// SPDX-License-Identifier: MIT OR Apache-2.0
import React, { useState } from "react";

interface LoRAAdapter {
  id: string;
  name: string;
  baseModel: string;
  enabled: boolean;
  createdAt: string;
  status: "ready" | "training" | "error" | "downloaded" | "merged";
  source?: "local" | "p2p";
  mergedWith?: string[];
  downloadedFrom?: string;
  deployedModel?: string; // Nome do modelo deployado no Ollama
  displayName?: string;
}

interface AdaptersListProps {
  adapters: LoRAAdapter[];
  isDeleting: boolean;
  isToggling: boolean;
  isTraining: boolean;
  onDeleteAdapter: (adapterId: string) => void;
  onMergeAdapters?: (
    adapterIds: string[],
    outputName: string,
    strategy: "arithmetic_mean" | "weighted_average" | "svd_merge",
    weights?: number[]
  ) => Promise<{ success: boolean; error?: string; mergedAdapterId?: string }>;
  onDeployAdapter?: (
    adapterId: string,
    targetModel?: string
  ) => Promise<{ success: boolean; error?: string; modelName?: string }>;
}

const AdaptersList: React.FC<AdaptersListProps> = ({
  adapters,
  isDeleting,
  isToggling,
  isTraining,
  onDeleteAdapter,
  onMergeAdapters,
  onDeployAdapter,
}) => {
  const [showMergeSection, setShowMergeSection] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeOutputName, setMergeOutputName] = useState("");
  const [mergeStrategy, setMergeStrategy] = useState<
    "arithmetic_mean" | "weighted_average" | "svd_merge"
  >("svd_merge"); // SVD é geralmente a melhor estratégia
  const [isMerging, setIsMerging] = useState(false);
  const [deployingAdapters, setDeployingAdapters] = useState<Set<string>>(
    new Set()
  );

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  };

  const getStatusIcon = (adapter: LoRAAdapter) => {
    switch (adapter.status) {
      case "training":
        return "🔄";
      case "error":
        return "❌";
      case "downloaded":
        return "📥";
      case "merged":
        return "🔗";
      default:
        return adapter.enabled ? "🟢" : "🔴";
    }
  };

  const getStatusText = (adapter: LoRAAdapter) => {
    switch (adapter.status) {
      case "training":
        return "Training...";
      case "error":
        return "Error";
      case "downloaded":
        return `Downloaded${
          adapter.downloadedFrom ? ` from ${adapter.downloadedFrom}` : ""
        }`;
      case "merged":
        return `Merged from ${adapter.mergedWith?.length || 0} adapters`;
      default:
        // Remove "Enabled/Disabled" text - will show only date
        return "";
    }
  };

  const getStatusColor = (adapter: LoRAAdapter) => {
    switch (adapter.status) {
      case "training":
        return "text-blue-400";
      case "error":
        return "text-red-400";
      case "downloaded":
        return "text-cyan-400";
      case "merged":
        return "text-purple-400";
      default:
        return adapter.enabled ? "text-green-400" : "text-gray-400";
    }
  };

  const handleMergeToggle = (adapterId: string) => {
    setSelectedForMerge((prev) =>
      prev.includes(adapterId)
        ? prev.filter((id) => id !== adapterId)
        : [...prev, adapterId]
    );
  };

  const handleMergeSubmit = async () => {
    if (
      !onMergeAdapters ||
      selectedForMerge.length < 1 ||
      !mergeOutputName.trim()
    ) {
      return;
    }

    // Validar se adapters selecionados têm o mesmo baseModel
    const selectedAdapters = adapters.filter((a) =>
      selectedForMerge.includes(a.id)
    );
    const baseModels = [...new Set(selectedAdapters.map((a) => a.baseModel))];

    if (baseModels.length > 1) {
      alert(
        `❌ Cannot merge adapters with different base models: ${baseModels.join(
          ", "
        )}\nPlease select adapters with the same base model.`
      );
      return;
    }

    setIsMerging(true);
    try {
      const result = await onMergeAdapters(
        selectedForMerge,
        mergeOutputName,
        mergeStrategy
      );
      if (result.success) {
        setShowMergeSection(false);
        setSelectedForMerge([]);
        setMergeOutputName("");
        alert(
          `✅ ${
            selectedForMerge.length === 1
              ? "Adapter deployed"
              : "Adapters merged"
          } successfully!`
        );
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    } finally {
      setIsMerging(false);
    }
  };

  const handleDeployAdapter = async (adapterId: string) => {
    if (!onDeployAdapter) return;

    setDeployingAdapters((prev) => new Set([...prev, adapterId]));

    try {
      const result = await onDeployAdapter(adapterId);
      if (result.success) {
        alert(`✅ Adapter deployed successfully as model: ${result.modelName}`);
      } else {
        alert(`❌ Deploy failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Deploy error: ${error}`);
    } finally {
      setDeployingAdapters((prev) => {
        const newSet = new Set(prev);
        newSet.delete(adapterId);
        return newSet;
      });
    }
  };

  // Filtrar adapters que podem ser mergeados (downloaded, ready ou merged, mesmo baseModel)
  const mergeableAdapters = adapters.filter(
    (a) =>
      a.status === "downloaded" || a.status === "ready" || a.status === "merged"
  );

  // Agrupar por baseModel para validação de compatibilidade
  const adaptersByBaseModel = mergeableAdapters.reduce((acc, adapter) => {
    const baseModel = adapter.baseModel;
    if (!acc[baseModel]) {
      acc[baseModel] = [];
    }
    acc[baseModel].push(adapter);
    return acc;
  }, {} as Record<string, typeof mergeableAdapters>);

  // Verificar se há adapters compatíveis para merge (mesmo baseModel)
  const hasCompatibleAdapters = Object.values(adaptersByBaseModel).some(
    (group) => group.length >= 1
  );

  const canShowMerge = hasCompatibleAdapters && onMergeAdapters;

  // Verificar se adapter pode ser deployado
  const canDeploy = (adapter: LoRAAdapter) => {
    return (
      onDeployAdapter &&
      (adapter.status === "ready" ||
        adapter.status === "downloaded" ||
        adapter.status === "merged") &&
      !deployingAdapters.has(adapter.id)
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-cyan-400">LoRA Adapters</h3>
          <span className="bg-cyan-600/20 text-cyan-300 px-2 py-1 rounded-full text-xs font-medium">
            {adapters.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {canShowMerge && (
            <button
              onClick={() => setShowMergeSection(!showMergeSection)}
              className={`px-4 py-2 border rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 ${
                showMergeSection
                  ? "bg-purple-600/40 border-purple-400/60 text-purple-200"
                  : "bg-purple-600/20 border-purple-400/40 text-purple-300 hover:bg-purple-600/30"
              }`}
              title="Toggle merge mode"
            >
              <span className="text-base">🔗</span>
              <span>Merge</span>
            </button>
          )}
          <div className="text-xs text-gray-400">Deploy • Merge • Manage</div>
        </div>
      </div>

      {/* Merge Section */}
      {showMergeSection && (
        <div className="mb-3 p-3 bg-purple-900/20 border border-purple-400/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-purple-400">
              🔗 Merge Adapters ({selectedForMerge.length} selected)
            </h4>
            <button
              onClick={() => {
                setShowMergeSection(false);
                setSelectedForMerge([]);
              }}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  value={mergeOutputName}
                  onChange={(e) => setMergeOutputName(e.target.value)}
                  placeholder="merged_adapter_name"
                  className="w-full px-2 py-1 bg-slate-800/50 border border-slate-600/50 rounded text-xs text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <select
                  value={mergeStrategy}
                  onChange={(e) => setMergeStrategy(e.target.value as any)}
                  title="Select merge strategy"
                  className="w-full px-2 py-1 bg-slate-800/50 border border-slate-600/50 rounded text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="svd_merge">SVD Merge (Best)</option>
                  <option value="arithmetic_mean">Arithmetic Mean</option>
                  <option value="weighted_average">Weighted Average</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleMergeSubmit}
                disabled={
                  selectedForMerge.length < 1 ||
                  !mergeOutputName.trim() ||
                  isMerging
                }
                className="px-4 py-2 bg-purple-600/80 text-white rounded-lg text-sm font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span className="text-base">
                  {isMerging
                    ? "⏳"
                    : selectedForMerge.length === 1
                    ? "🚀"
                    : "🔗"}
                </span>
                <span>
                  {isMerging
                    ? selectedForMerge.length === 1
                      ? "Deploying..."
                      : "Merging..."
                    : selectedForMerge.length === 1
                    ? "Deploy"
                    : "Merge"}{" "}
                  ({selectedForMerge.length})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
        {adapters.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-4 h-4 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-400 mb-1">No adapters yet</p>
            <p className="text-xs text-gray-500">
              Train conversations or download from P2P to create LoRA adapters
            </p>
          </div>
        ) : (
          adapters.map((adapter) => (
            <div
              key={adapter.id}
              className={`bg-gradient-to-r from-slate-800/40 to-slate-900/40 backdrop-blur-sm rounded-lg p-3 border transition-colors ${
                showMergeSection && selectedForMerge.includes(adapter.id)
                  ? "border-purple-400/50 bg-purple-900/20"
                  : "border-cyan-400/20 hover:border-cyan-400/40"
              }`}
            >
              {/* Adapter Header */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {/* Merge Checkbox */}
                  {showMergeSection &&
                    mergeableAdapters.some((a) => a.id === adapter.id) && (
                      <input
                        type="checkbox"
                        checked={selectedForMerge.includes(adapter.id)}
                        onChange={() => handleMergeToggle(adapter.id)}
                        className="w-3 h-3 text-purple-400 rounded"
                        title="Select for merge"
                      />
                    )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="text-[9px]">
                        {getStatusIcon(adapter)}
                      </span>
                      <h4 className="text-[10px] font-medium text-white truncate">
                        {adapter.status === "merged" && adapter.displayName
                          ? adapter.displayName
                          : adapter.name}
                      </h4>
                      {adapter.source === "p2p" && (
                        <span className="text-[8px] bg-cyan-600/20 text-cyan-300 px-1 rounded">
                          P2P
                        </span>
                      )}
                      {adapter.status === "merged" && (
                        <span className="text-[8px] bg-purple-600/20 text-purple-300 px-1 rounded">
                          MERGED
                        </span>
                      )}
                    </div>
                    <p className="text-[8px] text-gray-400 truncate">
                      {adapter.baseModel}
                    </p>
                    {/* Deployed Model Info */}
                    {adapter.deployedModel && (
                      <p className="text-[8px] text-green-400 truncate">
                        📦 {adapter.deployedModel}
                      </p>
                    )}
                    {/* Merged Adapter Filesystem Name */}
                    {adapter.status === "merged" && adapter.displayName && (
                      <p className="text-[8px] text-purple-400 truncate">
                        🗂️ {adapter.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2 ml-2">
                  {/* Deploy Button */}
                  {canDeploy(adapter) && (
                    <button
                      onClick={() => handleDeployAdapter(adapter.id)}
                      disabled={deployingAdapters.has(adapter.id) || isTraining}
                      className="px-3 py-1.5 bg-green-600/30 border border-green-400/50 text-green-300 rounded-lg hover:bg-green-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium min-w-[60px] flex items-center justify-center"
                      title="Deploy adapter to Ollama model"
                    >
                      {deployingAdapters.has(adapter.id) ? (
                        <span className="text-sm">⏳</span>
                      ) : (
                        <span className="flex items-center space-x-1">
                          <span className="text-sm">🚀</span>
                          <span>Deploy</span>
                        </span>
                      )}
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteAdapter(adapter.id)}
                    disabled={isDeleting || isTraining}
                    className="px-3 py-1.5 bg-red-600/30 border border-red-400/50 text-red-300 rounded-lg hover:bg-red-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium min-w-[60px] flex items-center justify-center"
                    title="Delete adapter"
                  >
                    <span className="flex items-center space-x-1">
                      <span className="text-sm">🗑️</span>
                      <span>Delete</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Adapter Details */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-[8px] text-gray-500">
                    {formatDate(adapter.createdAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {getStatusText(adapter) && (
                    <span className={`text-[8px] ${getStatusColor(adapter)}`}>
                      {getStatusText(adapter)}
                    </span>
                  )}
                </div>
              </div>

              {/* Merged Info */}
              {adapter.status === "merged" && adapter.mergedWith && (
                <div className="mt-1 pt-1 border-t border-purple-400/20">
                  <p className="text-[8px] text-purple-300">
                    🔗 Sources:{" "}
                    {adapter.mergedWith
                      .map(
                        (id) => adapters.find((a) => a.id === id)?.name || id
                      )
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-cyan-400/20">
        {showMergeSection && hasCompatibleAdapters ? (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 text-center">
              Select adapters with the same base model to merge
            </p>
            {Object.entries(adaptersByBaseModel).map(
              ([baseModel, compatibleAdapters]) => (
                <p
                  key={baseModel}
                  className="text-xs text-cyan-400 text-center"
                >
                  📋 {baseModel}: {compatibleAdapters.length} compatible adapter
                  {compatibleAdapters.length !== 1 ? "s" : ""}
                </p>
              )
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center">
            {showMergeSection
              ? "Select adapters above and configure merge settings"
              : "🚀 Deploy creates Ollama model with LoRA adapter • 🔗 Merge combines multiple adapters"}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdaptersList;
