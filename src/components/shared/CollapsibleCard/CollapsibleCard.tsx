// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import { CollapsibleModuleProps } from "../../../domain/core/interfaces/components/CollapsibleModule";

/**
 * CollapsibleCard — Implementação concreta de um córtex modular expansível/colapsável.
 * 
 * Intent simbólico: Neurônio de interface que permite colapso/expansão cognitiva, permitindo
 * aos usuários gerenciar a densidade de informação e focar em áreas específicas do córtex interface.
 * 
 * Linhagem neural: Interface -> Módulos Cognitivos -> Adaptação Dinâmica
 */
export type CollapsibleCardProps = CollapsibleModuleProps & {
  /** Symbolic type for color/glow (context, transcription, cognition, ai) */
  type?: 'context' | 'transcription' | 'cognition' | 'ai';
  /** Optional icon (JSX.Element) to show in header */
  icon?: React.ReactNode;
  /** Optional actions (e.g., buttons) to render in the header, right-aligned */
  headerActions?: React.ReactNode;
};

/**
 * Implementação concreta do córtex colapsável para o painel de transcrição.
 * Alinha-se às interfaces de domínio para modularização e reutilização em outros módulos.
 */
const ICONS: Record<string, React.ReactNode> = {
  context: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="8" ry="6" stroke="#00faff" strokeWidth="2"/><circle cx="6.5" cy="10" r="1.5" fill="#00faff"/><circle cx="13.5" cy="10" r="1.5" fill="#00faff"/><path d="M8 10 Q10 12 12 10" stroke="#00faff" strokeWidth="1.2" fill="none"/></svg>
  ),
  transcription: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#ff416c" strokeWidth="2"/><rect x="8" y="5" width="4" height="8" rx="2" fill="#ff416c"/><rect x="9" y="14" width="2" height="2" rx="1" fill="#ff416c"/></svg>
  ),
  cognition: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="8" ry="6" stroke="#7c4dff" strokeWidth="2"/><circle cx="10" cy="10" r="3" fill="#7c4dff"/></svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="4" width="12" height="12" rx="4" stroke="#ff80ab" strokeWidth="2"/><circle cx="10" cy="10" r="2" fill="#ff80ab"/></svg>
  )
};

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, children, debugBorder, type, icon, headerActions = undefined }) => {
  // Sempre aberto: não há mais estado de expansão
  const open = true;
  const contentId = `neural-content-${title.replace(/\s+/g, '-').toLowerCase()}`;
  // Componente final com estrutura semântica e acessível
  return (
    <div
      className={`orchos-card transcription-card-collapsible open`}
      data-state={"expanded"}
      data-debugborder={debugBorder ? "true" : undefined}
      data-type={type}
    >
      <div className="transcription-card-header flex items-center gap-2 rounded-[1.3rem] text-left focus:outline-none group w-full justify-between">

        {type && ICONS[type] && (
          <span className="transcription-card-icon" aria-hidden="true">
            {ICONS[type]}
          </span>
        )}
        <span 
          className="transcription-card-title flex-1 text-lg font-bold tracking-wide truncate" 
          title={title} // Adiciona tooltip nativo para mostrar o texto completo no hover
        >
          {title}
        </span>
        {headerActions && (
          <div className="transcription-card-header-actions flex items-center ml-auto">
            {headerActions}
          </div>
        )}
      </div>
      {/* Conteúdo do card colapsável */}
      <div 
        className={`transcription-card-content${open ? " open" : ""}`} 
        id={contentId}
      >
        {open ? children : null}
      </div>
    </div>
  );
};

export default CollapsibleCard;