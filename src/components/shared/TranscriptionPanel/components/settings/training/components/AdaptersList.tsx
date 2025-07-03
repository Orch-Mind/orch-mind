// SPDX-License-Identifier: MIT OR Apache-2.0
import React from "react";

interface LoRAAdapter {
  id: string;
  name: string;
  baseModel: string;
  enabled: boolean;
  createdAt: string;
  status: "ready" | "training" | "error";
}

interface AdaptersListProps {
  adapters: LoRAAdapter[];
  isDeleting: boolean;
  isToggling: boolean;
  isTraining: boolean;
  onDeleteAdapter: (adapterId: string) => void;
  onEnableAdapter: (adapterId: string) => void;
  onDisableAdapter: (adapterId: string) => void;
}

const AdaptersList: React.FC<AdaptersListProps> = ({
  adapters,
  isDeleting,
  isToggling,
  isTraining,
  onDeleteAdapter,
  onEnableAdapter,
  onDisableAdapter,
}) => {
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
    if (adapter.status === "training") {
      return "🔄";
    }
    if (adapter.status === "error") {
      return "❌";
    }
    return adapter.enabled ? "🟢" : "🔴";
  };

  const getStatusText = (adapter: LoRAAdapter) => {
    if (adapter.status === "training") {
      return "Training...";
    }
    if (adapter.status === "error") {
      return "Error";
    }
    return adapter.enabled ? "Enabled" : "Disabled";
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-purple-400/20">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-purple-400">LoRA Adapters</h3>
        <div className="flex items-center space-x-1">
          <span className="text-[9px] text-purple-300">{adapters.length}</span>
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
              Train conversations to create LoRA adapters
            </p>
          </div>
        ) : (
          adapters.map((adapter) => (
            <div
              key={adapter.id}
              className="bg-slate-800/40 rounded-sm p-2 border border-slate-600/20 hover:border-purple-400/30 transition-colors"
            >
              {/* Adapter Header */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px]">{getStatusIcon(adapter)}</span>
                    <h4 className="text-[10px] font-medium text-white truncate">
                      {adapter.name}
                    </h4>
                  </div>
                  <p className="text-[8px] text-gray-400 truncate">
                    {adapter.baseModel}
                  </p>
                </div>
                <div className="flex space-x-1 ml-1">
                  {/* Enable/Disable Button */}
                  {adapter.status === "ready" && (
                    <button
                      onClick={() =>
                        adapter.enabled
                          ? onDisableAdapter(adapter.id)
                          : onEnableAdapter(adapter.id)
                      }
                      disabled={isToggling || isTraining}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        adapter.enabled
                          ? "bg-green-600/20 border border-green-400/40 text-green-300 hover:bg-green-600/30"
                          : "bg-blue-600/20 border border-blue-400/40 text-blue-300 hover:bg-blue-600/30"
                      }`}
                      title={
                        adapter.enabled ? "Disable adapter" : "Enable adapter"
                      }
                    >
                      {adapter.enabled ? "Disable" : "Enable"}
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
                  <span className="text-[8px] text-gray-400">
                    {getStatusText(adapter)}
                  </span>
                </div>
              </div>

              {/* Active Model Info */}
              {adapter.enabled && (
                <div className="mt-1 pt-1 border-t border-green-400/20">
                  <p className="text-[8px] text-green-300">
                    🔗 Active: {adapter.baseModel.replace(":", "_")}_with_
                    {adapter.id}
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
          Enable adapters to activate enhanced capabilities
        </p>
      </div>
    </div>
  );
};

export default AdaptersList;
