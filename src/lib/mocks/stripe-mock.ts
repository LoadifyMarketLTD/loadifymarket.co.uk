/**
 * Mock Stripe Service for Development
 * Used when real Stripe credentials are not available
 */

export const createMockStripeService = () => {
  return {
    createCheckoutSession: async (items: any[], metadata: any) => {
      console.log('[MOCK STRIPE] Creating checkout session', { items, metadata });
      
      // Calculate mock total
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const total = subtotal * 1.20; // Including VAT
      
      return {
        id: `cs_mock_${Date.now()}`,
        url: '/checkout/success?session_id=mock_session_id',
        amount_total: Math.round(total * 100), // in pence
        currency: 'gbp',
        status: 'complete',
      };
    },
    
    createPaymentIntent: async (amount: number, metadata: any) => {
      console.log('[MOCK STRIPE] Creating payment intent', { amount, metadata });
      
      return {
        id: `pi_mock_${Date.now()}`,
        amount,
        currency: 'gbp',
        status: 'succeeded',
        client_secret: 'mock_client_secret',
      };
    },
    
    createRefund: async (paymentIntentId: string, amount?: number) => {
      console.log('[MOCK STRIPE] Creating refund', { paymentIntentId, amount });
      
      return {
        id: `re_mock_${Date.now()}`,
        amount: amount || 0,
        currency: 'gbp',
        status: 'succeeded',
        payment_intent: paymentIntentId,
      };
    },
    
    retrieveSession: async (sessionId: string) => {
      console.log('[MOCK STRIPE] Retrieving session', sessionId);
      
      return {
        id: sessionId,
        payment_status: 'paid',
        customer_email: 'test@loadifymarket.co.uk',
        amount_total: 120000, // £1200
        currency: 'gbp',
        metadata: {
          orderId: 'mock-order-id',
        },
      };
    },
    
    constructWebhookEvent: (_payload: any, _signature: string) => {
      console.log('[MOCK STRIPE] Constructing webhook event');
      
      return {
        id: `evt_mock_${Date.now()}`,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_mock_session',
            payment_status: 'paid',
            customer_email: 'test@loadifymarket.co.uk',
            amount_total: 120000,
            currency: 'gbp',
            metadata: {},
          },
        },
      };
    },
  };
};

// Mock Stripe Connect functions for seller payouts
export const createMockStripeConnect = () => {
  return {
    createAccount: async (email: string, country: string = 'GB') => {
      console.log('[MOCK STRIPE CONNECT] Creating account', { email, country });
      
      return {
        id: `acct_mock_${Date.now()}`,
        type: 'express',
        email,
        country,
        charges_enabled: true,
        payouts_enabled: true,
      };
    },
    
    createAccountLink: async (accountId: string, _returnUrl: string, _refreshUrl: string) => {
      console.log('[MOCK STRIPE CONNECT] Creating account link', { accountId });
      
      return {
        url: `/seller/onboarding/success?account=${accountId}`,
        expires_at: Date.now() + 3600000, // 1 hour
      };
    },
    
    createTransfer: async (amount: number, destination: string, metadata: any) => {
      console.log('[MOCK STRIPE CONNECT] Creating transfer', { amount, destination, metadata });
      
      return {
        id: `tr_mock_${Date.now()}`,
        amount,
        currency: 'gbp',
        destination,
        metadata,
      };
    },
    
    retrieveBalance: async (accountId: string) => {
      console.log('[MOCK STRIPE CONNECT] Retrieving balance', accountId);
      
      return {
        available: [{ amount: 50000, currency: 'gbp' }], // £500
        pending: [{ amount: 10000, currency: 'gbp' }], // £100
      };
    },
  };
};
