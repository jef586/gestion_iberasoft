# License Validate Function

`POST /license/validate`

Valida una licencia desde el POS, verifica expiración, límites y estado del dispositivo.

## Request

**Endpoint:** `POST https://[project].functions.supabase.co/license-validate`

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer [ANON_KEY]`

**Body:**
```json
{
  "licenseKey": "uuid-de-la-licencia",
  "deviceFingerprint": "string-unico-del-hardware",
  "localTimestamp": "2026-02-10T10:00:00Z"
}
```

## Response

**Success (200 OK):**
```json
{
  "status": "active|grace|expired",
  "licenseId": "uuid",
  "expiresAt": "2026-12-31T23:59:59Z",
  "graceUntil": "2027-01-31T23:59:59Z",
  "limits": {
    "maxDevices": 1
  },
  "device": {
    "activated": true,
    "revoked": false
  }
}
```

**Que significa `device.activated: false`?**  
Es el **Supuesto B (Opción 2)**: El servidor responde OK (status 200) para informar el estado de la licencia, pero indica que *este dispositivo* no ha sido activado aún. El POS debe entonces llamar a `/license/activate` o bloquear el acceso si su política local lo requiere.

## Errores

- **400 Bad Request**: Faltan campos o timestamp inválido.
- **403 Forbidden - License Blocked**: `{ "error": "License is blocked" }`
- **404 Not Found**: Licencia no existe.
- **500 Internal Server Error**: Error inesperado.

## Casos Manuales y Ejemplos Curl

Para probar estos casos, asegúrate de tener datos en la base de datos que correspondan a cada escenario (una licencia activa, una expirada, una bloqueada, etc.).

### 1. Validar Licencia Activa (Caso Feliz)
Licencia existente, fecha actual < expires_at.

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/license-validate' \
--header 'Authorization: Bearer [ANON_KEY]' \
--header 'Content-Type: application/json' \
--data-raw '{
    "licenseKey": "UUID_LICENCIA_ACTIVA",
    "deviceFingerprint": "device-123",
    "localTimestamp": "2026-02-10T12:00:00Z"
}'
```

### 2. Validar Licencia en Grace Period
Licencia existente, expires_at < fecha actual < grace_until.

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/license-validate' \
--header 'Authorization: Bearer [ANON_KEY]' \
--header 'Content-Type: application/json' \
--data-raw '{
    "licenseKey": "UUID_LICENCIA_GRACE",
    "deviceFingerprint": "device-123",
    "localTimestamp": "2026-02-10T12:00:00Z"
}'
```

### 3. Validar Licencia Expirada
Licencia existente, fecha actual > grace_until (o > expires_at si no hay grace).

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/license-validate' \
--header 'Authorization: Bearer [ANON_KEY]' \
--header 'Content-Type: application/json' \
--data-raw '{
    "licenseKey": "UUID_LICENCIA_EXPIRADA",
    "deviceFingerprint": "device-123",
    "localTimestamp": "2026-02-10T12:00:00Z"
}'
```

### 4. Validar Licencia Bloqueada
Licencia con `status = 'blocked'`. Debe retornar 403.

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/license-validate' \
--header 'Authorization: Bearer [ANON_KEY]' \
--header 'Content-Type: application/json' \
--data-raw '{
    "licenseKey": "UUID_LICENCIA_BLOQUEADA",
    "deviceFingerprint": "device-123",
    "localTimestamp": "2026-02-10T12:00:00Z"
}'
```

### 5. Validar Dispositivo No Activado
Licencia válida, pero `deviceFingerprint` no existe en `license_devices`.

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/license-validate' \
--header 'Authorization: Bearer [ANON_KEY]' \
--header 'Content-Type: application/json' \
--data-raw '{
    "licenseKey": "UUID_LICENCIA_ACTIVA",
    "deviceFingerprint": "NUEVO_DISPOSITIVO_999",
    "localTimestamp": "2026-02-10T12:00:00Z"
}'
```
Respuesta esperada: `200 OK` con `"device": { "activated": false, ... }`
