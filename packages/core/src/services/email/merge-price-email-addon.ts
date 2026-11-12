import type { PriceEmailAddon, ProductEmailConfig } from './types';

function appendTextBlock(base: string, extra: string | undefined): string {
  const e = (extra ?? '').trim();
  if (!e) return base;
  const b = base.trimEnd();
  return b ? `${b}\n\n${e}` : e;
}

function mergeOptionalText(
  productPart: string | undefined,
  pricePart: string | undefined
): string | undefined {
  const p = (productPart ?? '').trim();
  const x = (pricePart ?? '').trim();
  if (p && x) return `${p}\n\n${x}`;
  if (x) return x;
  if (p) return p;
  return undefined;
}

/**
 * Junta mensagem principal do pedido criado (produto + complemento do preço).
 */
export function mergeOrderCreatedCustomMessage(
  productDefault: string,
  productMessage: string | undefined,
  addon: PriceEmailAddon | null | undefined
): string {
  const base = (productMessage ?? '').trim() || productDefault;
  return appendTextBlock(base, addon?.order_created?.custom_message);
}

/**
 * Junta instruções do pedido criado (produto + preço).
 */
export function mergeOrderCreatedInstructions(
  productInstructions: string | undefined,
  addon: PriceEmailAddon | null | undefined
): string | undefined {
  return mergeOptionalText(productInstructions, addon?.order_created?.instructions);
}

/**
 * Junta mensagem de pagamento confirmado (produto + preço).
 */
export function mergePaymentConfirmedCustomMessage(
  productDefault: string,
  productMessage: string | undefined,
  addon: PriceEmailAddon | null | undefined
): string {
  const base = (productMessage ?? '').trim() || productDefault;
  return appendTextBlock(base, addon?.payment_confirmed?.custom_message);
}

/**
 * Junta próximos passos e define se a seção deve aparecer.
 */
export function mergePaymentConfirmedNextSteps(
  config: NonNullable<ProductEmailConfig['payment_confirmed']>,
  addon: PriceEmailAddon | null | undefined
): { nextSteps: string[]; includeNextSteps: boolean } {
  const productSteps = [...(config.next_steps ?? [])];
  const priceSteps = [...(addon?.payment_confirmed?.next_steps ?? [])];
  const merged = [...productSteps, ...priceSteps];
  const include =
    merged.length > 0 &&
    (config.include_next_steps === true || priceSteps.length > 0);
  return { nextSteps: merged, includeNextSteps: include };
}
