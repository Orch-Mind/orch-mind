// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState, useEffect, useRef } from 'react';
import './QuantumVisualization.css';
import { QuantumVisualizationProvider, useQuantumVisualization, QuantumFrequencyBand, QuantumCore } from './QuantumVisualizationContext';
import { CognitionEvent } from '../../context/deepgram/types/CognitionEvent';
import { QuantumModel } from './index';
import { QuantumLegend } from './QuantumLegend';
// Import científico refinado da tradução cognitiva para fenômenos quânticos
import { mapCognitionEventToQuantumProperties } from './utils/CognitionMapper';

interface QuantumVisualizationContainerProps {
  cognitionEvents: CognitionEvent[] | null;
  width?: string;
  height?: string;
  showLegend?: boolean;
  lowPerformanceMode?: boolean; // Modo de baixa performance para dispositivos menos potentes
}

/**
 * Container principal para visualização quântica de eventos cognitivos segundo a teoria Orch-OR
 * 
 * Este componente implementa a interface visual para a teoria Penrose-Hameroff de
 * Redução Objetiva Orquestrada (Orch-OR), modelando a transformação de sinais neurais 
 * em fenômenos quânticos como superposição, emaranhamento e colapso (OR).
 * 
 * Simbolicamente, representa o conector entre processos neurais simbólicos e fenômenos quânticos,
 * servindo como interface cortical entre cognição e estruturas quânticas de Planck.
 */
export const QuantumVisualizationContainer: React.FC<QuantumVisualizationContainerProps> = ({
  cognitionEvents,
  width = '100%',
  height = '280px',
  showLegend = true,
  lowPerformanceMode = false
}) => {
  return (
    <QuantumVisualizationProvider>
      <QuantumVisualizationContent 
        cognitionEvents={cognitionEvents} 
        width={width} 
        height={height}
        showLegend={showLegend}
        lowPerformanceMode={lowPerformanceMode}
      />
    </QuantumVisualizationProvider>
  );
};

