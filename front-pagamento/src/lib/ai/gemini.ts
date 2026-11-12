/**
 * Cliente para Google Gemini API (generateContent)
 * Usado para geração de produtos via gemini-3-flash-preview
 */
import { getLogger } from '@/lib/logger'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const MODEL = 'gemini-3-flash-preview'

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GeminiChatOptions {
  messages: GeminiMessage[]
  /** Quando type é json_object, pode enviar responseJsonSchema para structured output (Gemini 3) */
  responseFormat?: { type: 'json_object'; responseJsonSchema?: Record<string, unknown> }
  temperature?: number
  maxTokens?: number
}

export interface GeminiChatResult {
  text: string
  /** Ex.: STOP, MAX_TOKENS — útil para diagnosticar JSON cortado */
  finishReason?: string
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
    finishReason?: string
  }>
}

/**
 * Chama a API Gemini para gerar conteúdo (system + user) com saída JSON
 */
export async function geminiChat(
  apiKey: string,
  options: GeminiChatOptions
): Promise<GeminiChatResult> {
  const systemMessage = options.messages.find((m) => m.role === 'system')
  const userMessage = options.messages.find((m) => m.role === 'user')
  if (!userMessage?.content) {
    throw new Error('É necessário pelo menos uma mensagem de usuário')
  }

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.2,
    maxOutputTokens: options.maxTokens ?? 4096,
  }
  if (options.responseFormat?.type === 'json_object') {
    generationConfig.responseMimeType = 'application/json'
    if (options.responseFormat.responseJsonSchema) {
      generationConfig.responseJsonSchema = options.responseFormat.responseJsonSchema
    }
  }

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: userMessage.content }] }],
    generationConfig,
  }

  if (systemMessage?.content) {
    body.systemInstruction = { parts: [{ text: systemMessage.content }] }
  }

  const url = `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${text}`)
  }

  const data = (await response.json()) as GeminiGenerateContentResponse
  const candidate = data.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text

  if (!text) {
    const logger = getLogger()
    logger.error('Gemini respondeu sem texto', undefined, {
      hasCandidates: !!data.candidates?.length,
      finishReason: candidate?.finishReason,
      safetyRatings: (candidate as { safetyRatings?: unknown })?.safetyRatings,
      rawResponse: JSON.stringify(data).slice(0, 500),
    })
    throw new Error('Gemini retornou resposta vazia')
  }

  return { text, finishReason: candidate?.finishReason }
}
