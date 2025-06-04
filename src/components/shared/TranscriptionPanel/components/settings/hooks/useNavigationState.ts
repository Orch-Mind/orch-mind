// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useState, useMemo } from "react";
import { OpenSectionType, TabType } from '../types';

/**
 * Hook para gerenciamento de estado de navegação do modal de configurações
 * Implementa o princípio de responsabilidade única gerenciando apenas a navegação
 */
export const useNavigationState = () => {
  const [openSection, setOpenSection] = useState<OpenSectionType>(null);
  const [activeTab, setActiveTab] = useState<TabType>('general');

  return useMemo(() => ({
    openSection,
    setOpenSection,
    activeTab,
    setActiveTab
  }), [
    openSection,
    setOpenSection,
    activeTab,
    setActiveTab
  ]);
};
