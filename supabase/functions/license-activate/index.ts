
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { logAudit } from "../_shared/audit-logger.ts"
import { resolveLicenseState } from "../_shared/license-state-resolver.ts"

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

        // 2. Validate Request Request
        const { licenseId, deviceFingerprint } = await req.json()
        if (!licenseId || !deviceFingerprint) {
            return new Response(
                JSON.stringify({ error: 'Missing licenseId or deviceFingerprint' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 3. Fetch License and Plan limits
        const { data: license, error: licenseError } = await supabaseClient
            .from('licenses')
            .select(`
                *,
                plans (
                    limits
                )
            `)
            .eq('id', licenseId)
            .single()

        if (licenseError || !license) {
            return new Response(
                JSON.stringify({ error: 'License not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // 4. Validate License Status
        const now = new Date()
        const licenseState = resolveLicenseState(license, now);

        if (licenseState.isBlocked) {
            return new Response(
                JSON.stringify({ error: 'License is blocked' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        if (licenseState.isExpired) {
            // Persist expiration if needed (On Access Expiration)
            if (licenseState.shouldPersistExpired) {
                await supabaseClient
                    .from('licenses')
                    .update({ status: 'expired' })
                    .eq('id', license.id);
                
                await logAudit(supabaseClient, {
                    action: 'LICENSE_EXPIRED',
                    entity: 'licenses',
                    entityId: license.id,
                    actor: 'system',
                    metadata: {
                        previousStatus: licenseState.storedStatus,
                        effectiveStatus: 'expired',
                        expiresAt: licenseState.expiresAt,
                        graceUntil: licenseState.graceUntil
                    }
                });
            }

            return new Response(
                JSON.stringify({ error: 'License expired' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 5. Get Max Devices from Plan
        // plans.limits is jsonb.
        const maxDevices = license.plans?.limits?.maxDevices ?? 1

        // 6. Check existing device registration
        const { data: existingDevice, error: deviceError } = await supabaseClient
            .from('license_devices')
            .select('*')
            .eq('license_id', licenseId)
            .eq('device_fingerprint', deviceFingerprint)
            .maybeSingle()

        if (deviceError) throw deviceError

        let activated = false
        if (existingDevice) {
            if (existingDevice.revoked_at === null) {
                // Already active - Idempotent success
                activated = true
            } else {
                // Revoked - Reactivate (Update revoked_at = null)
                const { error: updateError } = await supabaseClient
                    .from('license_devices')
                    .update({ revoked_at: null, activated_at: new Date().toISOString() })
                    .eq('id', existingDevice.id)

                if (updateError) throw updateError
                activated = true
            }
        } else {
            // New Device - Check limit
            // Count active devices for this license
            const { count, error: countError } = await supabaseClient
                .from('license_devices')
                .select('*', { count: 'exact', head: true })
                .eq('license_id', licenseId)
                .is('revoked_at', null)

            if (countError) throw countError

            const activeCount = count ?? 0

            if (activeCount >= maxDevices) {
                return new Response(
                    JSON.stringify({ error: 'Device limit reached', maxDevices, activeDevices: activeCount }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
                )
            }

            // Insert new device
            const { error: insertError } = await supabaseClient
                .from('license_devices')
                .insert({
                    license_id: licenseId,
                    device_fingerprint: deviceFingerprint
                })

            if (insertError) throw insertError
            activated = true
        }

        // 7. Get final count for response
        const { count: finalCount } = await supabaseClient
            .from('license_devices')
            .select('*', { count: 'exact', head: true })
            .eq('license_id', licenseId)
            .is('revoked_at', null)

        // 8. Audit Log
        await logAudit(supabaseClient, {
            action: 'LICENSE_DEVICE_ACTIVATED',
            entity: 'licenses',
            entityId: licenseId,
            actor: 'pos',
            metadata: {
                deviceFingerprint,
                maxDevices,
                activeDevicesCount: finalCount
            }
        })

        return new Response(
            JSON.stringify({
                ok: true,
                licenseId,
                deviceFingerprint,
                activated,
                activeDevices: finalCount,
                maxDevices
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
