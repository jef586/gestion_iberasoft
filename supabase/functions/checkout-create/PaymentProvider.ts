
export interface CreateCheckoutParams {
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, any>;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  providerRef: string;
}

export interface PaymentProvider {
  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;
}

export class FakeProvider implements PaymentProvider {
  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    console.log("FakeProvider.createCheckout", params);
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Generate a random provider reference
    const ref = `fake_${crypto.randomUUID()}`;
    
    // Construct a dummy URL. 
    // In a real scenario, this would be a Stripe Checkout session URL or similar.
    const checkoutUrl = `https://fake-payment-provider.com/checkout/${ref}?amount=${params.amount}&currency=${params.currency}`;
    
    return {
      checkoutUrl,
      providerRef: ref,
    };
  }
}
