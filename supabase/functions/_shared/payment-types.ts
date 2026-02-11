export type PaymentProvider = 'stripe' | 'mercadopago' | 'fake';

export type PaymentStatus = 'approved' | 'rejected' | 'pending';

export interface NormalizedEvent {
    provider: PaymentProvider;
    eventId: string;
    providerRef: string; // The ID of the payment at the provider (e.g., pi_123 or collection_id)
    status: PaymentStatus;
    amount: number;
    currency: string;
    metadata: {
        customerId?: string;
        planId?: string;
        paymentId?: string; // Internal payment ID if available
        [key: string]: any;
    };
    raw?: any; // Optional: keep the raw event for debugging
}
