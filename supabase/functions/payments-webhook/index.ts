import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySignature, normalizeEvent } from "../_shared/webhook-utils.ts";
import { NormalizedEvent } from "../_shared/payment-types.ts";
import { logAudit } from "../_shared/audit-logger.ts";
import { calculateLicenseDates } from "../_shared/license-state-resolver.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Verify Signature
        const secret = Deno.env.get('PAYMENT_WEBHOOK_SECRET') ?? '';
        const isValid = await verifySignature(req, secret);
        if (!isValid) {
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        // 2. Normalize Event
        const payload = await req.json();
        let event: NormalizedEvent;
        try {
            event = normalizeEvent(payload);
        } catch (e) {
            return new Response(
                JSON.stringify({ error: 'Invalid event format' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        console.log(`Processing event: ${event.eventId} (${event.status})`);

        // 3. Idempotency Check
        // Check if we already processed this event
        // We look for "PAYMENT_WEBHOOK_PROCESSED" in audit logs with this eventId
        const { data: existingLog } = await supabaseClient
            .from('audit_logs')
            .select('id')
            .eq('action', 'PAYMENT_WEBHOOK_PROCESSED')
            .contains('metadata', { eventId: event.eventId, provider: event.provider })
            .maybeSingle();

        if (existingLog) {
            console.log(`Event ${event.eventId} already processed.`);
            return new Response(
                JSON.stringify({ ok: true, deduped: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // 4. Process Logic
        // 4a. Find Payment
        let paymentId = event.metadata?.paymentId;
        let payment;

        if (paymentId) {
            const { data } = await supabaseClient.from('payments').select('*').eq('id', paymentId).single();
            payment = data;
        } else {
            const { data } = await supabaseClient
                .from('payments')
                .select('*')
                .eq('provider', event.provider)
                .eq('provider_ref', event.providerRef)
                .maybeSingle();
            payment = data;
        }

        if (!payment) {
            console.error(`Payment not found for ref ${event.providerRef}`);
            // Return 404 but maybe we should log and continue? 
            // If payment record is missing, we can't link it easily.
            return new Response(
                JSON.stringify({ error: 'Payment not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            );
        }

        paymentId = payment.id;

        // 4b. Update Payment
        const { error: updateError } = await supabaseClient
            .from('payments')
            .update({
                status: event.status,
                provider_ref: event.providerRef,
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);

        if (updateError) throw updateError;

        let licenseId = null;

        // 4c. Activate/Renew License if Approved
        if (event.status === 'approved') {
            const customerId = payment.customer_id;
            // planId might come from metadata or we need to fetch it if not present
            const planId = event.metadata?.planId || payment.plan_id; // assuming payment might have plan_id

            if (!planId) {
                console.error('Missing planId in metadata for activation');
            } else {
                // Get Plan Duration
                const { data: plan } = await supabaseClient.from('plans').select('duration_days').eq('id', planId).single();
                const durationDays = plan?.duration_days || 30;
                const graceDays = Number(Deno.env.get('GRACE_DAYS') ?? 7);

                // Check existing license (active, trial, expired, grace)
                const { data: existingLicense } = await supabaseClient
                    .from('licenses')
                    .select('*')
                    .eq('customer_id', customerId)
                    .eq('plan_id', planId)
                    // We check for any license that is not blocked/revoked basically.
                    // Or specifically look for the one to renew.
                    // If multiple exist, pick the latest one?
                    .neq('status', 'blocked')
                    .order('expires_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existingLicense) {
                    // Renew / Reactivate
                    const now = new Date();
                    const currentExpires = new Date(existingLicense.expires_at);
                    
                    // If current expiration is in the future, extend from there.
                    // If in the past (expired), start from NOW.
                    let startDate = now;
                    if (currentExpires > now) {
                        startDate = currentExpires;
                    }

                    const { expiresAt, graceUntil } = calculateLicenseDates(startDate, durationDays, graceDays);

                    const { data: updatedLicense, error: licError } = await supabaseClient
                        .from('licenses')
                        .update({
                            status: 'active', // Reactivate if expired
                            expires_at: expiresAt.toISOString(),
                            grace_until: graceUntil.toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingLicense.id)
                        .select()
                        .single();

                    if (licError) throw licError;
                    licenseId = updatedLicense.id;

                    // Audit Renewal/Reactivation
                    const action = existingLicense.status === 'expired' ? 'LICENSE_REACTIVATED' : 'LICENSE_RENEWED';
                    await logAudit(supabaseClient, {
                        action,
                        entity: 'licenses',
                        entityId: licenseId,
                        actor: 'system',
                        metadata: {
                            previousStatus: existingLicense.status,
                            newExpiresAt: expiresAt.toISOString(),
                            paymentId
                        }
                    });

                } else {
                    // Create New License
                    const now = new Date();
                    const { expiresAt, graceUntil } = calculateLicenseDates(now, durationDays, graceDays);

                    const { data: newLicense, error: licError } = await supabaseClient
                        .from('licenses')
                        .insert({
                            customer_id: customerId,
                            plan_id: planId,
                            status: 'active',
                            starts_at: now.toISOString(),
                            expires_at: expiresAt.toISOString(),
                            grace_until: graceUntil.toISOString(),
                            // license_key generated by default or trigger?
                            // device_count: 0 // default
                        })
                        .select()
                        .single();

                    if (licError) throw licError;
                    licenseId = newLicense.id;
                    
                    await logAudit(supabaseClient, {
                        action: 'LICENSE_CREATED',
                        entity: 'licenses',
                        entityId: licenseId,
                        actor: 'system',
                        metadata: {
                            paymentId,
                            expiresAt: expiresAt.toISOString()
                        }
                    });
                }
            }
        }

        // 5. Audit Log (Payment Update + Webhook Processed)
        // ... (existing audit logic)

        // 5. Audit Log (Payment Update + Webhook Processed)
        
        let action = 'PAYMENT_RECEIVED';
        if (event.status === 'approved') action = 'PAYMENT_APPROVED';
        else if (event.status === 'rejected') action = 'PAYMENT_REJECTED';

        await logAudit(supabaseClient, {
            action,
            entity: 'payments',
            entityId: paymentId,
            actor: 'webhook',
            metadata: {
                eventId: event.eventId,
                provider: event.provider,
                status: event.status,
                amount: event.amount
            }
        });

        // Log 'PAYMENT_WEBHOOK_PROCESSED' for idempotency
        await logAudit(supabaseClient, {
            action: 'PAYMENT_WEBHOOK_PROCESSED',
            entity: 'system',
            actor: 'webhook',
            metadata: {
                eventId: event.eventId,
                provider: event.provider
            }
        });

        return new Response(
            JSON.stringify({
                ok: true,
                processed: true,
                deduped: false,
                paymentId,
                licenseId
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: 'Internal Server Error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
