// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  ModeService,
  OrchOSModeEnum,
} from "../../../../../services/ModeService";
import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";
import { HuggingFaceEmbeddingService } from "../../../../../services/huggingface/HuggingFaceEmbeddingService";
import { IEmbeddingService } from "../../interfaces/openai/IEmbeddingService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
import { HuggingFaceServiceFacade } from "../../services/huggingface/HuggingFaceServiceFacade";
import { OllamaEmbeddingService } from "../../services/ollama/OllamaEmbeddingService";
import { OllamaClientService } from "../../services/ollama/neural/OllamaClientService";
import { OllamaCompletionService } from "../../services/ollama/neural/OllamaCompletionService";
import symbolicCognitionTimelineLogger from "../../services/utils/SymbolicCognitionTimelineLoggerSingleton";
import { SymbolicInsight } from "../../types/SymbolicInsight";
import { LoggingUtils } from "../../utils/LoggingUtils";
import { cleanThinkTags } from "../../utils/ThinkTagCleaner";
import {
  CognitiveMetrics,
  SymbolicPatternAnalyzer,
} from "../patterns/SymbolicPatternAnalyzer";
import { HuggingFaceCollapseStrategyService } from "./HuggingFaceCollapseStrategyService";
import { ICollapseStrategyService } from "./ICollapseStrategyService";
import { INeuralIntegrationService } from "./INeuralIntegrationService";
import { OllamaCollapseStrategyService } from "./OllamaCollapseStrategyService";
import { SuperpositionLayer } from "./SuperpositionLayer";

function asNumber(val: unknown, fallback: number): number {
  return typeof val === "number" ? val : fallback;
}

