# Checkout Create Edge Function

## Descripción
Esta función genera una intención de pago y devuelve una `checkoutUrl` para que el cliente complete el pago.
Soporta proveedores de pago abstractos (actualmente implementado `FakeProvider`, listo para Stripe/MercadoPago).
Maneja idempotencia y registra auditoría.

## Endpoint
`POST /checkout/create`

### Request Body
```json
{
  "customerId": "uuid-del-cliente",
  "planId": "uuid-del-plan"
}
```

### Headers
- `Authorization`: Bearer [Anon Key] (o Service Role si es admin-only, pero esta función suele ser pública/autenticada por usuario)
  *Nota: La implementación actual valida customerId/planId contra la DB, asumiendo que el caller tiene permiso para invocar la función.*
- `Idempotency-Key` (Opcional): String único para evitar duplicados.

### Response
#### 200 OK
```json
{
  "checkoutUrl": "https://fake-payment-provider.com/checkout/fake_ref_...?amount=1000"
}
```

#### 400 Bad Request
```json
{
  "error": "Missing customerId or planId"
}
```
o
```json
{
  "error": "Invalid plan duration"
}
```

#### 404 Not Found
```json
{
  "error": "Customer not found"
}
```
o
```json
{
  "error": "Plan not found"
}
```

#### 409 Conflict
```json
{
  "error": "Idempotency conflict"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```

## Variables de Entorno Requeridas
Estas variables deben estar en el archivo `.env` o configuradas en Supabase Dashboard:

- `SUPABASE_URL`: URL de la API de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Key con permisos de admin (necesaria para insertar en `payments` y `audit_logs` que tienen RLS restrictivo).
- `PAYMENT_PROVIDER`: (Opcional, por defecto usa `FakeProvider` en código, se puede extender para seleccionar implementación).

## Ejecución Local

1.  Asegurarse de que Supabase esté corriendo (`supabase start`).
2.  Servir la función:
    ```bash
    supabase functions serve checkout-create --no-verify-jwt
    ```
    *(Nota: `--no-verify-jwt` es útil para probar con curl sin generar tokens de auth, pero en producción se debe requerir autenticación)*

## Ejemplo CURL

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/checkout-create' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer SUPABASE_ANON_KEY' \
--header 'Idempotency-Key: unique-key-123' \
--data-raw '{
  "customerId": "ID_DEL_CUSTOMER",
  "planId": "ID_DEL_PLAN"
}'
```
