/**
 * Helpers reutilizáveis para checkout
 */

import { v4 as uuidv4 } from 'uuid';

import { getLogger } from '../logger';
import { loadCheckoutPrice, type SqlClient } from '../payments/checkout/checkout-store';

const checkoutLogger = getLogger();

/**
 * Busca preço e produto (por REF ou ID)
 */
export async function getPriceWithProduct(
  db: SqlClient,
  priceId: string
): Promise<{
  price: any;
  product: any;
  error?: { message: string; details?: any };
}> {
  checkoutLogger.debug('Buscando preço para checkout', { module: 'checkout', priceId });
  const loaded = await loadCheckoutPrice(db, priceId);
  if (loaded.error || !loaded.price || !loaded.product) {
    checkoutLogger.error('Preço não encontrado', loaded.error, { module: 'checkout', priceId });
  }
  return loaded;
}

/**
 * Checkout Asaas (API v3): reuso só se o pedido não estiver soft-deleted e a sessão ainda não tiver expirado
 * (`orders.expires_at`, alinhado a `minutesToExpire` na criação). Sem objeto `order` na resposta do join,
 * mantém o comportamento permissivo anterior.
 */
export function isAsaasPendingCheckoutReusable(
  order: { deleted_at?: string | null; expires_at?: string | null } | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!order) return true;
  if (order.deleted_at) return false;
  if (order.expires_at == null || order.expires_at === '') return true;
  return new Date(order.expires_at).getTime() > nowMs;
}

/**
 * Verifica se já existe pagamento pendente
 * IMPORTANTE: Considera apenas pedidos que NÃO foram soft deleted
 */
export async function checkExistingPayment(
  supabase: any,
  userId: string,
  productId: string,
  gateway: 'pagarme' | 'asaas'
): Promise<{
  existingPayment: any;
  shouldReuse: boolean;
}> {
  const tableName = gateway === 'pagarme' ? 'pagarme_payments' : 'asaas_payments';
  const urlField = gateway === 'pagarme' ? 'payment_link_url' : 'invoice_url';

  // Buscar pagamento pendente
  // Se tiver order_id, verificar se o order não foi soft deleted
  // Se não tiver order_id, considerar válido (pagamento antigo sem order)
  const { data: existingPayment } = await supabase
    .schema('payments')
    .from(tableName)
    .select(`
      id, 
      ${urlField}, 
      expires_at, 
      status,
      order_id,
      orders (
        id,
        deleted_at
      )
    `)
    .eq('user_id', userId)
    .eq('product_id', productId)
    .in('status', ['pending', 'incomplete'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Filtrar manualmente: se tem order_id, o order não pode estar deletado
  if (existingPayment) {
    const order = Array.isArray(existingPayment.orders) 
      ? existingPayment.orders[0] 
      : existingPayment.orders;
    
    // Se tem order_id mas o order foi deletado, não reutilizar
    if (existingPayment.order_id && order?.deleted_at) {
      checkoutLogger.debug('Pagamento pendente ignorado: order soft-deleted', { module: 'checkout' });
      return { existingPayment: null, shouldReuse: false };
    }
  }

  if (existingPayment) {
    // Verificar se não está expirado
    if (
      existingPayment.expires_at &&
      new Date(existingPayment.expires_at) < new Date()
    ) {
      checkoutLogger.debug('Pagamento pendente expirado; criando novo', { module: 'checkout' });
      return { existingPayment: null, shouldReuse: false };
    }

    checkoutLogger.debug('Reutilizando pagamento pendente existente', { module: 'checkout' });
    return { existingPayment, shouldReuse: true };
  }

  return { existingPayment: null, shouldReuse: false };
}

/**
 * Cria subscription pendente
 */
export async function createPendingSubscription(
  supabase: any,
  userId: string,
  priceId: string,
  productId: string,
  productRef: string
): Promise<{ subscriptionId: string; error?: any }> {
  const subscriptionId = uuidv4();

  const { error } = await supabase
    .schema('payments')
    .from('subscriptions')
    .insert({
      id: subscriptionId,
      user_id: userId,
      price_id: priceId,
      status: 'incomplete',
      metadata: {
        product_id: productId,
        product_ref: productRef,
      },
    });

  if (error) {
    checkoutLogger.error('Erro ao criar subscription', error, { module: 'checkout' });
    return { subscriptionId: '', error };
  }

  return { subscriptionId };
}

