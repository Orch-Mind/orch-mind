// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { QuantumEffect, QuantumFrequencyBand } from '../QuantumVisualizationContext';
import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Fatores biofísicos que contribuem para o isolamento quântico nos microtúbulos
 * segundo a teoria Orch-OR e pesquisas mais recentes
 */
export const QUANTUM_ISOLATION_FACTORS = {
  // Proteínas MAP2 e tau estabilizam os microtúbulos e isolam do ambiente
  MAP_PROTEINS: 0.35,
  
  // Água estruturada em estado gel dentro e ao redor dos microtúbulos
  // (Jibu, Hagan, Pribram, Yasue, 1994; Del Giudice et al. 2005)
  ORDERED_WATER: 0.25,
  
  // Citoesqueleto atua como suporte mecânico e isolante
  CYTOSKELETON: 0.15,
  
  // Estados de coerência atuam como proteção quântica
  // Efeito Zenão Quântico - medições frequentes evitam decoerência
  QUANTUM_ZENO_EFFECT: 0.15,
  
  // Cavidades internas dos microtúbulos (11nm) fornecem isolamento
  TUBULAR_CAVITIES: 0.10
};

/**
 * Calcula o fator de isolamento quântico para um efeito quântico específico
 * O isolamento explica como a coerência quântica é mantida no cérebro
 * 
 * @param effect Efeito quântico para calcular isolamento
 * @param environmentalNoise Nível de ruído ambiental (0-1)
 * @returns Fator de isolamento quântico (maior = melhor isolamento)
 */
export function calculateQuantumIsolation(
  effect: QuantumEffect, 
  environmentalNoise: number = 0.3
): number {
  // Calcular eficácia do isolamento para a frequência específica
  // Frequências mais altas são mais difíceis de isolar (mais vulneráveis à decoerência)
  let frequencyIsolationFactor = 1.0;
  switch (effect.frequencyBand) {
    case QuantumFrequencyBand.TERAHERTZ:
      frequencyIsolationFactor = 0.5; // Mais difícil de isolar
      break;
    case QuantumFrequencyBand.GIGAHERTZ:
      frequencyIsolationFactor = 0.7;
      break;
    case QuantumFrequencyBand.MEGAHERTZ:
      frequencyIsolationFactor = 0.85;
      break;
    case QuantumFrequencyBand.KILOHERTZ:
      frequencyIsolationFactor = 0.95;
      break;
    case QuantumFrequencyBand.HERTZ:
      frequencyIsolationFactor = 1.0; // Mais fácil de isolar
      break;
    default:
      frequencyIsolationFactor = 0.7;
  }
  
  // Calcular isolamento total baseado nos fatores biofísicos
  const totalIsolation = Object.values(QUANTUM_ISOLATION_FACTORS).reduce(
    (sum, factor) => sum + factor, 
    0
  );
  
  // Ajustar com a fase de coerência do efeito (maior coerência = melhor isolamento)
  const coherenceFactor = effect.phaseCoherence || 0.5;
  
  // Aplicar ruído ambiental (temperatura, campos eletromagnéticos, etc.)
  // Este fator é crucial para entender como o cérebro mantém estados quânticos
  // em temperatura corporal (310K), um desafio fundamental para a teoria Orch-OR
  const effectiveIsolation = totalIsolation * 
    frequencyIsolationFactor * 
    coherenceFactor * 
    (1 - environmentalNoise);
  
  return Math.min(1, effectiveIsolation);
}

interface QuantumIsolationFieldProps {
  isolationFactor: number;
  size?: number;
  pulseSpeed?: number;
}

/**
 * Componente visual que representa o isolamento quântico
 * Visualiza como os microtúbulos protegem estados quânticos da decoerência
 */
export const QuantumIsolationField: React.FC<QuantumIsolationFieldProps> = ({ 
  isolationFactor, 
  size = 0.15, 
  pulseSpeed = 1.0 
}) => {
  const ref = useRef<THREE.Mesh>(null!);
  
  // Cor baseada no fator de isolamento (azul = bom isolamento, vermelho = isolamento fraco)
  // Ajustado para cores mais intensas e visíveis mesmo em estado de repouso
  const color = useMemo(() => {
    // Garantir um valor base para isolação para melhor visibilidade
    const baseIsolation = Math.max(isolationFactor, 0.4);
    
    // Aumentar saturação das cores para maior impacto visual
    const r = Math.max(0, 1 - baseIsolation) * 0.8;
    const g = Math.max(0, baseIsolation * 0.7); // Aumentar componente verde para brilho
    const b = Math.max(0, baseIsolation * 1.2); // Intensificar azul para maior destaque
    
    return new THREE.Color(r, g, b);
  }, [isolationFactor]);
  
  // Animação suave do campo de isolamento
  useFrame((state) => {
    if (!ref.current) return;
    
    // Garantir intensidade mínima para visibilidade em estado de repouso
    const baseIsolation = Math.max(isolationFactor, 0.4); // Aumentar valor mínimo para visibilidade
    const t = state.clock.getElapsedTime();
    
    // Pulsar suavemente para representar o campo de isolamento dinâmico
    // Aumentar o fator de pulsação para maior visibilidade
    const pulseFactor = 0.2 * Math.sin(t * pulseSpeed * 1.5) * baseIsolation;
    ref.current.scale.setScalar(1 + pulseFactor);
    
    // Adicionar rotação suave para melhor percepção 3D
    ref.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    ref.current.rotation.y = Math.sin(t * 0.3) * 0.1;
    
    // Transparência oscilante para representar a natureza quântica do isolamento
    // Aumentar opacidade base para maior visibilidade
    if (ref.current.material instanceof THREE.Material) {
      const material = ref.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 * baseIsolation * (0.7 + 0.3 * Math.sin(t * 2));
    }
  });
  
  // Sempre renderizar com um valor mínimo para visibilidade em estado de repouso
  // (remover condição que impedia a renderização)
  
  // Verificar se a opacidade é suficiente para ser visível
  // Evitar artefatos visuais quando quase transparente
  const opacity = 0.3 * Math.max(isolationFactor, 0.4);
  if (opacity < 0.05) return null;
  
  return (
    <mesh ref={ref}>
      <meshBasicMaterial 
          color={color} 
          transparent={true} 
        opacity={opacity}
        depthWrite={false} // Previne problemas de renderização de ordem de profundidade
        />
    </mesh>
  );
};

export default QuantumIsolationField;