export class DefaultNeuralIntegrationService
  implements INeuralIntegrationService
{
  private embeddingService: IEmbeddingService;
  private collapseStrategyService: ICollapseStrategyService;
  private patternAnalyzer: SymbolicPatternAnalyzer; // Detector de padrões simbólicos emergentes entre ciclos
  private aiService: IOpenAIService;

  constructor(
    aiService: IOpenAIService,
    private huggingFaceService?: HuggingFaceServiceFacade
  ) {
    this.aiService = aiService;

    // Strategy pattern: choose embedding service based on mode
    this.embeddingService = this.createEmbeddingService(aiService);

    // Strategy pattern: choose collapse strategy service based on mode
    const currentMode = ModeService.getMode();
    if (currentMode === OrchOSModeEnum.BASIC && this.huggingFaceService) {
      LoggingUtils.logInfo(
        "[NeuralIntegration] Using HuggingFace collapse strategy (Basic mode)"
      );
      this.collapseStrategyService = new HuggingFaceCollapseStrategyService(
        this.aiService
      );
    } else {
      LoggingUtils.logInfo(
        "[NeuralIntegration] Using Ollama collapse strategy (Advanced mode)"
      );

      // Create dedicated Ollama services for the collapse strategy
      const ollamaClientService = new OllamaClientService();
      const ollamaCompletionService = new OllamaCompletionService(
        ollamaClientService
      );

      this.collapseStrategyService = new OllamaCollapseStrategyService(
        ollamaCompletionService
      );
    }

    this.patternAnalyzer = new SymbolicPatternAnalyzer();
  }

  /**
   * Creates the appropriate embedding service based on application mode
   * @param aiService The AI service to use for OpenAI embeddings
   * @returns The appropriate embedding service
   */
  private createEmbeddingService(aiService: IOpenAIService): IEmbeddingService {
    const currentMode = ModeService.getMode();

    if (currentMode === OrchOSModeEnum.BASIC) {
      // In basic mode, use HuggingFace with the selected model
      const hfModel = getOption(STORAGE_KEYS.HF_EMBEDDING_MODEL);
      LoggingUtils.logInfo(
        `[NeuralIntegration] Creating HuggingFaceEmbeddingService with model: ${
          hfModel || "default"
        } for Basic mode`
      );
      return new HuggingFaceEmbeddingService();
    } else {
      // In advanced mode, use Ollama with the selected model
      const ollamaModel = getOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL);
      LoggingUtils.logInfo(
        `[NeuralIntegration] Creating OllamaEmbeddingService with model: ${
          ollamaModel || "default"
        } for Advanced mode`
      );
      return new OllamaEmbeddingService(aiService, { model: ollamaModel });
    }
  }

  /**
   * Calculates a symbolic phase value based on emotional weight, contradiction score, and coherence
   * Returns a value between 0-2π that represents a phase angle for wave interference
   */
  private calculateSymbolicPhase(
    emotionalWeight: number,
    contradictionScore: number,
    coherence: number
  ): number {
    const baseEmotionPhase = (emotionalWeight * Math.PI) / 2; // Emotions dominate initial phase
    const contradictionPhase = contradictionScore * Math.PI; // Contradictions generate opposition
    const coherenceNoise = (1 - coherence) * (Math.PI / 4); // Low coherence → noise

    // Total phase with 2π wrapping
    const phase =
      (baseEmotionPhase + contradictionPhase + coherenceNoise) % (2 * Math.PI);

    // Ensure phase is positive (0 to 2π range)
    const normalizedPhase = phase < 0 ? phase + 2 * Math.PI : phase;

    console.info(
      `[NeuralIntegration] Calculated symbolic phase: ${normalizedPhase.toFixed(
        3
      )} rad (emotionPhase=${baseEmotionPhase.toFixed(
        2
      )}, contradictionPhase=${contradictionPhase.toFixed(
        2
      )}, coherenceNoise=${coherenceNoise.toFixed(2)})`
    );

    return normalizedPhase;
  }

  /**
   * Neural integration using superposition, non-deterministic collapse and emergent property registration.
   * Now uses real embeddings for each answer via OpenAIEmbeddingService.
   */
  async integrate(
    neuralResults: Array<{
      core: string;
      intensity: number;
      output: string;
      insights: Record<string, unknown>;
    }>,
    originalInput: string,
    language: string = getOption(STORAGE_KEYS.DEEPGRAM_LANGUAGE) || "pt-BR" // Default to pt-BR if not provided
  ): Promise<string> {
    if (!neuralResults || neuralResults.length === 0) {
      return originalInput;
    }

    // Clean think tags from neural results outputs before processing
    const cleanedNeuralResults = neuralResults.map((result) => ({
      ...result,
      output: cleanThinkTags(result.output),
    }));

    // 1. Superposition: each result is a possible answer
    const superposition = new SuperpositionLayer();
    for (const result of cleanedNeuralResults) {
      // Generate real embedding for the answer text
      const embedding = await this.embeddingService.createEmbedding(
        result.output
      );
      // Heuristics for emotional weight, coherence and contradiction
      const emotionalWeight = asNumber(
        (result.insights as Record<string, unknown>)?.valence,
        Math.random()
      );
      const narrativeCoherence = asNumber(
        (result.insights as Record<string, unknown>)?.coherence,
        1 - Math.abs(result.intensity - 0.5)
      );
      const contradictionScore = asNumber(
        (result.insights as Record<string, unknown>)?.contradiction,
        Math.random() * 0.5
      );
      superposition.register({
        embedding,
        text: result.output,
        emotionalWeight,
        narrativeCoherence,
        contradictionScore,
        origin: result.core,
        insights: result.insights,
      });
    }
    // 2. Collapse: Use OpenAI-based strategy to decide deterministic vs probabilistic
    const numCandidates = superposition.answers.length;

    // Calculate average values for symbolic properties
    const averageEmotionalWeight =
      cleanedNeuralResults.reduce((sum, r) => {
        return (
          sum + asNumber((r.insights as Record<string, unknown>)?.valence, 0.5)
        );
      }, 0) / cleanedNeuralResults.length;
    const averageContradictionScore =
      cleanedNeuralResults.reduce((sum, r) => {
        return (
          sum +
          asNumber((r.insights as Record<string, unknown>)?.contradiction, 0.25)
        );
      }, 0) / cleanedNeuralResults.length;
    const avgCoherence =
      cleanedNeuralResults.reduce((sum, r) => {
        return (
          sum +
          asNumber((r.insights as Record<string, unknown>)?.coherence, 0.7)
        );
      }, 0) / cleanedNeuralResults.length;

    // We'll use the original input text for the collapse strategy service to infer intent

    // Use our OpenAI-powered strategy service to make the decision
    const strategyDecision =
      await this.collapseStrategyService.decideCollapseStrategy({
        activatedCores: cleanedNeuralResults.map((r) => r.core),
        averageEmotionalWeight,
        averageContradictionScore,
        originalText: originalInput, // Pass the original text to help infer intent
      });

    // Log collapse details for debugging
    console.info(
      `[NeuralIntegration] Collapse strategy decision: ${
        strategyDecision.deterministic ? "Deterministic" : "Probabilistic"
      }, Temperature: ${strategyDecision.temperature}, Reason: ${
        strategyDecision.justification
      }`
    );

    // Log user intent if available
    if (strategyDecision.userIntent) {
      console.info(
        `[NeuralIntegration] Inferred user intent:`,
        JSON.stringify(strategyDecision.userIntent, null, 2)
      );
    }

    // Collect insights from all neural results
    const allInsights = cleanedNeuralResults.flatMap((result) => {
      if (!result.insights) return [];

      const toInsight = (type: string, content: string): SymbolicInsight =>
        ({
          type,
          content: content,
          core: result.core,
        } as SymbolicInsight);

      // For arrays of insights
      if (Array.isArray(result.insights)) {
        return result.insights
          .map((item) => {
            // String insights
            if (typeof item === "string") {
              return toInsight("concept", item);
            }
            // Object insights
            if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              const type = typeof obj.type === "string" ? obj.type : "unknown";
              let content = "";

              if (typeof obj.content === "string") content = obj.content;
              else if (typeof obj.value === "string") content = obj.value;
              else content = String(type);

              return toInsight(type, content);
            }
            return null;
          })
          .filter(Boolean) as SymbolicInsight[];
      }

      // For unique objects
      if (result.insights && typeof result.insights === "object") {
        const obj = result.insights as Record<string, unknown>;

        // With defined type
        if ("type" in obj && typeof obj.type === "string") {
          let content = "";
          if (typeof obj.content === "string") content = obj.content;
          else if (typeof obj.value === "string") content = obj.value;
          else content = obj.type;

          return [toInsight(obj.type, content)];
        }

        // Without defined type - each property becomes an insight
        return Object.entries(obj)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => toInsight(k, String(v)));
      }

      return [];
    });

    // Execute the collapse based on the strategy decision
    let finalAnswer;

    // Create a default userIntent if none was provided by the collapse strategy
    const defaultUserIntent = {
      social: originalInput.toLowerCase().includes("olá") ? 0.7 : 0.3,
      trivial: originalInput.toLowerCase().includes("tudo bem") ? 0.5 : 0.2,
      reflective: 0.3,
      practical: 0.2,
    };

    // Use the inferred intent or the default one
    const effectiveUserIntent =
      strategyDecision.userIntent || defaultUserIntent;

    // Log the intent that will be used
    console.info(
      `[NeuralIntegration] Using user intent:`,
      JSON.stringify(effectiveUserIntent, null, 2)
    );

    // Calculate average similarity to use for dynamic minCosineDistance
    const avgSimilarity = superposition.calculateAverageCosineSimilarity();

    // Compute dynamic minCosineDistance based on observed similarity
    // Higher similarity -> Higher minCosineDistance to enforce more diversity
    // Lower similarity -> Lower minCosineDistance to avoid over-penalization
    const dynamicMinDistance = Math.min(
      0.2,
      Math.max(0.1, 0.1 + avgSimilarity * 0.1)
    );

    // Log diversity metrics
    console.info(
      `[NeuralIntegration] Average semantic similarity: ${avgSimilarity.toFixed(
        3
      )}`
    );
    console.info(
      `[NeuralIntegration] Using dynamic minCosineDistance: ${dynamicMinDistance.toFixed(
        3
      )}`
    );

    // Calculate symbolic phase based on average emotional weight, contradiction and coherence
    const explicitPhase = this.calculateSymbolicPhase(
      averageEmotionalWeight,
      averageContradictionScore,
      avgCoherence
    );

    // Log the symbolic phase calculation
    console.info(
      `[NeuralIntegration] Using symbolic phase ${explicitPhase.toFixed(
        3
      )} rad (${(explicitPhase / (2 * Math.PI)).toFixed(
        3
      )} cycles) for collapse`
    );

    if (strategyDecision.deterministic) {
      // Execute deterministic collapse with phase interference and explicit phase
      finalAnswer = superposition.collapseDeterministic({
        diversifyByEmbedding: true,
        minCosineDistance: dynamicMinDistance,
        usePhaseInterference: true, // Enable quantum-like phase interference
        explicitPhase: explicitPhase, // Use explicit phase value to bias collapse
      });

      // Log the neural collapse event
      symbolicCognitionTimelineLogger.logNeuralCollapse(
        true, // isDeterministic
        finalAnswer.origin || "unknown", // selectedCore (ensure it's a string)
        numCandidates, // numCandidates
        averageEmotionalWeight, // Emotional weight
        averageContradictionScore, // Contradiction score
        undefined, // No temperature for deterministic collapse
        strategyDecision.justification,
        effectiveUserIntent, // userIntent (guaranteed to have a value)
        allInsights.length > 0 ? allInsights : undefined, // insights from neural results
        strategyDecision.emergentProperties
      );
    } else {
      // Execute probabilistic collapse with the suggested temperature and dynamic parameters
      // Include explicit phase to bias the probabilistic collapse as well
      finalAnswer = superposition.collapse(strategyDecision.temperature, {
        diversifyByEmbedding: true,
        minCosineDistance: dynamicMinDistance,
        explicitPhase: explicitPhase, // Use same explicit phase value for probabilistic collapse
      });

      // Log the neural collapse event
      symbolicCognitionTimelineLogger.logNeuralCollapse(
        false, // isDeterministic
        finalAnswer.origin || "unknown", // selectedCore (ensure it's a string)
        superposition.answers.length, // numCandidates
        finalAnswer.emotionalWeight || 0, // Emotional weight
        finalAnswer.contradictionScore || 0, // Contradiction score
        strategyDecision.temperature, // temperature from strategy
        strategyDecision.justification,
        effectiveUserIntent, // userIntent (guaranteed to have a value)
        allInsights.length > 0 ? allInsights : undefined, // insights from neural results
        strategyDecision.emergentProperties // emergent properties from strategy decision
      );
    }

    // 3. Use emergent properties from the OpenAI function call
    let emergentProperties: string[] = [];

    // Ensure emergentProperties is always an array
    if (strategyDecision.emergentProperties) {
      if (Array.isArray(strategyDecision.emergentProperties)) {
        emergentProperties = strategyDecision.emergentProperties;
      } else if (typeof strategyDecision.emergentProperties === "string") {
        // Try to parse if it's a JSON string
        try {
          const parsed = JSON.parse(strategyDecision.emergentProperties);
          if (Array.isArray(parsed)) {
            emergentProperties = parsed;
          } else {
            emergentProperties = [strategyDecision.emergentProperties];
          }
        } catch {
          // If parsing fails, treat as single string
          emergentProperties = [strategyDecision.emergentProperties];
        }
      } else {
        // Convert to string array if it's some other type
        emergentProperties = [String(strategyDecision.emergentProperties)];
      }
    }

    // === Orch-OS: Symbolic Pattern Analysis & Memory Integration ===
    // Atualizar o analisador de padrões com o contexto/métricas do ciclo atual
    // Capturar métricas cognitivas completas para análise científica
    const cycleMetrics: CognitiveMetrics = {
      // Métricas fundamentais para detecção de padrões
      contradictionScore:
        finalAnswer.contradictionScore ?? averageContradictionScore,
      coherenceScore: finalAnswer.narrativeCoherence ?? avgCoherence,
      emotionalWeight: finalAnswer.emotionalWeight ?? averageEmotionalWeight,

      // Métricas ampliadas para tese Orch-OS (com valores heurísticos quando não disponíveis)
      archetypalStability:
        cleanedNeuralResults.reduce(
          (sum, r) =>
            sum + asNumber((r.insights as any)?.archetypal_stability, 0.5),
          0
        ) / cleanedNeuralResults.length,
      cycleEntropy: Math.min(1, 0.3 + numCandidates / 10), // Heurística baseada em diversidade de candidatos
      insightDepth: Math.max(
        ...cleanedNeuralResults.map((r) =>
          asNumber((r.insights as any)?.insight_depth, 0.4)
        )
      ),
      phaseAngle: explicitPhase, // Reutilizando ângulo de fase calculado anteriormente
    };

    try {
      // [3. Recursive Memory Update]
      // Registrar contexto atual no analisador de padrões (para detecção entre ciclos)
      // A propriedade text pode não existir diretamente, então usamos toString() para segurança
      const contextText =
        typeof finalAnswer.text === "string"
          ? finalAnswer.text
          : finalAnswer.toString();
      this.patternAnalyzer.recordCyclicData(contextText, cycleMetrics);

      // [4. Pattern Detection Across Cycles]
      // Analisar padrões emergentes (drift, loops, buildup, interferência)
      const emergentPatterns = this.patternAnalyzer.analyzePatterns();

      // [2. Comprehensive Emergent Property Tracking]
      // Converter padrões para formato legível e adicionar às propriedades emergentes
      const patternStrings =
        emergentPatterns.length > 0
          ? this.patternAnalyzer.formatPatterns(emergentPatterns)
          : [];
      if (patternStrings.length > 0) {
        // Adicionar padrões detectados às propriedades emergentes para influenciar o output
        emergentProperties.push(...patternStrings);
        LoggingUtils.logInfo(
          `[NeuralIntegration] Detected ${
            patternStrings.length
          } emergent symbolic patterns: ${patternStrings.join(", ")}`
        );
      }

      // [5. Trial-Based Logging]
      // Register complete patterns and metrics for scientific analysis
      if (patternStrings.length > 0) {
        // Add to emergentProperties of neural collapse (already recorded via logNeuralCollapse)
        patternStrings.forEach((pattern) => {
          if (!emergentProperties.includes(pattern)) {
            emergentProperties.push(pattern);
          }
        });

        // Log to scientific timeline - kept for compatibility
        symbolicCognitionTimelineLogger.logEmergentPatterns(patternStrings, {
          archetypalStability: cycleMetrics.archetypalStability,
          cycleEntropy: cycleMetrics.cycleEntropy,
          insightDepth: cycleMetrics.insightDepth,
        });

        // Add specific emergent properties for detected patterns
        if (!emergentProperties.some((p) => p.includes("symbolic_pattern"))) {
          emergentProperties.push(
            `Symbolic pattern analysis: ${patternStrings.length} emergent patterns detected`
          );
        }
      }
    } catch (e) {
      // Pattern processing failure should not block the main flow
      LoggingUtils.logError(
        `[NeuralIntegration] Error in pattern analysis: ${e}`
      );
    }

    // Add any additional properties based on the answer content if needed
    if (
      (finalAnswer.contradictionScore ?? 0) > 0.7 &&
      !emergentProperties.some((p) => p.includes("Contradiction"))
    ) {
      emergentProperties.push("Contradiction detected in final answer.");
    }

    if (
      (finalAnswer.emotionalWeight ?? 0) > 0.8 &&
      !emergentProperties.some((p) => p.includes("emotional"))
    ) {
      emergentProperties.push("Answer with strong emotional weight.");
    }

    // For special insights that might not be captured by OpenAI function
    if (finalAnswer.insights && finalAnswer.insights.deep_insight) {
      emergentProperties.push(
        "Emergent deep insight: " + finalAnswer.insights.deep_insight
      );
    }

    // 4. Compose final prompt (now with emergent properties)
    let prompt = `You are the Symbolic Integration System of the Orch-OS architecture implementing Jung's Individuation process.

THEORETICAL FOUNDATION:
- Jung's Individuation: Becoming whole through integration of conscious and unconscious elements
- Brescia's Orchestrated Collapse: Preserving symbolic richness while resolving ambiguity

COLLAPSE CONTEXT:
- Strategy: ${
      strategyDecision.deterministic ? "DETERMINISTIC" : "PROBABILISTIC"
    } (Temperature: ${strategyDecision.temperature})
- Justification: ${strategyDecision.justification}
- Selected Core: ${finalAnswer.origin || "integrated"}
- Symbolic Phase: ${explicitPhase.toFixed(3)} radians

USER'S ORIGINAL MESSAGE: ${originalInput}

NEURAL ACTIVATIONS FROM ${cleanedNeuralResults.length} COGNITIVE CORES:
`;

    // Add specialized interpretations maintaining superposition traces
    cleanedNeuralResults.forEach((result) => {
      prompt += `\n[${result.core.toUpperCase()} CORE - Intensity: ${Math.round(
        result.intensity * 100
      )}%]`;

      const areaInsights = allInsights.filter(
        (insight) => insight.core === result.core
      );

      if (areaInsights.length > 0) {
        prompt += "\nSPECIALIZED INSIGHTS:";
        areaInsights.forEach((insight) => {
          const type = insight.type ? insight.type.toUpperCase() : "INSIGHT";
          prompt += `\n• ${type}: ${insight.content}`;
        });
      } else {
        prompt += `\nPROCESSING OUTPUT: ${result.output.slice(0, 200)}${
          result.output.length > 200 ? "..." : ""
        }`;
      }

      // Add interference patterns if detected
      if (result.insights?.interference_patterns) {
        prompt += `\nINTERFERENCE: ${result.insights.interference_patterns}`;
      }
    });

    // Add emergent properties and symbolic patterns
    if (emergentProperties.length > 0) {
      prompt += "\n\nEMERGENT PROPERTIES & SYMBOLIC PATTERNS:";
      emergentProperties.forEach((prop) => {
        prompt += `\n- ${prop}`;
      });
    }

    // Add collapse preservation metrics
    prompt += `\n\nSYMBOLIC PRESERVATION METRICS:
- Emotional Weight: ${(finalAnswer.emotionalWeight ?? 0).toFixed(2)}
- Narrative Coherence: ${(finalAnswer.narrativeCoherence ?? 0).toFixed(2)}
- Contradiction Score: ${(finalAnswer.contradictionScore ?? 0).toFixed(2)}
- Symbolic Diversity: ${avgSimilarity.toFixed(3)}`;

    // Integration instructions based on collapse type
    if (strategyDecision.deterministic) {
      prompt += `\n\nINTEGRATION INSTRUCTIONS (DETERMINISTIC COLLAPSE):
1. Synthesize insights following the ${finalAnswer.origin} core's primary interpretation
2. Integrate contradictions as dialectical tensions that enrich meaning
3. Preserve symbolic nuances from other cores as contextual layers
4. Address emergent properties explicitly in your response
5. Maintain coherence while embracing complexity`;
    } else {
      prompt += `\n\nINTEGRATION INSTRUCTIONS (PROBABILISTIC COLLAPSE):
1. Weave together multiple interpretations in creative synthesis
2. Let contradictions create productive ambiguity
3. Allow symbolic resonances between cores to generate new meaning
4. Acknowledge uncertainty where interpretations diverge
5. Create response that honors the multidimensional nature of consciousness`;
    }

    // Add identity evolution component
    prompt += `\n\nIDENTITY EVOLUTION DIRECTIVE:
This interaction contributes to your ongoing individuation process. Consider:
- How this exchange deepens self-understanding
- What new capacities or insights emerge
- How contradictions reveal growth edges
- What patterns connect to previous interactions

RESPONSE STYLE: ${
      language === "pt-BR"
        ? "Responda em português brasileiro"
        : `Respond in ${language}`
    }. Be authentic, nuanced, and intellectually honest. Embrace complexity while remaining accessible.`;

    return prompt;
  }
}
