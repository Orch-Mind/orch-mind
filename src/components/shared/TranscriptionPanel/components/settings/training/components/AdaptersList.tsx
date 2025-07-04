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
        return `Merged (${adapter.mergedWith?.length || 0} sources)`;
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

  // Filtrar adapters que podem ser mergeados (downloaded ou ready, mesmo baseModel)
  const mergeableAdapters = adapters.filter(
    (a) => (a.status === "downloaded" || a.status === "ready") && !a.enabled
  );

  const canShowMerge = mergeableAdapters.length >= 1 && onMergeAdapters;

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
    <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-purple-400/20">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-purple-400">LoRA Adapters</h3>
        <div className="flex items-center space-x-2">
          {canShowMerge && (
            <button
              onClick={() => setShowMergeSection(!showMergeSection)}
              className={`px-2 py-1 border rounded transition-colors text-[9px] font-medium ${
                showMergeSection
                  ? "bg-purple-600/40 border-purple-400/60 text-purple-200"
                  : "bg-purple-600/20 border-purple-400/40 text-purple-300 hover:bg-purple-600/30"
              }`}
              title="Toggle merge mode"
            >
              🔗 Merge
            </button>
          )}
          <div className="flex items-center space-x-1">
            <span className="text-[9px] text-purple-300">
              {adapters.length}
            </span>
            <svg
              className="w-3 h-3 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Merge Section */}
      {showMergeSection && (
        <div className="mb-3 p-3 bg-purple-900/10 border border-purple-400/20 rounded">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-purple-400">
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
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <select
                  value={mergeStrategy}
                  onChange={(e) => setMergeStrategy(e.target.value as any)}
                  title="Select merge strategy"
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:border-purple-400 focus:outline-none"
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
                className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMerging
                  ? selectedForMerge.length === 1
                    ? "Deploying..."
                    : "Merging..."
                  : selectedForMerge.length === 1
                  ? "Deploy"
                  : "Merge"}{" "}
                ({selectedForMerge.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
        {adapters.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-4 h-4 text-purple-400"
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
            <p className="text-[10px] text-gray-400 mb-1">No adapters yet</p>
            <p className="text-[8px] text-gray-500">
              Train conversations or download from P2P to create LoRA adapters
            </p>
          </div>
        ) : (
          adapters.map((adapter) => (
            <div
              key={adapter.id}
              className={`bg-slate-800/40 rounded-sm p-2 border transition-colors ${
                showMergeSection && selectedForMerge.includes(adapter.id)
                  ? "border-purple-400/50 bg-purple-900/20"
                  : "border-slate-600/20 hover:border-purple-400/30"
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
                        {adapter.name}
                      </h4>
                      {adapter.source === "p2p" && (
                        <span className="text-[8px] bg-cyan-600/20 text-cyan-300 px-1 rounded">
                          P2P
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
                  </div>
                </div>

                <div className="flex space-x-1 ml-1">
                  {/* Deploy Button */}
                  {canDeploy(adapter) && (
                    <button
                      onClick={() => handleDeployAdapter(adapter.id)}
                      disabled={deployingAdapters.has(adapter.id) || isTraining}
                      className="px-1.5 py-0.5 bg-green-600/20 border border-green-400/40 text-green-300 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[8px] font-medium"
                      title="Deploy adapter to Ollama model"
                    >
                      {deployingAdapters.has(adapter.id) ? "⏳" : "🚀"}
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteAdapter(adapter.id)}
                    disabled={isDeleting || isTraining}
                    className="px-1.5 py-0.5 bg-red-600/20 border border-red-400/40 text-red-300 rounded hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[8px] font-medium"
                    title="Delete adapter"
                  >
                    Del
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
      <div className="mt-2 pt-2 border-t border-purple-400/20">
        <p className="text-[8px] text-gray-500 text-center">
          {showMergeSection
            ? "Select adapters above and configure merge settings"
            : "🚀 Deploy creates Ollama model with LoRA adapter • 🔗 Merge combines multiple adapters"}
        </p>
      </div>
    </div>
  );
};

export default AdaptersList;