// Inner component to use hooks with context
const QuantumVisualizationContent: React.FC<QuantumVisualizationContainerProps> = ({
  cognitionEvents,
  width,
  height,
  showLegend,
  lowPerformanceMode = false
}) => {
  // Get quantum context functions from the Orch OR model - apenas os realmente utilizados
  const {
    // Estados quânticos realmente utilizados na renderização ou processamento
    quantumSuperpositions,
    quantumEntanglements,
    objectiveReductions,
    consciousStates,
    
    // Métodos para adicionar efeitos quânticos
    addQuantumSuperposition,
    addQuantumEntanglement,
    addObjectiveReduction,
    addConsciousState,
    setActiveRegion,
    
    // Métricas de orquestração utilizadas no processamento
    tubulinCoherenceLevel,
    orchestrationIntensity,
    setPlanckScaleFeedback,
    
    // Gerenciamento de efeitos
    clearAllEffects,
    setTubulinCoherenceLevel,
    setOrchestrationIntensity
  } = useQuantumVisualization();
  
  // Referência para rastrear se já inicializamos os efeitos quânticos basais
  const initializedRef = useRef(false);
  
  // Initialize quantum state effects - baseado na teoria Orch-OR, apenas UMA VEZ
  useEffect(() => {
    // Evitar múltiplas inicializações
    if (initializedRef.current) {
      return;
    }
    
    // Apenas reseta os estados uma vez para garantir início limpo
    clearAllEffects(); // Isso agora mantém um estado basal (Modificamos o clearAllEffects)
    
    // Marcar como inicializado para evitar chamadas repetidas
    initializedRef.current = true;
    
    // Coerencia e orquestração nos níveis iniciais adequados
    setTubulinCoherenceLevel(0.3); // Coerência inicial moderada 
    setOrchestrationIntensity(0.5); // Orquestração inicial moderada
    
    // Active region inicial - tálamo como integrador central
    setActiveRegion('THALAMUS');
  }, [clearAllEffects, setTubulinCoherenceLevel, setOrchestrationIntensity, setActiveRegion]);
  
  // State to control whether the legend is visible
  const [legendVisible, setLegendVisible] = useState(showLegend);
  
  // Ref para o container DOM
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Event processing - rastreia eventos processados por seus timestamps
  const processedEventTimestampsRef = React.useRef<Set<string>>(new Set());
  
  // Ref para controle de processamento
  const processingEventRef = React.useRef<boolean>(false);
  
  // Utilidade para identificar eventos de forma única por timestamp e tipo
  const getEventKey = (event: CognitionEvent): string => {
    return `${event.type}-${event.timestamp}`;
  };
  
  // REMOVIDO: O timer automático de reset estava causando problemas, fazendo tudo desaparecer
  
  /**
   * Processa um evento cognitivo e o traduz para fenômenos quânticos segundo a teoria Orch-OR
   * Esta função implementa a tradução científica entre cognição e fenômenos quânticos
   */
  const handleCognitionEvent = React.useCallback((event: CognitionEvent) => {
    // Usa o CognitionMapper para traduzir o evento cognitivo para propriedades quânticas
    const quantumProperties = mapCognitionEventToQuantumProperties(event);
    
    // Ajusta a coerência e intensidade de orquestração baseado no evento
    if (event.type === 'neural_collapse') {
      // Eventos de colapso reduzem temporariamente a coerência e aumentam orquestração
      const newCoherence = Math.max(0.1, tubulinCoherenceLevel * 0.7);
      setTubulinCoherenceLevel(newCoherence);
      
      const newIntensity = Math.min(1, orchestrationIntensity * 1.3);
      setOrchestrationIntensity(newIntensity);
      
      // No momento do colapso, adiciona um efeito de reduction (OR)
      addObjectiveReduction(quantumProperties.core as QuantumCore);
      
      // Com cada colapso, atualizamos a região ativa
      setActiveRegion(quantumProperties.core as QuantumCore);
    } 
    else if (event.type === 'neural_signal') {
      // Sinais neurais aumentam a coerência quântica e superposição
      const newCoherence = Math.min(0.95, tubulinCoherenceLevel + 0.1);
      setTubulinCoherenceLevel(newCoherence);
      
      // Adiciona superposição com propriedades mapeadas do evento
      addQuantumSuperposition(
        quantumProperties.core as QuantumCore, 
        quantumProperties.frequencyBand as QuantumFrequencyBand
      );
    }
    else if (event.type === 'symbolic_retrieval') {
      // Recuperação simbólica cria entanglement entre regiões
      addQuantumEntanglement(
        'HIPPOCAMPUS' as QuantumCore, // Origem (hipocampo - memória)
        quantumProperties.frequencyBand as QuantumFrequencyBand // Banda de frequência
      );
    }
    else if (event.type === 'symbolic_context_synthesized' || event.type === 'fusion_initiated') {
      // Síntese e fusão criam estados conscientes
      addConsciousState(
        quantumProperties.core as QuantumCore,
        quantumProperties.frequencyBand as QuantumFrequencyBand
      );
    }
    // NOVO: Padrões emergentes geram entrelamento complexo entre múltiplas regiões
    else if (event.type === 'emergent_patterns') {
      // Na teoria Orch-OR, padrões emergentes representam a formação de estados cognitivos complexos
      // através de múltiplos entrelamentos quânticos
      addQuantumEntanglement(
        'PREFRONTAL' as QuantumCore,
        QuantumFrequencyBand.KILOHERTZ
      );
      
      // Segundo entrelamento para região relacionada à memória
      addQuantumEntanglement(
        'HIPPOCAMPUS' as QuantumCore,
        QuantumFrequencyBand.MEGAHERTZ
      );
      
      // Aumenta a orquestração global para refletir integração de informações
      setOrchestrationIntensity(Math.min(1, orchestrationIntensity + 0.2));
    }
    // Nota: 'raw_prompt' não gera efeitos quânticos diretos conforme teoria Orch-OR
    // Na teoria, processos quânticos só ocorrem após processamento neural inicial
    
    // MELHORADO: Eventos não-computáveis têm efeito quântico mais significativo
    if (quantumProperties.nonComputable) {
      setPlanckScaleFeedback(true); // Ativa o feedback de escala de Planck
      
      // Na teoria Orch-OR, eventos não-computáveis representam aspectos da consciência 
      // que transcendem algoritmização e emergem da física quântica
      addQuantumSuperposition(
        quantumProperties.core as QuantumCore,
        QuantumFrequencyBand.TERAHERTZ // Maior frequência - nível quântico fundamental
      );
      
      // Aumento significativo de coerência - característico de eventos não-computáveis
      setTubulinCoherenceLevel(Math.min(0.98, tubulinCoherenceLevel + 0.15));
    }
  }, [tubulinCoherenceLevel, orchestrationIntensity, setTubulinCoherenceLevel, 
      setOrchestrationIntensity, addObjectiveReduction, addQuantumSuperposition, 
      addQuantumEntanglement, addConsciousState, setActiveRegion, setPlanckScaleFeedback]);

  // Processar novo evento cognitivo quando disponível - mantém o ciclo Orch-OR
  useEffect(() => {
    // Não processa se não houver eventos ou se ainda não inicializamos
    if (!cognitionEvents || cognitionEvents.length === 0 || !initializedRef.current) {
      return;
    }
    
    // Identifica apenas os eventos novos que ainda não foram processados
    const newEvents = cognitionEvents.filter(event => {
      const eventKey = getEventKey(event);
      return !processedEventTimestampsRef.current.has(eventKey);
    });
    
    // Se não há eventos novos, não processa nada
    if (newEvents.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[OrchORContainer] No new events to process');
      }
      return;
    }
    
    // Se já estiver processando um evento, ignora para evitar sobreposições
    if (processingEventRef.current) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[OrchORContainer] Ignorando processamento: já existe um evento em processamento`);
      }
      return;
    }
    
    // Marca como em processamento
    processingEventRef.current = true;

    // Processa os novos eventos
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OrchORContainer] Processing ${newEvents.length} new cognition events`);
    }
    
    // Marca os eventos como processados e os processa
    newEvents.forEach(event => {
      // Adiciona o evento à lista de eventos já processados
      const eventKey = getEventKey(event);
      processedEventTimestampsRef.current.add(eventKey);
      
      // Processa o evento
      handleCognitionEvent(event);
    });
    
    // Limita o tamanho do set de eventos processados (evita memory leak)
    if (processedEventTimestampsRef.current.size > 100) {
      // Mantém apenas os 50 mais recentes se exceder 100 eventos
      const keysArray = Array.from(processedEventTimestampsRef.current);
      const toRemove = keysArray.slice(0, keysArray.length - 50);
      toRemove.forEach(key => processedEventTimestampsRef.current.delete(key));
    }
    
    // Libera para novo processamento depois que este for concluído
    setTimeout(() => {
      processingEventRef.current = false;
    }, 100);
  }, [cognitionEvents, handleCognitionEvent]);

  // Toggle legend visibility
  const toggleLegend = () => setLegendVisible(prev => !prev);

  // Create custom CSS properties if custom sizes are needed
  useEffect(() => {
    if (containerRef.current && (width !== '100%' || height !== '280px')) {
      containerRef.current.style.setProperty('--custom-width', width || '100%');
      containerRef.current.style.setProperty('--custom-height', height || '280px');
    }
  }, [width, height]);

  // Adiciona classes específicas para os estados de Orch OR
  const getOrchORClassNames = () => {
    const classNames = [];
    
    // Classes refletindo intensidades de coerência
    if (tubulinCoherenceLevel > 0.7) classNames.push('high-coherence');
    else if (tubulinCoherenceLevel > 0.3) classNames.push('medium-coherence');
    else classNames.push('low-coherence');
    
    // Classes refletindo intensidades de orquestração
    if (orchestrationIntensity > 0.7) classNames.push('intense-orchestration');
    else if (orchestrationIntensity > 0.3) classNames.push('medium-orchestration');
    else classNames.push('minimal-orchestration');
    
    // Classes baseadas no estado predominante
    if (quantumSuperpositions.length > 0) classNames.push('quantum-superposition-active');
    if (quantumEntanglements.length > 0) classNames.push('quantum-entanglement-active');
    if (objectiveReductions.length > 0) classNames.push('objective-reduction-active');
    if (consciousStates.length > 0) classNames.push('conscious-moment-active');
    
    return classNames.join(' ');
  };

  return (
    <div 
      ref={containerRef}
      className={`quantum-visualization-container 
        ${height === '280px' ? 'fixed-height' : ''} 
        ${width === '100%' ? 'fixed-width' : ''} 
        ${lowPerformanceMode ? 'low-performance-mode' : ''}
        ${getOrchORClassNames()}
      `}
      data-width={width !== '100%' ? width : undefined}
      data-height={height !== '280px' ? height : undefined}
      data-coherence={tubulinCoherenceLevel.toFixed(2)}
      data-orchestration={orchestrationIntensity.toFixed(2)}
    >
      {/* Quantum Visualization always visible */}
      <QuantumModel />

      {/* Botão de toggle para a legenda quântica */}
      <button 
        className="quantum-legend-toggle" 
        onClick={toggleLegend}
        aria-label="Toggle quantum legend"
        title="Toggle quantum legend"
      >
        {legendVisible ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
          </svg>
        )}
      </button>
      
      {/* Legend for quantum phenomena */}
      {legendVisible && <QuantumLegend />}
    </div>
  );
};

export default QuantumVisualizationContainer;
