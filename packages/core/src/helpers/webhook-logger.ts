/**
 * Sistema de logs de webhooks
 * Inspirado no @app-client
 *
 * Registra todos os webhooks recebidos para auditoria e debugging
 */

import { getLogger } from '../logger';

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'asaas-access-token',
  'x-api-key',
  'api-key',
  'cookie',
]);

/**
 * Remove headers sensíveis antes de persistir em webhook_events.
 * Exportado para testes unitários.
 */
export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (!SENSITIVE_HEADER_KEYS.has(lower) && !lower.startsWith('x-auth-')) {
      out[key] = value;
    }
  }
  return out;
}

export interface LogWebhookParams {
  provider: string;
  payload: Record<string, any>;
  headers: Record<string, any>;
  eventType?: string;
  /** Identificador único do evento no provedor (para idempotência). Ex.: asaas:pay_xxx:PAYMENT_RECEIVED */
  providerEventId?: string | null;
}

/** Janela em que outro delivery simultâneo é tratado como duplicata (evita efeitos colaterais duplicados). */
const WEBHOOK_CONCURRENT_WINDOW_MS = 120_000;

export type ClaimWebhookEventResult =
  | { action: 'process'; eventId: string | null }
  | { action: 'respond'; message: string };

/**
 * Insere ou reutiliza linha em webhook_events por (provider, provider_event_id).
 * - Sucesso no insert: processar com o novo id.
 * - Já existe com processing_status success: não reprocessar (idempotência real).
 * - Já existe com error: reprocessar e atualizar o mesmo registro no finally.
 * - Já existe com received e recente: outro request em voo — responder sem reprocessar.
 * - received antigo: reprocessar (ex.: crash antes do finally).
 */
type WebhookQueryClient = {
  schema: (schema: string) => WebhookQueryClient;
  from: (table: string) => any;
};

export async function claimWebhookEventOnClient(
  db: WebhookQueryClient,
  params: LogWebhookParams & { providerEventId: string }
): Promise<ClaimWebhookEventResult> {
  const { provider, payload, headers, eventType, providerEventId } = params;
  const safeHeaders = sanitizeHeaders(headers);

  const supabaseAdmin = db;

  const insertPayload: Record<string, unknown> = {
    provider,
    payload,
    headers: safeHeaders,
    event_type: eventType || payload.event || payload.type || 'unknown',
    provider_event_id: providerEventId,
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .schema('payments')
    .from('webhook_events')
    .insert(insertPayload)
    .select('id')
    .single();

  if (!insertError && inserted?.id) {
    getLogger().info('Webhook registrado (claim)', {
      module: 'webhook-logger',
      action: 'claimWebhookEventForProcessing',
      provider,
      webhookEventId: inserted.id,
    });
    return { action: 'process', eventId: inserted.id };
  }

  if (insertError && insertError.code !== '23505') {
    getLogger().error('Falha ao registrar webhook no banco', insertError, {
      module: 'webhook-logger',
      action: 'claimWebhookEventForProcessing',
      provider,
      providerEventId,
    });
    return { action: 'process', eventId: null };
  }

  const { data: row, error: selectError } = await supabaseAdmin
    .schema('payments')
    .from('webhook_events')
    .select('id, processing_status, created_at')
    .eq('provider', provider)
    .eq('provider_event_id', providerEventId)
    .maybeSingle();

  if (selectError || !row) {
    getLogger().warn('Conflito de idempotência sem linha legível; segue processamento', {
      module: 'webhook-logger',
      action: 'claimWebhookEventForProcessing',
      provider,
      providerEventId,
    });
    return { action: 'process', eventId: null };
  }

  if (row.processing_status === 'success') {
    return { action: 'respond', message: 'Evento já processado.' };
  }

  if (row.processing_status === 'error') {
    return { action: 'process', eventId: row.id };
  }

  const age = Date.now() - new Date(row.created_at as string).getTime();
  if (age >= 0 && age < WEBHOOK_CONCURRENT_WINDOW_MS) {
    return { action: 'respond', message: 'Evento em processamento.' };
  }

  return { action: 'process', eventId: row.id };
}

export async function claimWebhookEventForProcessing(
  _supabaseUrl: string,
  _supabaseServiceRoleKey: string,
  _params: LogWebhookParams & { providerEventId: string }
): Promise<ClaimWebhookEventResult> {
  throw new Error('O cliente do Supabase saiu do caminho de produção. Use claimWebhookEventOnClient.')
}

/**
 * Registra um evento de webhook recebido na tabela webhook_events.
 * Headers sensíveis (authorization, asaas-access-token, etc.) não são persistidos.
 * @returns O ID do evento registrado ou null em caso de falha.
 */
export async function logWebhookOnClient(
  db: WebhookQueryClient,
  params: LogWebhookParams
): Promise<string | null> {
  const { provider, payload, headers, eventType, providerEventId } = params;
  const safeHeaders = sanitizeHeaders(headers);

  try {
    const supabaseAdmin = db;

    const insertPayload: Record<string, unknown> = {
      provider,
      payload,
      headers: safeHeaders,
      event_type: eventType || payload.event || payload.type || 'unknown',
    };
    if (providerEventId != null) {
      insertPayload.provider_event_id = providerEventId;
    }

    const { data, error } = await supabaseAdmin
      .schema('payments')
      .from('webhook_events')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      getLogger().error('Falha ao registrar webhook no banco', error, {
        module: 'webhook-logger',
        action: 'logWebhook',
        provider,
        providerEventId: providerEventId ?? undefined,
      });
      return null;
    }

    getLogger().info('Webhook registrado', {
      module: 'webhook-logger',
      action: 'logWebhook',
      provider,
      webhookEventId: data.id,
    });
    return data.id;
  } catch (error) {
    getLogger().error('Erro inesperado ao registrar webhook', error, {
      module: 'webhook-logger',
      action: 'logWebhook',
      provider,
    });
    return null;
  }
}

export async function logWebhook(
  _supabaseUrl: string,
  _supabaseServiceRoleKey: string,
  _params: LogWebhookParams
): Promise<string | null> {
  throw new Error('O cliente do Supabase saiu do caminho de produção. Use logWebhookOnClient.')
}

interface UpdateWebhookLogParams {
  eventId: string;
  status: 'success' | 'error';
  log?: string;
}

/**
 * Atualiza o status de um evento de webhook já registrado.
 */
export async function updateWebhookLogOnClient(
  db: WebhookQueryClient,
  params: UpdateWebhookLogParams
): Promise<void> {
  const { eventId, status, log } = params;

  try {
    const supabaseAdmin = db;

    const { error } = await supabaseAdmin
      .schema('payments')
      .from('webhook_events')
      .update({
        processing_status: status,
        processing_log: log,
      })
      .eq('id', eventId);

    if (error) {
      getLogger().error(`Falha ao atualizar status do webhook ${eventId}`, error, {
        module: 'webhook-logger',
        action: 'updateWebhookLog',
        eventId,
      });
    } else {
      getLogger().info('Webhook atualizado', {
        module: 'webhook-logger',
        action: 'updateWebhookLog',
        eventId,
        status,
      });
    }
  } catch (error) {
    getLogger().error('Erro inesperado ao atualizar log do webhook', error, {
      module: 'webhook-logger',
      action: 'updateWebhookLog',
      eventId,
    });
  }
}

export async function updateWebhookLog(
  _supabaseUrl: string,
  _supabaseServiceRoleKey: string,
  _params: UpdateWebhookLogParams
): Promise<void> {
  throw new Error('O cliente do Supabase saiu do caminho de produção. Use updateWebhookLogOnClient.')
}

