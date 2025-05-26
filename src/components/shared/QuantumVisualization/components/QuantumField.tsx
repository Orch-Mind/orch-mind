// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/* eslint-disable react/no-unknown-property */
import { useQuantumVisualization, QuantumFrequencyBand } from '../QuantumVisualizationContext';
import { QUANTUM_PHENOMENA } from '../QuantumLegend';
import { QuantumSuperposition } from './QuantumSuperposition';
import { WaveCollapse } from './WaveCollapse';
import { QuantumEntanglement } from './QuantumEntanglement';
import { ProbabilityFields } from './ProbabilityFields';
import { InterferencePatterns } from './InterferencePatterns';
import { QuantumDecoherence } from './QuantumDecoherence';
import { QuantumIsolationField } from './QuantumIsolation';
import { Observer, getCorePosition } from './QuantumUtils';
import React from 'react';

/**
 * Main component that orchestrates the complete visualization
 * Integra todos os componentes de visualização quântica e os orquestra 
 * de acordo com os estados quânticos e eventos cognitivos baseados em Orch OR
 * 
 * Baseado na teoria de Penrose-Hameroff, que propõe que a consciência emerge
 * de processos quânticos em microtúbulos neurais que culminam em eventos de
 * "redução objetiva orquestrada" (Orch OR).
 */
