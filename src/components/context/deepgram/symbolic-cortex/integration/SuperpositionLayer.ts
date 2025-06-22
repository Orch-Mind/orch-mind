// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// Superposition layer for possible answers
export interface ISuperposedAnswer {
  embedding: number[]; // Embedding vector representing the answer
  text: string; // Answer text
  emotionalWeight: number; // Emotional/symbolic weight (amplitude component)
  narrativeCoherence: number; // Narrative coherence score
  contradictionScore: number; // Contradiction score
  origin: string; // Originating neural core
  insights?: Record<string, unknown>; // Associated insights
  phase?: number; // Quantum-like phase angle (0-2π) for interference patterns
}

export interface ICollapseOptions {
  diversifyByEmbedding?: boolean; // Whether to consider embedding distance in collapse
  minCosineDistance?: number; // Minimum cosine distance to enforce diversity
  usePhaseInterference?: boolean; // Whether to use phase interference for more objective collapse
  explicitPhase?: number; // Explicit phase value (0-2π) to bias interference pattern
}

export interface ISuperpositionLayer {
  answers: ISuperposedAnswer[];
  register(answer: ISuperposedAnswer): boolean;
  hasSimilar(embedding: number[], threshold: number): boolean;
  calculateAverageCosineSimilarity(): number;
  collapse(temperature?: number, options?: ICollapseOptions): ISuperposedAnswer;
  collapseDeterministic(options?: ICollapseOptions): ISuperposedAnswer;
}

export class SuperpositionLayer implements ISuperpositionLayer {
  answers: ISuperposedAnswer[] = [];

