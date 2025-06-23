// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useLayoutEffect, useRef } from "react";
import { CognitionEvent } from "../../../../context/deepgram/types/CognitionEvent";
import styles from "../../CognitionTimeline.module.css";

/**
 * Pure UI component for rendering a single cognition event in the timeline.
 * No logic, no mutation, only visual representation.
 * SOLID: Single Responsibility Principle.
 */
export interface CognitionEventUIProps {
  event: CognitionEvent;
  idx: number;
  onClick?: (event: CognitionEvent) => void;
  duration?: { value: string; color: string };
}

// Define the background colors for each event type to match modal colors
const eventColors: Record<string, string> = {
  raw_prompt: "bg-blue-700",
  temporary_context: "bg-purple-700",
  neural_signal: "bg-amber-700",
  neural_collapse: "bg-pink-700",
  symbolic_retrieval: "bg-green-700",
  fusion_initiated: "bg-orange-700",
  symbolic_context_synthesized: "bg-indigo-700",
  gpt_response: "bg-red-700",
  emergent_patterns: "bg-teal-700",
};

// Use the colors to create the icons
const eventTypeIcons: Record<string, React.ReactNode> = {
  raw_prompt: (
    <div
      className={`w-9 h-9 rounded-full ${eventColors.raw_prompt} flex items-center justify-center text-white overflow-hidden text-xl`}
    >
      🧠
    </div>
  ),
  temporary_context: (
    <div
      className={`w-8 h-8 rounded-full ${eventColors.temporary_context} flex items-center justify-center text-white overflow-hidden text-xl`}
    >
      🧠
    </div>
  ),
  neural_signal: (
    <div
      className={`w-8 h-8 rounded-full ${eventColors.neural_signal} flex items-center justify-center text-white overflow-hidden text-xl`}
    >
      ⚡
    </div>
  ),
  neural_collapse: (
    <div
      className={`w-8 h-8 rounded-full ${eventColors.neural_collapse} flex items-center justify-center text-white overflow-hidden text-xl`}
    >
      💥
    </div>
  ),
  symbolic_retrieval: (
    <div
      className={`w-8 h-8 rounded-full ${eventColors.symbolic_retrieval} flex items-center justify-center text-white overflow-hidden text-xl`}
    >
      🔍
    </div>
  ),
  fusion_initiated: (
    <div
      className={`w-8 h-8 rounded-full ${eventColors.fusion_initiated} flex items-center justify-center text-white overflow-hidden text-xl`}
    >
      🔥
    </div>
  ),
  symbolic_context_synthesized: (
    <div
      className={`w-8 h-8 rounded-full ${eventColors.symbolic_context_synthesized} flex items-center justify-center text-white overflow-hidden text-xl`}
    >
      🔗
    </div>
  ),
  gpt_response: (
    <div
      className={`w-8 h-8 rounded-full ${eventColors.gpt_response} flex items-center justify-center text-white overflow-hidden text-xl`}
    >
      💬
    </div>
  ),
  emergent_patterns: (
    <div
      className={`w-8 h-8 rounded-full ${eventColors.emergent_patterns} flex items-center justify-center text-white overflow-hidden text-xl`}
    >
      🌊
    </div>
  ),
};

