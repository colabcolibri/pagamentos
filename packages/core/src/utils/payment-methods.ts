/**
 * Payment Methods Utilities
 * 
 * Funções auxiliares para trabalhar com métodos de pagamento permitidos por produto.
 */

import type { PaymentMethod, Product } from '../types';

// ==========================================
// CONSTANTES
// ==========================================

export const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'credit_card',
  'pix',
  'boleto',
  'asaas_boleto_parcelado',
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  'credit_card',
  'pix',
  'boleto',
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Verifica se um método de pagamento é permitido para um produto
 * 
 * @param product - Produto a verificar
 * @param method - Método de pagamento a checar
 * @returns true se o método é permitido
 * 
 * @example
 * ```typescript
 * const product = { payment_methods: ['credit_card', 'pix'] };
 * isPaymentMethodAllowed(product, 'pix'); // true
 * isPaymentMethodAllowed(product, 'asaas_boleto_parcelado'); // false
 * ```
 */
export function isPaymentMethodAllowed(
  product: Product | { payment_methods?: unknown },
  method: PaymentMethod
): boolean {
  // Se não tem payment_methods definido, permite tudo
  if (!product.payment_methods) return true;
  
  // Validar que é um array
  if (!Array.isArray(product.payment_methods)) return true;
  
  // Verificar se o método está na lista
  return product.payment_methods.includes(method);
}

/**
 * Retorna os métodos de pagamento desabilitados para um produto
 * 
 * @param product - Produto a verificar
 * @returns Array com métodos desabilitados
 * 
 * @example
 * ```typescript
 * const product = { payment_methods: ['credit_card', 'pix'] };
 * getDisabledMethods(product); // ['boleto', 'asaas_boleto_parcelado']
 * ```
 */
export function getDisabledMethods(
  product: Product | { payment_methods?: unknown }
): PaymentMethod[] {
  // Se não tem payment_methods ou não é array, nada está desabilitado
  if (!product.payment_methods || !Array.isArray(product.payment_methods)) {
    return [];
  }
  
  // Retornar métodos que NÃO estão na lista
  return ALL_PAYMENT_METHODS.filter(
    m => !(product.payment_methods as PaymentMethod[]).includes(m)
  );
}

/**
 * Retorna os métodos de pagamento permitidos para um produto
 * 
 * @param product - Produto a verificar
 * @returns Array com métodos permitidos (default: todos)
 * 
 * @example
 * ```typescript
 * const product = { payment_methods: ['credit_card', 'pix'] };
 * getAllowedMethods(product); // ['credit_card', 'pix']
 * 
 * const productWithoutConfig = {};
 * getAllowedMethods(productWithoutConfig); // ['credit_card', 'pix', 'boleto', 'asaas_boleto_parcelado']
 * ```
 */
export function getAllowedMethods(
  product: Product | { payment_methods?: unknown }
): PaymentMethod[] {
  // Se não tem payment_methods ou não é array, permite tudo
  if (!product.payment_methods || !Array.isArray(product.payment_methods)) {
    return [...ALL_PAYMENT_METHODS];
  }
  
  // Retornar apenas métodos válidos
  return (product.payment_methods as PaymentMethod[]).filter(
    m => ALL_PAYMENT_METHODS.includes(m)
  );
}

/**
 * Determina o gateway correto para um método de pagamento.
 * Asaas é o gateway primário para todos os métodos.
 *
 * @param method - Método de pagamento
 * @returns Gateway correspondente ('asaas' ou 'pagarme')
 *
 * @example
 * ```typescript
 * getGatewayForMethod('credit_card'); // 'asaas'
 * getGatewayForMethod('pix'); // 'asaas'
 * getGatewayForMethod('asaas_boleto_parcelado'); // 'asaas'
 * ```
 */
export function getGatewayForMethod(_method: PaymentMethod): 'pagarme' | 'asaas' {
  return 'asaas';
}

/**
 * Valida se um produto tem ao menos um método de pagamento configurado
 * 
 * @param product - Produto a verificar
 * @returns true se tem métodos válidos
 */
export function hasValidPaymentMethods(
  product: Product | { payment_methods?: unknown }
): boolean {
  if (!product.payment_methods) return true; // Se não definido, considera válido
  if (!Array.isArray(product.payment_methods)) return false;
  
  return (product.payment_methods as PaymentMethod[]).some(
    m => ALL_PAYMENT_METHODS.includes(m)
  );
}

