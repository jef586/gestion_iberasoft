# Telemetry Heartbeat Function

Endpoint specific handling for POS heartbeats.

## Endpoint
`POST /telemetry/heartbeat`

## Logic
1. Validates `licenseId` and `deviceFingerprint`.
2. Checks if license exists and is not blocked.
3. Checks if license is expired (allows access during grace period).
4. Upserts `telemetry_heartbeats` to update `last_seen_at`.
5. Logs `HEARTBEAT_RECEIVED` to `audit_logs`.

## Usage
### Valid Heartbeat
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/telemetry-heartbeat' \
--header 'Authorization: Bearer SUPABASE_ANON_KEY' \
--header 'Content-Type: application/json' \
--data '{"licenseId": "VALID_LICENSE_UUID", "deviceFingerprint": "dev_123"}'
```

### Blocked License
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/telemetry-heartbeat' \
--header 'Authorization: Bearer SUPABASE_ANON_KEY' \
--header 'Content-Type: application/json' \
--data '{"licenseId": "BLOCKED_LICENSE_UUID", "deviceFingerprint": "dev_123"}'
```

### Expired License
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/telemetry-heartbeat' \
--header 'Authorization: Bearer SUPABASE_ANON_KEY' \
--header 'Content-Type: application/json' \
--data '{"licenseId": "EXPIRED_LICENSE_UUID", "deviceFingerprint": "dev_123"}'
```
