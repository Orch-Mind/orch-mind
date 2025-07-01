// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  DeepgramProvider,
  MicrophoneProvider,
  TranscriptionProvider,
} from "./components/context";
import { CognitionLogProvider } from "./components/context/CognitionLogContext";
import { LanguageProvider } from "./components/context/LanguageContext";
import { initializeQuantumPerformanceOptimizations } from "./components/shared/QuantumVisualization/utils/performance";
import {
  useGlobalPassiveEventOptimization,
  useHeavyTaskManager,
} from "./components/shared/QuantumVisualization/utils/performanceOptimizations";
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastProvider,
  ToastTitle,
  ToastVariant,
  ToastViewport,
} from "./components/ui/toast";
import TranscriptionModule from "./features/transcription/TranscriptionModule";
import "./styles/orchos-theme.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface ToastContextType {
  showToast: (
    title: string,
    description: string,
    variant: ToastVariant
  ) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined
);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Helper function to safely update language
export function updateLanguage(newLanguage: string) {
  async () => {
    window.__LANGUAGE__ = newLanguage;
  };
}

// This component has been moved to TranscriptionModule

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral",
  });

  // Initialize performance optimizations once at application startup
  useEffect(() => {
    const cleanup = initializeQuantumPerformanceOptimizations();

    return cleanup;
  }, []);

  // Apply global passive event optimization to resolve OrbitControls violations
  useGlobalPassiveEventOptimization();

  // Apply heavy task management to coordinate HuggingFace + 3D rendering
  const { queueHeavyTask } = useHeavyTaskManager();

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant });
    setToastOpen(true);
  };

  // Provide heavy task manager to child components via context if needed
  const toastContextValue: ToastContextType = {
    showToast,
  };

  return (
    <div ref={containerRef} className="h-screen w-full overflow-hidden">
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TranscriptionProvider>
            <MicrophoneProvider>
              <DeepgramProvider>
                <CognitionLogProvider>
                  <ToastProvider>
                    <ToastContext.Provider value={toastContextValue}>
                      <TranscriptionModule />
                    </ToastContext.Provider>
                    <Toast
                      open={toastOpen}
                      onOpenChange={setToastOpen}
                      variant={toastMessage.variant}
                      duration={3000}
                    >
                      <ToastTitle>{toastMessage.title}</ToastTitle>
                      <ToastDescription>
                        {toastMessage.description}
                      </ToastDescription>
                    </Toast>
                    <ToastViewport />
                  </ToastProvider>
                </CognitionLogProvider>
              </DeepgramProvider>
            </MicrophoneProvider>
          </TranscriptionProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </div>
  );
}
