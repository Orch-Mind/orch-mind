// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Propriedades para o componente de visualização da decoerência quântica
 */
interface QuantumDecoherenceProps {
  /** Intensidade da decoerência (0-1) */
  intensity: number;
  /** Posição do efeito no espaço 3D */
  position?: [number, number, number];
  /** Escala visual do efeito */
  scale?: number;
  /** Velocidade da animação */
  speed?: number;
  /** Direção da propagação da decoerência */
  direction?: [number, number, number];
  /** Cor base do efeito */
  color?: string;
}

/**
 * Componente que visualiza o processo de decoerência quântica
 * 
 * A decoerência quântica é o processo pelo qual estados quânticos perdem
 * suas propriedades de superposição devido à interação com o ambiente.
 * Este é um desafio fundamental para a teoria Orch-OR, que propõe que
 * os microtúbulos possuem mecanismos para proteger contra a decoerência.
 */
export const QuantumDecoherence: React.FC<QuantumDecoherenceProps> = ({
  intensity,
  position = [0, 0, 0],
  scale = 1,
  speed = 1,
  direction = [1, 0, 0],
  color = '#ff3300'
}) => {
  // Referências para os elementos visuais
  const groupRef = useRef<THREE.Group>(null!);
  const particlesRef = useRef<THREE.Points>(null!);
  const waveRef = useRef<THREE.Mesh>(null!);
  
  // Número de partículas baseado na intensidade
  const particleCount = useMemo(() => Math.round(100 * intensity), [intensity]);
  
  // Gerar geometria para as partículas de decoerência
  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    
    const colorObj = new THREE.Color(color);
    
    for (let i = 0; i < particleCount; i++) {
      // Posição aleatória em uma esfera
      const radius = 0.1 + Math.random() * 0.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Tamanho baseado na distância do centro (partículas mais distantes são menores)
      sizes[i] = 0.01 + 0.03 * (1 - Math.random() * 0.3);
      
      // Cores gradientes baseadas na distância
      const distance = Math.sqrt(
        positions[i * 3] ** 2 +
        positions[i * 3 + 1] ** 2 +
        positions[i * 3 + 2] ** 2
      );
      
      const colorFactor = Math.max(0, 1 - distance * 2);
      colors[i * 3] = colorObj.r * colorFactor;
      colors[i * 3 + 1] = colorObj.g * colorFactor;
      colors[i * 3 + 2] = colorObj.b * colorFactor;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, [particleCount, color]);
  
  // Material para partículas de decoerência
  const particlesMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.02,
      transparent: true,
      opacity: 0.7,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }, []);
  
  // Criar o material para a onda de decoerência
  const waveMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.5),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, [color]);
  
  // Animação da decoerência
  useFrame((state) => {
    if (!groupRef.current || !particlesRef.current || !waveRef.current) return;
    
    // Garantir intensidade mínima para visibilidade em estado de repouso
    const baseIntensity = Math.max(intensity, 0.35);
    const t = state.clock.getElapsedTime() * speed;
    
    // Rotação suave do grupo - mais evidente no estado de repouso
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.3;
    groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.4;
    
    // Atualizar posições das partículas para simular dissipação
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const sizes = particlesRef.current.geometry.attributes.size.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      // Movimento para fora (decoerência)
      const idx = i * 3;
      const dirX = positions[idx];
      const dirY = positions[idx + 1];
      const dirZ = positions[idx + 2];
      
      // Normalizar direção
      const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
      const normalizedX = dirX / len;
      const normalizedY = dirY / len;
      const normalizedZ = dirZ / len;
      
      // Movimento para fora + direção preferencial - mais visível mesmo com baixa intensidade
      // Adiciona movimento oscilatório mais visível
      const oscillation = Math.sin(t * 2 + i * 0.5) * 0.8 + 0.2;
      positions[idx] += (normalizedX * 0.002 * baseIntensity + direction[0] * 0.001) * oscillation;
      positions[idx + 1] += (normalizedY * 0.002 * baseIntensity + direction[1] * 0.001) * oscillation;
      positions[idx + 2] += (normalizedZ * 0.002 * baseIntensity + direction[2] * 0.001) * oscillation;
      
      // Reduzir tamanho com o tempo (partículas desvanecem) mas manter tamanho mínimo
      sizes[i] = Math.max(sizes[i] * 0.998, 0.01);
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    
    // Animar a onda de decoerência
    if (waveRef.current) {
      // Expandir a onda para fora
      waveRef.current.scale.setScalar(1 + 0.2 * Math.sin(t * 2) + 0.3 * intensity);
      
      // Reduzir opacidade da onda com o tempo
      const material = waveRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 * (0.5 + 0.5 * Math.sin(t * 3)) * intensity;
    }
  });
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Partículas de decoerência */}
      <points ref={particlesRef} geometry={particlesGeometry} material={particlesMaterial} />
      
      {/* 
      Removida a onda esférica central que causava o efeito de bolinha intermitente
      Mantendo apenas as partículas de decoerência, que são mais consistentes visualmente
      e representam melhor o fenômeno físico de perda de coerência quântica
      */}
    </group>
  );
};

/**
 * Versão memorizada do componente para otimização de renderização
 */
export default React.memo(QuantumDecoherence);