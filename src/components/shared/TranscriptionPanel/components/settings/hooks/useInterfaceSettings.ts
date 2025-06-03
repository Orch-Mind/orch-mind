// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useState, useEffect } from "react";
import { getOption, setOption, STORAGE_KEYS, subscribeToStorageChanges } from '../../../../../../services/StorageService';

/**
 * Hook para gerenciamento de configurações de interface
 * Componente neural-simbólico especializado na experiência visual do usuário
 */
export const useInterfaceSettings = () => {
  // Estado neural-simbólico para opções de interface
  const [darkMode, setDarkMode] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.DARK_MODE) ?? true);
  const [enableNeumorphism, setEnableNeumorphism] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_NEUMORPHISM) ?? true);
  const [enableGlassmorphism, setEnableGlassmorphism] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.ENABLE_GLASSMORPHISM) ?? true);
  const [panelTransparency, setPanelTransparency] = useState<number>(() => getOption<number>(STORAGE_KEYS.PANEL_TRANSPARENCY) ?? 70);
  const [colorTheme, setColorTheme] = useState<string>(() => getOption<string>(STORAGE_KEYS.COLOR_THEME) || 'quantum-blue');
  const [theme, setTheme] = useState<string>(() => getOption<string>(STORAGE_KEYS.THEME) || 'auto');
  const [uiDensity, setUiDensity] = useState<string>(() => getOption<string>(STORAGE_KEYS.UI_DENSITY) || 'normal');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(() => getOption<boolean>(STORAGE_KEYS.SHOW_ADVANCED_SETTINGS) ?? false);
  
  // Sincroniza mudanças do storage para o estado local
  useEffect(() => {
    const handleStorageChange = (key: string, value: any) => {
      switch(key) {
        case STORAGE_KEYS.DARK_MODE: setDarkMode(value); break;
        case STORAGE_KEYS.ENABLE_NEUMORPHISM: setEnableNeumorphism(value); break;
        case STORAGE_KEYS.ENABLE_GLASSMORPHISM: setEnableGlassmorphism(value); break;
        case STORAGE_KEYS.PANEL_TRANSPARENCY: setPanelTransparency(value); break;
        case STORAGE_KEYS.COLOR_THEME: setColorTheme(value); break;
        case STORAGE_KEYS.THEME: setTheme(value); break;
        case STORAGE_KEYS.UI_DENSITY: setUiDensity(value); break;
        case STORAGE_KEYS.SHOW_ADVANCED_SETTINGS: setShowAdvancedSettings(value); break;
      }
    };
    
    const unsubscribe = subscribeToStorageChanges(handleStorageChange);
    return () => unsubscribe();
  }, []);
  
  // Salva as configurações de interface no storage
  const saveInterfaceSettings = () => {
    setOption(STORAGE_KEYS.DARK_MODE, darkMode);
    setOption(STORAGE_KEYS.ENABLE_NEUMORPHISM, enableNeumorphism);
    setOption(STORAGE_KEYS.ENABLE_GLASSMORPHISM, enableGlassmorphism);
    setOption(STORAGE_KEYS.PANEL_TRANSPARENCY, panelTransparency);
    setOption(STORAGE_KEYS.COLOR_THEME, colorTheme);
    setOption(STORAGE_KEYS.THEME, theme);
    setOption(STORAGE_KEYS.UI_DENSITY, uiDensity);
    setOption(STORAGE_KEYS.SHOW_ADVANCED_SETTINGS, showAdvancedSettings);
  };
  
  return {
    // Valores
    darkMode,
    setDarkMode,
    enableNeumorphism,
    setEnableNeumorphism,
    enableGlassmorphism,
    setEnableGlassmorphism,
    panelTransparency,
    setPanelTransparency,
    colorTheme,
    setColorTheme,
    theme,
    setTheme,
    uiDensity,
    setUiDensity,
    showAdvancedSettings,
    setShowAdvancedSettings,
    
    // Ações
    saveInterfaceSettings
  };
};
