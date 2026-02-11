# License Activation Edge Function

## Endpoint
`POST /license/activate`

Activates a license on a specific device. This function is idempotent and handles device limits and reactivation of revoked devices.

## Request

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <reserved>` (Not strictly required for this public/POS endpoint if using checks inside, but Standard Supabase Functions usually require the anon key at least)

**Body:**
```json
{
  "licenseId": "uuid-of-license",
  "deviceFingerprint": "unique-device-identifier"
}
```

## Response

**Success (200 OK):**
```json
{
  "ok": true,
  "licenseId": "uuid-of-license",
  "deviceFingerprint": "unique-device-identifier",
  "activated": true,
  "activeDevices": 1,
  "maxDevices": 5
}
```

**Errors:**

| Status | Code | Description |
| copy | copy | copy |
| 400 | VALIDATION_ERROR | Missing `licenseId` or `deviceFingerprint`. |
| 403 | LICENSE_BLOCKED | The license status is 'blocked'. |
| 403 | LICENSE_EXPIRED | The license has expired and is past any grace period. |
| 404 | LICENSE_NOT_FOUND | The `licenseId` does not exist. |
| 409 | DEVICE_LIMIT_REACHED | The maximum number of devices for this plan has been reached. |
| 500 | INTERNAL_ERROR | Server-side error. |

## Audit
Every successful activation is logged in `audit_logs` with:
- `action`: `LICENSE_DEVICE_ACTIVATED`
- `actor`: `pos`
- `entity`: `licenses`
- `metadata`: `{ deviceFingerprint, maxDevices, activeDevicesCount }`

## Examples

**Curl:**
```bash
curl -i --request POST 'https://<project>.supabase.co/functions/v1/license-activate' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{
    "licenseId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceFingerprint": "pos-terminal-001"
  }'
```
