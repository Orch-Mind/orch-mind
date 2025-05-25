// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import "./SimpleCard.css";

/**
 * SimpleCard — Implementação concreta de um córtex neural de interface.
 * 
 * Intent simbólico: Neurônio de interface que organiza informação cognitiva em
 * um container espacial com propriedades quânticas de contexto.
 * 
 * Linhagem neural: Interface -> Córtex Visual -> Representação Simbólica
 */
export interface SimpleCardProps {
  /** Title of the card, displayed in the header */
  title: string;
  /** Card content */
  children: React.ReactNode;
  /** Optional debug border */
  debugBorder?: boolean;
  /** Symbolic type for color/glow (context, transcription, cognition, ai) */
  type?: 'context' | 'transcription' | 'cognition' | 'ai';
  /** Optional icon (JSX.Element) to show in header */
  icon?: React.ReactNode;
  /** Optional actions (e.g., buttons) to render in the header, right-aligned */
  headerActions?: React.ReactNode;
  /** Optional footer actions (e.g., buttons) to render at the bottom of the card */
  footerActions?: React.ReactNode;
  /** For backward compatibility with previous APIs */
  defaultOpen?: boolean;
};

/**
 * Implementação concreta do córtex neural para o painel de transcrição.
 * Alinha-se às interfaces de domínio para modularização e reutilização em outros módulos.
 */


const SimpleCard: React.FC<SimpleCardProps> = ({ 
  title, 
  children, 
  debugBorder, 
  type, 
  icon, 
  headerActions = undefined,
  footerActions = undefined
}) => {
  const contentId = `neural-content-${title.replace(/\s+/g, '-').toLowerCase()}`;
  
  // Componente final com estrutura semântica e acessível
  return (
    <div
      className="orchos-card neural-card"
      data-state="expanded"
      data-debugborder={debugBorder ? "true" : undefined}
      data-type={type}
    >
      <div className="transcription-card-header">
        {icon && (
          <span className="transcription-card-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span
          className="transcription-card-title"
          title={title}
        >
          {title}
        </span>
        {headerActions && (
          <div className="transcription-card-header-actions ml-auto">
            {headerActions}
          </div>
        )}
      </div>
      
      {/* Conteúdo do card neural */}
      <div 
        className="transcription-card-content" 
        id={contentId}
      >
        {children}
      </div>
      
      {footerActions && (
        <div className="orchos-card-footer">
          {footerActions}
        </div>
      )}
    </div>
  );
};

export default SimpleCard;