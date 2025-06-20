// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { getOption, STORAGE_KEYS } from "../../../../services/StorageService";
import { ImportModalProps } from "../types/interfaces";

const ImportModal: React.FC<ImportModalProps> = ({
  show,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose,
  importFile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setImportFile,
  importMode,
  setImportMode,
  importProgress,
  importStage,
  importSummary,
  isImporting,
  handleFileChange,
  handleStartImport,
  handleCloseImportModal,
}) => {
  if (!show) return null;

  // Get the userName from settings to display
  const userName = getOption(STORAGE_KEYS.USER_NAME) || "User";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
      <div 
        className="rounded-2xl p-6 w-full max-w-md relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
          backdropFilter: "blur(40px) saturate(1.5) brightness(1.05)",
          WebkitBackdropFilter: "blur(40px) saturate(1.5) brightness(1.05)",
          border: "1px solid rgba(0, 250, 255, 0.15)",
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.1), 
            0 0 100px rgba(0, 250, 255, 0.05), 
            inset 0 0 60px rgba(255, 255, 255, 0.01),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-2xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]"
            style={{ fontFamily: "Orbitron, Inter, sans-serif" }}
          >
            Import Neural Data
          </h2>
          <button
            onClick={handleCloseImportModal}
            className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-full p-1"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* User info display */}
        <div 
          className="mb-4 p-3 rounded-xl"
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(0, 250, 255, 0.1)"
          }}
        >
          <p className="text-cyan-200/80 text-sm flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Importing as:{" "}
            <span className="text-cyan-400 font-semibold">{userName}</span>
          </p>
          <p className="text-cyan-200/60 text-xs mt-1">
            You can change your name in Settings → General
          </p>
        </div>

        {/* File selection */}
        <label className="block mb-6">
          <span className="block text-cyan-200/80 mb-2 font-medium">
            Select file
          </span>
          <div className="flex items-center gap-3">
            <input
              data-testid="import-user-input"
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
              id="orchos-upload-neural"
              disabled={isImporting}
            />
            <label
              htmlFor="orchos-upload-neural"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-700/20 to-purple-600/20 text-white font-semibold shadow-lg cursor-pointer hover:scale-105 transition-all duration-150 border border-cyan-400/30 hover:border-cyan-400/60"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="#00F0FF"
                  strokeWidth="1.5"
                />
                <path
                  d="M10 6v5m0 0l2.5-2.5M10 11l-2.5-2.5"
                  stroke="#8F00FF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {importFile ? importFile.name : "Choose file"}
            </label>
          </div>
        </label>

        {/* Import mode selection */}
        <div className="mb-6">
          <span className="block text-cyan-200/80 mb-2 font-medium">
            Import mode
          </span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                value="increment"
                checked={importMode === "increment"}
                onChange={(e) =>
                  setImportMode(e.target.value as "increment" | "overwrite")
                }
                className="w-4 h-4 text-cyan-400 bg-gray-800/50 border-gray-600 focus:ring-cyan-400"
                disabled={isImporting}
              />
              <span className="text-white group-hover:text-cyan-300 transition-colors">Increment</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                value="overwrite"
                checked={importMode === "overwrite"}
                onChange={(e) =>
                  setImportMode(e.target.value as "increment" | "overwrite")
                }
                className="w-4 h-4 text-cyan-400 bg-gray-800/50 border-gray-600 focus:ring-cyan-400"
                disabled={isImporting}
              />
              <span className="text-white group-hover:text-cyan-300 transition-colors">Overwrite</span>
            </label>
          </div>
        </div>

        {/* Start Import button */}
        <button
          type="button"
          className="flex items-center gap-2 justify-center w-full py-3 rounded-full font-bold text-lg bg-gradient-to-r from-cyan-400/20 via-blue-700/20 to-purple-600/20 shadow-lg hover:shadow-cyan-400/30 hover:scale-105 transition-all duration-200 border border-cyan-400/30 hover:border-cyan-400/60 text-white focus:outline-none focus:ring-4 focus:ring-cyan-400/60 disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          onClick={() => {
            handleStartImport();
          }}
          disabled={!importFile || isImporting}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="8" stroke="#00F0FF" strokeWidth="1.5" />
            <path
              d="M10 6v5m0 0l2.5-2.5M10 11l-2.5-2.5"
              stroke="#8F00FF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isImporting ? "Importing..." : "Start Import"}
        </button>

        {/* Progress bar */}
        {isImporting && (
          <div className="w-full flex flex-col items-center mb-6">
            <div 
              className="relative w-full h-9 rounded-full shadow-inner overflow-hidden mt-2 mb-3"
              style={{
                background: "linear-gradient(to right, rgba(0, 245, 255, 0.1), rgba(139, 0, 255, 0.1))",
                border: "1px solid rgba(0, 250, 255, 0.1)"
              }}
            >
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-400 via-blue-700 to-purple-600 transition-all duration-300 ease-out"
                style={{
                  width: `${importProgress}%`, // This is ALWAYS the overall/global progress (0-100%)
                  minWidth: importProgress > 0 ? "2.5rem" : 0,
                  borderRadius: "9999px",
                  boxShadow: "0 0 18px 2px rgba(0, 240, 255, 0.18)"
                }}
              >
                {/* Animated pulse effect on the progress bar */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
              {/* Progress percentage overlay - Shows GLOBAL progress, not stage progress */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                  {importProgress}%
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 mt-2">
              <span className="text-cyan-300 text-lg font-semibold drop-shadow animate-pulse">
                {importStage || "Preparing..."}
              </span>
              <span className="text-cyan-400/70 text-xs">
                Processing your chat history...
              </span>
            </div>
          </div>
        )}

        {/* Status display when not importing */}
        {!isImporting && importStage && (
          <div className="mb-2 flex items-center justify-center text-base">
            <span className="mr-2 text-white/70 font-medium">Status:</span>
            <span className="font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">
              {importStage}
            </span>
          </div>
        )}

        {/* Import summary */}
        {importSummary && (
          <div
            className={`text-sm mt-2 p-3 rounded-lg ${
              importSummary.includes("Error") 
                ? "text-red-400 bg-red-900/20 border border-red-500/30" 
                : "text-green-400 bg-green-900/20 border border-green-500/30"
            }`}
            data-testid="import-summary"
          >
            {importSummary}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
