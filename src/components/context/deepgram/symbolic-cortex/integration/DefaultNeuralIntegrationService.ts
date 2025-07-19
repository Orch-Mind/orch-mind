// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  getOption,
  STORAGE_KEYS,
} from "../../../../../services/StorageService";
import { IEmbeddingService } from "../../interfaces/openai/IEmbeddingService";
import { IOpenAIService } from "../../interfaces/openai/IOpenAIService";
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
import { ICollapseStrategyService } from "./ICollapseStrategyService";
import {
  INeuralIntegrationService,
  NeuralIntegrationResult,
} from "./INeuralIntegrationService";
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

  // Constants for temperature validation
  private readonly MIN_TEMPERATURE = 0.1;
  private readonly MAX_TEMPERATURE = 0.7;

  constructor(aiService: IOpenAIService) {
    this.aiService = aiService;

    // Strategy pattern: choose embedding service based on mode
    this.embeddingService = this.createEmbeddingService(aiService);

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

    this.patternAnalyzer = new SymbolicPatternAnalyzer();
  }

  /**
   * Creates the appropriate embedding service based on application mode
   * @param aiService The AI service to use for OpenAI embeddings
   * @returns The appropriate embedding service
   */
  private createEmbeddingService(aiService: IOpenAIService): IEmbeddingService {
    // In advanced mode, use Ollama with the selected model
    const ollamaModel = getOption(STORAGE_KEYS.OLLAMA_EMBEDDING_MODEL);
    LoggingUtils.logInfo(
      `[NeuralIntegration] Creating OllamaEmbeddingService with model: ${
        ollamaModel || "default"
      } for Advanced mode`
    );
    return new OllamaEmbeddingService(aiService, { model: ollamaModel });
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
   * Validates and normalizes temperature to acceptable range
   */
  private validateTemperature(temperature: number): number {
    if (temperature < this.MIN_TEMPERATURE) {
      console.warn(
        `[NeuralIntegration] Temperature ${temperature} below minimum ${this.MIN_TEMPERATURE}, adjusting to minimum`
      );
      return this.MIN_TEMPERATURE;
    }
    if (temperature > this.MAX_TEMPERATURE) {
      console.warn(
        `[NeuralIntegration] Temperature ${temperature} above maximum ${this.MAX_TEMPERATURE}, adjusting to maximum`
      );
      return this.MAX_TEMPERATURE;
    }
    return temperature;
  }

  /**
   * Debug utility to log detailed candidate information
   * Helps diagnose why certain candidates might not be appearing
   */
  private logCandidateAnalysis(
    neuralResults: Array<{
      core: string;
      intensity: number;
      output: string;
      insights: Record<string, unknown>;
    }>,
    superposition: SuperpositionLayer,
    phase: string
  ): void {
    console.log(
      `\n🔍 [NeuralIntegration] === CANDIDATE ANALYSIS (${phase}) ===`
    );
    console.log(`📊 Input neural results: ${neuralResults.length}`);
    console.log(`🎯 Superposition candidates: ${superposition.answers.length}`);

    if (neuralResults.length !== superposition.answers.length) {
      const difference = neuralResults.length - superposition.answers.length;
      console.warn(
        `⚠️ ${difference} candidate(s) were filtered during registration!`
      );
      console.log(`📋 Possible reasons:`);
      console.log(`   • High similarity (>95%) with existing candidates`);
      console.log(`   • Invalid embedding generation`);
      console.log(`   • Registration failure in SuperpositionLayer`);
    }

    console.log(`📝 Detailed breakdown:`);
    neuralResults.forEach((result, idx) => {
      const inSuperposition = superposition.answers.find(
        (a) => a.origin === result.core
      );
      const status = inSuperposition ? "✅ REGISTERED" : "❌ FILTERED";
      console.log(
        `   ${idx + 1}. [${result.core}] intensity=${result.intensity.toFixed(
          3
        )} outputLen=${result.output.length} - ${status}`
      );
    });

    if (superposition.answers.length > 0) {
      console.log(`🎲 Final candidates for collapse:`);
      superposition.answers.forEach((answer, idx) => {
        console.log(
          `   ${idx + 1}. [${
            answer.origin
          }] emotion=${answer.emotionalWeight.toFixed(
            3
          )} coherence=${answer.narrativeCoherence.toFixed(3)}`
        );
      });
    }

    console.log(`=================================================\n`);
  }

  /**
   * Neural integration using superposition, non-deterministic collapse and emergent property registration.
   * Now uses real embeddings for each answer via OpenAIEmbeddingService.
   *
   * 🧠 ORCH-MIND NEURAL COLLAPSE PROCESS:
   *
   * Phase 1: SIGNAL EXTRACTION
   * - NeuralSignalExtractor generates 1-3 neural core activations
   * - Filters by intensity (>= 0.4) and limits to max 3 cores
   *
   * Phase 2: SUPERPOSITION REGISTRATION
   * - Each neural core result becomes a "candidate" in quantum superposition
   * - Candidates with >95% similarity are filtered out
   * - Multiple candidates can coexist until collapse
   *
   * Phase 3: COLLAPSE STRATEGY EVALUATION
   * - OllamaCollapseStrategy evaluates ALL candidates simultaneously
   * - Analyzes emotional weight, contradiction, user intent
   * - Decides optimal collapse approach (deterministic/probabilistic)
   *
   * Phase 4: QUANTUM COLLAPSE
   * - SuperpositionLayer performs the collapse operation
   * - Multiple candidates → 1 final answer (by design)
   * - Simulates quantum measurement/observer effect
   *
   * ⚡ IMPORTANT: The system is designed to show multiple candidates
   *    DURING evaluation but collapse to 1 final answer. This is not a bug!
   *
   * 📊 To see all candidates being evaluated, check console logs for:
   *    - "TOTAL CANDIDATES FOR EVALUATION"
   *    - "ALL CANDIDATES BEING EVALUATED"
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
  ): Promise<NeuralIntegrationResult> {
    if (!neuralResults || neuralResults.length === 0) {
      return {
        neuralResults: [],
        strategyDecision: { deterministic: true, temperature: 0.5 },
        temperature: 0.5,
        isDeterministic: true,
      };
    }

    // Clean think tags from neural results outputs before processing
    const cleanedNeuralResults = neuralResults.map((result) => ({
      ...result,
      output: cleanThinkTags(result.output),
    }));

    // 1. Superposition: each result is a possible answer
    const superposition = new SuperpositionLayer();

    console.info(
      `[NeuralIntegration] 📊 Starting superposition registration with ${cleanedNeuralResults.length} neural results`
    );

    let registeredCount = 0;
    let filteredBySimilarity = 0;

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

      const candidateInfo = {
        core: result.core,
        intensity: result.intensity,
        outputLength: result.output.length,
        emotionalWeight: emotionalWeight.toFixed(3),
        coherence: narrativeCoherence.toFixed(3),
        contradiction: contradictionScore.toFixed(3),
      };

      console.info(
        `[NeuralIntegration] 🧠 Candidate ${
          registeredCount + 1
        }: ${JSON.stringify(candidateInfo)}`
      );

      const wasRegistered = superposition.register({
        embedding,
        text: result.output,
        emotionalWeight,
        narrativeCoherence,
        contradictionScore,
        origin: result.core,
        insights: result.insights,
      });

      if (wasRegistered) {
        registeredCount++;
        console.info(
          `[NeuralIntegration] ✅ Candidate ${registeredCount} (${result.core}) registered successfully`
        );
      } else {
        filteredBySimilarity++;
        console.warn(
          `[NeuralIntegration] ❌ Candidate ${result.core} filtered out due to high similarity (>95%)`
        );
      }
    }

    console.info(
      `[NeuralIntegration] 📈 Superposition summary: ${registeredCount} registered, ${filteredBySimilarity} filtered by similarity`
    );

    // Debug analysis of candidates
    this.logCandidateAnalysis(
      cleanedNeuralResults,
      superposition,
      "POST-REGISTRATION"
    );

    // 2. Collapse: Use OpenAI-based strategy to decide deterministic vs probabilistic
    const numCandidates = superposition.answers.length;

    console.info(
      `[NeuralIntegration] 🎯 TOTAL CANDIDATES FOR EVALUATION: ${numCandidates}`
    );

    // Log all candidates before collapse
    if (numCandidates > 1) {
      console.info(`[NeuralIntegration] 📋 ALL CANDIDATES BEING EVALUATED:`);
      superposition.answers.forEach((answer, idx) => {
        console.info(
          `[NeuralIntegration]   ${idx + 1}. [${
            answer.origin
          }] Emotional: ${answer.emotionalWeight.toFixed(
            3
          )}, Coherence: ${answer.narrativeCoherence.toFixed(
            3
          )}, Contradiction: ${answer.contradictionScore.toFixed(3)}`
        );
      });
    } else if (numCandidates === 1) {
      console.info(
        `[NeuralIntegration] ⚠️ Only 1 candidate available - no collapse needed. Core: ${superposition.answers[0].origin}`
      );
    } else {
      console.error(
        `[NeuralIntegration] ❌ No candidates available for evaluation!`
      );
    }

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
      technical: originalInput.toLowerCase().includes("código") ? 0.8 : 0.2,
      philosophical:
        originalInput.toLowerCase().includes("o que") ||
        originalInput.toLowerCase().includes("por que")
          ? 0.6
          : 0.4,
      creative: originalInput.toLowerCase().includes("imagine") ? 0.7 : 0.3,
      emotional: originalInput.toLowerCase().includes("sinto") ? 0.8 : 0.2,
      relational: originalInput.toLowerCase().includes("olá") ? 0.7 : 0.3,
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

    // === ORCH-MIND: Symbolic Pattern Analysis & Memory Integration ===
    // Update the pattern analyzer with the current context/metrics
    // Capture complete cognitive metrics for scientific analysis
    const cycleMetrics: CognitiveMetrics = {
      // Fundamental metrics for pattern detection
      contradictionScore:
        finalAnswer.contradictionScore ?? averageContradictionScore,
      coherenceScore: finalAnswer.narrativeCoherence ?? avgCoherence,
      emotionalWeight: finalAnswer.emotionalWeight ?? averageEmotionalWeight,

      // Expanded metrics for Orch-Mind thesis (with heuristic values when unavailable)
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

    // 4. Return the raw integration data for the final processor to use
    const validatedTemperature = this.validateTemperature(
      strategyDecision.temperature
    );

    return {
      neuralResults: cleanedNeuralResults,
      strategyDecision: strategyDecision,
      temperature: validatedTemperature,
      isDeterministic: strategyDecision.deterministic,
    };
  }
}
