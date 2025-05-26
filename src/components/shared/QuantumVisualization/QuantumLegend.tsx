// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from 'react';
import { useQuantumVisualization, OrchORState } from './QuantumVisualizationContext';
import './QuantumVisualization.css';

// Define the quantum phenomena with their respective colors and descriptions
export const QUANTUM_PHENOMENA = {
  SUPERPOSITION: {
    id: 'quantum-superposition',
    label: 'Quantum Superposition',
    color: '#9D6AFF',
    description: 'Multiple quantum states existing simultaneously in microtubules before collapse.'
  },
  REDUCTION: {
    id: 'objective-reduction',
    label: 'Objective Reduction',
    color: '#00B4D8',
    description: 'Orchestrated collapse of quantum states through gravity-induced reduction.'
  },
  ENTANGLEMENT: {
    id: 'quantum-entanglement',
    label: 'Quantum Entanglement',
    color: '#E63B7A',
    description: 'Non-local quantum connections between microtubules across neural networks.'
  },
  CONSCIOUS: {
    id: 'conscious-state',
    label: 'Conscious State',
    color: '#3BE669',
    description: 'Emergent consciousness arising from orchestrated quantum collapses.'
  },
  COHERENCE: {
    id: 'tubulin-coherence',
    label: 'Tubulin Coherence',
    color: '#FFD166',
    description: 'Quantum resonance maintained in microtubule structures.'
  },
  ORCHESTRATION: {
    id: 'orchestration',
    label: 'Orchestration',
    color: '#00CBD1',
    description: 'Synchronization of quantum processes across neural architectures.'
  },
  OBSERVER: {
    id: 'observer',
    label: 'Observer',
    color: '#FFFFFF',
    description: 'Self-referential quantum measurement process in consciousness.'
  }
};

interface LegendItemProps {
  id: string;
  label: string;
  color: string;
  active?: boolean;
  selected?: boolean;
  description: string;
  onClick: (id: string) => void;
}

