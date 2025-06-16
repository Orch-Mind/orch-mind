// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/**
 * Single Responsibility Principle (SRP) - Classe focada apenas em cálculo de thresholds
 * KISS (Keep It Simple, Stupid) - Lógica simples para determinar thresholds
 * Enhanced with NEUROBIOLOGICAL INTELLIGENCE - Mimics brain behavior
 */

import {
  IVectorLogger,
  ThresholdType,
  VECTOR_CONSTANTS,
  vectorLogger,
} from "../utils/VectorConstants";

export interface ThresholdContext {
  keywords?: string[];
  filters?: Record<string, unknown>;
  topK?: number;
  requestedThreshold?: number;
}

// 🧠 NEURAL CONCEPT TYPES - Como o cérebro categoriza informações
type ConceptType =
  | "EMOTIONAL" // Conceitos emocionais (valence, mood, feelings)
  | "COGNITIVE" // Conceitos cognitivos (memory, attention, perception)
  | "ABSTRACT" // Conceitos abstratos (consciousness, meaning, essence)
  | "CONCRETE" // Conceitos concretos (objects, specific entities)
  | "ASSOCIATIVE" // Conceitos associativos (relationships, connections)
  | "UNKNOWN"; // Conceitos não categorizados

// 🧠 COGNITIVE CONTEXT - Estado mental da busca
type CognitiveContext =
  | "FOCUSED_ATTENTION" // Atenção focada (filtros específicos)
  | "DIVERGENT_THINKING" // Pensamento divergente (exploração criativa)
  | "EPISODIC_RECALL" // Lembrança episódica (eventos específicos)
  | "SEMANTIC_SEARCH" // Busca semântica (conceitos gerais)
  | "ASSOCIATIVE_FLOW" // Fluxo associativo (conexões livres)
  | "ANALYTICAL_MODE"; // Modo analítico (precisão alta)

export class DynamicThresholdCalculator {
  private logger: IVectorLogger;

  // 🧠 NEURAL KEYWORDS - Palavras que ativam diferentes tipos de processamento cerebral
  private readonly EMOTIONAL_KEYWORDS = [
    "mood",
    "emotion",
    "feeling",
    "valence",
    "arousal",
    "affect",
    "emotional",
    "happy",
    "sad",
    "angry",
    "fear",
    "joy",
    "anxiety",
    "stress",
    "calm",
    "emocional",
    "sentimento",
    "humor",
    "estado",
    "sensibilidade",
  ];

  private readonly COGNITIVE_KEYWORDS = [
    "memory",
    "attention",
    "perception",
    "cognition",
    "thinking",
    "mind",
    "neural",
    "brain",
    "consciousness",
    "awareness",
    "focus",
    "concentration",
    "memória",
    "atenção",
    "percepção",
    "cognição",
    "pensamento",
    "mental",
  ];

  private readonly ABSTRACT_KEYWORDS = [
    "essence",
    "meaning",
    "purpose",
    "philosophy",
    "consciousness",
    "soul",
    "spirit",
    "transcendence",
    "metaphysical",
    "existential",
    "being",
    "essência",
    "significado",
    "propósito",
    "filosofia",
    "consciência",
  ];

  private readonly ASSOCIATIVE_KEYWORDS = [
    "connection",
    "relationship",
    "link",
    "association",
    "network",
    "pattern",
    "similarity",
    "analogy",
    "metaphor",
    "correlation",
    "interaction",
    "conexão",
    "relação",
    "ligação",
    "associação",
    "rede",
    "padrão",
  ];

  constructor(logger?: IVectorLogger) {
    this.logger = logger || vectorLogger;
  }

  calculateOptimalThreshold(context: ThresholdContext = {}): number {
    // Se explicitamente solicitado, respeitar
    if (
      context.requestedThreshold !== undefined &&
      context.requestedThreshold >= 0
    ) {
      return context.requestedThreshold;
    }

    // 🧠 NEURAL ANALYSIS - Analisar o input como um cérebro
    const cognitiveContext = this.analyzeCognitiveContext(context);
    const conceptType = this.analyzeConceptType(context.keywords || []);
    const emotionalIntensity = this.analyzeEmotionalIntensity(
      context.keywords || []
    );

    const thresholdType = this.determineNeuralThresholdType(
      cognitiveContext,
      conceptType,
      emotionalIntensity,
      context
    );

    const threshold = VECTOR_CONSTANTS.THRESHOLDS[thresholdType];

    this.logger.info(
      `🧠 NEURAL ANALYSIS: Context=${cognitiveContext}, Concept=${conceptType}, Emotional=${emotionalIntensity}`
    );
    this.logger.info(
      `🎯 NEURAL THRESHOLD: Using ${thresholdType} threshold (${threshold}) - ${this.getThresholdReason(
        thresholdType
      )}`
    );

    return threshold;
  }

