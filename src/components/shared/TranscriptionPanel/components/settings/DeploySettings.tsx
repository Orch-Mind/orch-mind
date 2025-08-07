// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";
import { AdaptersList } from "./training/components";
import { useLoRAAdapters } from "./training/hooks";

interface DeploySettingsProps {}

const DeploySettings: React.FC<DeploySettingsProps> = () => {
  const { t } = useTranslation();
  
  // Use the same hook as Training for LoRA adapters management
  const {
    adapters,
    selectedBaseModel,
    isDeleting,
    isToggling,
    deleteAdapter,
    mergeAdapters,
    deployAdapter,
  } = useLoRAAdapters();

  // Handler for showing delete modal
  const handleDeleteAdapter = (adapterId: string) => {
    if (confirm(t('deploy.deleteConfirmation', { adapterId }))) {
      deleteAdapter(adapterId);
    }
  };

  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center pb-2 border-b border-cyan-400/20">
        <h2 className="text-lg font-bold text-cyan-400 mb-0.5">
          {t('deploy.title')}
        </h2>
        <p className="text-sm text-gray-400">
          {t('deploy.subtitle')}
        </p>
      </div>

      {/* Current Base Model - Quantum Theme */}
      {selectedBaseModel && (
        <div className="bg-gradient-to-r from-slate-900/50 to-gray-900/50 backdrop-blur-sm rounded-lg p-3 border border-cyan-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-cyan-400">🎯</span>
              <span className="text-sm text-gray-300">{t('deploy.baseModelLabel')}</span>
            </div>
            <span className="text-sm font-mono text-cyan-400">
              {selectedBaseModel}
            </span>
          </div>
        </div>
      )}

      {/* Main Adapters Section - Following Quantum Theme */}
      <div className="bg-gradient-to-r from-black/40 to-slate-900/40 backdrop-blur-sm rounded-lg border border-cyan-400/20">
        <AdaptersList
          adapters={adapters}
          isDeleting={isDeleting}
          isToggling={isToggling}
          isTraining={false}
          onDeleteAdapter={handleDeleteAdapter}
          onMergeAdapters={mergeAdapters}
          onDeployAdapter={deployAdapter}
        />
      </div>

      {/* Quick Guide - Quantum Theme */}
      <div className="bg-gradient-to-r from-slate-900/30 to-gray-900/30 backdrop-blur-sm rounded-lg p-3 border border-cyan-400/10">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="text-center">
            <div className="text-green-400 mb-1">🚀 {t('deploy.quickGuide.deploy')}</div>
            <p className="text-gray-400">{t('deploy.quickGuide.deployDescription')}</p>
          </div>
          <div className="text-center">
            <div className="text-purple-400 mb-1">🔗 {t('deploy.quickGuide.merge')}</div>
            <p className="text-gray-400">{t('deploy.quickGuide.mergeDescription')}</p>
          </div>
          <div className="text-center">
            <div className="text-red-400 mb-1">🗑️ {t('deploy.quickGuide.delete')}</div>
            <p className="text-gray-400">{t('deploy.quickGuide.deleteDescription')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploySettings;
