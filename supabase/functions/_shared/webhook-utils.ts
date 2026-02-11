import { NormalizedEvent, PaymentStatus } from "./payment-types.ts";

export async function verifySignature(req: Request, secret: string): Promise<boolean> {
    const signature = req.headers.get("x-webhook-signature");
    if (!signature) {
        // For 'fake' provider during dev, we might allow no signature if configured? 
        // Or we expect the client to send 'x-webhook-signature' even for fake.
        // Let's allow 'fake' provider to bypass if explicit header says so, or strictly require validation.
        // User says: "Verificar firma del webhook usando PAYMENT_WEBHOOK_SECRET".
        // Let's assume a simple equality check for 'fake' or a robust HMAC for others.
        // For this MVP, we will implement a simple equality check for the fake provider scenario 
        // where the signature IS the secret (conceptually) or a hash of it.
        // Real implementation would depend on provider (Stripe uses Stripe-Signature, MP uses x-signature-id, etc).
        // Given "agnostic", we might need provider-specific validators.
        // For now: check if header 'x-webhook-signature' matches 'PAYMENT_WEBHOOK_SECRET'.
        // This is checking "fake" style.
        return false;
    }
    return signature === secret;
}

export function normalizeEvent(payload: any): NormalizedEvent {
    // Detect provider based on payload structure or assume 'fake' if generic
    // In a real app we might inspect headers or a 'provider' field in payload.
    // For 'fake', we expect the payload to ALREADY be close to NormalizedEvent or easy to map.

    if (payload.object === 'event' && payload.id && payload.type) {
        // Looks like Stripe
        return {
            provider: 'stripe',
            eventId: payload.id,
            providerRef: payload.data?.object?.id || 'unknown',
            status: mapStripeStatus(payload.type),
            amount: payload.data?.object?.amount || 0,
            currency: payload.data?.object?.currency || 'USD',
            metadata: payload.data?.object?.metadata || {},
            raw: payload
        };
    }

    // Fake provider handling
    // Expecting payload to match NormalizedEvent structure directly for simplicity in this MVP
    // or have a specific wrapper.
    if (payload.provider === 'fake') {
        return {
            provider: 'fake',
            eventId: payload.eventId || `evt_${crypto.randomUUID()}`,
            providerRef: payload.providerRef,
            status: payload.status as PaymentStatus,
            amount: payload.amount,
            currency: payload.currency,
            metadata: payload.metadata || {},
            raw: payload
        }
    }

    // Fallback or Error
    throw new Error("Unknown event provider format");
}

function mapStripeStatus(type: string): PaymentStatus {
    switch (type) {
        case 'payment_intent.succeeded': return 'approved';
        case 'payment_intent.payment_failed': return 'rejected';
        default: return 'pending';
    }
}
