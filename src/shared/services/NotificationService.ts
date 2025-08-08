// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { toast, ToastOptions } from 'react-toastify';

/**
 * Service para notificações não-bloqueantes usando react-toastify
 * Substitui o uso de alert() que bloqueia a UI e o estado dos componentes
 */
export class NotificationService {
  private static defaultOptions: ToastOptions = {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "colored"
  };

  /**
   * Exibe notificação de sucesso
   */
  static success(message: string, options?: ToastOptions): void {
    toast.success(message, {
      ...this.defaultOptions,
      ...options
    });
  }

  /**
   * Exibe notificação de erro
   */
  static error(message: string, options?: ToastOptions): void {
    toast.error(message, {
      ...this.defaultOptions,
      autoClose: 6000, // Erros ficam mais tempo visíveis
      ...options
    });
  }

  /**
   * Exibe notificação informativa
   */
  static info(message: string, options?: ToastOptions): void {
    toast.info(message, {
      ...this.defaultOptions,
      ...options
    });
  }

  /**
   * Exibe notificação de aviso
   */
  static warning(message: string, options?: ToastOptions): void {
    toast.warning(message, {
      ...this.defaultOptions,
      autoClose: 5000, // Warnings ficam um pouco mais tempo
      ...options
    });
  }

  /**
   * Exibe notificação de deploy/processos longos
   */
  static deploy(message: string, type: 'success' | 'error' = 'success'): void {
    const options: ToastOptions = {
      ...this.defaultOptions,
      autoClose: 8000, // Deploys são importantes, ficam mais tempo
      closeOnClick: false, // Usuário deve ler completamente
      pauseOnHover: true
    };

    if (type === 'success') {
      this.success(message, options);
    } else {
      this.error(message, options);
    }
  }

  /**
   * Remove todas as notificações ativas
   */
  static dismissAll(): void {
    toast.dismiss();
  }

  /**
   * Configurações padrão para diferentes contextos
   */
  static getConfigForContext(context: 'deploy' | 'merge' | 'training' | 'general'): ToastOptions {
    const baseConfig = { ...this.defaultOptions };

    switch (context) {
      case 'deploy':
        return {
          ...baseConfig,
          autoClose: 8000,
          closeOnClick: false
        };
      case 'merge':
        return {
          ...baseConfig,
          autoClose: 6000
        };
      case 'training':
        return {
          ...baseConfig,
          autoClose: 10000,
          closeOnClick: false
        };
      default:
        return baseConfig;
    }
  }
}
