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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900/90 rounded-2xl shadow-2xl p-8 w-full max-w-md relative backdrop-blur-lg ring-2 ring-cyan-400/10">
        <button
          className="orchos-btn-circle absolute top-2 right-2"
          onClick={handleCloseImportModal}
          title="Fechar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
        <h2
          className="text-2xl font-bold mb-6 text-center tracking-wide bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]"
          style={{ fontFamily: "Orbitron, Inter, sans-serif" }}
        >
          Import Neural Data
        </h2>

        {/* User info display */}
        <div className="mb-4 p-3 bg-black/30 rounded-xl ring-1 ring-cyan-400/10">
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
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-700 to-purple-600 text-white font-semibold shadow-lg cursor-pointer hover:scale-105 transition-all duration-150"
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
        <div className="mb-6">
          <span className="block text-cyan-200/80 mb-2 font-medium">
            Import mode
          </span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="increment"
                checked={importMode === "increment"}
                onChange={(e) =>
                  setImportMode(e.target.value as "increment" | "overwrite")
                }
                className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 focus:ring-cyan-400"
                disabled={isImporting}
              />
              <span className="text-white">Increment</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="overwrite"
                checked={importMode === "overwrite"}
                onChange={(e) =>
                  setImportMode(e.target.value as "increment" | "overwrite")
                }
                className="w-4 h-4 text-cyan-400 bg-gray-800 border-gray-600 focus:ring-cyan-400"
                disabled={isImporting}
              />
              <span className="text-white">Overwrite</span>
            </label>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 justify-center w-full py-3 mt-2 rounded-full font-bold text-lg bg-gradient-to-r from-cyan-400 via-blue-700 to-purple-600 shadow-[0_0_18px_2px_rgba(0,240,255,0.18)] hover:shadow-cyan-400/70 hover:scale-105 transition-all duration-200 ring-2 ring-cyan-400/20 backdrop-blur text-white focus:outline-none focus:ring-4 focus:ring-cyan-400/60 disabled:opacity-60 disabled:cursor-not-allowed mb-4"
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
        {isImporting && (
          <div className="w-full flex flex-col items-center mb-6">
            <div className="relative w-full h-9 rounded-full bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-purple-900/40 shadow-inner overflow-hidden mt-2 mb-3 ring-1 ring-cyan-400/10">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-400 via-blue-700 to-purple-600 shadow-[0_0_18px_2px_rgba(0,240,255,0.18)] transition-all duration-300 ease-out"
                style={{
                  width: `${importProgress}%`, // This is ALWAYS the overall/global progress (0-100%)
                  minWidth: importProgress > 0 ? "2.5rem" : 0,
                  borderRadius: "9999px",
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
        {!isImporting && importStage && (
          <div className="mb-2 flex items-center justify-center text-base">
            <span className="mr-2 text-white/70 font-medium">Status:</span>
            <span className="font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">
              {importStage}
            </span>
          </div>
        )}
        {importSummary && (
          <div
            className="text-green-400 text-sm mt-2"
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