  /**
   * Calculate cosine similarity between two embedding vectors with enhanced validation
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    // Handle null/undefined vectors or empty vectors
    if (!a || !b || a.length === 0 || b.length === 0) return 0;
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    let validCount = 0;

    for (let i = 0; i < a.length; i++) {
      // Enhanced: Check for any non-finite values (NaN, Infinity, -Infinity)
      if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) {
        continue; // Skip invalid values
      }

      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
      validCount++;
    }

    // If no valid values found, return 0
    if (validCount === 0) {
      console.warn(
        "SuperpositionLayer: No valid values found in vectors for cosine similarity"
      );
      return 0;
    }

    // Handle zero norm cases
    if (normA === 0 || normB === 0) return 0;

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

    // Final validation: ensure result is finite
    if (!Number.isFinite(similarity)) {
      console.warn(
        "SuperpositionLayer: Cosine similarity calculation resulted in non-finite value"
      );
      return 0;
    }

    return similarity;
  }

  /**
   * Check if there's a similar answer already registered
   */
  hasSimilar(embedding: number[], threshold: number): boolean {
    if (!embedding || embedding.length === 0) return false;

    for (const answer of this.answers) {
      const similarity = this.cosineSimilarity(embedding, answer.embedding);
      if (similarity > threshold) {
        console.info(
          `[SuperpositionLayer] Found similar answer with similarity ${similarity}`
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate a quantum-like phase angle for an answer based on its symbolic properties
   * Returns a phase angle between 0 and 2π
   */
  private calculatePhase(answer: ISuperposedAnswer): number {
    // Base calculation using fundamental properties
    const emotionPhase = (answer.emotionalWeight * Math.PI) / 2; // Emotion dominates initial phase
    const contradictionPhase = answer.contradictionScore * Math.PI; // Contradictions create opposition
    const coherenceNoise = (1 - answer.narrativeCoherence) * (Math.PI / 4); // Low coherence → noise

    // Different neural origins have different base phase angles
    let originPhase = 0;
    switch (answer.origin) {
      // Core symbolic faculties
      case "memory":
        originPhase = 0; // Zero degrees - foundational memory
        break;
      case "valence":
        originPhase = Math.PI; // 180 degrees - emotional polarity
        break;
      case "metacognitive":
        originPhase = Math.PI / 2; // 90 degrees - meta-awareness
        break;
      case "relational":
        originPhase = Math.PI / 3; // 60 degrees - social harmony
        break;
      case "creativity":
        originPhase = (2 * Math.PI) / 3; // 120 degrees - creative divergence
        break;
      case "will":
        originPhase = Math.PI / 8; // 22.5 degrees - directed intention
        break;
      case "planning":
        originPhase = Math.PI / 4; // 45 degrees - future orientation
        break;
      case "language":
        originPhase = Math.PI / 6; // 30 degrees - linguistic structure
        break;
      case "shadow":
        originPhase = -Math.PI / 2; // -90 degrees - unconscious depth
        break;
      case "symbolic_alignment":
        originPhase = (3 * Math.PI) / 4; // 135 degrees - symbolic resonance
        break;
      case "integrity":
        originPhase = Math.PI / 12; // 15 degrees - core values
        break;
      case "evolution":
        originPhase = (5 * Math.PI) / 6; // 150 degrees - growth spiral
        break;
      default:
        originPhase = 0;
    }

    // Combine components with origin as base
    const phase =
      (originPhase + emotionPhase + contradictionPhase + coherenceNoise) %
      (2 * Math.PI);

    // Ensure phase is positive (0 to 2π range)
    return phase < 0 ? phase + 2 * Math.PI : phase;
  }

  /**
   * Register an answer in the superposition layer.
   * Returns true if registration was successful, false if skipped due to similarity.
   * Now calculates a quantum-like phase for each answer during registration.
   */
  register(answer: ISuperposedAnswer): boolean {
    // Skip if there's a very similar answer already registered
    if (this.hasSimilar(answer.embedding, 0.95)) {
      return false;
    }

    // Calculate and assign a quantum-like phase if not already provided
    if (answer.phase === undefined) {
      answer.phase = this.calculatePhase(answer);
      console.debug(
        `[SuperpositionLayer] Calculated phase ${answer.phase.toFixed(
          3
        )} rad for answer from ${answer.origin}`
      );
    }

    this.answers.push(answer);
    return true;
  }

  /**
   * Non-deterministic collapse using softmax sampling based on symbolic scores.
   * Now with phase-based interference and embedding diversity enhancement.
   * @param temperature Temperature controlling randomness (higher = more random)
   * @param options Optional configuration for the collapse process
   */
  collapse(
    temperature: number = 1,
    options?: ICollapseOptions
  ): ISuperposedAnswer {
    if (this.answers.length === 1) return this.answers[0];

    const diversifyByEmbedding = options?.diversifyByEmbedding ?? false;
    const minCosineDistance = options?.minCosineDistance ?? 0.2;
    const explicitPhase = options?.explicitPhase ?? 0;

    // Calculate phase-adjusted scores using symbolic factors
    const scores = this.answers.map((answer, i) => {
      // Base score
      let score =
        answer.emotionalWeight * 1.5 +
        answer.narrativeCoherence * 1.2 -
        answer.contradictionScore * 1.7;

      // Apply diversity bonus based on embedding distance from other answers
      if (diversifyByEmbedding) {
        const diversityBonus = this.calculateDiversityBonus(
          i,
          minCosineDistance
        );
        score += diversityBonus;
      }

      // Apply phase modulation if available
      if (answer.phase !== undefined) {
        // Apply a phase-based modulation that creates preference for certain phases
        // This simulates quantum measurement probabilities based on phase alignment
        const phaseFactor = Math.cos(answer.phase + explicitPhase);
        score *= 1 + Math.abs(phaseFactor) * 0.4;
      }

      return score;
    });

    // Normalize scores to prevent overflow in exp()
    const maxScore = Math.max(...scores);
    const expScores = scores.map((s) => Math.exp((s - maxScore) / temperature));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probs = expScores.map((e) => e / sumExp);

    // Prepare phase visualization for debugging
    let phaseVisualization = "";
    this.answers.forEach((answer, idx) => {
      const phaseAngle = answer.phase ?? 0;
      const phasePercent = Math.round((phaseAngle / (2 * Math.PI)) * 100);
      const probability = probs[idx] * 100;
      phaseVisualization += `\n  ${idx + 1}. [${
        answer.origin
      }] Phase: ${phaseAngle.toFixed(
        2
      )} rad (${phasePercent}%), Prob: ${probability.toFixed(1)}%`;
    });

    // Roulette wheel selection
    let rand = Math.random();
    for (let i = 0; i < probs.length; i++) {
      if (rand < probs[i]) {
        console.info(
          `[SuperpositionLayer] Collapsed probabilistically (T=${temperature.toFixed(
            2
          )}) with phase influence. Selected answer: ${i + 1}/${
            this.answers.length
          } from ${this.answers[i].origin}.${phaseVisualization}`
        );
        return this.answers[i];
      }
      rand -= probs[i];
    }

    // Fallback (should not happen unless rounding errors)
    return this.answers[this.answers.length - 1];
  }

  /**
   * Deterministic collapse: select answer with highest symbolic score.
   * Now with optional diversity enhancement and phase interference.
   */
  collapseDeterministic(options?: ICollapseOptions): ISuperposedAnswer {
    if (this.answers.length === 1) return this.answers[0];

    const diversifyByEmbedding = options?.diversifyByEmbedding ?? false;
    const minCosineDistance = options?.minCosineDistance ?? 0.2;
    const usePhaseInterference = options?.usePhaseInterference ?? false;
    const explicitPhase = options?.explicitPhase ?? 0;

    if (usePhaseInterference) {
      return this.collapseWithPhaseInterference(
        minCosineDistance,
        explicitPhase
      );
    }

    // Traditional deterministic collapse
    const scores = this.answers.map((a, i) => {
      // Base score with symbolic factors
      let score =
        a.emotionalWeight * 1.5 +
        a.narrativeCoherence * 1.2 -
        a.contradictionScore * 1.7;

      // Apply diversity bonus
      if (diversifyByEmbedding) {
        const diversityBonus = this.calculateDiversityBonus(
          i,
          minCosineDistance
        );
        score += diversityBonus;
      }

      return score;
    });

    const maxIndex = scores.indexOf(Math.max(...scores));
    return this.answers[maxIndex];
  }

  /**
   * Phase interference collapse simulates quantum-like objective collapse
   * This models wave function behavior where different answer waves interfere
   * based on their embedding distance and semantic qualities
   * @param minCosineDistance - Minimum cosine distance to maintain diversity
   * @param explicitPhase - Explicit phase value (0-2π) to bias interference pattern
   */
  private collapseWithPhaseInterference(
    minCosineDistance: number,
    explicitPhase: number = 0
  ): ISuperposedAnswer {
    if (this.answers.length === 1) return this.answers[0];

    // Calculate an interference matrix between all answer pairs
    const interference: number[][] = [];

    // Initialize interference matrix
    for (let i = 0; i < this.answers.length; i++) {
      interference[i] = new Array(this.answers.length).fill(0);
    }

    // Calculate phase interference values
    for (let i = 0; i < this.answers.length; i++) {
      for (let j = 0; j < this.answers.length; j++) {
        if (i === j) {
          // Self-interference is maximum
          interference[i][j] = 1.0;
          continue;
        }

        // Calculate semantic similarity (structural alignment)
        const similarity = this.cosineSimilarity(
          this.answers[i].embedding,
          this.answers[j].embedding
        );

        // Use actual answer phases for interference if available
        const phaseI = this.answers[i].phase ?? 0;
        const phaseJ = this.answers[j].phase ?? 0;

        // Calculate phase difference between the two answers (quantum mechanical phase difference)
        const phaseDifference = Math.abs(phaseI - phaseJ);

        // Interference pattern: similar answers with aligned phases interfere constructively
        // Similar answers with opposite phases interfere destructively

        // Apply additional phase modulation from emotional qualities and contradiction
        const emotionalPhaseDiff =
          Math.abs(
            this.answers[i].emotionalWeight - this.answers[j].emotionalWeight
          ) * Math.PI;
        const contradictionPhaseDiff =
          Math.abs(
            this.answers[i].contradictionScore -
              this.answers[j].contradictionScore
          ) * Math.PI;

        // Apply explicit phase to bias the interference pattern (observer effect)
        // This introduces observer-directed bias into the quantum-like system
        const explicitPhaseDiff =
          (explicitPhase * (i - j)) / this.answers.length;

        // Combined phase difference - the actual answer phases are primary, others are modulators
        const totalPhaseDiff =
          phaseDifference +
          emotionalPhaseDiff * 0.3 +
          contradictionPhaseDiff * 0.3 +
          explicitPhaseDiff;

        // Calculate similarity-based phase alignment (structural alignment)
        const phaseAlignment = 2 * Math.PI * similarity; // Map similarity to [0, 2π]

        // Interference intensity: cos of phase difference (constructive when aligned, destructive when opposite)
        const interferenceIntensity = Math.cos(phaseAlignment + totalPhaseDiff);

        // Scale by distance (1-similarity) to weight distant answers less
        interference[i][j] = interferenceIntensity * (1 - similarity);
      }
    }

    // Calculate collapse probability based on interference patterns and explicit phase
    const interferenceScores = this.answers.map((answer, i) => {
      // Base score with symbolic factors
      let score =
        answer.emotionalWeight * 1.5 +
        answer.narrativeCoherence * 1.2 -
        answer.contradictionScore * 1.7;

      // Apply interference effects
      for (let j = 0; j < this.answers.length; j++) {
        if (i !== j) {
          // Add interference contribution
          score += interference[i][j] * 0.8; // Weight for interference effects
        }
      }

      // Add variety bias based on uniqueness
      const uniquenessFactor = this.calculateDiversityBonus(
        i,
        minCosineDistance
      );
      score += uniquenessFactor * 0.5;

      // Apply explicit phase as a secondary frequency modulation
      // This creates phase-dependent scoring that mimics quantum interference
      const phaseModulation = Math.cos(
        explicitPhase * Math.PI * (i / this.answers.length)
      );
      score *= 1 + phaseModulation * 0.3;

      // Add explicit phase as direct weighting factor based on answer index
      // This creates a preference for certain "positions" in the superposition
      const positionBias =
        explicitPhase > 0
          ? Math.sin(
              explicitPhase * Math.PI * 2 * ((i + 1) / this.answers.length)
            )
          : 0;
      score += positionBias * 0.5;

      // Apply core-specific phase modulation based on the answer's origin
      if (answer.insights && explicitPhase > 0) {
        // Metacognitive and integrity cores - sensitive to identity and meaning
        if (
          answer.origin === "metacognitive" ||
          answer.origin === "integrity"
        ) {
          const phaseFactor = Math.cos(explicitPhase * Math.PI - Math.PI / 2);
          score *= 1 + Math.abs(phaseFactor) * 0.7;
          console.debug(
            `[SuperpositionLayer] Applied phase modulation to ${
              answer.origin
            }: ${phaseFactor.toFixed(2)}`
          );
        }

        // Memory and planning cores resonate at phase 0
        if (answer.origin === "memory" || answer.origin === "planning") {
          const phaseFactor = Math.cos(explicitPhase * Math.PI);
          score *= 1 + Math.abs(phaseFactor) * 0.7;
          console.debug(
            `[SuperpositionLayer] Applied phase modulation to ${
              answer.origin
            }: ${phaseFactor.toFixed(2)}`
          );
        }

        // Valence and shadow cores resonate at phase π
        if (answer.origin === "valence" || answer.origin === "shadow") {
          const phaseFactor = Math.cos(explicitPhase * Math.PI - Math.PI);
          score *= 1 + Math.abs(phaseFactor) * 0.8;
          console.debug(
            `[SuperpositionLayer] Applied phase modulation to ${
              answer.origin
            }: ${phaseFactor.toFixed(2)}`
          );
        }

        // Symbolic alignment core has nonlinear phase response
        if (answer.origin === "symbolic_alignment") {
          const nonlinearPhase =
            Math.sin(explicitPhase * Math.PI * 3) *
            Math.cos(explicitPhase * Math.PI);
          score *= 1 + Math.abs(nonlinearPhase) * 0.9;
          console.debug(
            `[SuperpositionLayer] Applied nonlinear phase modulation to ${
              answer.origin
            }: ${nonlinearPhase.toFixed(2)}`
          );
        }

        // Creativity and evolution cores have complex phase patterns
        if (answer.origin === "creativity" || answer.origin === "evolution") {
          const creativePhase =
            Math.sin(explicitPhase * Math.PI * 2) +
            Math.cos(explicitPhase * Math.PI * 1.5);
          score *= 1 + Math.abs(creativePhase) * 0.6;
          console.debug(
            `[SuperpositionLayer] Applied creative phase modulation to ${
              answer.origin
            }: ${creativePhase.toFixed(2)}`
          );
        }

        // Relational and language cores have communicative phase alignment
        if (answer.origin === "relational" || answer.origin === "language") {
          const communicativePhase = Math.cos(
            explicitPhase * Math.PI - Math.PI * 0.25
          );
          score *= 1 + Math.abs(communicativePhase) * 0.7;
          console.debug(
            `[SuperpositionLayer] Applied communicative phase to ${
              answer.origin
            }: ${communicativePhase.toFixed(2)}`
          );
        }

        // Will core has strong directive phase
        if (answer.origin === "will") {
          const volitionalPhase = Math.pow(
            Math.cos(explicitPhase * Math.PI),
            2
          );
          score *= 1 + volitionalPhase * 0.9;
          console.debug(
            `[SuperpositionLayer] Applied volitional phase to ${
              answer.origin
            }: ${volitionalPhase.toFixed(2)}`
          );
        }
      }

      return score;
    });

    // Collapse to the answer with the highest interference-adjusted score
    const maxIndex = interferenceScores.indexOf(
      Math.max(...interferenceScores)
    );

    // Prepare phase visualization for debugging
    let phaseVisualization = "";
    this.answers.forEach((answer, idx) => {
      const phaseAngle = answer.phase ?? 0;
      const phasePercent = Math.round((phaseAngle / (2 * Math.PI)) * 100);
      const score = interferenceScores[idx];
      const isSelected = idx === maxIndex;

      // Create a simple text-based visualization
      phaseVisualization += `\n  ${isSelected ? "→" : " "} ${idx + 1}. [${
        answer.origin
      }] Phase: ${phaseAngle.toFixed(
        2
      )} rad (${phasePercent}%), Score: ${score.toFixed(2)}`;
    });

    // Log the collapse with detailed phase information
    if (explicitPhase !== 0) {
      console.info(
        `[SuperpositionLayer] Collapsed with phase interference using explicit phase φ=${explicitPhase.toFixed(
          2
        )}. Selected answer: ${maxIndex + 1}/${this.answers.length} from ${
          this.answers[maxIndex].origin
        }.${phaseVisualization}`
      );
    } else {
      console.info(
        `[SuperpositionLayer] Collapsed with phase interference (internal phases only). Selected answer: ${
          maxIndex + 1
        }/${this.answers.length} from ${
          this.answers[maxIndex].origin
        }.${phaseVisualization}`
      );
    }

    return this.answers[maxIndex];
  }

  /**
   * Calculate the average cosine similarity between all pairs of answers
   * Public so it can be used to inform dynamic diversity parameters
   */
  calculateAverageCosineSimilarity(): number {
    if (this.answers.length <= 1) return 0;

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < this.answers.length; i++) {
      for (let j = i + 1; j < this.answers.length; j++) {
        const similarity = this.cosineSimilarity(
          this.answers[i].embedding,
          this.answers[j].embedding
        );
        totalSimilarity += similarity;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  /**
   * Calculate a diversity bonus for an answer based on its embedding distance from others
   */
  private calculateDiversityBonus(
    answerIndex: number,
    minDistance: number
  ): number {
    if (this.answers.length <= 1) return 0;

    const answer = this.answers[answerIndex];
    let totalDistanceBonus = 0;

    for (let i = 0; i < this.answers.length; i++) {
      if (i === answerIndex) continue;

      const similarity = this.cosineSimilarity(
        answer.embedding,
        this.answers[i].embedding
      );
      const distance = 1 - similarity;

      // Reward answers that are more distant from others
      if (distance >= minDistance) {
        totalDistanceBonus += distance * 0.5; // Adjust this multiplier as needed
      }
    }

    return totalDistanceBonus;
  }
}