  // 🧠 Analisa o contexto cognitivo como um cérebro real
  private analyzeCognitiveContext(context: ThresholdContext): CognitiveContext {
    const hasKeywords = context.keywords && context.keywords.length > 0;
    const hasFilters =
      context.filters && Object.keys(context.filters).length > 0;
    const isHighVolume =
      context.topK &&
      context.topK > VECTOR_CONSTANTS.PERFORMANCE.HIGH_VOLUME_THRESHOLD;

    // 🎯 FOCUSED ATTENTION - Filtros específicos = atenção focada
    if (hasFilters && hasKeywords) {
      return "FOCUSED_ATTENTION";
    }

    // 🔍 ANALYTICAL MODE - Apenas filtros = modo analítico
    if (hasFilters && !hasKeywords) {
      return "ANALYTICAL_MODE";
    }

    // 🌊 ASSOCIATIVE FLOW - Keywords sem filtros = fluxo associativo
    if (hasKeywords && !hasFilters) {
      return "ASSOCIATIVE_FLOW";
    }

    // 📊 DIVERGENT THINKING - Alto volume = pensamento divergente
    if (isHighVolume) {
      return "DIVERGENT_THINKING";
    }

    // 🔗 SEMANTIC SEARCH - Busca geral = busca semântica
    return "SEMANTIC_SEARCH";
  }

  // 🧠 Analisa o tipo de conceito das keywords
  private analyzeConceptType(keywords: string[]): ConceptType {
    if (keywords.length === 0) return "UNKNOWN";

    const keywordText = keywords.join(" ").toLowerCase();

    // Contar matches por categoria
    const emotionalMatches = this.EMOTIONAL_KEYWORDS.filter((k) =>
      keywordText.includes(k)
    ).length;
    const cognitiveMatches = this.COGNITIVE_KEYWORDS.filter((k) =>
      keywordText.includes(k)
    ).length;
    const abstractMatches = this.ABSTRACT_KEYWORDS.filter((k) =>
      keywordText.includes(k)
    ).length;
    const associativeMatches = this.ASSOCIATIVE_KEYWORDS.filter((k) =>
      keywordText.includes(k)
    ).length;

    // Determinar categoria dominante
    const maxMatches = Math.max(
      emotionalMatches,
      cognitiveMatches,
      abstractMatches,
      associativeMatches
    );

    if (maxMatches === 0) return "CONCRETE";
    if (emotionalMatches === maxMatches) return "EMOTIONAL";
    if (cognitiveMatches === maxMatches) return "COGNITIVE";
    if (abstractMatches === maxMatches) return "ABSTRACT";
    if (associativeMatches === maxMatches) return "ASSOCIATIVE";

    return "UNKNOWN";
  }

  // 🧠 Analisa a intensidade emocional das keywords
  private analyzeEmotionalIntensity(
    keywords: string[]
  ): "HIGH" | "MEDIUM" | "LOW" {
    const keywordText = keywords.join(" ").toLowerCase();

    // Keywords de alta intensidade emocional
    const highIntensityWords = [
      "crisis",
      "extreme",
      "intense",
      "overwhelming",
      "powerful",
      "deep",
      "profound",
    ];
    const mediumIntensityWords = [
      "moderate",
      "balanced",
      "calm",
      "stable",
      "gentle",
      "mild",
    ];

    const highMatches = highIntensityWords.filter((w) =>
      keywordText.includes(w)
    ).length;
    const mediumMatches = mediumIntensityWords.filter((w) =>
      keywordText.includes(w)
    ).length;

    if (highMatches > 0) return "HIGH";
    if (mediumMatches > 0) return "MEDIUM";

    // Análise por comprimento e complexidade das keywords
    const avgKeywordLength =
      keywords.reduce((sum, k) => sum + k.length, 0) / keywords.length;
    const hasComplexConcepts = keywords.some(
      (k) => k.includes(" ") || k.length > 12
    );

    if (hasComplexConcepts || avgKeywordLength > 15) return "HIGH";
    if (avgKeywordLength > 8) return "MEDIUM";

    return "LOW";
  }

