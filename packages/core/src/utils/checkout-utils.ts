// ==========================================
// UTILITÁRIOS DE CHECKOUT
// ==========================================

import type { CustomerData } from '../types';

// ==========================================
// FORMATAÇÃO DE PREÇOS
// ==========================================

export function formatPrice(priceInCents: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
}

export function calculateCashPrice(
  originalPrice: number,
  discount: number | null
): number {
  if (!discount) return originalPrice;
  return Math.round(originalPrice * (1 - discount / 100));
}

export function calculateInstallmentPrice(
  originalPrice: number,
  installments: number
): number {
  return Math.round(originalPrice / installments);
}

export function formatCurrency(
  amountInCents: number,
  currency: string = 'BRL'
): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

// ==========================================
// FORMATAÇÃO DE DADOS DE PRODUTOS
// ==========================================

export function formatProductPrice(
  originalPrice: number,
  cashDiscount: number | null,
  maxInstallments: number,
  currency: string = 'BRL'
): {
  formattedPrice: string;
  formattedCashTag: string;
  formattedInstallmentsTag: string;
} {
  const finalPrice = calculateCashPrice(originalPrice, cashDiscount);
  const formattedPrice = formatCurrency(finalPrice, currency);

  // Formatação do desconto à vista
  let formattedCashTag = '';
  if (cashDiscount && cashDiscount > 0) {
    formattedCashTag = 'à vista';
  }

  // Formatação do parcelamento
  let formattedInstallmentsTag = '';
  if (maxInstallments && maxInstallments > 1) {
    const installmentValue = finalPrice / maxInstallments;
    const formattedInstallmentValue = formatCurrency(installmentValue, currency);
    formattedInstallmentsTag = `${maxInstallments}x de ${formattedInstallmentValue}`;

    // Adicionar "sem juros" se não há desconto à vista ou desconto é pequeno
    if (!cashDiscount || cashDiscount <= 5) {
      formattedInstallmentsTag += ' sem juros';
    }
  }

  return {
    formattedPrice,
    formattedCashTag,
    formattedInstallmentsTag,
  };
}

// ==========================================
// VALIDAÇÃO DE DADOS
// ==========================================

export function validateCustomerData(data: Partial<CustomerData>): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Nome é obrigatório');
  }

  if (!data.email?.trim()) {
    errors.push('Email é obrigatório');
  } else if (!isValidEmail(data.email)) {
    errors.push('Email inválido');
  }

  return errors;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

// ==========================================
// MÁSCARAS DE FORMATAÇÃO
// ==========================================

export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

export function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

export function maskCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

export function maskPhone(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

// ==========================================
// REDIRECIONAMENTO
// ==========================================

export function handleSuccessRedirect(
  redirectUrl?: string,
  defaultUrl: string = '/obrigado',
  autoRedirect: boolean = false
): void {
  if (autoRedirect) {
    const url = redirectUrl || defaultUrl;
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }
}

// ==========================================
// DELAY/TIMEOUT
// ==========================================

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==========================================
// UTILITÁRIOS DE PAGAMENTO
// ==========================================

export function getPaymentMethodLabel(paymentMethod: string): string {
  const labels: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    pix: 'PIX',
    boleto: 'Boleto Bancário',
    pagarme: 'Cartão/PIX/Boleto',
    asaas_boleto_parcelado: 'Boleto Parcelado',
  };

  return labels[paymentMethod] || paymentMethod;
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

