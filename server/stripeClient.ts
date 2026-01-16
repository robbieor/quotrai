import Stripe from 'stripe';

// Stripe configuration for local development
// Uses environment variables instead of Replit connector API

let stripeClient: Stripe | null = null;

function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY || null;
}

export function getStripePublishableKey(): string | null {
  return process.env.STRIPE_PUBLISHABLE_KEY || null;
}

export async function getUncachableStripeClient(): Promise<Stripe | null> {
  const secretKey = getStripeSecretKey();

  if (!secretKey) {
    console.warn("Stripe not configured - STRIPE_SECRET_KEY not set");
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export async function getStripeSecretKeyAsync(): Promise<string | null> {
  return getStripeSecretKey();
}

// Stub for stripe-replit-sync replacement
export async function getStripeSync(): Promise<any> {
  console.warn("Stripe sync not available in local development mode");
  return {
    processWebhook: async () => { console.warn("Stripe webhooks disabled locally"); },
    syncBackfill: async () => { console.warn("Stripe sync disabled locally"); },
    findOrCreateManagedWebhook: async () => null,
  };
}

export function isStripeConfigured(): boolean {
  return !!getStripeSecretKey();
}
