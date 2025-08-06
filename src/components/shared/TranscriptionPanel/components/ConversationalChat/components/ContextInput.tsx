// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";
import { ContextInputProps } from "../types/ChatTypes";

/**
 * Context input component
 * Follows Single Responsibility Principle - only handles context input
 */
export const ContextInput: React.FC<ContextInputProps> = ({
  value,
  onChange,
  onClose,
  show,
}) => {
  const { t } = useTranslation();
  
  if (!show && !value) return null;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="context-input-wrapper">
      <div className="context-label">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
          <path
            d="M10 5v5l3 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {t('chatInput.contextLabel')}
        <button
          className="context-close-btn"
          onClick={onClose}
          title={t('chatInput.removeContext')}
          type="button"
        >
          ×
        </button>
      </div>
      <textarea
        className="context-input"
        value={value}
        onChange={handleChange}
        placeholder={t('chatInput.contextPlaceholder')}
        rows={2}
        autoFocus={show}
      />
    </div>
  );
};