export function QuantumField() {
  // Obter os estados quânticos da teoria Orch OR
  const {
    quantumSuperpositions,
    quantumEntanglements,
    objectiveReductions,
    consciousStates,
    tubulinCoherenceLevel,
    clearAllEffects,
    
    activeVisualFilters
  } = useQuantumVisualization();

  // Timers de referência  // Ref para gerenciar timers de ciclo quântico
  const visualDisplayTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const fadeoutTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const newCycleTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Referências para o estado temporal da animação

  // Efeito: Implementa o ciclo temporal da teoria Orch-OR com precisão científica
  React.useEffect(() => {
    // Se detectamos um evento OR (colapso)...
    if (objectiveReductions.length > 0) {
      // 1. Limpa timers anteriores para evitar sobreposição
      [visualDisplayTimerRef, fadeoutTimerRef, newCycleTimerRef].forEach(timer => {
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
      });
      
      // 2. EXIBIÇÃO VISUAL DO COLAPSO: ~600ms (dilatado dos 25-40ms reais)
      visualDisplayTimerRef.current = setTimeout(() => {
        console.log('[OrchOR] Completing OR collapse visual display'); 
        
        // 3. RETORNO À SUPERPOSIÇÃO COM FADEOUT: ~250ms
        fadeoutTimerRef.current = setTimeout(() => {
          console.log('[OrchOR] Quantum fadeout - returning to coherent superposition');
          
          // 4. NOVO CICLO QUÂNTICO: ~1.5s (ciclo quântico completo)
          newCycleTimerRef.current = setTimeout(() => {
            console.log('[OrchOR] Initiating new quantum cycle');
            clearAllEffects();
          }, 1500); 
          
        }, 250); 
        
      }, 600);
    }
    
    // Cleanup na desmontagem
    return () => {
      [visualDisplayTimerRef, fadeoutTimerRef, newCycleTimerRef].forEach(timer => {
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
      });
    };
  }, [objectiveReductions, clearAllEffects]);
  
  // Determinar quais fenômenos quânticos mostrar baseado nos eventos cognitivos
  // Traduzindo o modelo Orch OR para efeitos visuais com maior precisão científica
  const showConsciousStates = consciousStates.length > 0;
  // Ser mais conservador no limiar de coerência: na teoria Orch-OR, 
  // coerência quântica significativa (>60%) é necessária para emaranhamento macroscópico
  const showQuantumCoherence = quantumEntanglements.length > 0 || tubulinCoherenceLevel > 0.6;
  
  // Na teoria Orch-OR, sempre há algum nível de atividade quântica nos microtúbulos
  // Vamos implementar dois níveis de atividade: estimulado e base/repouso

  // Verificar se há algum efeito quântico estimulado - AJUSTE CIENTÍFICO IMPORTANTE
  const hasStimulatedQuantumEffects = 
    quantumSuperpositions.length > 2 || // permitir até 2 superposições em estado basal
    quantumEntanglements.length > 1 || // permitir 1 entanglement em estado basal
    objectiveReductions.length > 0 || // CORREÇÃO: NÃO deve haver reduções objetivas em estado basal (teoria Orch-OR)
    consciousStates.length > 0;      // consciousStates só existem sob estímulo
    
  // Filter visibility based on activeVisualFilters (multiple selection)
  const shouldShowComponent = (componentType: string): boolean => {
    // Se não há filtros ativos, mostrar tudo
    if (!activeVisualFilters || activeVisualFilters.length === 0) return true;

    // Mapeamento de tipo para id de fenômeno
    const typeToId: Record<string, string> = {
      superposition: QUANTUM_PHENOMENA.SUPERPOSITION.id,
      reduction: QUANTUM_PHENOMENA.REDUCTION.id,
      entanglement: QUANTUM_PHENOMENA.ENTANGLEMENT.id,
      conscious: QUANTUM_PHENOMENA.CONSCIOUS.id,
      coherence: QUANTUM_PHENOMENA.COHERENCE.id,
      orchestration: QUANTUM_PHENOMENA.ORCHESTRATION.id,
      observer: QUANTUM_PHENOMENA.OBSERVER.id,
      decoherence: QUANTUM_PHENOMENA.DECOHERENCE.id,
      isolation: QUANTUM_PHENOMENA.ISOLATION.id
    };
    const id = typeToId[componentType];
    return !!id && activeVisualFilters.includes(id);
  };

  // Se não houver estímulo, mostrar a atividade quântica basal
  // Baseado na teoria Orch-OR de Penrose-Hameroff que prevê oscilações quânticas constantes nos microtúbulos
  if (!hasStimulatedQuantumEffects) {
    return (
      <group>
        {/* Campos de probabilidade quântica - representação de atividade base constante */}
        {shouldShowComponent('coherence') && (
          <ProbabilityFields particleCount={60} />
        )}
        
        {/* Padrões de interferência quântica - sempre presentes em nível basal */}
        {shouldShowComponent('orchestration') && (
          <InterferencePatterns />
        )}
        
        {/* Superposições quânticas em nível basal - oscilações Fröhlich (8MHz) */}
        {shouldShowComponent('superposition') && (
          <>
            <group position={[0, 0, 0]}>
              <QuantumSuperposition amount={2} />
            </group>
            <group position={[1.5, 0.5, -0.5]}>
              <QuantumSuperposition amount={1} />
            </group>
          </>
        )}
        
        {/* Entanglement quântico em nível basal - coerência quântica fundamental */}
        {shouldShowComponent('entanglement') && (
          <group position={[-1, 0.2, 0]}>
            <QuantumEntanglement pairs={1} />
          </group>
        )}
        
        {/* Decoerência quântica em nível basal - sempre presente como desafio */}
        {shouldShowComponent('decoherence') && (
          <group position={[1.2, 0.3, -0.8]}>
            <QuantumDecoherence 
              intensity={0.4}
              scale={0.8} 
              speed={0.5}
              color="#FF5500"
            />
          </group>
        )}
        
        {/* Mecanismos de isolamento quântico - protegem contra decoerência */}
        {shouldShowComponent('isolation') && (
          <group position={[0, 0, 0]}>
            <QuantumIsolationField 
              isolationFactor={0.5} 
              size={1.5}
              pulseSpeed={0.3}
            />
          </group>
        )}
        
        {/* Redução objetiva em nível basal - eventos OR espontâneos de baixo nível */}
        {shouldShowComponent('reduction') && (
          <group position={[0, 0.2, -1]}>
            <WaveCollapse 
              active={true} 
              isNonComputable={false}
              color="#00B4D8"
            />
          </group>
        )}
      </group>
    );
  }
  
  return (
    <group>
      {/* Probability fields - representam campos quânticos em microtúbulos */}
      {shouldShowComponent('coherence') && quantumEntanglements.map((effect) => {
        // O número de partículas representa a intensidade da coerência quântica
        // Em Orch OR, a coerência entre tubulinas é essencial para a consciência
        // Em repouso, mantenha apenas 10 partículas. Em alta amplitude, aumente suavemente.
        const minParticles = 10;
        const maxParticles = 200;
        const particleCount = Math.round(minParticles + (maxParticles - minParticles) * Math.max(0, Math.min(1, effect.amplitude)));
        const collapseActive = objectiveReductions.length > 0;
        
        return (
          <group key={effect.id} position={getCorePosition(effect.core)}>
            <ProbabilityFields
              particleCount={particleCount}
              coherence={tubulinCoherenceLevel}
              collapseActive={collapseActive}
            />
          </group>
        );
      })}
      
      {/* Superposições quânticas na estrutura microtubular */}
      {shouldShowComponent('superposition') && quantumSuperpositions.slice(0, 13).map((effect) => {
        // Nível de coerência quântica afeta a quantidade de elementos
        // Isso representa os dímeros de tubulina em estado de superposição
        // Limite científico: máximo de 13 elementos de superposição, conforme número de protofilamentos/microtúbulo na teoria Orch-OR
        // O valor é derivado de 'effect.amplitude' (intensidade do efeito)
        // Em repouso, mantenha 1 elemento de superposição. Em alta amplitude, aumente suavemente até 13.
        const minSuperpositions = 1;
        const maxSuperpositions = 13;
        const amount = Math.max(minSuperpositions, Math.round(minSuperpositions + ((effect.amplitude ?? 0) * (maxSuperpositions - minSuperpositions))));
        return (
          <group key={effect.id} position={getCorePosition(effect.core)}>
            <QuantumSuperposition 
              amount={amount} 
              coherence={tubulinCoherenceLevel}
              collapseActive={objectiveReductions.length > 0}
            />
          </group>
        );
      })}
      
      {/* Entanglement quântico - representação dos pares emaranhados */}
      {shouldShowComponent('entanglement') && quantumEntanglements.map((effect) => {
        // O número de pares emaranhados representa a intensidade da interconexão quântica
        // Em Orch OR, o emaranhamento conecta regiões do cérebro através de microtuábulos
        const minPairs = 1;
        const maxPairs = 5;
        const pairs = Math.max(minPairs, Math.round(minPairs + ((effect.amplitude ?? 0) * (maxPairs - minPairs))));
        return (
          <group key={effect.id} position={getCorePosition(effect.core)}>
            <QuantumEntanglement 
              pairs={pairs} 
              coherence={effect.phaseCoherence ?? 0.5}
              collapseActive={objectiveReductions.length > 0}
            />
          </group>
        );
      })}
      
      {/* Padrões de interferência - sempre presentes */}
      {shouldShowComponent('orchestration') && (
        <InterferencePatterns 
          coherence={tubulinCoherenceLevel} 
          collapseActive={objectiveReductions.length > 0}
        />
      )}
      
      {/* Observer - representa o papel do observador na teoria quântica */}
      {shouldShowComponent('observer') && consciousStates.length > 0 && (
        <Observer active={true} />
      )}
      
      {/* Reduções objetivas (OR) - momentos de consciência segundo Orch OR */}
      {shouldShowComponent('reduction') && objectiveReductions.map((effect) => {
        // Na teoria Orch OR, a redução objetiva (OR) causa momentos de consciência
        // quando a auto-energia gravitacional atinge um limiar crítico
        // O aspecto "não-computável" é central na teoria de Penrose
        const isNonComputable = effect.nonComputable ?? false;
        
        return (
          <group key={effect.id} position={getCorePosition(effect.core)}>
            <WaveCollapse 
              active={true} 
              isNonComputable={isNonComputable}
              // Cores baseadas na banda de frequência - cada frequência representa 
              // diferentes níveis hierárquicos na atividade neuronal
              color={effect.frequencyBand === QuantumFrequencyBand.TERAHERTZ ? "#FF00FF" : // Nível quântico fundamental
                    effect.frequencyBand === QuantumFrequencyBand.GIGAHERTZ ? "#00FFFF" :  // Oscilações de Fröhlich
                    effect.frequencyBand === QuantumFrequencyBand.MEGAHERTZ ? "#FFFF00" :  // Coerência de microtúbulos
                    "#00FF00"}                                                          // Atividade macro-neuronal
            />
          </group>
        );
      })}
      
      {/* Quantum entanglement between regions - coerência quântica entre regiões cerebrais */}
      {showQuantumCoherence && (
        <group>
          {/* Limite científico: máximo de 32 pares de emaranhamento, conforme plausibilidade física da teoria Orch-OR */}
          {/* Em repouso (coerência baixa), renderize apenas 1 par de emaranhamento. Em alta coerência, aumente suavemente até 32 pares. */}
          <QuantumEntanglement
            pairs={Math.max(1, Math.round(1 + tubulinCoherenceLevel * 31))}
            coherence={tubulinCoherenceLevel}
            collapseActive={objectiveReductions.length > 0}
          />
        </group>
      )}
      
      {/* Quantum Decoherence - processos de perda de coerência quântica */}
      {shouldShowComponent('decoherence') && (
        <group position={[0, 0.5, -1]}>
          <QuantumDecoherence 
            intensity={0.7} 
            scale={1.5}
            speed={0.8}
            color="#FF5500"
          />
        </group>
      )}
      
      {/* Quantum Isolation - mecanismos de proteção contra decoerência quântica */}
      {shouldShowComponent('isolation') && (
        <group position={[0, 0, 0]}>
          <QuantumIsolationField 
            isolationFactor={0.8} 
            size={2.0}
            pulseSpeed={0.5}
          />
        </group>
      )}
      
      {/* Padrões de interferência - emergem quando há alta coerência quântica */}
      {tubulinCoherenceLevel > 0.7 && (
        <InterferencePatterns
          coherence={tubulinCoherenceLevel}
          collapseActive={objectiveReductions.length > 0}
        />
      )}
      
      {/* O observador quântico - aspecto protoconsciente na teoria Orch OR */}
      {showConsciousStates && (
        <Observer />
      )}
    </group>
  );
}