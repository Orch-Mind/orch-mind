// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/* eslint-disable react/no-unknown-property */
import { Trail } from '@react-three/drei';
import React, { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useOptimizedQuantumFrame } from '../utils/performance';

/**
 * Component for quantum state superposition in microtubules (Orch OR theory)
 * 
 * Representa a superposição quântica nas proteínas tubulina dentro dos microtúbulos
 * conforme descrito na teoria de Penrose-Hameroff. Na teoria Orch OR, as tubulinas
 * (proteínas dos microtúbulos) podem existir em superposição quântica de estados,
 * criando computação quântica em escala neuronal. Esta superposição precede a
 * Redução Objetiva (OR) que resulta em momentos conscientes.
 * 
 * Estrutura dos microtúbulos:
 * - Compostos de dímeros de tubulina (α e β) em um arranjo cilíndrico
 * - Típicamente 13 protofilamentos em arranjo hexagonal/circular
 * - Cada tubulina pode existir em superposição quântica, conforme Orch OR
 */
interface QuantumSuperpositionProps {
  amount?: number;
  coherence?: number;
  collapseActive?: boolean; // Sinaliza evento de Redução Objetiva (OR)
}

const QuantumSuperposition = React.memo<QuantumSuperpositionProps>(({ 
  amount = 7, 
  coherence = 0.3, 
  collapseActive = false 
}) => {
  const group = useRef<THREE.Group>(null);
  const tubuleRefs = useRef<THREE.Mesh[]>([]);
  
  // Criando padrão de arranjo hexagonal para simular a estrutura dos microtúbulos
  // De acordo com Hameroff, os microtúbulos têm formato hexagonal com 13 protofilamentos
  const paths = useMemo(() => {
    // Criamos um arranjo hexagonal para simular a estrutura tubular
    const hexRadius = 0.8;
    const basePoints = [];
    
    // Pontos centrais - representam o eixo dos microtúbulos
    basePoints.push(new THREE.Vector3(0, 0, 0));
    
    // Pontos na estrutura hexagonal - representam dímeros de tubulina
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      basePoints.push(new THREE.Vector3(
        hexRadius * Math.cos(angle),
        hexRadius * Math.sin(angle),
        0
      ));
    }
    
    // Criamos multiplicações do padrão para representar os diferentes níveis da estrutura
    const all = [];
    for (let j = 0; j < amount; j++) {
      // Espaçamento vertical representa o comprimento de uma seção microtubular
      const z = (j - amount/2) * 0.3;
      
      // Para cada nível, criamos uma cópia do arranjo com pequenas variações
      for (const point of basePoints) {
        all.push(new THREE.Vector3(
          point.x + (Math.random() - 0.5) * 0.1, // Pequena variação para simular as moléculas de tubulina
          point.y + (Math.random() - 0.5) * 0.1, 
          z
        ));
      }
    }
    
    return all;
  }, [amount]);
  
  // Preparando a configuração de estados de tubulina quântica
  // Na teoria Orch OR, cada dímero de tubulina pode existir em estados quânticos
  // de superposição, contribuindo para a computação quântica no cérebro
  const tubulinStates = useMemo(() => {
    // Cada estado de tubulina contém probabilidades quânticas
    return paths.map(() => ({
      // Probabilidade quântica de estados 0/1 em superposição
      probability: Math.random(),
      // Fase quântica (representando coerência quântica)
      phase: Math.random() * Math.PI * 2,
      // Frequência de oscilação (representando oscilações de Fröhlich)
      // Fröhlich propôs que proteínas como tubulina podem manter
      // estados de excitação quântica coerente em temperaturas biológicas
      frequency: 3 + Math.random() * 10
    }));
  }, [paths]);

  // Optimized animation callback with performance monitoring
  const animateQuantumStates = useCallback((state: { clock: { getElapsedTime: () => number } }) => {
    if (!group.current) return;
    
    const t = state.clock.getElapsedTime();
    
    // Rotação lenta da estrutura - representando os microtúbulos em movimento browniano
    group.current.rotation.y = t * 0.05;
    group.current.rotation.x = Math.sin(t * 0.1) * 0.1;
    
    // Atualizando cada "quantum bit" de tubulina individualmente
    group.current.children.forEach((child, i) => {
      if (i >= paths.length) return;
      
      const mesh = child as THREE.Mesh;
      const originalPos = paths[i];
      const state = tubulinStates[i];
      
      // Movimento quântico que segue a equação de Schrödinger (simplificada)
      // Aqui simulamos a evolução temporal dos estados quânticos de forma simplificada
      const quantum_phase = state.phase + t * state.frequency;
      const probability_amplitude = Math.cos(quantum_phase) * Math.sin(t * 0.1 + i);
      
      // Oscilação quântica - representando superposição quântica nas moléculas de tubulina
      // Em Orch OR, estas oscilações podem ser mantidas em estado coerente,
      // protegidas da decoerência por processos de isolamento quântico
      const quantum_offset = 0.1 * probability_amplitude;
      
      // Atualizando posição com oscilação quântica
      mesh.position.set(
        originalPos.x + quantum_offset * Math.sin(quantum_phase),
        originalPos.y + quantum_offset * Math.cos(quantum_phase),
        originalPos.z + quantum_offset * Math.sin(quantum_phase * 0.7)
      );
      
      // A cor representa o estado quântico da tubulina
      // Vermelho/laranja: mais "excitado"
      // Azul/verde: mais próximo do estado fundamental
      const intensity = 0.5 + 0.5 * probability_amplitude;
      const hue = 240 - 180 * intensity; // 240=azul, 60=amarelo/vermelho
      
      // Atualizando cor diretamente através do material
      if (mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).color.setHSL(hue/360, 0.8, 0.6 + 0.4 * intensity);
        
        // Opacidade mínima muito baixa em repouso (0.05), crescendo suavemente com coherence
        // Corrige: aplica opacidade e transparência apenas se material for MeshBasicMaterial ou array de MeshBasicMaterial
        // Durante evento OR (colapso), aumenta opacidade e pulsação, representando o "momento de consciência" da teoria Orch-OR
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if (mat instanceof THREE.MeshBasicMaterial) {
              mat.transparent = true;
              // Durante colapso (OR), opacidade máxima; em repouso, proporcional à coerência
              mat.opacity = collapseActive ? 1 : (0.05 + 0.9 * coherence);
            }
          });
        } else if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.transparent = true;
          mesh.material.opacity = collapseActive ? 1 : (0.05 + 0.9 * coherence);
        }
      }
      
      // Atualiza escala para representar "expansão quântica"
      // Escala modulada por intensidade local e coerência global
      // Durante evento OR (colapso), expansão máxima; em repouso, proporcional à intensidade e coerência
      // Represent a expansão temporal durante o colapso da função de onda (segundo Penrose)
      mesh.scale.setScalar(collapseActive ? 
        (0.8 + 0.5 * intensity) : // Expansão máxima durante OR
        (0.6 + 0.4 * intensity * (0.8 + 0.4 * coherence))); // Escala normal em coerência
    });
  }, [paths, tubulinStates, coherence, collapseActive]);

  // Animação da superposição quântica em tubulinas
  // Simulando a dinâmica quântica descrita na teoria Orch OR
  useOptimizedQuantumFrame(animateQuantumStates, 'medium');

  // Memoized trail components for better performance
  const trailComponents = useMemo(() => {
    return paths.map((path, i) => {
      // Define o padrão de cores inicial para cada estado de tubulina
      const state = tubulinStates[i];
      const initialProbability = state.probability;
      const hue = 240 - 180 * initialProbability; // 240=azul, 60=amarelo/vermelho
      
      return (
        <Trail
          key={i}
          width={1.5}
          length={3 + Math.floor(initialProbability * 6)}
          color={new THREE.Color().setHSL(hue/360, 0.8, 0.6)}
          attenuation={(t) => Math.pow(1-t, 1.5)} // Queda mais rápida das "caudas quânticas"
        >
          <mesh 
            position={path}
            ref={(el) => { 
              if (el) tubuleRefs.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.05 + (initialProbability * 0.03), 8, 8]} />
            <meshBasicMaterial color={new THREE.Color().setHSL(hue/360, 0.8, 0.6)} />
          </mesh>
        </Trail>
      );
    });
  }, [paths, tubulinStates]);

  return (
    <group ref={group}>
      {trailComponents}
    </group>
  );
});

QuantumSuperposition.displayName = 'QuantumSuperposition';

export { QuantumSuperposition };
