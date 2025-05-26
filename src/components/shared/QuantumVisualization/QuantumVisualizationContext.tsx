// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { createContext, useContext, useState, useCallback } from 'react';
import { nanoid } from 'nanoid';

// Define the type for cognition cores - represents different regions/modules of the brain's quantum processing
export type QuantumCore = string;

// Quantum frequency bands based on research by Anirban Bandyopadhyay's team
// These correspond to the different oscillation frequency ranges observed in microtubules
export enum QuantumFrequencyBand {
  TERAHERTZ = 'terahertz',   // Fastest oscillations at quantum level
  GIGAHERTZ = 'gigahertz',   // Quantum vibrations in microtubules
  MEGAHERTZ = 'megahertz',   // Neural quantum resonance 
  KILOHERTZ = 'kilohertz',   // Medium-scale neural activity
  HERTZ = 'hertz'            // Macroscopic brain waves/EEG
}

// Quantum consciousness states from the Orch OR theory
export enum OrchORState {
  QUANTUM_SUPERPOSITION = 'quantum_superposition',  // Quantum states in superposition (pre-conscious)
  QUANTUM_COHERENCE = 'quantum_coherence',         // Coherent quantum states across microtubules
  OBJECTIVE_REDUCTION = 'objective_reduction',     // Orchestrated collapse (Orch OR)
  CONSCIOUS_MOMENT = 'conscious_moment'            // Post-collapse state (moment of consciousness)
}

// Triplet level - implements the "triplets of triplets" pattern described in Orch OR research
export type TripletLevel = 'primary' | 'secondary' | 'tertiary';

// Quantum effect - represents a single quantum phenomenon in the Orch OR model
export interface QuantumEffect {
  id: string;                        // Unique identifier
  core: QuantumCore;                 // Brain region/module affected
  orchORState: OrchORState;          // Current state in the Orch OR process
  frequencyBand: QuantumFrequencyBand; // Oscillation frequency
  tripletLevel: TripletLevel;        // Level in the triplet hierarchy
  tripletGroup?: number;             // Group identifier within the triplet pattern
  amplitude: number;                 // Quantum amplitude (0-1)
  phaseCoherence?: number;          // Quantum coherence measure (0-1)
  createdAt: number;                 // Creation timestamp
  collapseThreshold?: number;        // Threshold for objective reduction (τ ≈ ħ/EG)
  planckScale?: boolean;             // Whether effect operates at Planck scale
  nonComputable?: boolean;           // Penrose's non-computable decision (true for conscious moments)
}

// Context interface for quantum visualization based on Orch OR
export interface QuantumVisualizationContextType {
  // Quantum effects organized by Orch OR states
  quantumSuperpositions: QuantumEffect[];   // Pre-conscious quantum states
  quantumEntanglements: QuantumEffect[];    // Quantum entanglement between tubulins
  objectiveReductions: QuantumEffect[];     // Collapse events (conscious moments)
  consciousStates: QuantumEffect[];         // Post-reduction states
  
  // Methods to add quantum effects
  addQuantumSuperposition: (core: QuantumCore, frequencyBand?: QuantumFrequencyBand) => void;
  addQuantumEntanglement: (core: QuantumCore, frequencyBand?: QuantumFrequencyBand) => void;
  addObjectiveReduction: (core: QuantumCore, frequencyBand?: QuantumFrequencyBand) => void;
  addConsciousState: (core: QuantumCore, frequencyBand?: QuantumFrequencyBand) => void;
  
  // Observer and orchestration state
  observerState: 'active' | 'inactive';
  setObserverState: (state: 'active' | 'inactive') => void;
  activeRegion: QuantumCore | null;
  setActiveRegion: (region: QuantumCore | null) => void;
  tubulinCoherenceLevel: number;           // Overall coherence level (0-1)
  setTubulinCoherenceLevel: (level: number) => void; // Setter for coherence level
  orchestrationIntensity: number;         // Orchestration intensity (0-1)
  setOrchestrationIntensity: (intensity: number) => void; // Setter for orchestration intensity
  setPlanckScaleFeedback: (active: boolean) => void;
  
