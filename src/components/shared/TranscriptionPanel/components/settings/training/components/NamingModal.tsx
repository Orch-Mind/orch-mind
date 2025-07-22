// SPDX-License-Identifier: MIT OR Apache-2.0
// Naming Modal Component - For customizing adapter and model names

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface NamingModalProps {
  isOpen: boolean;
  type: "adapter" | "deploy";
  defaultName?: string;
  title: string;
  description: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const NamingModal: React.FC<NamingModalProps> = ({
  isOpen,
  type,
  defaultName = "",
  title,
  description,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [name, setName] = useState(defaultName);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    setName(defaultName);
  }, [defaultName, isOpen]);

  useEffect(() => {
    // Validate name: should not be empty and follow naming conventions
    const trimmedName = name.trim();
    if (type === "adapter") {
      // Adapter name validation: no special chars except - and _
      setIsValid(
        trimmedName.length >= 3 && 
        trimmedName.length <= 50 && 
        /^[a-zA-Z0-9_-]+$/.test(trimmedName)
      );
    } else {
      // Deploy model name validation: follow Ollama naming conventions
      setIsValid(
        trimmedName.length >= 3 && 
        trimmedName.length <= 50 && 
        /^[a-zA-Z0-9._-]+$/.test(trimmedName) &&
        !trimmedName.startsWith('.') &&
        !trimmedName.endsWith('.')
      );
    }
  }, [name, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isLoading) {
      onConfirm(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  const getPlaceholder = () => {
    if (type === "adapter") {
      return "my-custom-adapter";
    } else {
      return "my-custom-model:latest";
    }
  };

  const getHelpText = () => {
    if (type === "adapter") {
      return "Use apenas letras, números, hífen (-) e underscore (_). Mín. 3 caracteres.";
    } else {
      return "Siga as convenções do Ollama. Use letras, números, pontos, hífen e underscore. Mín. 3 caracteres.";
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={!isLoading ? onCancel : undefined}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-gradient-to-b from-slate-800 to-slate-900 border border-cyan-400/30 rounded-xl shadow-2xl w-full max-w-md mx-auto"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        style={{ maxHeight: '90vh', overflow: 'auto' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-cyan-400/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {description}
              </p>
            </div>
            {!isLoading && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700/50"
                title="Fechar modal"
                aria-label="Fechar modal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {type === "adapter" ? "Nome do Adapter" : "Nome do Modelo"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={getPlaceholder()}
                className={`w-full px-3 py-2.5 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                  name.trim() === "" 
                    ? "border-gray-500 focus:ring-cyan-500/50 focus:border-cyan-400"
                    : isValid
                    ? "border-green-500/50 focus:ring-green-500/50 focus:border-green-400"
                    : "border-red-500/50 focus:ring-red-500/50 focus:border-red-400"
                }`}
                disabled={isLoading}
                autoFocus
              />
              
              {/* Help text */}
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-400">
                  {getHelpText()}
                </p>
                
                {name.trim() !== "" && !isValid && (
                  <p className="text-xs text-red-400">
                    {type === "adapter" 
                      ? "Nome inválido. Use apenas letras, números, hífen (-) e underscore (_)."
                      : "Nome inválido. Siga as convenções do Ollama para nomes de modelos."
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-gray-300 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-gray-500 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                isValid && !isLoading
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 hover:shadow-lg"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {type === "adapter" ? "Treinando..." : "Deployando..."}
                  </span>
                </div>
              ) : (
                <span>{type === "adapter" ? "Iniciar Treinamento" : "Deploy Modelo"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Use portal to render modal at document body level to avoid z-index issues
  return createPortal(modalContent, document.body);
};

export default NamingModal;
