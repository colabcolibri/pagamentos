import { describe, expect, it } from 'vitest';

import {
  mergeOrderCreatedCustomMessage,
  mergePaymentConfirmedCustomMessage,
  mergePaymentConfirmedNextSteps,
} from './merge-price-email-addon';
import type { ProductEmailConfig } from './types';

describe('mergePriceEmailAddon', () => {
  it('concatena custom_message do pedido criado', () => {
    expect(
      mergeOrderCreatedCustomMessage('default', 'Olá do produto', {
        order_created: { custom_message: 'Extra do preço' },
      })
    ).toBe('Olá do produto\n\nExtra do preço');
  });

  it('concatena custom_message de pagamento confirmado', () => {
    expect(
      mergePaymentConfirmedCustomMessage('default', 'Obrigado!', {
        payment_confirmed: { custom_message: 'Link: https://exemplo.com/plano-x' },
      })
    ).toBe('Obrigado!\n\nLink: https://exemplo.com/plano-x');
  });

  it('inclui próximos passos só do preço quando o produto desliga a lista', () => {
    const config = {
      from_name: 'x',
      from_email: 'a@b.c',
      subject: 's',
      custom_message: 'm',
      include_next_steps: false,
      next_steps: [],
    } as NonNullable<ProductEmailConfig['payment_confirmed']>;

    const { nextSteps, includeNextSteps } = mergePaymentConfirmedNextSteps(config, {
      payment_confirmed: { next_steps: ['Acesse o grupo VIP'] },
    });

    expect(nextSteps).toEqual(['Acesse o grupo VIP']);
    expect(includeNextSteps).toBe(true);
  });

  it('concatena next_steps do produto e do preço', () => {
    const config = {
      from_name: 'x',
      from_email: 'a@b.c',
      subject: 's',
      custom_message: 'm',
      include_next_steps: true,
      next_steps: ['Passo A'],
    } as NonNullable<ProductEmailConfig['payment_confirmed']>;

    const { nextSteps, includeNextSteps } = mergePaymentConfirmedNextSteps(config, {
      payment_confirmed: { next_steps: ['Passo B'] },
    });

    expect(nextSteps).toEqual(['Passo A', 'Passo B']);
    expect(includeNextSteps).toBe(true);
  });
});
