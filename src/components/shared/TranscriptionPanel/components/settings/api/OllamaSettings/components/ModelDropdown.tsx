// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { CheckCircleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useRef, useState } from "react";
import { OllamaModel } from "../types/ollama.types";

interface ModelDropdownProps {
  label: string;
  value: string;
  models: OllamaModel[];
  onSelect: (model: OllamaModel) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

/**
 * Reusable dropdown component for model selection
 * Single Responsibility: Handle dropdown UI and interactions
 */
export const ModelDropdown: React.FC<ModelDropdownProps> = ({
  label,
  value,
  models,
  onSelect,
  disabled = false,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (model: OllamaModel) => {
    onSelect(model);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return "Select...";
    return value.split(":")[0];
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs text-cyan-400 mb-1">
        {label}
        {isLoading && (
          <span className="ml-1 animate-spin inline-block">🔄</span>
        )}
      </label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30 focus:outline-none hover:bg-black/50 transition-colors text-xs disabled:opacity-50"
      >
        <span className="text-left truncate">{getDisplayValue()}</span>
        <ChevronDownIcon
          className={`w-3 h-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-black/90 border border-cyan-500/30 rounded shadow-lg max-h-40 overflow-y-auto">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelect(model)}
              className="w-full px-2 py-2 text-left hover:bg-cyan-500/20 transition-colors border-b border-cyan-500/10 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 truncate">
                  <div className="text-white/90 font-medium text-xs truncate">
                    {model.name}
                  </div>
                  <div className="text-cyan-400/60 text-[10px]">
                    {model.size}
                  </div>
                </div>
                {model.isDownloaded && (
                  <CheckCircleIcon className="w-3 h-3 text-green-400 ml-2" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
