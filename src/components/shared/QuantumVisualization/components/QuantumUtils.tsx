// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/* eslint-disable react/no-unknown-property */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QuantumCore } from '../QuantumVisualizationContext';

/**
 * Funções auxiliares para a visualização Orch OR
 */

// Calcula a idade de um efeito quântico
export function getAge(createdAt: number): number {
  return Date.now() - createdAt;
}

// Mapeia uma região do cérebro para coordenadas 3D
export function getCorePosition(core: QuantumCore): [number, number, number] {
  // Mapeamento de regiões cerebrais para posições espaciais
  // seguindo a teoria Orch OR de Penrose-Hameroff sobre microtúbulos em regiões
  // cerebrais que sustentam a consciência
  switch(core) {
    case 'PREFRONTAL':
      return [0, 1.5, -1.2];
    case 'VISUAL':
      return [0, 0.2, -2];
    case 'TEMPORAL':
      return [-1.5, 0.5, -0.5];
    case 'PARIETAL':
      return [1.5, 0.5, -0.5];
    case 'THALAMUS':
      return [0, 0, 0];
    case 'HIPPOCAMPUS':
      return [0.8, -0.3, -0.6];
    default:
      // Posição aleatória nas proximidades do centro
      return [
        (Math.random() - 0.5) * 2, 
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ];
  }
}

/**
 * Component that represents the abstract "Observer"
 * Na teoria de Penrose-Hameroff, o observador é um aspecto importante
 * da redução objetiva (OR) que leva à consciência
 */
interface ObserverProps {
  active?: boolean;
}

export function Observer({ active = true }: ObserverProps) {
  const ref = useRef<THREE.Mesh>(null);
  
  // Pulso suave do "observador"
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      // Intensify the pulse when active
      const pulseIntensity = active ? 0.15 : 0.1;
      ref.current.scale.setScalar(1 + pulseIntensity * Math.sin(t * 1.5));
      // Rotação lenta
      ref.current.rotation.y = t * 0.1;
      ref.current.rotation.z = t * 0.05;
    }
  });

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <octahedronGeometry args={[0.7, 0]} />
      <meshPhysicalMaterial 
        color="#FFFFFF"
        emissive="#FFFFFF"
        emissiveIntensity={0.5}
        metalness={0.5}
        roughness={0}
        transmission={0.95}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}