// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from 'react-i18next';
import { CognitionEvent } from "../../context/deepgram/types/CognitionEvent";
import { SymbolicInsight } from "../../context/deepgram/types/SymbolicInsight";

interface CognitionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CognitionEvent | null;
}

const CognitionDetailModal: React.FC<CognitionDetailModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const { t } = useTranslation();
  if (!event) return null;

  // Prevent scrolling on body when modal is open
  React.useEffect(() => {
    const toggleBodyScroll = (disable: boolean) => {
      if (disable) {
        document.body.classList.add("overflow-hidden");
      } else {
        document.body.classList.remove("overflow-hidden");
      }
    };

    toggleBodyScroll(isOpen);

    return () => {
      toggleBodyScroll(false);
    };
  }, [isOpen]);

  // Handle click outside modal to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Format event type for display
  const formatEventType = (type: string): string => {
    return type
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get event color for display
  const getEventTypeStyles = (
    type: string
  ): { bgColor: string; textColor: string; borderColor: string } => {
    switch (type) {
      case "raw_prompt":
        return {
          bgColor: "bg-blue-700",
          textColor: "text-blue-100",
          borderColor: "border-blue-500",
        };
      case "temporary_context":
        return {
          bgColor: "bg-purple-700",
          textColor: "text-purple-100",
          borderColor: "border-purple-500",
        };
      case "neural_signal":
        return {
          bgColor: "bg-amber-700",
          textColor: "text-amber-100",
          borderColor: "border-amber-500",
        };
      case "neural_collapse":
        return {
          bgColor: "bg-pink-700",
          textColor: "text-pink-100",
          borderColor: "border-pink-500",
        };
      case "symbolic_retrieval":
        return {
          bgColor: "bg-green-700",
          textColor: "text-green-100",
          borderColor: "border-green-500",
        };
      case "fusion_initiated":
        return {
          bgColor: "bg-orange-700",
          textColor: "text-orange-100",
          borderColor: "border-orange-500",
        };
      case "symbolic_context_synthesized":
        return {
          bgColor: "bg-indigo-700",
          textColor: "text-indigo-100",
          borderColor: "border-indigo-500",
        };
      case "gpt_response":
        return {
          bgColor: "bg-red-700",
          textColor: "text-red-100",
          borderColor: "border-red-500",
        };
      case "emergent_patterns":
        return {
          bgColor: "bg-teal-700",
          textColor: "text-teal-100",
          borderColor: "border-teal-500",
        };
      default:
        return {
          bgColor: "bg-gray-700",
          textColor: "text-gray-100",
          borderColor: "border-gray-600",
        };
    }
  };

  // Helper function to render insight items
  const renderInsights = (insights: any[]) => {
    return (
      <ul className="space-y-2 mt-3">
        {insights.map((insight, i) => {
          // Handle string insights
          if (typeof insight === "string") {
            return (
              <li
                key={i}
                className="text-sm bg-gray-800/50 p-2 rounded border border-gray-700"
              >
                {insight}
              </li>
            );
          }
          // Handle SymbolicInsight objects
          else if (
            insight &&
            typeof insight === "object" &&
            "type" in insight
          ) {
            const insightObj = insight as SymbolicInsight;

            return (
              <li
                key={i}
                className="text-sm bg-gray-800/50 p-2 rounded border border-gray-700"
              >
                <span className="text-teal-400 font-medium">
                  {insightObj.type}
                </span>
                : <span>{String(insightObj.content || "")}</span>
              </li>
            );
          }
          // Fallback for other structures
          return (
            <li
              key={i}
              className="text-sm bg-gray-800/50 p-2 rounded border border-gray-700"
            >
              {JSON.stringify(insight)}
            </li>
          );
        })}
      </ul>
    );
  };

  // Helper function to render patterns
  const renderPatterns = (patterns: string[]) => {
    return (
      <ul className="space-y-2 mt-3">
        {patterns.map((pattern, i) => (
          <li
            key={i}
            className="text-sm bg-gray-800/50 p-2 rounded border border-gray-700 text-teal-300"
          >
            {pattern}
          </li>
        ))}
      </ul>
    );
  };

  // Render event details based on type
  const renderEventDetails = (): React.ReactNode => {
    if (!event) return null;

    switch (event.type) {
      case "raw_prompt":
        return (
          <div className="space-y-4">
            <div className="text-lg text-blue-300 font-medium">{t('cognitionDetailModal.eventTypes.rawPrompt')}</div>
            <div className="p-4 bg-gray-800/50 rounded-lg border border-blue-500/30 whitespace-pre-wrap text-gray-200">
              {event.content}
            </div>
          </div>
        );

      case "temporary_context":
        return (
          <div className="space-y-4">
            <div className="text-lg text-purple-300 font-medium">
              {t('cognitionDetailModal.eventTypes.temporaryContext')}
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/30 whitespace-pre-wrap text-gray-200">
              {event.context}
            </div>
          </div>
        );

      case "neural_signal":
        return (
          <div className="space-y-4">
            <div className="text-lg text-amber-300 font-medium">
              {t('cognitionDetailModal.eventTypes.neuralSignal')}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-gray-800/50 p-3 rounded-lg border border-amber-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.core')}</div>
                <div className="text-white font-medium">{event.core}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg border border-amber-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.intensity')}</div>
                <div className="text-amber-400 font-medium text-xl">
                  {Math.round(event.intensity * 100)}%
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg border border-amber-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.topK')}</div>
                <div className="text-white font-medium">{event.topK}</div>
              </div>
            </div>

            <div>
              <div className="text-gray-400 mb-2">{t('cognitionDetailModal.fields.symbolicQuery')}</div>
              <div className="p-4 bg-gray-800/50 rounded-lg border border-amber-500/30 whitespace-pre-wrap text-gray-200">
                {JSON.stringify(event.symbolic_query, null, 2)}
              </div>
            </div>

            {Object.keys(event.params).length > 0 && (
              <div>
                <div className="text-gray-400 mb-2">{t('cognitionDetailModal.fields.parameters')}</div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-amber-500/30 whitespace-pre-wrap text-gray-200 font-mono text-sm">
                  {JSON.stringify(event.params, null, 2)}
                </div>
              </div>
            )}
          </div>
        );

      case "emergent_patterns":
        return (
          <div className="space-y-4">
            <div className="text-lg text-teal-300 font-medium">
              {t('cognitionDetailModal.eventTypes.emergentPatterns')}
            </div>

            {event.metrics && (
              <div className="flex flex-wrap gap-4">
                {event.metrics.archetypalStability !== undefined && (
                  <div className="bg-gray-800/50 p-3 rounded-lg border border-teal-500/30 flex-1">
                    <div className="text-gray-400 text-sm mb-1">
                      {t('cognitionDetailModal.fields.archetypalStability')}
                    </div>
                    <div className="text-teal-400 font-medium text-xl">
                      {event.metrics.archetypalStability.toFixed(3)}
                    </div>
                  </div>
                )}

                {event.metrics.cycleEntropy !== undefined && (
                  <div className="bg-gray-800/50 p-3 rounded-lg border border-amber-500/30 flex-1">
                    <div className="text-gray-400 text-sm mb-1">
                      {t('cognitionDetailModal.fields.cycleEntropy')}
                    </div>
                    <div className="text-amber-400 font-medium text-xl">
                      {event.metrics.cycleEntropy.toFixed(3)}
                    </div>
                  </div>
                )}

                {event.metrics.insightDepth !== undefined && (
                  <div className="bg-gray-800/50 p-3 rounded-lg border border-cyan-500/30 flex-1">
                    <div className="text-gray-400 text-sm mb-1">
                      {t('cognitionDetailModal.fields.insightDepth')}
                    </div>
                    <div className="text-cyan-400 font-medium text-xl">
                      {event.metrics.insightDepth.toFixed(3)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {event.patterns.length > 0 ? (
              <div>
                <div className="text-gray-400 mb-2">{t('cognitionDetailModal.fields.detectedPatterns')}</div>
                {renderPatterns(event.patterns)}
              </div>
            ) : (
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-gray-400 italic">
                {t('cognitionDetailModal.values.noPatternsDetected')}
              </div>
            )}
          </div>
        );

      case "symbolic_retrieval":
        return (
          <div className="space-y-4">
            <div className="text-lg text-green-300 font-medium">
              {t('cognitionDetailModal.eventTypes.symbolicRetrieval')}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-gray-800/50 p-3 rounded-lg border border-green-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.core')}</div>
                <div className="text-white font-medium">{event.core}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg border border-green-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.memoryMatches')}</div>
                <div className="text-white font-medium">{event.matchCount}</div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg border border-green-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.duration')}</div>
                <div className="text-green-400 font-medium">
                  {event.durationMs}ms
                </div>
              </div>
            </div>

            {event.insights && event.insights.length > 0 && (
              <div>
                <div className="text-blue-400 mb-2 font-medium">{t('cognitionDetailModal.fields.insights')}</div>
                {renderInsights(event.insights)}

                {/* 🔧 CORREÇÃO: Mostrar keywords dos insights se disponíveis */}
                {event.insights.some(
                  (insight: any) =>
                    insight.keywords && insight.keywords.length > 0
                ) && (
                  <div className="mt-4">
                    <div className="text-gray-400 mb-2">{t('cognitionDetailModal.fields.keywords')}</div>
                    <div className="flex flex-wrap gap-2">
                      {event.insights
                        .filter(
                          (insight: any) =>
                            insight.keywords && insight.keywords.length > 0
                        )
                        .flatMap((insight: any) => insight.keywords)
                        .filter(
                          (keyword: string, index: number, arr: string[]) =>
                            arr.indexOf(keyword) === index
                        ) // Remove duplicatas
                        .map((keyword: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-gray-800 rounded-full text-xs text-green-300 border border-green-500/30"
                          >
                            "{keyword}"
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "neural_collapse":
        return (
          <div className="space-y-4">
            <div className="text-lg text-pink-300 font-medium">
              {t('cognitionDetailModal.eventTypes.neuralCollapse')}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-gray-800/50 p-3 rounded-lg border border-pink-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.selectedCore')}</div>
                <div className="text-white font-medium">
                  {event.selectedCore}
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg border border-pink-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.process')}</div>
                <div className="text-white font-medium">
                  {event.isDeterministic ? t('cognitionDetailModal.values.deterministic') : t('cognitionDetailModal.values.stochastic')}
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg border border-pink-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.candidates')}</div>
                <div className="text-white font-medium">
                  {event.numCandidates}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-gray-800/50 p-3 rounded-lg border border-pink-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">
                  {t('cognitionDetailModal.fields.emotionalWeight')}
                </div>
                <div className="text-pink-400 font-medium">
                  {event.emotionalWeight.toFixed(2)}
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg border border-pink-500/30 flex-1">
                <div className="text-gray-400 text-sm mb-1">
                  {t('cognitionDetailModal.fields.contradictionScore')}
                </div>
                <div className="text-pink-400 font-medium">
                  {event.contradictionScore.toFixed(2)}
                </div>
              </div>

              {event.temperature !== undefined && (
                <div className="bg-gray-800/50 p-3 rounded-lg border border-pink-500/30 flex-1">
                  <div className="text-gray-400 text-sm mb-1">{t('cognitionDetailModal.fields.temperature')}</div>
                  <div className="text-pink-400 font-medium">
                    {event.temperature.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {event.justification && (
              <div>
                <div className="text-gray-400 mb-2">{t('cognitionDetailModal.fields.justification')}</div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-pink-500/30 whitespace-pre-wrap text-gray-200">
                  {event.justification}
                </div>
              </div>
            )}

            {event.insights && event.insights.length > 0 && (
              <div>
                <div className="text-blue-400 mb-2 font-medium">{t('cognitionDetailModal.fields.insights')}</div>
                {renderInsights(event.insights)}
              </div>
            )}

            {event.emergentProperties &&
              event.emergentProperties.length > 0 && (
                <div>
                  <div className="text-teal-400 mb-2 font-medium">
                    {t('cognitionDetailModal.fields.emergentProperties')}
                  </div>
                  {renderPatterns(event.emergentProperties)}
                </div>
              )}
          </div>
        );

      case "symbolic_context_synthesized":
        return (
          <div className="space-y-4">
            <div className="text-lg text-indigo-300 font-medium">
              {t('cognitionDetailModal.eventTypes.symbolicContextSynthesized')}
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg border border-indigo-500/30 whitespace-pre-wrap text-gray-200 font-mono text-sm">
              {JSON.stringify(event.context, null, 2)}
            </div>
          </div>
        );

      case "gpt_response":
        return (
          <div className="space-y-4">
            <div className="text-lg text-red-300 font-medium">{t('cognitionDetailModal.eventTypes.gptResponse')}</div>

            <div className="p-4 bg-gray-800/50 rounded-lg border border-red-500/30 whitespace-pre-wrap text-gray-200">
              {event.response || t('cognitionDetailModal.values.emptyResponse')}
            </div>

            {event.symbolicTopics && event.symbolicTopics.length > 0 && (
              <div>
                <div className="text-gray-400 mb-2">{t('cognitionDetailModal.fields.symbolicTopics')}</div>
                <div className="flex flex-wrap gap-2">
                  {event.symbolicTopics.map((topic: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-800 rounded-full text-xs text-red-300 border border-red-500/30"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {event.insights && event.insights.length > 0 && (
              <div>
                <div className="text-blue-400 mb-2 font-medium">{t('cognitionDetailModal.fields.insights')}</div>
                {renderInsights(event.insights)}
              </div>
            )}
          </div>
        );

      case "fusion_initiated":
        return (
          <div className="p-4 bg-gray-800/50 rounded-lg border border-orange-500/30 text-center">
            <div className="text-orange-300 font-medium text-lg mb-2">
              {t('cognitionDetailModal.eventTypes.fusionInitiated')}
            </div>
            <div className="text-gray-400">
              {t('cognitionDetailModal.values.fusionProcessTriggered')}
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-gray-400">
            {t('cognitionDetailModal.values.unknownEventType')} {(event as any).type}
          </div>
        );
    }
  };

  const typeStyle = getEventTypeStyles(event.type);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 pt-[2vh] pb-[2vh]"
          onClick={handleBackdropClick}
        >
          <div
            className={`relative bg-gray-900 rounded-lg shadow-2xl max-w-3xl w-full border-t-4 flex flex-col max-h-[96vh] animate-in fade-in slide-in-from-bottom-4 duration-300 ${typeStyle.borderColor}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center">
                <span
                  className={`inline-block px-3 py-1 rounded text-sm font-medium mr-3 ${typeStyle.bgColor} ${typeStyle.textColor}`}
                >
                  {formatEventType(event.type)}
                </span>
                <span className="text-gray-400 text-sm">
                  {new Date(event.timestamp).toLocaleTimeString()}.
                  {new Date(event.timestamp)
                    .getMilliseconds()
                    .toString()
                    .padStart(3, "0")}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
                aria-label={t('cognitionDetailModal.closeModal')}
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

            {/* Modal content - event details */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              {renderEventDetails()}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CognitionDetailModal;
