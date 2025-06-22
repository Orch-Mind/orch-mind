import { useEffect, useState } from "react";

/**
 * Hook que gerencia o status de processamento exposto no window
 * Aplica SRP: Responsabilidade única - gerenciar status de processamento
 */
export function useProcessingStatus() {
  const [processingStatus, setProcessingStatus] = useState<string>("");

  useEffect(() => {
    // Função para atualizar status de processamento
    const updateProcessingStatus = (status: string) => {
      setProcessingStatus(status);
    };

    // Expõe no window para TranscriptionPromptProcessor
    if (typeof window !== "undefined") {
      (window as any).__updateProcessingStatus = updateProcessingStatus;
    }

    // Cleanup
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__updateProcessingStatus;
      }
    };
  }, []);

  return { processingStatus, setProcessingStatus };
}
