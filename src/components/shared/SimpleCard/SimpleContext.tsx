// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { createContext, ReactNode, useContext, useState } from 'react';
import { SimpleModuleState } from '../../../domain/core/interfaces/components/SimpleModule';

/**
 * Contexto para o estado de colapso/expansão de módulos neurais da interface.
 * 
 * Intent Simbólico: Permite orquestração coordenada de múltiplos estados de colapso
 * nos módulos corticais, possibilitando comunicação neural entre componentes irmãos.
 */
interface SimpleContextState {
  expandedModules: Set<string>;
  toggleModule: (id: string) => void;
  isExpanded: (id: string) => boolean;
  collapseAll: () => void;
  expandAll: (moduleIds: string[]) => void;
}

const SimpleContext = createContext<SimpleContextState | null>(null);

/**
 * Provider para gerenciamento de estado de colapso/expansão entre múltiplos módulos.
 * 
 * Linhagem Neural: Orquestrador Cortical → Adaptação Dinâmica → Interface Visual
 */
export const SimpleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const isExpanded = (id: string) => expandedModules.has(id);
  
  const collapseAll = () => setExpandedModules(new Set());
  const expandAll = (moduleIds: string[]) => setExpandedModules(new Set(moduleIds));

  return (
    <SimpleContext.Provider value={{ expandedModules, toggleModule, isExpanded, collapseAll, expandAll }}>
      {children}
    </SimpleContext.Provider>
  );
};

/**
 * Hook para utilização do contexto de collapse/expand nos módulos corticais.
 * Retorna funções e estado para sincronizar estados de colapso.
 */
export const useSimple = (): SimpleContextState => {
  const context = useContext(SimpleContext);
  if (!context) {
    throw new Error('useSimple deve ser usado dentro de um SimpleProvider');
  }
  return context;
};

/**
 * Hook para um módulo colapsável individual.
 * Fornece estado e funções para gerenciar colapso/expansão sincronizada.
 */
export const useSimpleModule = (id: string, defaultOpen = false): SimpleModuleState => {
  const context = useContext(SimpleContext);
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  
  // Se não houver contexto, usa state local
  if (!context) {
    return {
      isExpanded: localOpen,
      toggle: () => setLocalOpen(!localOpen)
    };
  }
  
  // Inicializa o módulo como aberto no contexto se for padrão
  if (defaultOpen && !context.isExpanded(id)) {
    context.toggleModule(id);
  }
  
  return {
    isExpanded: context.isExpanded(id),
    toggle: () => context.toggleModule(id)
  };
};