const LegendItem: React.FC<LegendItemProps> = ({ 
  id, 
  label, 
  color, 
  active = false, 
  selected = false,
  description,
  onClick 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div 
      className={`quantum-legend-item ${active ? 'active' : ''} ${selected ? 'selected' : ''}`} 
      onClick={() => onClick(id)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        className={`quantum-legend-indicator quantum-color-${id}`} 
        data-color={color}
      />
      <span className="quantum-legend-label">{label}</span>
      {showTooltip && (
        <div className={`quantum-legend-tooltip tooltip-color-${id}`}>
          {description}
        </div>
      )}
    </div>
  );
};

/**
 * Component that displays legends for quantum phenomena in the visualization
 * Shows which phenomena are active at a specific moment and allows filtering
 */
export const QuantumLegend: React.FC = () => {
  const {
    quantumSuperpositions,
    objectiveReductions,
    quantumEntanglements,
    consciousStates,
    observerState,
    activeVisualFilter,
    setActiveVisualFilter
  } = useQuantumVisualization();

  // Determine if each Orch OR quantum phenomenon is active based on events
  const isSuperpositionActive = quantumSuperpositions.length > 0;
  const isObjectiveReductionActive = objectiveReductions.length > 0;
  const isQuantumEntanglementActive = quantumEntanglements.length > 0;
  const isConsciousStateActive = consciousStates.length > 0;
  
  // Assegurar que tubulina e orquestração estejam ativas no estado de repouso
  // Mesmo sem eventos cognitivos, há um nível básico de coerência quântica
  // de acordo com a teoria Orch-OR
  const isCoherenceActive = true; // Sempre ativo para refletir o estado quântico de base
  const isOrchestrationActive = true; // Sempre ativo para refletir orquestração em nível base
  const isObserverActive = observerState === 'active' || consciousStates.length > 0;
  
  // Handle legend item click to toggle filtering
  const handleLegendClick = (id: string) => {
    if (activeVisualFilter === id) {
      setActiveVisualFilter(null); // Deselect if already selected
    } else {
      setActiveVisualFilter(id); // Select the item
    }
  };

  // Add the title at the top of the visualization
  React.useEffect(() => {
    // Check if title already exists
    const existingTitle = document.querySelector('.quantum-matrix-title');
    if (!existingTitle) {
      const container = document.querySelector('.quantum-visualization-container');
      if (container) {
        const titleElement = document.createElement('h1');
        titleElement.className = 'quantum-matrix-title';
        titleElement.textContent = 'QUANTUM CONSCIOUSNESS MATRIX';
        container.insertBefore(titleElement, container.firstChild);
      }
    }
  }, []);

  return (
    <div className="quantum-legend">
      <LegendItem 
        id={QUANTUM_PHENOMENA.SUPERPOSITION.id}
        label={QUANTUM_PHENOMENA.SUPERPOSITION.label}
        color={QUANTUM_PHENOMENA.SUPERPOSITION.color}
        description={QUANTUM_PHENOMENA.SUPERPOSITION.description}
        active={isSuperpositionActive}
        selected={activeVisualFilter === QUANTUM_PHENOMENA.SUPERPOSITION.id}
        onClick={handleLegendClick}
      />
      <LegendItem 
        id={QUANTUM_PHENOMENA.REDUCTION.id}
        label={QUANTUM_PHENOMENA.REDUCTION.label}
        color={QUANTUM_PHENOMENA.REDUCTION.color}
        description={QUANTUM_PHENOMENA.REDUCTION.description}
        active={isObjectiveReductionActive}
        selected={activeVisualFilter === QUANTUM_PHENOMENA.REDUCTION.id}
        onClick={handleLegendClick}
      />
      <LegendItem 
        id={QUANTUM_PHENOMENA.ENTANGLEMENT.id}
        label={QUANTUM_PHENOMENA.ENTANGLEMENT.label}
        color={QUANTUM_PHENOMENA.ENTANGLEMENT.color}
        description={QUANTUM_PHENOMENA.ENTANGLEMENT.description}
        active={isQuantumEntanglementActive}
        selected={activeVisualFilter === QUANTUM_PHENOMENA.ENTANGLEMENT.id}
        onClick={handleLegendClick}
      />
      <LegendItem 
        id={QUANTUM_PHENOMENA.CONSCIOUS.id}
        label={QUANTUM_PHENOMENA.CONSCIOUS.label}
        color={QUANTUM_PHENOMENA.CONSCIOUS.color}
        description={QUANTUM_PHENOMENA.CONSCIOUS.description}
        active={isConsciousStateActive} 
        selected={activeVisualFilter === QUANTUM_PHENOMENA.CONSCIOUS.id}
        onClick={handleLegendClick}
      />
      <LegendItem 
        id={QUANTUM_PHENOMENA.COHERENCE.id}
        label={QUANTUM_PHENOMENA.COHERENCE.label}
        color={QUANTUM_PHENOMENA.COHERENCE.color}
        description={QUANTUM_PHENOMENA.COHERENCE.description}
        active={isCoherenceActive}
        selected={activeVisualFilter === QUANTUM_PHENOMENA.COHERENCE.id}
        onClick={handleLegendClick}
      />
      <LegendItem 
        id={QUANTUM_PHENOMENA.ORCHESTRATION.id}
        label={QUANTUM_PHENOMENA.ORCHESTRATION.label}
        color={QUANTUM_PHENOMENA.ORCHESTRATION.color}
        description={QUANTUM_PHENOMENA.ORCHESTRATION.description}
        active={isOrchestrationActive}
        selected={activeVisualFilter === QUANTUM_PHENOMENA.ORCHESTRATION.id}
        onClick={handleLegendClick}
      />
      <LegendItem 
        id={QUANTUM_PHENOMENA.OBSERVER.id}
        label={QUANTUM_PHENOMENA.OBSERVER.label}
        color={QUANTUM_PHENOMENA.OBSERVER.color}
        description={QUANTUM_PHENOMENA.OBSERVER.description}
        active={isObserverActive} 
        selected={activeVisualFilter === QUANTUM_PHENOMENA.OBSERVER.id}
        onClick={handleLegendClick}
      />
    </div>
  );
};

export default QuantumLegend;
