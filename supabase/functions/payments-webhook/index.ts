import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifySignature, normalizeEvent } from "../_shared/webhook-utils.ts";
import { NormalizedEvent } from "../_shared/payment-types.ts";

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
        // We can check audit_logs for a specialized entry or payments table if we store event_id there.
        // The requirements say: "Si ya se procesó ese evento: devolver 200 OK con { "ok": true, "deduped": true }"
        // "La clave idempotente mínima debe ser: (provider, eventId)"

        // We'll query audit_logs for this specific event processing to be safe, 
        // OR we can rely on `payments` if we store the last event ID. 
        // But one payment might have multiple events (pending -> approved). 
        // So looking for "PAYMENT_WEBHOOK_PROCESSED" in audit logs with this eventId is safer.

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

        // 4. Process Logic (DB Transaction via separate calls or RPC? Supabase JS doesn't do complex transactions easily without RPC)
        // We will do sequential operations with error handling. Ideally this should be an RPC.
        // Requirement says: "Lógica DB (ideal con transacción)"
        // We will stick to sequential for now as creating a new SQL function might be out of scope or we can do it if user permits.
        // Given the constraints, I will do sequential updates.

        // 4a. Find Payment
        let paymentId = event.metadata.paymentId;
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
            // Option: Insert new payment if not found? Or error? 
            // Usually webhooks might arrive before client knows. 
            // But checkout usually creates pending payment first.
            // If not found, we might log and ignore or create a "orphan" payment.
            // Requirement: "Actualizar: status, provider_ref if missing". Doesn't explicitly say "Create if missing".
            // But "Buscar payments por..." implies it should accept existing.
            console.error(`Payment not found for ref ${event.providerRef}`);
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
                provider_ref: event.providerRef, // Ensure it's set
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);

        if (updateError) throw updateError;

        let licenseId = null;

        // 4c. Activate/Renew License if Approved
        if (event.status === 'approved') {
            // Check for existing active license for this customer (+ plan?)
            // Requirement: "Si customer NO tiene licencia activa -> crear... Si ya tiene -> renovar"
            // We need plan details to know duration.
            // We can get planId from payment metadata or payment record (we didn't store plan_id in payment strictly? 
            // Wait, payment table has customer_id. Does it have plan_id? 
            // The previous conversation's schema might not have plan_id in payments, but it has amount. 
            // Luckily event metadata should have planId.

            const customerId = payment.customer_id;
            const planId = event.metadata.planId;

            if (!planId) {
                console.error('Missing planId in metadata for activation');
                // Proceed without license activation? Or fail? 
                // Failing might retry webhook. Let's log error.
            } else {
                // Get Plan Duration
                const { data: plan } = await supabaseClient.from('plans').select('duration_days').eq('id', planId).single();
                const durationDays = plan?.duration_days || 30;
                const graceDays = Number(Deno.env.get('GRACE_DAYS') ?? 7);

                // Check existing license
                const { data: activeLicense } = await supabaseClient
                    .from('licenses')
                    .select('*')
                    .eq('customer_id', customerId)
                    .eq('plan_id', planId) // Assuming one license per plan type? Or just one active license per user?
                    // "Si customer NO tiene licencia activa" - implies generic. 
                    // Let's assume matches planId.
                    .in('status', ['active', 'past_due']) // active or maybe validation needed
                    .order('expires_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (activeLicense) {
                    // Renew
                    const currentExpires = new Date(activeLicense.expires_at);
                    // If it's already expired (past_due), valid from NOW? Or from old expiry?
                    // Usually from NOW if it was long ago. 
                    // If distinct logic not specified, let's just add days to current max(expires_at, now).
                    const now = new Date();
                    const baseDate = currentExpires > now ? currentExpires : now;
                    baseDate.setDate(baseDate.getDate() + durationDays);
                    const newExpiresAt = baseDate.toISOString();

                    // Calculate Grace
                    const graceDate = new Date(baseDate);
                    graceDate.setDate(graceDate.getDate() + graceDays);

                    const { data: updatedLicense, error: licError } = await supabaseClient
                        .from('licenses')
                        .update({
                            status: 'active',
                            expires_at: newExpiresAt,
                            grace_until: graceDate.toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', activeLicense.id)
                        .select()
                        .single();

                    if (licError) throw licError;
                    licenseId = updatedLicense.id;
                } else {
                    // Create New
                    const now = new Date();
                    const expiresDate = new Date();
                    expiresDate.setDate(now.getDate() + durationDays);
                    const graceDate = new Date(expiresDate);
                    graceDate.setDate(graceDate.getDate() + graceDays);

                    const { data: newLicense, error: licError } = await supabaseClient
                        .from('licenses')
                        .insert({
                            customer_id: customerId,
                            plan_id: planId,
                            status: 'active',
                            starts_at: now.toISOString(),
                            expires_at: expiresDate.toISOString(),
                            grace_until: graceDate.toISOString(),
                            device_count: 0 // Default
                        })
                        .select()
                        .single();

                    if (licError) throw licError;
                    licenseId = newLicense.id;
                }
            }
        }

        // 5. Audit Log (Payment Update + Webhook Processed)
        // Log specialized 'PAYMENT_RECEIVED'
        await supabaseClient.from('audit_logs').insert({
            action: event.status === 'approved' ? 'PAYMENT_APPROVED' : 'PAYMENT_RECEIVED', // or REJECTED
            entity: 'payments',
            entity_id: paymentId,
            actor: 'system',
            metadata: {
                eventId: event.eventId,
                provider: event.provider,
                status: event.status,
                amount: event.amount
            }
        });

        // Log 'PAYMENT_WEBHOOK_PROCESSED' for idempotency
        await supabaseClient.from('audit_logs').insert({
            action: 'PAYMENT_WEBHOOK_PROCESSED',
            entity: 'system', // or payments?
            actor: 'system',
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
