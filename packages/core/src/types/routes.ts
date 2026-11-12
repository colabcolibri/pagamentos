/**
 * Tipos para handlers de routes
 */

import { NextRequest, NextResponse } from 'next/server';

export type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

export interface WebhookHandlerOptions {
  /** Cliente SQL do schema payments. `supabase` continua aceito. */
  payments?: any;
  supabase?: any;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  onSuccess?: (payment: any) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

export interface PagarmeWebhookOptions extends WebhookHandlerOptions {
  validateAuth: (username: string, password: string) => boolean | Promise<boolean>;
  onOrderCreated?: (result: any) => Promise<void>;
}

export interface AsaasWebhookOptions extends WebhookHandlerOptions {
  validateToken: (token: string) => boolean | Promise<boolean>;
}

export interface CheckoutHandlerOptions {
  payments?: any;
  supabase?: any;
  getUserFromRequest: (req: NextRequest) => Promise<{userId: string, email: string} | null>;
}

export interface PagarmeCheckoutOptions extends CheckoutHandlerOptions {
  pagarmeSecretKey: string;
  environment?: 'production' | 'sandbox';
}

export interface AsaasCheckoutOptions extends CheckoutHandlerOptions {
  asaasApiKey: string;
  environment?: 'production' | 'sandbox';
}

export interface OrchestratorOptions {
  payments?: any;
  supabase?: any;
  onActivateSubscription?: (subscription: any, product: any) => Promise<void>;
}

