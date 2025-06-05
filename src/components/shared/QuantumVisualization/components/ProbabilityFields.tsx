// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/* eslint-disable react/no-unknown-property */
import { useFrame } from '@react-three/fiber';
import React, { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Flowing quantum probability fields
 * 
 * Na teoria Orch OR de Penrose-Hameroff, os campos de probabilidade quântica são fundamentais:
 * 
 * 1. Representam a função de onda quântica distribuída através dos microtúbulos
 * 2. Demonstram as propriedades de "não-localidade" quântica do sistema neural
 * 3. Visualizam como os estados de superposição existem como campos de probabilidade
 *    antes do colapso (OR)
 * 
 * Nesta representação, cada partícula representa um componente do campo de probabilidade
 * quântica descrito pela equação de Schrödinger, antes da redução objetiva.
 */
interface ProbabilityFieldsProps {
  particleCount?: number;
  coherence?: number;
  collapseActive?: boolean;
}

const ProbabilityFields = React.memo<ProbabilityFieldsProps>(({ 
  particleCount = 150, 
  coherence = 0.3, 
  collapseActive = false 
}) => {
  const particles = useRef<THREE.Points>(null);
  
  // Criando posições iniciais para partículas
  // Cada partícula representa um "elemento" da função de onda quântica
  const positions = useMemo(() => {
    const pos = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      // Distribuir em volume esférico - representa o campo de probabilidade 3D
      const radius = 0.5 + Math.random() * 1.5;
      
      pos.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
    }
    return new Float32Array(pos);
  }, [particleCount]);
  
  // Cores para as partículas - representam diferentes estados quânticos
  // Em Orch OR, os estados quânticos envolvem diferentes configurações de elétrons
  // em proteínas tubulina, cada uma com diferentes níveis energéticos
  const colors = useMemo(() => {
    const cols = [];
    for (let i = 0; i < particleCount; i++) {
      // Gradiente de cor de azul a violeta - representa espectro de energia quântica
      // Azul: Estados de baixa energia
      // Violeta: Estados de alta energia (próximos de colapso OR)
      const h = 180 + (Math.random() * 80); // 180-260 (azul a violeta)
      const s = 60 + (Math.random() * 40);  // Saturação moderada a alta
      const l = 50 + (Math.random() * 30);  // Luminosidade média a alta
      
      const color = new THREE.Color(`hsl(${h}, ${s}%, ${l}%)`);
      cols.push(color.r, color.g, color.b);
    }
    return new Float32Array(cols);
  }, [particleCount]);

  // Optimized animation callback for probability fields
  const animateProbabilityFields = useCallback((state: { clock: { getElapsedTime: () => number } }) => {
    if (!particles.current) return;
    
    const t = state.clock.getElapsedTime();
    const positions = particles.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const i3 = i / 3;
      
      // Usa funções senoidais para criar movimento fluido
      // Isto simula a evolução da função de onda quântica
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Cálculo de deslocamento baseado em funções senoidais entrelaçadas
      // Simula as interações não-locais dos campos quânticos
      const modulation = Math.sin(t * 0.5 + i3 * 0.1);
      const phase = t * 0.2 + i3 * 0.05;
      
      // Movimento em espiral - representa evolução da função de onda
      // que caracteriza os estados quânticos em proteínas tubulina
      positions[i] = x + Math.sin(phase + y * 0.5) * 0.01 * modulation;
      positions[i + 1] = y + Math.cos(phase + x * 0.5) * 0.01 * modulation;
      positions[i + 2] = z + Math.sin(phase * 1.5) * 0.01 * modulation;
    }
    
    particles.current.geometry.attributes.position.needsUpdate = true;
    
    // Rotação lenta do sistema de partículas
    // Representa a dinâmica global do campo quântico
    particles.current.rotation.y = t * 0.05;
    particles.current.rotation.x = Math.sin(t * 0.1) * 0.2;
  }, []);
  
  // Animação do campo de probabilidade
  // Na teoria Orch OR, os campos quânticos evoluem de acordo com a equação de Schrödinger
  // até atingirem um limiar de massa-energia para colapso gravitacional
  useFrame(animateProbabilityFields);

  // Memoized geometry for better performance
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [positions, colors]);

  // Memoized material for better performance
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: collapseActive ? 1 : (0.03 + 0.8 * coherence),
      sizeAttenuation: true
    });
  }, [collapseActive, coherence]);
  
  return (
    <points ref={particles} geometry={geometry} material={material} />
  );
});

ProbabilityFields.displayName = 'ProbabilityFields';

export { ProbabilityFields };
