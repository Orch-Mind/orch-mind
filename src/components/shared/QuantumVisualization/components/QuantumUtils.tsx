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

/**
 * Representa o substrato microtubular da consciência quântica na teoria Orch-OR (Penrose-Hameroff)
 * 
 * Na teoria Orch-OR, a consciência emerge das vibrações quânticas (redução objetiva orquestrada)
 * em microtúbulos dentro dos neurônios cerebrais. Microtúbulos são estruturas cilíndricas
 * compostas por 13 filamentos de proteínas tubulina, organizados em uma estrutura
 * hexagonal/pentagonal.
 * 
 * Este componente representa visualmente a estrutura dos microtúbulos como observador
 * quântico, com estado de vibração variável baseado no nível de consciência.
 */
export function Observer({ active = true }: ObserverProps) {
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  
  // Animação baseada nas vibrações quânticas dos microtúbulos conforme descrito na
  // teoria Orch-OR - vibrações em múltiplas frequências: terahertz, gigahertz,
  // megahertz, kilohertz e hertz formando uma hierarquia multiescalar
  useFrame(({ clock }) => {
    if (outerRef.current && innerRef.current) {
      const t = clock.getElapsedTime();
      
      // Vibrações quânticas coerentes - mais intensas durante consciência ativa
      // Em estado ativo: vibrações de alta frequência (40Hz - gamma synchrony em Orch-OR)
      // Em estado basal: vibrações de baixa frequência (8-12Hz - alpha em Orch-OR)
      const teraHzFactor = active ? 0.15 : 0.03; // Vibrações terahertz (mais rápidas)
      const gigaHzFactor = active ? 0.12 : 0.02; // Vibrações gigahertz
      const hertzFactor = active ? 0.10 : 0.06;  // Vibrações hertz (mais lentas)
      
      // Frequências de vibração coerente - replicando as frequências neurais
      const gammaFreq = 40; // 40Hz = gamma (consciência ativa)
      const alphaFreq = 10; // 10Hz = alpha (estado relaxado/basal)
      
      // Frequência principal depende do estado de consciência
      const primaryFreq = active ? gammaFreq : alphaFreq;
      
      // Microvibrações em escalas diferentes simulando a hierarquia vibracional quântica
      // Esta abordagem simula as vibrações da tubulina nos microtúbulos
      innerRef.current.scale.x = 1 + teraHzFactor * Math.sin(t * 0.6 * primaryFreq);
      innerRef.current.scale.y = 1 + gigaHzFactor * Math.sin(t * 0.4 * primaryFreq + 0.2);
      innerRef.current.scale.z = 1 + hertzFactor * Math.sin(t * 0.2 * primaryFreq + 0.5);
      
      // Rotação - representa a propagação das ondas quânticas ao longo dos microtúbulos
      // Proteínas tubulina podem existir em dois estados conformacionais diferentes
      // que se alternam em um padrão de "onda" ao longo do microtúbulo
      const rotationSpeed = active ? 0.1 : 0.03;
      outerRef.current.rotation.y = t * rotationSpeed;
      innerRef.current.rotation.z = t * rotationSpeed * 0.7;
      
      // Não-localidade quântica (emaranhamento) - essencial na teoria Orch-OR
      // Movimentação que simula estados quânticos não-locais
      if (active) {
        // No estado ativo, mais movimento não-local (emaranhamento quântico estendido)
        outerRef.current.position.x = Math.sin(t * 0.3) * 0.04;
        outerRef.current.position.y = Math.cos(t * 0.2) * 0.04;
      } else {
        // Mesmo em repouso, existe um mínimo de movimento quântico não-local
        outerRef.current.position.x = Math.sin(t * 0.1) * 0.01;
        outerRef.current.position.y = Math.cos(t * 0.1) * 0.01;
      }
    }
  });

  // Representação visual baseada na estrutura real dos microtúbulos
  // conforme descrito na teoria Orch-OR
  return (
    <group ref={outerRef} position={[0, 0.2, 0]} rotation={[0, Math.PI / 4, 0]}>
      {/* Estrutura interna - representa os dímeros de tubulina */}
      <mesh ref={innerRef}>
        {/* Forma cilíndrica similar à estrutura microtubular real */}
        <cylinderGeometry args={[0.25, 0.25, 0.6, 13, 4]} /> {/* 13 segmentos representando os 13 protofilamentos */}
        <meshPhysicalMaterial 
          color={active ? "#FFFFFF" : "#88CCEE"} // Azul claro em repouso (estado quântico basal)
          emissive={active ? "#FFFFFF" : "#4488AA"}
          emissiveIntensity={active ? 0.8 : 0.3} // Mais luminoso quando ativo (colapso OR)
          metalness={0.2}
          roughness={0.3}
          transmission={active ? 0.75 : 0.9}
          transparent
          opacity={active ? 0.8 : 0.4}
        />
      </mesh>

      {/* Malha externa - representa o campo eletromagnético do microtúbulo */}
      <mesh scale={1.15}>
        <cylinderGeometry args={[0.25, 0.25, 0.6, 13, 1]} />
        <meshBasicMaterial
          color={active ? "#E0F4FF" : "#77AADD"}
          wireframe={true}
          transparent
          opacity={active ? 0.4 : 0.15}
        />
      </mesh>
      
      {/* Campo quântico externo - representa a não-localidade e estados de superposição */}
      <mesh scale={active ? 1.3 : 1.2}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshBasicMaterial
          color={active ? "#FFFFFF" : "#88AADD"}
          transparent
          opacity={active ? 0.12 : 0.06}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Partículas de energia quântica - visíveis apenas em estado ativo */}
      {active && (
        <group>
          {[...Array(8)].map((_, i) => {
            // Distribuir uniformemente em torno do cilindro
            const angle = (i / 8) * Math.PI * 2;
            const radius = 0.32;
            const x = Math.cos(angle) * radius;
            const y = (Math.random() - 0.5) * 0.6; // Altura variável ao longo do cilindro
            const z = Math.sin(angle) * radius;
            
            return (
              <mesh key={i} position={[x, y, z]} scale={0.05}>
                <sphereGeometry args={[1, 8, 8]} />
                <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}