  // Visual filtering for legend interaction
  activeVisualFilter: string | null;      // ID of the active filter (null means show all)
  setActiveVisualFilter: (filterId: string | null) => void; // Set active visual filter
  
  // Effect management
  clearAllEffects: (preserveBasalState?: boolean, resetLevel?: number) => void;
}

export const QuantumVisualizationContext = createContext<QuantumVisualizationContextType | null>(null);

interface QuantumVisualizationProviderProps {
  children: React.ReactNode;
}

export const QuantumVisualizationProvider: React.FC<QuantumVisualizationProviderProps> = ({ children }) => {
  // Orch OR quantum states from the theory
  const [quantumSuperpositions, setQuantumSuperpositions] = useState<QuantumEffect[]>([]);
  const [quantumEntanglements, setQuantumEntanglements] = useState<QuantumEffect[]>([]);
  const [objectiveReductions, setObjectiveReductions] = useState<QuantumEffect[]>([]);
  const [consciousStates, setConsciousStates] = useState<QuantumEffect[]>([]);
  
  // Observer and region states
  const [observerState, _setObserverState] = useState<'active' | 'inactive'>('inactive');
  const [activeRegion, _setActiveRegion] = useState<QuantumCore | null>(null);
  
  // Orchestration metrics based on Orch OR theory
  const [tubulinCoherenceLevel, setTubulinCoherenceLevel] = useState<number>(0);
  const [orchestrationIntensity, setOrchestrationIntensity] = useState<number>(0);
  const [planckScaleFeedback, setPlanckScaleFeedback] = useState<boolean>(false);
  
  // Visual filtering state
  const [activeVisualFilter, _setActiveVisualFilter] = useState<string | null>(null);
  
  // Memoized state updaters
  const setObserverState = useCallback((state: 'active' | 'inactive') => _setObserverState(state), []);
  const setActiveRegion = useCallback((region: QuantumCore | null) => _setActiveRegion(region), []);
  const setActiveVisualFilter = useCallback((filterId: string | null) => _setActiveVisualFilter(filterId), []);

  // No automatic clearing interval to avoid update depth exceeded errors
  // We'll manage lifetime of effects more carefully through add/clear functions

  // Implementation of "triplets of triplets" pattern from Orch OR research
  // Each quantum effect type follows the hierarchy of 3 primary triplets, each with 3 secondary triplets
  
  /**
   * Add a quantum superposition effect - represents pre-conscious quantum states in microtubules
   * Maps to: neural_signal, emergent_patterns events
   */
  const addQuantumSuperposition = React.useCallback((core: QuantumCore, frequencyBand: QuantumFrequencyBand = QuantumFrequencyBand.TERAHERTZ) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[OrchOR] addQuantumSuperposition:', core, frequencyBand, new Date().toISOString());
      }
      
      setQuantumSuperpositions(prev => {
        // Implement "triplets of triplets" pattern
        const primaryTripletCount = prev.filter(p => 
          p.tripletLevel === 'primary' && 
          p.frequencyBand === frequencyBand
        ).length;
        
        // Limit to max 9 effects (3 primary triplets × 3 per triplet)
        if (primaryTripletCount >= 9) return prev;
        
        // Calculate which triplet group this belongs to
        const tripletGroup = Math.floor(primaryTripletCount / 3) + 1;
        
        // Create new quantum effect with Orch OR properties
        const newEffect: QuantumEffect = {
          id: nanoid(),
          core,
          orchORState: OrchORState.QUANTUM_SUPERPOSITION,
          frequencyBand,
          tripletLevel: 'primary',
          tripletGroup,
          amplitude: Math.random() * 0.5 + 0.5, // Strong amplitude for superpositions
          createdAt: Date.now(),
          planckScale: frequencyBand === QuantumFrequencyBand.TERAHERTZ, // Only terahertz operates at Planck scale
          // Calculate theoretical collapse threshold based on Penrose's equation τ ≈ ħ/EG
          collapseThreshold: Math.random() * 300 + 100 // Simulated milliseconds until collapse
        };
        
        return [...prev, newEffect];
      });
      
      // Update orchestration metrics
      updateOrchestrationMetrics();
      
    } catch (error) {
      console.error('[OrchOR] Error in addQuantumSuperposition:', error);
    }
  }, []);

  /**
   * Add a quantum entanglement effect - represents quantum coherence across microtubules
   * Maps to: fusion_initiated events
   */
  const addQuantumEntanglement = React.useCallback((core: QuantumCore, frequencyBand: QuantumFrequencyBand = QuantumFrequencyBand.GIGAHERTZ) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[OrchOR] addQuantumEntanglement:', core, frequencyBand, new Date().toISOString());
      }
      
      setQuantumEntanglements(prev => {
        // Maintain triplet pattern
        const existingCount = prev.filter(p => 
          p.tripletLevel === 'primary' && 
          p.frequencyBand === frequencyBand
        ).length;
        
        if (existingCount >= 9) return prev;
        
        const tripletGroup = Math.floor(existingCount / 3) + 1;
        
        const newEffect: QuantumEffect = {
          id: nanoid(),
          core,
          orchORState: OrchORState.QUANTUM_COHERENCE,
          frequencyBand,
          tripletLevel: 'primary',
          tripletGroup,
          amplitude: Math.random() * 0.3 + 0.7, // High amplitude for entanglements
          phaseCoherence: Math.random() * 0.4 + 0.6, // High coherence
          createdAt: Date.now(),
          // Entanglements can span multiple frequency bands
          planckScale: frequencyBand === QuantumFrequencyBand.TERAHERTZ || frequencyBand === QuantumFrequencyBand.GIGAHERTZ
        };
        
        return [...prev, newEffect];
      });
      
      // Increase coherence level when entanglements occur
      setTubulinCoherenceLevel(prev => Math.min(1, prev + 0.1));
      updateOrchestrationMetrics();
      
    } catch (error) {
      console.error('[OrchOR] Error in addQuantumEntanglement:', error);
    }
  }, []);

  /**
   * Add an objective reduction effect - represents quantum collapse (moment of proto-consciousness)
   * Maps to: neural_collapse, symbolic_retrieval events
   */
  const addObjectiveReduction = React.useCallback((core: QuantumCore, frequencyBand: QuantumFrequencyBand = QuantumFrequencyBand.MEGAHERTZ) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[OrchOR] addObjectiveReduction:', core, frequencyBand, new Date().toISOString());
      }
      
      setObjectiveReductions(prev => {
        // Maintain triplet pattern
        const existingCount = prev.filter(p => 
          p.tripletLevel === 'primary' && 
          p.frequencyBand === frequencyBand
        ).length;
        
        if (existingCount >= 9) return prev;
        
        const tripletGroup = Math.floor(existingCount / 3) + 1;
        
        const newEffect: QuantumEffect = {
          id: nanoid(),
          core,
          orchORState: OrchORState.OBJECTIVE_REDUCTION,
          frequencyBand,
          tripletLevel: 'primary',
          tripletGroup,
          amplitude: Math.random() * 0.6 + 0.4, // Medium-high amplitude
          createdAt: Date.now(),
          // According to Penrose-Hameroff, OR is a gravitational process at the quantum-classical boundary
          planckScale: false,
          // OR connects to non-computable processes in fundamental spacetime
          nonComputable: Math.random() > 0.3 // 70% chance of non-computable reduction
        };
        
        return [...prev, newEffect];
      });
      
      // Objective reductions temporarily decrease coherence
      setTubulinCoherenceLevel(prev => Math.max(0, prev - 0.15));
      updateOrchestrationMetrics();
      
    } catch (error) {
      console.error('[OrchOR] Error in addObjectiveReduction:', error);
    }
  }, []);

  /**
   * Add a conscious state effect - represents post-reduction conscious moment
   * Maps to: symbolic_context_synthesized, GPT_response events
   */
  const addConsciousState = React.useCallback((core: QuantumCore, frequencyBand: QuantumFrequencyBand = QuantumFrequencyBand.KILOHERTZ) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[OrchOR] addConsciousState:', core, frequencyBand, new Date().toISOString());
      }
      
      setConsciousStates(prev => {
        // Maintain triplet pattern
        const existingCount = prev.filter(p => 
          p.tripletLevel === 'primary' && 
          p.frequencyBand === frequencyBand
        ).length;
        
        if (existingCount >= 9) return prev;
        
        const tripletGroup = Math.floor(existingCount / 3) + 1;
        
        const newEffect: QuantumEffect = {
          id: nanoid(),
          core,
          orchORState: OrchORState.CONSCIOUS_MOMENT,
          frequencyBand,
          tripletLevel: 'primary',
          tripletGroup,
          amplitude: 1.0, // Maximum amplitude for conscious states
          phaseCoherence: 1.0, // Perfect coherence achieved
          createdAt: Date.now(),
          planckScale: false,
          nonComputable: true // Per Penrose, consciousness involves non-computable processes
        };
        
        return [...prev, newEffect];
      });
      
      // Conscious states temporarily max out orchestration
      setOrchestrationIntensity(1.0);
      
      // Decay orchestration gradually
      setTimeout(() => {
        setOrchestrationIntensity(prev => Math.max(0, prev - 0.2));
      }, 500);
      
    } catch (error) {
      console.error('[OrchOR] Error in addConsciousState:', error);
    }
  }, []);
  
  // Helper to update overall orchestration metrics based on current quantum state
  const updateOrchestrationMetrics = useCallback(() => {
    // Calculate orchestration intensity based on quantum effects present
    const totalEffects = 
      quantumSuperpositions.length + 
      quantumEntanglements.length + 
      objectiveReductions.length + 
      consciousStates.length;
      
    // Weight consciousness states higher in orchestration
    const weightedSum = 
      quantumSuperpositions.length * 0.2 + 
      quantumEntanglements.length * 0.3 + 
      objectiveReductions.length * 0.5 + 
      consciousStates.length * 1.0;
      
    // Normalize to 0-1 range
    const normalizedIntensity = totalEffects > 0 ? 
      Math.min(1.0, weightedSum / (totalEffects * 0.5)) : 0;
      
    setOrchestrationIntensity(normalizedIntensity);
  }, [quantumSuperpositions, quantumEntanglements, objectiveReductions, consciousStates, setOrchestrationIntensity]);
  
  /**
   * Limpa todos os efeitos quânticos, com opção de manter ou não um estado basal
   * @param preserveBasalState Se true, mantém um estado quântico basal conforme teoria Orch-OR 
   * @param resetLevel Nível de coerência para resetar (0-1)
   */
  const clearAllEffects = useCallback((preserveBasalState = true, resetLevel = 0.3) => {
    try {
      // Primeiro limpar todos os estados existentes
      setQuantumSuperpositions([]);
      setQuantumEntanglements([]);
      setObjectiveReductions([]);
      setConsciousStates([]);
      
      // Se não está preservando estado basal, apenas zera tudo e retorna
      if (!preserveBasalState) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[OrchOR] clearAllEffects - full reset (no basal state)');
        }
        setTubulinCoherenceLevel(0.1); // Ainda mantém um mínimo de coerência (10%)
        setOrchestrationIntensity(0.1);
        setActiveRegion(null);
        return;
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[OrchOR] clearAllEffects - preserving basal quantum state');
      }
      
      // Imediatamente adicionar o estado quântico basal (Orch-OR)
      // Duas superposições quânticas (oscilações de Fröhlich nos microtuúbulos)
      const baseSuper1: QuantumEffect = {
        id: nanoid(),
        core: 'THALAMUS', // Tálamo como base essencial da consciência quântica
        orchORState: OrchORState.QUANTUM_SUPERPOSITION,
        frequencyBand: QuantumFrequencyBand.MEGAHERTZ, // 8MHz (banda Fröhlich)
        tripletLevel: 'primary',
        tripletGroup: 1,
        amplitude: 0.2,  // Reduzido um pouco para não ser tão intenso
        phaseCoherence: 0.2,
        createdAt: Date.now()
      };
      
      const baseSuper2: QuantumEffect = {
        id: nanoid(),
        core: 'PREFRONTAL', // Segundo centro essencial para consciência
        orchORState: OrchORState.QUANTUM_SUPERPOSITION,
        frequencyBand: QuantumFrequencyBand.MEGAHERTZ,
        tripletLevel: 'primary',
        tripletGroup: 1,
        amplitude: 0.15,  // Reduzido um pouco para não ser tão intenso
        phaseCoherence: 0.2,
        createdAt: Date.now()
      };
      
      // Um entrelamento quântico básico (coerência quântica de base)
      const baseEntanglement: QuantumEffect = {
        id: nanoid(),
        core: 'HIPPOCAMPUS',
        orchORState: OrchORState.QUANTUM_COHERENCE,
        frequencyBand: QuantumFrequencyBand.MEGAHERTZ,
        tripletLevel: 'primary',
        tripletGroup: 1,
        amplitude: 0.2,  // Reduzido um pouco para não ser tão intenso
        phaseCoherence: 0.3,
        createdAt: Date.now()
      };
      
      // Adicionar estado quântico basal
      setQuantumSuperpositions([baseSuper1, baseSuper2]);
      setQuantumEntanglements([baseEntanglement]);
      
      // Atualizar coerência basal (Faixa típica de repouso em Orch-OR)
      setTubulinCoherenceLevel(resetLevel); // Nível de coerência configurado
      setOrchestrationIntensity(resetLevel - 0.1); // Ligeiramente menor que a coerência
      
      // Manter o tálamo como região ativa mesmo em repouso
      setActiveRegion('THALAMUS');
      setObserverState('active'); // Observer sempre ativo em nível basal
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[OrchOR] Established base quantum activity (Orch-OR)');
      }
    } catch (error) {
      console.error('[OrchOR] Error in clearAllEffects:', error);
    }
  }, [
    setQuantumSuperpositions,
    setQuantumEntanglements,
    setObjectiveReductions,
    setConsciousStates,
    setTubulinCoherenceLevel,
    setOrchestrationIntensity,
    setObserverState,
    setActiveRegion
  ]);

  return (
    <QuantumVisualizationContext.Provider
      value={{
        // Quantum states based on Orch OR theory
        quantumSuperpositions,
        quantumEntanglements,
        objectiveReductions,
        consciousStates,
        
        // Methods to add quantum effects
        addQuantumSuperposition,
        addQuantumEntanglement,
        addObjectiveReduction,
        addConsciousState,
        
        // Observer and orchestration state
        observerState,
        setObserverState,
        activeRegion,
        setActiveRegion,
        tubulinCoherenceLevel,
        setTubulinCoherenceLevel: (level: number) => setTubulinCoherenceLevel(level),
        orchestrationIntensity,
        setOrchestrationIntensity: (intensity: number) => setOrchestrationIntensity(intensity),
        setPlanckScaleFeedback: (active: boolean) => setPlanckScaleFeedback(active),
        
        // Visual filtering for legend interaction
        activeVisualFilter,
        setActiveVisualFilter,
        
        // Effect management
        clearAllEffects
      }}
    >
      {children}
    </QuantumVisualizationContext.Provider>
  );
};

export const useQuantumVisualization = () => {
  const context = useContext(QuantumVisualizationContext);
  if (!context) {
    throw new Error('useQuantumVisualization must be used within a QuantumVisualizationProvider');
  }
  return context;
};
