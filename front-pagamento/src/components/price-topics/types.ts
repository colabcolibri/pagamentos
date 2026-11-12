/**
 * Seção de tópicos/características do preço (exibida na página de pagamento).
 * Mesma ideia das seções da política: título + lista de itens.
 */
export interface PriceTopicSection {
  title: string
  content: string[]
}

export type PriceTopicsContent = PriceTopicSection[]
