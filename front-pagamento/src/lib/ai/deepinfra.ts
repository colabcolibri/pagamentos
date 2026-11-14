/**
 * Cliente para API DeepInfra (OpenAI-compatible)
 * Usado para geração de produtos via GPT-OSS-120B
 */

const DEEPINFRA_BASE = 'https://api.deepinfra.com/v1/openai/chat/completions'
const MODEL = 'openai/gpt-oss-120b'

export interface DeepInfraMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DeepInfraChatOptions {
  messages: DeepInfraMessage[]
  responseFormat?: { type: 'json_object' }
  temperature?: number
  maxTokens?: number
}

export interface DeepInfraChatResponse {
  id: string
  choices: Array<{
    index: number
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Chama a API DeepInfra para completar chat com JSON estruturado
 */
export async function deepInfraChat(
  apiKey: string,
  options: DeepInfraChatOptions
): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4096,
  }

  if (options.responseFormat) {
    body.response_format = options.responseFormat
  }

  const response = await fetch(DEEPINFRA_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`DeepInfra API error ${response.status}: ${text}`)
  }

  const data = (await response.json()) as DeepInfraChatResponse
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('DeepInfra retornou resposta vazia')
  }
  return content
}
