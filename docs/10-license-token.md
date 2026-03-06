# Validación de Licencias Offline (HMAC)

Este documento describe el mecanismo de firma y validación de licencias para el funcionamiento offline del POS.

## 1. Concepto
El servidor (Supabase Edge Function) es la autoridad. Emite un `licenseToken` firmado digitalmente (HMAC-SHA256) que el POS almacena localmente.
Cuando el POS está offline, puede validar este token para asegurar que la licencia es auténtica y verificar si está vigente.

## 2. Formato del Token
El token sigue una estructura similar a JWT pero simplificada:
`BASE64URL(PAYLOAD) . BASE64URL(SIGNATURE)`

### Payload JSON
```json
{
  "v": 1,                                      // Versión del formato
  "licenseKey": "a1b2c3d4e5f6...",             // Key pública de la licencia
  "licenseId": "uuid-...",                     // ID interno
  "customerId": "uuid-...",                    // ID del cliente
  "planId": "uuid-...",                        // ID del plan
  "status": "trial|active|blocked|expired",    // Estado calculado al momento de emisión
  "expiresAt": "2026-12-31T23:59:59Z",         // Fecha de expiración
  "graceUntil": "2027-01-07T23:59:59Z",        // Fin del periodo de gracia (opcional)
  "limits": { "maxDevices": 5 },               // Límites del plan
  "issuedAt": "2026-03-05T10:00:00Z"           // Fecha de emisión
}
```

### Firma
`HMAC-SHA256( BASE64URL(PAYLOAD), SECRET )`
El `SECRET` es `LICENSE_HMAC_SECRET` (variable de entorno en Backend).

## 3. Flujo de Validación

### Online (Happy Path)
1. POS envía `licenseKey` + `deviceFingerprint` + `licenseToken` (si tiene) a `/license/validate`.
2. Servidor valida contra DB en tiempo real.
3. Si el estado cambió o el token es viejo/inválido, el servidor genera un **nuevo token**.
4. POS recibe respuesta y guarda el nuevo `licenseToken`.

### Offline (Fallback)
1. POS detecta que no hay conexión.
2. POS lee `licenseToken` almacenado localmente.
3. POS usa `verifyLicenseToken(token, secret)`:
   - Verifica que la firma coincida (integridad).
   - Verifica `expiresAt` y `graceUntil` contra el reloj local.
4. Reglas:
   - `now <= expiresAt`: **ACTIVA**
   - `now > expiresAt` Y `now <= graceUntil`: **GRACE** (Permitir operar con advertencia)
   - `now > graceUntil`: **EXPIRADA** (Bloquear operación)

> **Nota:** El estado `blocked` (revocación manual por impago/abuso) NO se puede detectar offline si ocurrió después de la última conexión. El POS debe conectarse periódicamente.

## 4. Implementación en POS

Se provee una utilidad en TypeScript/JavaScript para el POS:
`admin-panel/src/utils/pos-license-verifier.ts`

### Ejemplo de uso:

```typescript
import { verifyLicenseToken } from './pos-license-verifier';

// EL SECRET DEBE ESTAR PROTEGIDO EN EL POS
const SECRET = "tu-secreto-hmac-aqui"; 

async function checkLicense(token: string) {
  const payload = await verifyLicenseToken(token, SECRET);
  
  if (!payload) {
    throw new Error("Licencia inválida o corrupta");
  }
  
  const now = new Date();
  const expires = new Date(payload.expiresAt);
  
  if (now > expires) {
    if (payload.graceUntil && now <= new Date(payload.graceUntil)) {
      console.warn("Licencia en periodo de gracia");
      return "grace";
    }
    throw new Error("Licencia expirada");
  }
  
  return "active";
}
```

## 5. Seguridad
- **Secret Management**: El `LICENSE_HMAC_SECRET` es crítico.
  - En Backend: Guardado en Supabase Secrets.
  - En POS: Debe almacenarse de forma ofuscada o segura. **NO exponer en aplicaciones web públicas (Frontend browser)**. Si el POS es una Web App pública, este esquema HMAC simétrico no es seguro para validación offline cliente-side (el usuario podría extraer el secreto y forjar licencias).
  - *Para Web Apps públicas, se recomienda solo validación online, o migrar a firma Asimétrica (RSA/ECDSA) donde el POS solo tiene la clave pública.*
  - Este diseño asume que el POS es un entorno controlado (Electron, Terminal dedicado, o App Nativa).

## 6. Configuración Backend
Asegurarse de configurar la variable de entorno en Supabase Edge Functions:
```bash
supabase secrets set LICENSE_HMAC_SECRET="tu_secreto_super_seguro_y_largo"
```
