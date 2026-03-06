
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { generateLicenseToken, verifyLicenseToken, LicensePayload } from "../_shared/license-token.ts"

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

        const secret = Deno.env.get('LICENSE_HMAC_SECRET') ?? 'default-secret-change-me';

        // 2. Validate Request
        const { licenseKey, deviceFingerprint, localTimestamp, licenseToken } = await req.json()

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

        // 3. Find License by license_key (preferred) or ID (fallback)
        let license = null;
        let licenseError = null;

        // Try by license_key
        const { data: licenseByKey, error: errorByKey } = await supabaseClient
            .from('licenses')
            .select(`
                *,
                plans (
                    limits
                )
            `)
            .eq('license_key', licenseKey)
            .maybeSingle()
        
        if (licenseByKey) {
            license = licenseByKey;
        } else if (!errorByKey && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(licenseKey)) {
            // Fallback to ID if it looks like a UUID
             const { data: licenseById, error: errorById } = await supabaseClient
                .from('licenses')
                .select(`
                    *,
                    plans (
                        limits
                    )
                `)
                .eq('id', licenseKey)
                .maybeSingle()
             
             if (licenseById) license = licenseById;
             licenseError = errorById;
        } else {
            licenseError = errorByKey;
        }

        if (licenseError) throw licenseError

        if (!license) {
            return new Response(
                JSON.stringify({ error: 'License not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // 4. Calculate Status (Server Authority)
        const now = new Date()
        const expiresAt = new Date(license.expires_at)
        const graceUntil = license.grace_until ? new Date(license.grace_until) : null

        let calculatedStatus = 'active'

        if (license.status === 'blocked') {
            calculatedStatus = 'blocked'
        } else if (now <= expiresAt) {
            calculatedStatus = 'active'
        } else if (graceUntil && now <= graceUntil) {
            calculatedStatus = 'grace'
        } else {
            calculatedStatus = 'expired'
        }

        // 5. Validate Incoming Token (if present)
        let tokenValid = false;
        let tokenPayload: LicensePayload | null = null;

        if (licenseToken) {
            tokenPayload = await verifyLicenseToken(licenseToken, secret);
            if (tokenPayload) {
                // Check if payload matches current server state
                // We check critical fields: status, expiresAt, limits
                const payloadExpires = new Date(tokenPayload.expiresAt).getTime();
                const currentExpires = expiresAt.getTime();
                
                // If token status differs from calculated status, or expiry changed
                if (tokenPayload.status !== calculatedStatus || 
                    Math.abs(payloadExpires - currentExpires) > 1000 || // 1s tolerance
                    JSON.stringify(tokenPayload.limits) !== JSON.stringify(license.plans?.limits ?? {})
                   ) {
                    tokenValid = false; // Needs update
                } else {
                    tokenValid = true;
                }
            }
        }

        // 6. Generate New Token if needed
        let finalToken = licenseToken;
        
        // If no token, or invalid/outdated token, generate new one
        if (!tokenValid) {
             const newPayload: LicensePayload = {
                v: 1,
                licenseKey: license.license_key ?? license.id, // Fallback to ID if key missing (should not happen with migration)
                licenseId: license.id,
                customerId: license.customer_id,
                planId: license.plan_id,
                status: calculatedStatus as any,
                expiresAt: license.expires_at,
                graceUntil: license.grace_until,
                limits: license.plans?.limits ?? {},
                issuedAt: new Date().toISOString()
             };
             
             finalToken = await generateLicenseToken(newPayload, secret);
             
             // Update DB with new token
             await supabaseClient.from('licenses').update({
                 license_token: finalToken,
                 issued_at: newPayload.issuedAt,
             }).eq('id', license.id);
             
             // Log token issuance
             await supabaseClient.from('audit_logs').insert({
                action: 'LICENSE_TOKEN_ISSUED',
                entity: 'licenses',
                entity_id: license.id,
                actor: 'system',
                metadata: {
                    reason: licenseToken ? 'refresh' : 'create',
                    token_version: license.token_version
                }
            });
        }

        // 7. Validate Device
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

        // 8. Audit Log
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
                deviceRevoked,
                tokenRefreshed: !tokenValid
            }
        })

        if (auditError) console.error("Audit log error:", auditError)

        // 9. Telemetry Heartbeat (Upsert)
        const { error: telemetryError } = await supabaseClient.from('telemetry_heartbeats').upsert({
            license_id: license.id,
            device_fingerprint: deviceFingerprint,
            last_seen_at: new Date().toISOString()
        }, { onConflict: 'license_id, device_fingerprint' })

        if (telemetryError) console.error("Telemetry error:", telemetryError)


        // 10. Construct Response
        const responseData = {
            status: calculatedStatus,
            licenseId: license.id,
            licenseToken: finalToken,
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
