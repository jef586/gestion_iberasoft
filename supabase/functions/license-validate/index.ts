
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
        const { licenseKey, deviceFingerprint, localTimestamp } = await req.json()

        if (!licenseKey || !deviceFingerprint || !localTimestamp) {
            return new Response(
                JSON.stringify({ error: 'Missing licenseKey, deviceFingerprint, or localTimestamp' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Validate timestamp format (basic check)
        const localTime = new Date(localTimestamp)
        if (isNaN(localTime.getTime())) {
            return new Response(
                JSON.stringify({ error: 'Invalid localTimestamp format' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 3. Find License by ID (Assumption A: licenseKey = licenses.id)
        const { data: license, error: licenseError } = await supabaseClient
            .from('licenses')
            .select(`
                *,
                plans (
                    limits
                )
            `)
            .eq('id', licenseKey) // licenseKey is the UUID
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

        // 4. Calculate Status (Active/Grace/Expired)
        // Authority is Server Time (Assumption C)
        const now = new Date()
        const expiresAt = new Date(license.expires_at)
        const graceUntil = license.grace_until ? new Date(license.grace_until) : null

        let calculatedStatus = 'active'

        // Logic:
        // si now <= expires_at → activa
        // si now > expires_at y now <= grace_until → grace
        // si now > grace_until → expired

        if (now <= expiresAt) {
            calculatedStatus = 'active'
        } else if (graceUntil && now <= graceUntil) {
            calculatedStatus = 'grace'
        } else {
            calculatedStatus = 'expired'
        }

        // 5. Validate Device
        // Check if device is activated
        const { data: device, error: deviceError } = await supabaseClient
            .from('license_devices')
            .select('*')
            .eq('license_id', license.id)
            .eq('device_fingerprint', deviceFingerprint)
            .maybeSingle()

        if (deviceError) throw deviceError

        let deviceActivated = false
        let deviceRevoked = false

        if (device) {
            if (!device.revoked_at) {
                deviceActivated = true
            } else {
                deviceRevoked = true
            }
        }
        // Assumption B: If not activated, we return accepted response but with device.activated=false

        // 6. Audit Log
        const { error: auditError } = await supabaseClient.from('audit_logs').insert({
            action: 'LICENSE_VALIDATED',
            entity: 'licenses',
            entity_id: license.id,
            actor: 'pos',
            metadata: {
                deviceFingerprint,
                status: calculatedStatus,
                localTimestamp,
                deviceActivated,
                deviceRevoked
            }
        })

        if (auditError) console.error("Audit log error:", auditError)

        // 7. Telemetry Heartbeat (Upsert)
        const { error: telemetryError } = await supabaseClient.from('telemetry_heartbeats').upsert({
            license_id: license.id,
            device_fingerprint: deviceFingerprint,
            last_seen_at: new Date().toISOString()
        }, { onConflict: 'license_id, device_fingerprint' })

        if (telemetryError) console.error("Telemetry error:", telemetryError)


        // 8. Construct Response
        const responseData = {
            status: calculatedStatus,
            licenseId: license.id,
            expiresAt: license.expires_at,
            graceUntil: license.grace_until,
            limits: license.plans?.limits ?? {},
            device: {
                activated: deviceActivated,
                revoked: deviceRevoked
            }
        }

        return new Response(
            JSON.stringify(responseData),
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
