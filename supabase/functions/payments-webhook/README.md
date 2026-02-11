# Payments Webhook Function

Handles incoming payment webhooks from providers (Stripe, MercadoPago, Fake).

## Setup

Ensure the following environment variables are set:
- `PAYMENT_WEBHOOK_SECRET`: Secret to verify webhook signatures.
- `GRACE_DAYS`: Number of grace period days for license renewal (default: 7).
- `SUPABASE_URL`: URL of your Supabase instance.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin access.

## Testing with Curl

**Note**: For the "fake" provider, we assume the `x-webhook-signature` header matches `PAYMENT_WEBHOOK_SECRET`.

### 1. Payment Approved (New License / Renewal)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/payments-webhook' \
--header 'Content-Type: application/json' \
--header 'x-webhook-signature: YOUR_SECRET_HERE' \
--data-raw '{
  "provider": "fake",
  "eventId": "evt_test_001",
  "providerRef": "pay_test_001",
  "status": "approved",
  "amount": 10000,
  "currency": "ARS",
  "metadata": {
    "customerId": "YOUR_CUSTOMER_UUID",
    "planId": "YOUR_PLAN_UUID",
    "paymentId": "OPTIONAL_PAYMENT_UUID"
  }
}'
```

### 2. Payment Rejected

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/payments-webhook' \
--header 'Content-Type: application/json' \
--header 'x-webhook-signature: YOUR_SECRET_HERE' \
--data-raw '{
  "provider": "fake",
  "eventId": "evt_test_002",
  "providerRef": "pay_test_002",
  "status": "rejected",
  "amount": 10000,
  "currency": "ARS",
  "metadata": {
    "customerId": "YOUR_CUSTOMER_UUID",
    "planId": "YOUR_PLAN_UUID"
  }
}'
```

### 3. Duplicate Event (Idempotency) (Send same eventId twice)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/payments-webhook' \
--header 'Content-Type: application/json' \
--header 'x-webhook-signature: YOUR_SECRET_HERE' \
--data-raw '{
  "provider": "fake",
  "eventId": "evt_test_001",
  "providerRef": "pay_test_001",
  "status": "approved",
  "amount": 10000,
  "currency": "ARS",
  "metadata": {
    "customerId": "YOUR_CUSTOMER_UUID",
    "planId": "YOUR_PLAN_UUID"
  }
}'
```
Response:
```json
{
  "ok": true,
  "deduped": true
}
```

### 4. Invalid Signature

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/payments-webhook' \
--header 'Content-Type: application/json' \
--header 'x-webhook-signature: WRONG_SECRET' \
--data-raw '{ "provider": "fake" }'
```