  // 🧠 NEURAL DECISION ENGINE - Decide threshold baseado no contexto cerebral
  private determineNeuralThresholdType(
    cognitiveContext: CognitiveContext,
    conceptType: ConceptType,
    emotionalIntensity: "HIGH" | "MEDIUM" | "LOW",
    context: ThresholdContext
  ): ThresholdType {
    // 🎯 FOCUSED ATTENTION (filtros + keywords) = Precisão alta
    if (cognitiveContext === "FOCUSED_ATTENTION") {
      this.logger.info(
        `🎯 [THRESHOLD] Using CRITICAL_CONTEXT (${VECTOR_CONSTANTS.THRESHOLDS.CRITICAL_CONTEXT}) - focused attention`
      );
      return "CRITICAL_CONTEXT";
    }

    // 🔍 ANALYTICAL MODE (apenas filtros) = Precisão balanceada
    if (cognitiveContext === "ANALYTICAL_MODE") {
      this.logger.info(
        `🔍 [THRESHOLD] Using RAG_BALANCED (${VECTOR_CONSTANTS.THRESHOLDS.RAG_BALANCED}) - analytical mode`
      );
      return "RAG_BALANCED";
    }

    // 🧠 EMOTIONAL/ABSTRACT CONCEPTS = Threshold baixo (maior recall)
    if (conceptType === "EMOTIONAL" || conceptType === "ABSTRACT") {
      this.logger.info(
        `🧠 [THRESHOLD] Using EXPLORATORY (${VECTOR_CONSTANTS.THRESHOLDS.EXPLORATORY}) - emotional/abstract concepts`
      );
      return "EXPLORATORY";
    }

    // 🔗 ASSOCIATIVE CONCEPTS = Threshold baixo (conexões livres)
    if (
      conceptType === "ASSOCIATIVE" ||
      cognitiveContext === "ASSOCIATIVE_FLOW"
    ) {
      this.logger.info(
        `🔗 [THRESHOLD] Using EXPLORATORY (${VECTOR_CONSTANTS.THRESHOLDS.EXPLORATORY}) - associative concepts`
      );
      return "EXPLORATORY";
    }

    // 🧩 COGNITIVE CONCEPTS = Threshold médio (balanceado)
    if (conceptType === "COGNITIVE") {
      const thresholdType =
        emotionalIntensity === "HIGH" ? "EXPLORATORY" : "RAG_BALANCED";
      this.logger.info(
        `🧩 [THRESHOLD] Using ${thresholdType} (${VECTOR_CONSTANTS.THRESHOLDS[thresholdType]}) - cognitive concepts, intensity: ${emotionalIntensity}`
      );
      return thresholdType;
    }

    // 🌊 DIVERGENT THINKING = Threshold baixo (exploração ampla)
    if (cognitiveContext === "DIVERGENT_THINKING") {
      this.logger.info(
        `🌊 [THRESHOLD] Using EXPLORATORY (${VECTOR_CONSTANTS.THRESHOLDS.EXPLORATORY}) - divergent thinking`
      );
      return "EXPLORATORY";
    }

    // 📚 SEMANTIC SEARCH (padrão) = Threshold baixo (flexível)
    // BUGFIX: Para busca neural simbólica, sempre usar threshold baixo para maior recall
    this.logger.info(
      `📚 [THRESHOLD] Using EXPLORATORY (${VECTOR_CONSTANTS.THRESHOLDS.EXPLORATORY}) - default neural/semantic search`
    );
    return "EXPLORATORY";
  }

  private determineThresholdType(context: ThresholdContext): ThresholdType {
    // Método legado - delegando para a nova lógica neural
    const cognitiveContext = this.analyzeCognitiveContext(context);
    const conceptType = this.analyzeConceptType(context.keywords || []);
    const emotionalIntensity = this.analyzeEmotionalIntensity(
      context.keywords || []
    );

    return this.determineNeuralThresholdType(
      cognitiveContext,
      conceptType,
      emotionalIntensity,
      context
    );
  }

  private getThresholdReason(thresholdType: ThresholdType): string {
    const reasons: Record<ThresholdType, string> = {
      CRITICAL_CONTEXT: "focused attention with high precision",
      RAG_BALANCED: "analytical mode with balanced precision/recall",
      EXPLORATORY: "associative/emotional concepts with high recall",
      MINIMUM: "minimum neural activation",
      MAXIMUM: "maximum neural precision",
    };

    return reasons[thresholdType] || "default neural state";
  }

  isValidThreshold(threshold: number): boolean {
    return (
      threshold >= VECTOR_CONSTANTS.THRESHOLDS.MINIMUM &&
      threshold <= VECTOR_CONSTANTS.THRESHOLDS.MAXIMUM
    );
  }

  clampThreshold(threshold: number): number {
    return Math.max(
      VECTOR_CONSTANTS.THRESHOLDS.MINIMUM,
      Math.min(VECTOR_CONSTANTS.THRESHOLDS.MAXIMUM, threshold)
    );
  }
}
