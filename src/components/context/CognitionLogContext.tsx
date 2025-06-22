// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// CognitionLogContext.tsx
// Context for managing cognition logs in the application

import React, { createContext, useContext, useEffect, useState } from "react";
import { CognitionLogExporter } from "./deepgram/services/utils/CognitionLogExporter";
import cognitionLogExporterFactory from "./deepgram/services/utils/CognitionLogExporterFactory";
import symbolicCognitionTimelineLogger from "./deepgram/services/utils/SymbolicCognitionTimelineLoggerSingleton";
import { CognitionEvent } from "./deepgram/types/CognitionEvent";

/**
 * Interface for the cognition log context
 */
interface CognitionLogContextType {
  /** Current cognition events */
  events: CognitionEvent[];
  /** Available exporters */
  exporters: CognitionLogExporter[];
  /** Clear all cognition events */
  clearEvents: () => void;
  /** Export events using the specified exporter */
  exportEvents: (exporterLabel: string) => void;
}

/**
 * Context for managing cognition logs in the application
 */
const CognitionLogContext = createContext<CognitionLogContextType | null>(null);

/**
 * Provider for the cognition log context
 */
export const CognitionLogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [events, setEvents] = useState<CognitionEvent[]>([]);
  const [exporters] = useState<CognitionLogExporter[]>(
    cognitionLogExporterFactory.getExporters()
  );

  // Updates events periodically
  useEffect(() => {
    const updateEvents = () => {
      setEvents([...symbolicCognitionTimelineLogger.getTimeline()]);
    };

    // Initial update
    updateEvents();

    // Update every second
    const interval = setInterval(updateEvents, 1000);
    return () => clearInterval(interval);
  }, []);

  // Clears all events
  const clearEvents = () => {
    symbolicCognitionTimelineLogger.clear();
    setEvents([]);
  };

  // Exports events using the specified exporter
  const exportEvents = (exporterLabel: string) => {
    const exporter = exporters.find((e) => e.label === exporterLabel);
    if (exporter) {
      exporter.export(events);
    }
  };

  return (
    <CognitionLogContext.Provider
      value={{ events, exporters, clearEvents, exportEvents }}
    >
      {children}
    </CognitionLogContext.Provider>
  );
};

/**
 * Hook to access the cognition log context
 */
export const useCognitionLog = (): CognitionLogContextType => {
  const context = useContext(CognitionLogContext);
  if (!context) {
    throw new Error(
      "useCognitionLog must be used within a CognitionLogProvider"
    );
  }
  return context;
};

export default CognitionLogContext;
