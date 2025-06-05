// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/* eslint-disable react/no-unknown-property */
import { useFrame } from '@react-three/fiber';
import React, { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Wave collapse component - representa a Redução Objetiva (OR) de Penrose-Hameroff
 * 
 * Na teoria Orch OR, a gravitação causa o colapso da função de onda quântica
 * criando um momento de consciência quando o limiar E=ħ/t é atingido.
 * 
 * Segundo Penrose e Hameroff, estes colapsos gravitacionais envolvem:
 * 1. Superposição quântica em proteínas tubulina nos microtúbulos
 * 2. Crescimento da superposição até um limiar crítico de massa-energia
 * 3. Colapso gravitacional (OR) que resulta num momento de consciência
 * 4. A natureza "não-computável" deste processo é central para explicar aspectos
 *    da consciência que, segundo Penrose, não podem ser simulados por algoritmos
 */
interface WaveCollapseProps {
  position?: [number, number, number];
  active?: boolean;
  color?: string;
  isNonComputable?: boolean;
  collapseActive?: boolean;
}

const WaveCollapse = React.memo<WaveCollapseProps>(({ 
  position = [0, 0, 0], 
  active = false, 
  color = "#00FFFF",
  isNonComputable = false,
  collapseActive = false
}) => {
  // Referências para animação
  const outerRing = useRef<THREE.Mesh>(null);
  const middleRing = useRef<THREE.Mesh>(null);
  const innerRing = useRef<THREE.Mesh>(null);
  const quantum_particle = useRef<THREE.Group>(null);
  const spacetime_curvature = useRef<THREE.Group>(null);
  
  // Pontos para representar a curvatura espaço-temporal durante OR
  // A curvatura do espaço-tempo é central na teoria de Penrose para explicar a OR
  const spacetimePoints = useMemo(() => {
    const points = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const radius = 0.6 + Math.sin(theta * 3) * 0.1;
      points.push(new THREE.Vector3(
        radius * Math.cos(theta),
        radius * Math.sin(theta), 
        0
      ));
    }
    return points;
  }, []);
  
  // Partículas quânticas que se condensam durante o colapso
  // Representam os estados quânticos de tubulina convergindo durante OR
  const quantumParticles = useMemo(() => {
    const particles = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const radius = 0.4;
      particles.push({
        position: new THREE.Vector3(
          radius * Math.cos(theta),
          radius * Math.sin(theta),
          0
        ),
        originalRadius: radius,
        phase: Math.random() * Math.PI * 2,
        frequency: 3 + Math.random() * 5
      });
    }
    return particles;
  }, []);

  // Optimized animation callback for OR (Objective Reduction)
  const animateObjectiveReduction = useCallback((state: { clock: { getElapsedTime: () => number } }) => {
    if (!active) return;
    
    const t = state.clock.getElapsedTime();
    
    // Se o colapso ativo for forçado externamente, controlamos a fase diretamente
    // Isso permite sincronização entre colapsos e eventos de OR (Objective Reduction)
    let normalizedTime;
    let period = 3;
    
    if (collapseActive) {
      // Se colapso está ativo externamente, focamos na fase principal do colapso (0.3-0.7)
      normalizedTime = 0.5; // Meio do colapso - fase mais intensa
    } else {
      // Simulação normal do colapso quântico de Penrose
      // A equação E = ħ/t de Penrose determina quando ocorre a redução objetiva
      normalizedTime = (t % period) / period;
    }
    
    // Animação dos anéis - representam a frente de onda quântica
    if (outerRing.current && middleRing.current && innerRing.current) {
      // Fase 1: Expansão dos anéis - superposição inicial
      if (normalizedTime < 0.3) {
        const expansionFactor = Math.pow(normalizedTime / 0.3, 0.5);
        outerRing.current.scale.setScalar(0.2 + expansionFactor * 1.3);
        middleRing.current.scale.setScalar(0.2 + expansionFactor * 1.0);
        innerRing.current.scale.setScalar(0.2 + expansionFactor * 0.7);
        
        // Opacidade aumenta - representando o aumento da coerência quântica
        (outerRing.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + expansionFactor * 0.5;
        (middleRing.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + expansionFactor * 0.4;
        (innerRing.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + expansionFactor * 0.3;
      } 
      // Fase 2: Colapso quântico - momento da redução objetiva
      // Representa o limiar de Penrose (quando E=ħ/t é atingido)
      else if (normalizedTime < 0.7) {
        const collapseFactor = Math.pow((normalizedTime - 0.3) / 0.4, 1.5);
        // Colapso dos anéis - representando OR
        outerRing.current.scale.setScalar(1.5 - collapseFactor * 1.3);
        middleRing.current.scale.setScalar(1.2 - collapseFactor * 1.0);
        innerRing.current.scale.setScalar(0.9 - collapseFactor * 0.5);
        
        // Pulsos de intensidade durante o colapso - representam a transição de energia
        // Na teoria Orch OR, este é o momento em que a energia gravitacional
        // causa o colapso da função de onda
        const pulseIntensity = 0.8 + Math.sin(collapseFactor * Math.PI * 6) * 0.2;
        (outerRing.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * pulseIntensity;
        (middleRing.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * pulseIntensity;
        (innerRing.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * pulseIntensity;
      }
      // Fase 3: Dissipação - após OR
      // Representa o retorno ao estado clássico pós-colapso
      else {
        const dissipationFactor = (normalizedTime - 0.7) / 0.3;
        
        // Redução da escala e opacidade - representa o estado pós-colapso
        outerRing.current.scale.setScalar(0.2 * (1 - dissipationFactor));
        middleRing.current.scale.setScalar(0.2 * (1 - dissipationFactor));
        innerRing.current.scale.setScalar(0.4 * (1 - dissipationFactor));
        
        // Opacidade diminui
        (outerRing.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - dissipationFactor);
        (middleRing.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - dissipationFactor);
        (innerRing.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - dissipationFactor);
      }
      
      // Rotação continua - representa a fase quântica
      outerRing.current.rotation.z = t * 1.5;
      middleRing.current.rotation.z = -t * 1.0;
      innerRing.current.rotation.z = t * 0.5;
    }
    
    // Animação das partículas quânticas
    if (quantum_particle.current) {
      quantum_particle.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const particle = quantumParticles[i % quantumParticles.length];
        
        // Fase 1: Movimento quântico - partículas em superposição
        if (normalizedTime < 0.3) {
          const expansionFactor = normalizedTime / 0.3;
          const quantum_phase = particle.phase + t * particle.frequency;
          const quantum_radius = particle.originalRadius * (1 + expansionFactor * 0.5);
          
          // Movimento em superposição quântica - representa tubulinas em superposição
          mesh.position.set(
            quantum_radius * Math.cos(quantum_phase) * Math.sin(t + i),
            quantum_radius * Math.sin(quantum_phase) * Math.cos(t + i),
            0.1 * Math.sin(quantum_phase * 2)
          );
          
          // Partículas ficam mais brilhantes - aumento da energia quântica
          mesh.scale.setScalar(0.5 + 0.5 * expansionFactor);
        }
        // Fase 2: Colapso quântico - partículas convergem
        else if (normalizedTime < 0.7) {
          const collapseFactor = (normalizedTime - 0.3) / 0.4;
          const collapseRadius = particle.originalRadius * (1 - collapseFactor);
          
          // Movimento de convergência (colapso) - redução objetiva
          mesh.position.set(
            collapseRadius * Math.cos(particle.phase),
            collapseRadius * Math.sin(particle.phase),
            0.05 * Math.cos(t * 5 + i) * (1 - collapseFactor)
          );
          
          // Partículas brilham intensamente durante o colapso - energia liberada
          const pulseIntensity = 1.0 + Math.sin(collapseFactor * Math.PI * 8) * 0.5;
          mesh.scale.setScalar(1.0 * pulseIntensity);
        }
        // Fase 3: Pós-colapso - partículas se condensam
        else {
          const dissipationFactor = (normalizedTime - 0.7) / 0.3;
          
          // Partículas convergem para o centro - estado clássico pós-OR
          mesh.position.set(
            0.1 * Math.cos(particle.phase) * (1 - dissipationFactor),
            0.1 * Math.sin(particle.phase) * (1 - dissipationFactor),
            0
          );
          
          // Partículas diminuem - energia dissipada
          mesh.scale.setScalar(1.0 * (1 - dissipationFactor));
        }
      });
    }
    
    // Animação da curvatura espaço-temporal
    if (spacetime_curvature.current) {
      spacetime_curvature.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const point = spacetimePoints[i % spacetimePoints.length];
        
        // Curvatura do espaço-tempo durante OR
        // Segundo Penrose, a gravitação é responsável pelo colapso
        const curvature_intensity = normalizedTime < 0.7 ? 
          Math.sin(normalizedTime * Math.PI * 2) * 0.3 : 
          0.1 * (1 - (normalizedTime - 0.7) / 0.3);
        
        mesh.position.set(
          point.x * (1 + curvature_intensity),
          point.y * (1 + curvature_intensity),
          curvature_intensity * Math.sin(t * 2 + i * 0.1)
        );
        
        // Escala representa a intensidade da curvatura
        mesh.scale.setScalar(0.3 + curvature_intensity * 0.7);
      });
    }
  }, [active, collapseActive, quantumParticles, spacetimePoints]);
  
  // Animação da Redução Objetiva (OR)
  // Simula o processo de colapso descrito por Penrose-Hameroff
  useFrame(animateObjectiveReduction);
  
  if (!active) return null;
  
  // Cor base depende se é um processo não-computável (teoria de Penrose)
  // Processos não-computáveis são fundamentais na teoria de Penrose para explicar
  // aspectos da consciência que transcendem computação algoritmica
  const baseColor = isNonComputable ? "#FF00FF" : color;
  const hue = new THREE.Color(baseColor).getHSL({h:0, s:0, l:0}).h;
  
  // Cores para diferentes elementos do colapso
  const outerColor = new THREE.Color().setHSL(hue, 0.8, 0.7);
  const middleColor = new THREE.Color().setHSL((hue + 0.05) % 1, 0.9, 0.6);
  const innerColor = new THREE.Color().setHSL((hue + 0.1) % 1, 1.0, 0.5);
  
  return (
    <group position={new THREE.Vector3(...position)}>
      {/* Anéis de colapso quântico - representam a frente de onda durante OR */}
      <mesh ref={outerRing}>
        <torusGeometry args={[0.4, 0.02, 16, 100]} />
        {/* Opacidade dos anéis modulada por evento OR */}
{/* Opacidade mínima muito baixa em repouso (0.05), crescendo suavemente com collapseActive */}
<meshBasicMaterial color={outerColor} transparent opacity={collapseActive ? 1 : 0.05} />
      </mesh>
      <mesh ref={middleRing}>
        <torusGeometry args={[0.3, 0.02, 16, 100]} />
        {/* Opacidade dos anéis modulada por evento OR */}
{/* Opacidade mínima muito baixa em repouso (0.05), crescendo suavemente com collapseActive */}
<meshBasicMaterial color={middleColor} transparent opacity={collapseActive ? 1 : 0.05} />
      </mesh>
      <mesh ref={innerRing}>
        <torusGeometry args={[0.2, 0.02, 16, 100]} />
        {/* Opacidade dos anéis modulada por evento OR */}
{/* Opacidade mínima muito baixa em repouso (0.05), crescendo suavemente com collapseActive */}
<meshBasicMaterial color={innerColor} transparent opacity={collapseActive ? 1 : 0.05} />
      </mesh>
      
      {/* Partículas quânticas que se condensam durante o colapso */}
      <group ref={quantum_particle}>
        {quantumParticles.map((particle, i) => (
          <mesh key={i} position={particle.position}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color={new THREE.Color().setHSL(hue, 0.8, 0.8)} />
          </mesh>
        ))}
      </group>
      
      {/* Curvatura espaço-temporal - representa o mecanismo gravitacional de Penrose */}
      <group ref={spacetime_curvature}>
        <line>
          <bufferGeometry>
            <bufferAttribute 
              attach="attributes-position" 
              args={[new Float32Array(spacetimePoints.length * 3), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={outerColor} transparent opacity={0.5} />
        </line>
      </group>
    </group>
  );
});

export default WaveCollapse;