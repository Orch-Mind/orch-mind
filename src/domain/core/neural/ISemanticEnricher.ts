// ISemanticEnricher.ts
// Symbolic: Contract for semantic enrichment cortex

export interface ISemanticEnricher {
  enrichSemanticQueryForSignal(
    core: string,
    query: string,
    intensity: number,
    context?: string,
    language?: string
  ): Promise<{ enrichedQuery: string; keywords: string[] }>;
}
