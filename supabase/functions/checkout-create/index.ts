
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { FakeProvider, PaymentProvider } from "../_shared/PaymentProvider.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Validate Request Body
        const { customerId, planId } = await req.json()
        if (!customerId || !planId) {
            return new Response(
                JSON.stringify({ error: 'Missing customerId or planId' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 2. Idempotency Check
        const idempotencyKey = req.headers.get('idempotency-key')
        if (idempotencyKey) {
            const { data: existingPayment } = await supabaseClient
                .from('payments')
                .select('*')
                .eq('idempotency_key', idempotencyKey)
                .maybeSingle()

            if (existingPayment) {
                // Return existing checkout URL (reconstructed for FakeProvider context)
                // In a real scenario with Stripe, we might fetch the session URL from Stripe using provider_ref 
                // or check if we stored it (we didn't). 
                // For FakeProvider, we reconstruct it.
                const checkoutUrl = `https://fake-payment-provider.com/checkout/${existingPayment.provider_ref}?amount=${existingPayment.amount}`
                return new Response(
                    JSON.stringify({ checkoutUrl }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }
        }

        // 3. Validate Customer exists
        const { data: customer, error: customerError } = await supabaseClient
            .from('customers')
            .select('id')
            .eq('id', customerId)
            .single()

        if (customerError || !customer) {
            return new Response(
                JSON.stringify({ error: 'Customer not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // 4. Validate Plan exists and get details
        const { data: plan, error: planError } = await supabaseClient
            .from('plans')
            .select('id, name, duration_days, price_amount, currency')
            .eq('id', planId)
            .single()

        if (planError || !plan) {
            return new Response(
                JSON.stringify({ error: 'Plan not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        if (!plan.duration_days || plan.duration_days <= 0) {
            return new Response(
                JSON.stringify({ error: 'Invalid plan duration' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 5. Create Checkout at Provider
        // TODO: support env var to switch providers
        const provider: PaymentProvider = new FakeProvider()

        // Amount from plan
        const amount = Number(plan.price_amount)
        const currency = plan.currency

        const { checkoutUrl, providerRef } = await provider.createCheckout({
            amount,
            currency,
            description: `Plan: ${plan.name}`,
            metadata: {
                customerId,
                planId
            }
        })

        // 6. Persist Payment Record
        const { error: paymentError } = await supabaseClient
            .from('payments')
            .insert({
                customer_id: customerId,
                provider: 'fake', // or Deno.env.get('PAYMENT_PROVIDER')
                provider_ref: providerRef,
                amount: amount,
                status: 'pending',
                idempotency_key: idempotencyKey || null
            })

        if (paymentError) {
            console.error('Payment Insert Error:', paymentError)
            // Check for uniqueness violation (if idempotency key race condition occurred)
            if (paymentError.code === '23505') { // unique_violation
                return new Response(
                    JSON.stringify({ error: 'Idempotency conflict' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
                )
            }
            throw paymentError
        }

        // 7. Create Audit Log
        const { error: auditError } = await supabaseClient
            .from('audit_logs')
            .insert({
                action: 'CHECKOUT_CREATED',
                entity: 'payments',
                actor: 'admin', // As per requirements "actor = admin" (since this is called by system/admin panel mostly?) 
                // or maybe user? User said "Auth + RLS admin-only para el panel interno".
                // If this function is called from the text, it says "actor = admin".
                metadata: {
                    customerId,
                    planId,
                    provider: 'fake'
                }
            })

        if (auditError) {
            // Non-blocking but good to log
            console.error('Audit Log Error:', auditError)
        }

        // 8. Return Response
        return new Response(
            JSON.stringify({ checkoutUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: 'Internal Server Error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
