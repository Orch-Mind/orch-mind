// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import TextControls from './TextControls';


interface TextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  rows?: number;
  placeholder?: string;
  isExpanded?: boolean;
  toggleExpand?: () => void;
  forwardedRef?: React.RefObject<HTMLTextAreaElement>;
  useAutosize?: boolean;
  readOnly?: boolean;
}

const TextEditor: React.FC<TextEditorProps> = ({
  label,
  value,
  onChange,
  onClear,

  rows = 5,
  placeholder = '',
  isExpanded,
  toggleExpand,
  forwardedRef,
  useAutosize = false,
  readOnly = false
}) => {

  // Classes comuns para todos os textareas, adaptando-se ao contexto neural
  const commonClasses = `w-full p-4 rounded-xl bg-black/40 text-white leading-relaxed font-medium shadow-inner neural-adaptive-container`;

  return (
    <div className="flex-1 flex flex-col min-h-0 neural-text-container">
      <TextControls
        label={label}
        onClear={onClear}
        onExpand={toggleExpand}
      />
      
      {useAutosize ? (
        <textarea
          className={`${commonClasses} orchos-textarea-neural resize-none flex-1 h-full min-h-0 ${isExpanded ? 'max-h-96' : ''} overflow-y-auto`}
          value={value}
          onChange={(e) => { if (!readOnly) onChange(e.target.value); }}
          readOnly={readOnly}
          rows={isExpanded ? 10 : rows}
          ref={forwardedRef}
          placeholder={placeholder}
          title={readOnly ? "Transcription text (read-only)" : label}
          aria-label={readOnly ? "Transcription text (read-only)" : label}
          style={{ height: '100%', minHeight: '60px' }}
        />
      ) : (
        <textarea
          className={`${commonClasses} orchos-textarea-neural resize-none flex-1 h-full min-h-0`}
          value={value}
          onChange={(e) => { if (!readOnly) onChange(e.target.value); }}
          readOnly={readOnly}
          rows={rows}
          ref={forwardedRef}
          placeholder={placeholder}
          title={readOnly ? "Transcription text (read-only)" : label}
          aria-label={readOnly ? "Transcription text (read-only)" : label}
          style={{ height: '100%', minHeight: '60px' }}
        />
      )}
    </div>
  );
};

export default TextEditor;
