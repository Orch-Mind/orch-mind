// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

/* eslint-disable react/no-unknown-property */
import { useFrame } from '@react-three/fiber';
import { Fragment, memo, useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Quantum entanglement component - representa a coerência quântica entre microtúbulos na teoria Orch OR
 * 
 * Na teoria Orch OR de Penrose-Hameroff, o emaranhamento quântico entre microtúbulos
 * em diferentes neurônios permite:
 * 
 * 1. Coerência em escala macroscópica através do cérebro
 * 2. Sincronização de atividade neural que transcende conexões sinápticas
 * 3. Correlações não-locais que contribuem para a "unidade" da experiência consciente
 * 
 * Este componente visualiza essas conexões quânticas não-locais que são
 * fundamentais para a integração de informação na teoria Orch OR.
 */
interface QuantumEntanglementProps {
  pairs?: number;
  coherence?: number;
  collapseActive?: boolean;
}

const QuantumEntanglement = memo<QuantumEntanglementProps>(({
  pairs = 8,
  coherence = 0.3,
  collapseActive = false
}) => {
  const lines = useRef<THREE.Group>(null);
  const points = useRef<THREE.Group>(null);

  // Pares de partículas emaranhadas - representam pares de dímeros de tubulina 
  // em estado de emaranhamento quântico através de diferentes regiões cerebrais
  const entangledPairs = useMemo(() => {
    return Array(pairs).fill(0).map((_, i) => {
      // Para cada par, definimos dois pontos no espaço 3D
      // A distância entre pontos simula distintas regiões cerebrais
      const theta1 = (i / pairs) * Math.PI * 2;
      const phi1 = Math.random() * Math.PI;
      const radius1 = 0.7 + Math.random() * 0.5;

      // Pontos em regiões distantes, simulando emaranhamento não-local
      const theta2 = theta1 + Math.PI * (0.5 + Math.random() * 0.5); // Pontos aproximadamente opostos
      const phi2 = Math.PI - phi1 + (Math.random() - 0.5) * 0.5;
      const radius2 = 0.7 + Math.random() * 0.5;

      const point1 = new THREE.Vector3(
        radius1 * Math.sin(phi1) * Math.cos(theta1),
        radius1 * Math.sin(phi1) * Math.sin(theta1),
        radius1 * Math.cos(phi1)
      );

      const point2 = new THREE.Vector3(
        radius2 * Math.sin(phi2) * Math.cos(theta2),
        radius2 * Math.sin(phi2) * Math.sin(theta2),
        radius2 * Math.cos(phi2)
      );

      return {
        point1,
        point2,
        originalPoint1: point1.clone(),
        originalPoint2: point2.clone(),
        // Fase quântica - simula fase coerente entre pares
        // Na física quântica, sistemas emaranhados compartilham fases correlacionadas
        phase: Math.random() * Math.PI * 2,
        // Frequência de oscilação quântica
        // Representa oscilações de Fröhlich nos microtúbulos
        frequency: 2 + Math.random() * 3,
        // Força do emaranhamento - afeta a intensidade da correlação quântica
        // Na teoria Orch-OR, emaranhamento quântico é significativo mesmo em repouso
        // Aumentamos o valor mínimo para refletir esse aspecto fundamental
        entanglementStrength: 0.5 + Math.random() * 0.5,
        // Cor única para cada par emaranhado
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
      };
    });
  }, [pairs]);

  // Optimized animation callback for quantum entanglement
  const animateQuantumEntanglement = useCallback((state: { clock: { getElapsedTime: () => number } }) => {
    const t = state.clock.getElapsedTime();

    // Atualização dos pontos de partículas emaranhadas
    if (points.current) {
      points.current.children.forEach((point, idx) => {
        // Os dois pontos de cada par têm índices i e i+1
        const pairIdx = Math.floor(idx / 2);
        const isFirstPoint = idx % 2 === 0;

        if (pairIdx >= entangledPairs.length) return;

        const pair = entangledPairs[pairIdx];
        const mesh = point as THREE.Mesh;

        // Fase compartilhada - simula correlação quântica
        // Em sistemas emaranhados, a medida de uma propriedade em uma partícula
        // instantaneamente determina a propriedade correspondente na outra
        const sharedPhase = pair.phase + t * pair.frequency;

        // Oscilações correlacionadas - quando um vai para cima, o outro vai para baixo
        // Este comportamento anti-correlacionado é característico de sistemas emaranhados
        const oscillation = Math.sin(sharedPhase) * 0.1;

        // Atualizando posição - movimento em anti-fase (correlação quântica)
        if (isFirstPoint) {
          const originalPos = pair.originalPoint1;
          pair.point1.set(
            originalPos.x + oscillation * Math.sin(sharedPhase),
            originalPos.y + oscillation * Math.cos(sharedPhase),
            originalPos.z + oscillation
          );
          mesh.position.copy(pair.point1);

          // Cor varia com fase - simula estados quânticos
          const hue = (0.6 + 0.2 * Math.sin(sharedPhase)) % 1;
          (mesh.material as THREE.MeshBasicMaterial).color.setHSL(hue, 0.7, 0.6);
        } else {
          const originalPos = pair.originalPoint2;
          // Movimento em anti-fase - correlação quântica em estados opostos
          pair.point2.set(
            originalPos.x - oscillation * Math.sin(sharedPhase),
            originalPos.y - oscillation * Math.cos(sharedPhase),
            originalPos.z - oscillation
          );
          mesh.position.copy(pair.point2);

          // Cor correlacionada com o outro ponto - emaranhamento
          const hue = (0.6 + 0.2 * Math.sin(sharedPhase + Math.PI)) % 1;
          (mesh.material as THREE.MeshBasicMaterial).color.setHSL(hue, 0.7, 0.6);
        }

        // Pulso das partículas - representa flutuações quânticas
        const pulse = 0.8 + 0.2 * Math.sin(sharedPhase * 2);
        mesh.scale.setScalar(pulse * (0.05 + 0.05 * pair.entanglementStrength));
      });
    }

    // Atualização das linhas de emaranhamento
    if (lines.current) {
      lines.current.children.forEach((lineObj, i) => {
        if (i >= entangledPairs.length) return;

        const pair = entangledPairs[i];
        // Para primitives, o objeto Three.js real está no userData ou como child
        const line = (lineObj as any).object || lineObj as THREE.Line;

        try {
          // Atualiza a geometria da linha para conectar os pontos
          const lineGeometry = line.geometry as THREE.BufferGeometry;
          const positions = new Float32Array([
            pair.point1.x, pair.point1.y, pair.point1.z,
            pair.point2.x, pair.point2.y, pair.point2.z
          ]);

          lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          lineGeometry.attributes.position.needsUpdate = true;

          // Intensidade da linha varia com a força do emaranhamento e fase
          // Sistemas fortemente emaranhados mostram correlações mais intensas
          const lineIntensity = 0.3 + 0.4 * Math.sin(pair.phase + t * pair.frequency);
          (line.material as THREE.LineBasicMaterial).opacity = lineIntensity * pair.entanglementStrength;

          // A cor da linha pulsa em tons da cor base
          const baseColor = pair.color;
          const hue = baseColor.getHSL({ h: 0, s: 0, l: 0 }).h;
          const hueShift = 0.05 * Math.sin(pair.phase + t * pair.frequency);
          (line.material as THREE.LineBasicMaterial).color.setHSL(
            (hue + hueShift) % 1,
            0.7,
            0.6 + 0.2 * Math.sin(pair.phase + t * pair.frequency * 1.5)
          );
        } catch (error) {
          console.warn('Error updating line geometry:', error);
        }
      });
    }
  }, [entangledPairs]);

  // Animação do emaranhamento quântico
  // Simula a natureza correlacionada das propriedades quânticas
  useFrame(animateQuantumEntanglement);

  // Memoized particle components for better performance
  const particleComponents = useMemo(() => {
    return entangledPairs.map((pair, i) => (
      <Fragment key={`points-${i}`}>
        {/* Primeira partícula do par emaranhado */}
        <mesh position={pair.point1}>
          <sphereGeometry args={[0.05, 8, 8]} />
          {/* Opacidade aumentada para refletir a presença significativa do emaranhamento mesmo em estado basal */}
          <meshBasicMaterial color={pair.color} transparent opacity={collapseActive ? 1 : (0.25 + 0.75 * coherence)} />
        </mesh>

        {/* Segunda partícula do par emaranhado */}
        <mesh position={pair.point2}>
          <sphereGeometry args={[0.05, 8, 8]} />
          {/* Opacidade aumentada para refletir a presença significativa do emaranhamento mesmo em estado basal */}
          <meshBasicMaterial color={pair.color} transparent opacity={collapseActive ? 1 : (0.25 + 0.75 * coherence)} />
        </mesh>
      </Fragment>
    ));
  }, [entangledPairs, collapseActive, coherence]);

  // Memoized line components for better performance
  const lineComponents = useMemo(() => {
    return entangledPairs.map((pair, i) => {
      const lineGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        pair.point1.x, pair.point1.y, pair.point1.z,
        pair.point2.x, pair.point2.y, pair.point2.z
      ]);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const lineMaterial = new THREE.LineBasicMaterial({
        color: pair.color,
        transparent: true,
        opacity: 0.5 * pair.entanglementStrength
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);

      return (
        <primitive key={`line-${i}`} object={line} />
      );
    });
  }, [entangledPairs]);

  return (
    <group>
      {/* Partículas emaranhadas - representam dímeros de tubulina */}
      <group ref={points}>
        {particleComponents}
      </group>

      {/* Linhas de emaranhamento - conexões quânticas não-locais */}
      <group ref={lines}>
        {lineComponents}
      </group>
    </group>
  );
});

export default QuantumEntanglement;