// Format event type for display
const formatEventType = (type: string): string => {
  // Para Neural Signal e Raw Prompt, usamos formatos específicos
  if (type === "neural_signal") return "Neural Signal";
  if (type === "raw_prompt") return "Raw Prompt";

  // Para eventos regulares, usamos Title Case
  return type
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const CognitionEventUI: React.FC<CognitionEventUIProps> = React.memo(
  ({ event, idx, onClick, duration }) => {
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Verificar se é um evento de resposta GPT (geralmente o último)
    const isGptResponse = event.type === "gpt_response";
    const icon = eventTypeIcons[event.type] || (
      <span className="text-gray-400">⬛</span>
    );

    // Extract information based on event type
    const isNeuralSignal = event.type === "neural_signal";
    const isRawPrompt = event.type === "raw_prompt";

    // For neural signals, extract core and intensity
    const neuralCore = isNeuralSignal ? event.core : null;
    // Garantir que intensity seja tratado como número e convertido para percentual
    // Multiplicamos por 100 para converter o valor decimal (0-1) para percentual (0-100)
    const intensityValue = isNeuralSignal
      ? Math.round(event.intensity * 100)
      : 0;
    const neuralValue = isNeuralSignal ? `${intensityValue}%` : null;

    // Set CSS custom property for progress bar width
    useLayoutEffect(() => {
      if (progressBarRef.current && isNeuralSignal) {
        progressBarRef.current.style.setProperty(
          "--progress-width",
          `${intensityValue}%`
        );
      }
    }, [intensityValue, isNeuralSignal]);

    /**
     * Sistema de cores para todos os cores neurais do Orch-OS
     * - Cores escolhidas para refletir os domínios cognitivos específicos
     * - Codificação por cores facilita o reconhecimento de padrões (processamento pré-atentivo)
     * - Cores com boa visibilidade e associações semânticas relevantes
     */
    const getNeuralTypeColor = (type: string | null) => {
      if (!type) return "text-amber-400"; // Default

      switch (type.toLowerCase()) {
        // Cores cognitivos/memória
        case "memory":
          return "text-orange-400"; // Memória - Laranja (lembranças/recuperação)
        case "associative":
          return "text-amber-500"; // Associativo - Âmbar escuro (conexões entre memórias)

        // Cores emocionais/afetivos
        case "valence":
          return "text-amber-400"; // Valência - Âmbar (emoções/afeto)
        case "soul":
          return "text-rose-400"; // Alma - Rosa avermelhado (essência emocional profunda)

        // Cores de linguagem/comunicação
        case "language":
          return "text-indigo-400"; // Linguagem - Índigo (expressão verbal)

        // Cores de metacognição/planejamento
        case "metacognitive":
          return "text-teal-400"; // Metacognitivo - Turquesa (reflexão sobre pensamento)
        case "planning":
          return "text-sky-400"; // Planejamento - Azul céu (estruturação futura)
        case "will":
          return "text-blue-500"; // Vontade - Azul forte (força de intenção)

        // Cores inconscientes/arquetípicos
        case "unconscious":
          return "text-fuchsia-400"; // Inconsciente - Fuchsia (conteúdos não conscientes)
        case "archetype":
          return "text-purple-400"; // Arquétipo - Roxo (padrões universais)
        case "shadow":
          return "text-violet-500"; // Sombra - Violeta escuro (aspectos reprimidos)

        // Cores físicos/encarnação
        case "body":
          return "text-green-500"; // Corpo - Verde escuro (sensações físicas)

        // Cores sociais/identidade
        case "social":
          return "text-blue-400"; // Social - Azul (interações interpessoais)
        case "self":
          return "text-green-400"; // Self - Verde (identidade/auto-percepção)

        // Cores criativos/intuitivos
        case "creativity":
          return "text-pink-400"; // Criatividade - Rosa (inovação/expressão)
        case "intuition":
          return "text-purple-500"; // Intuição - Roxo intenso (conhecimento direto)

        // Default para qualquer outro tipo
        default:
          return "text-amber-400"; // Default - Âmbar como fallback
      }
    };

    /**
     * Cores otimizadas para barras de progresso com maior visibilidade
     * Correspondendo ao sistema de cores do texto, mas com ajustes de intensidade
     * para garantir boa visibilidade contra o fundo escuro
     */
    /**
     * Cores otimizadas para barras de progresso com alta visibilidade
     * Especialmente contra fundos escuros (bg-gray-800/60) usado no tema do Orch-OS
     *
     * Cores problemáticas contra fundos escuros foram ajustadas para:
     * 1. Tons de azul/roxo/violeta - aumentados para 500/600 (roxo e azul escuro absorvem mais luz)
     * 2. Tons de verde escuro - aumentados para 500/600 (verde escuro tem menor percepção luminosa)
     * 3. Cores neutras - aumentadas para 500/600 (cinzas e cores neutras se misturam com o fundo)
     */
    const getProgressBarColor = (type: string | null) => {
      if (!type) return "bg-amber-500"; // Default usando 500 para maior visibilidade

      switch (type.toLowerCase()) {
        // Cores cognitivos/memória
        case "memory":
          return "bg-orange-500"; // Memória - Laranja 500 (boa visibilidade natural)
        case "associative":
          return "bg-amber-600"; // Associativo - Âmbar 600 (mais intenso para maior contraste)

        // Cores emocionais/afetivos
        case "valence":
          return "bg-amber-500"; // Valência - Âmbar 500 (boa visibilidade natural)
        case "soul":
          return "bg-rose-500"; // Alma - Rosa 500 (bom contraste natural)

        // Cores de linguagem/comunicação
        case "language":
          return "bg-indigo-600"; // Linguagem - Índigo 600 (intensificado pois índigo tem baixa visibilidade)

        // Cores de metacognição/planejamento
        case "metacognitive":
          return "bg-teal-500"; // Metacognitivo - Teal 500 (boa visibilidade)
        case "planning":
          return "bg-sky-500"; // Planejamento - Sky 500 (boa visibilidade)
        case "will":
          return "bg-blue-600"; // Vontade - Azul 600 (intensificado para contraste)

        // Cores inconscientes/arquetípicos - Grupo mais problemático para visibilidade
        case "unconscious":
          return "bg-fuchsia-600"; // Inconsciente - Fuchsia 600 (cores roxas/violetas precisam de maior intensidade)
        case "archetype":
          return "bg-purple-600"; // Arquétipo - Roxo 600 (intensificado para garantir visibilidade)
        case "shadow":
          return "bg-violet-600"; // Sombra - Violeta 600 (intensificado para contraste)

        // Cores físicos/encarnação
        case "body":
          return "bg-green-600"; // Corpo - Verde 600 (verdes escuros precisam de maior intensidade)

        // Cores sociais/identidade
        case "social":
          return "bg-blue-600"; // Social - Azul 600 (intensificado pois azul escuro tem menor contraste)
        case "self":
          return "bg-green-500"; // Self - Verde 500 (verde médio tem boa visibilidade)

        // Cores criativos/intuitivos
        case "creativity":
          return "bg-pink-500"; // Criatividade - Rosa 500 (bom contraste natural)
        case "intuition":
          return "bg-purple-600"; // Intuição - Roxo 600 (intensificado para visibilidade)

        // Default para qualquer outro tipo
        default:
          return "bg-amber-500"; // Default usando âmbar 500 para melhor visibilidade
      }
    };

    // Format time as HH:MM:SS.mmm manually to include milliseconds
    const formattedTime = event.timestamp
      ? (() => {
          const date = new Date(event.timestamp);
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          const seconds = date.getSeconds().toString().padStart(2, "0");
          const ms = date.getMilliseconds().toString().padStart(3, "0");
          return `${hours}:${minutes}:${seconds}.${ms}`;
        })()
      : "";

    return (
      <div
        className={`relative rounded-xl p-3 shadow-lg transition-all cursor-pointer ${
          styles.eventCardGlass
        } ${onClick ? "hover:shadow-xl" : ""} ${
          isGptResponse ? "mb-6 pb-4" : ""
        }`}
        onClick={() => onClick && onClick(event)}
      >
        {/* Vertical timeline line - visible between consecutive events */}
        {idx > 0 && (
          <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-cyan-800/30 -translate-y-3 h-4" />
        )}
        <div
          className="group flex items-stretch bg-gray-900/90 hover:bg-gray-800/90 rounded-lg border border-gray-800/80 hover:border-gray-700 transition-all duration-200 overflow-hidden cursor-pointer"
          tabIndex={0}
          role="button"
          aria-label={event.type}
        >
          {/* Left column with icon */}
          <div className="w-14 flex-shrink-0 flex items-center justify-center text-2xl select-none border-r border-gray-800/30">
            {icon}
          </div>

          {/* Content section */}
          <div className="flex-1 px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              {/* Event type label */}
              <div className="flex items-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white ${
                    eventColors[event.type] || "bg-gray-800"
                  }`}
                >
                  {formatEventType(event.type)}
                </span>
              </div>

              {/* Timestamp and duration */}
              <div className="flex items-center space-x-2">
                <span className="whitespace-nowrap font-mono text-xs text-gray-400">
                  {formattedTime}
                </span>
                {duration && (
                  <span className="flex items-center">
                    <span
                      className={`whitespace-nowrap font-mono text-xs ${duration.color}`}
                    >
                      {duration.value}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Content based on event type */}
            {isNeuralSignal && neuralValue ? (
              <div className="text-base font-medium flex items-center gap-1.5">
                <span className={`${getNeuralTypeColor(neuralCore)} font-mono`}>
                  {neuralCore ? neuralCore.toLowerCase() : ""}
                </span>
                <span className={`${getNeuralTypeColor(neuralCore)} font-mono`}>
                  {neuralValue}
                </span>
                {/* Barra de intensidade junto do percentual */}
                <div className="w-28 h-2 bg-gray-800/60 rounded-full overflow-hidden ml-1">
                  {/* Aplicando largura dinâmica com CSS custom property */}
                  <div
                    className={`h-full ${getProgressBarColor(neuralCore)} ${
                      styles.progressBar
                    }`}
                    ref={progressBarRef}
                  />
                </div>
              </div>
            ) : isRawPrompt ? (
              <div className="text-base text-gray-300 font-medium">
                {event.content
                  ? event.content.substring(0, 50) +
                    (event.content.length > 50 ? "..." : "")
                  : ""}
              </div>
            ) : event.type === "gpt_response" ? (
              <div className="text-base text-gray-300 font-medium">
                {event.response
                  ? event.response.substring(0, 50) +
                    (event.response.length > 50 ? "..." : "")
                  : ""}
              </div>
            ) : (
              <div className="text-base text-gray-300 font-medium">
                {/* Display summary based on event type */}
                {event.type === "symbolic_retrieval"
                  ? `${event.matchCount || 0} matches found`
                  : event.type === "neural_collapse"
                  ? `Collapse: ${event.selectedCore}`
                  : event.type === "emergent_patterns"
                  ? `${event.patterns?.length || 0} patterns`
                  : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

// Exporta o componente memoizado
export default CognitionEventUI;
