import "server-only";

export const PRICE_NIS = 490;

export interface CheckoutResult {
  status: "succeeded" | "failed";
  providerRef: string;
}

/**
 * Payment provider abstraction. The MVP ships a mock that always succeeds so the
 * paid flow can be tested end to end. Plug a real provider (Stripe, or an Israeli
 * gateway such as Tranzila/Cardcom) in here — card data must only ever be handled
 * by the provider's hosted page, never by this app.
 */
export interface PaymentProvider {
  name: string;
  charge(input: { userId: string; diagnosisId: string; amountNis: number }): Promise<CheckoutResult>;
}

export const mockProvider: PaymentProvider = {
  name: "mock",
  async charge({ diagnosisId }) {
    return { status: "succeeded", providerRef: `mock_${diagnosisId}_${Date.now()}` };
  },
};

export function paymentProvider(): PaymentProvider {
  return mockProvider;
}
