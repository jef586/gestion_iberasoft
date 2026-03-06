
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { logAudit } from "../_shared/audit-logger.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Validate Request
        const { licenseId, deviceFingerprint } = await req.json()

        if (!licenseId || !deviceFingerprint) {
            return new Response(
                JSON.stringify({ error: 'Missing licenseId or deviceFingerprint' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 3. Check License Existence and Status
        const { data: license, error: licenseError } = await supabaseClient
            .from('licenses')
            .select('id, status, expires_at, grace_until')
            .eq('id', licenseId)
            .maybeSingle()

        if (licenseError) throw licenseError

        if (!license) {
            return new Response(
                JSON.stringify({ error: 'License not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        if (license.status === 'blocked') {
            return new Response(
                JSON.stringify({ error: 'License is blocked' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 4. Check Expiration / Grace Period
        // Assumption A: heartbeat allowed during grace period. 
        // Logic: if now > grace_until (or now > expires_at if no grace), then reject.
        // Actually, logic is: active if <= expires_at OR <= grace_until.

        const now = new Date()
        const expiresAt = new Date(license.expires_at)
        const graceUntil = license.grace_until ? new Date(license.grace_until) : null

        let isExpired = false
        if (graceUntil) {
            if (now > graceUntil) isExpired = true
        } else {
            if (now > expiresAt) isExpired = true
        }

        if (isExpired) {
            return new Response(
                JSON.stringify({ error: 'License expired' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 5. Upsert Telemetry Heartbeat
        // Keys: license_id, device_fingerprint
        const lastSeenAt = new Date().toISOString()

        const { error: telemetryError } = await supabaseClient
            .from('telemetry_heartbeats')
            .upsert({
                license_id: licenseId,
                device_fingerprint: deviceFingerprint,
                last_seen_at: lastSeenAt
            }, { onConflict: 'license_id, device_fingerprint' })

        if (telemetryError) {
            console.error('Telemetry upsert error:', telemetryError)
            return new Response(
                JSON.stringify({ error: 'Failed to record heartbeat' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // 6. Audit Log
        await logAudit(supabaseClient, {
            action: 'HEARTBEAT_RECEIVED',
            entity: 'licenses',
            entityId: licenseId,
            actor: 'pos',
            metadata: {
                deviceFingerprint,
                lastSeenAt
            }
        })

        // 7. Response
        return new Response(
            JSON.stringify({
                ok: true,
                licenseId,
                deviceFingerprint,
                lastSeenAt
            }),
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
