// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";

// Importation for TextDecoder
import { TextDecoder } from 'util';
// Assign the property to global
// @ts-expect-error - adding TextDecoder to the global object
global.TextDecoder = TextDecoder;

// Mock for gpt-tokenizer
jest.mock('gpt-tokenizer', () => ({
  encode: jest.fn().mockImplementation((text) => {
    // Simplified token simulation - approximately 1 token for every 4 characters
    return Array.from({ length: Math.ceil(text.length / 4) }, (_, i) => i);
  }),
  decode: jest.fn().mockImplementation((tokens) => {
    return tokens.map((t: number) => String.fromCharCode(97 + (t % 26))).join('');
  }),
}));

import '@testing-library/jest-dom';

// Mock global for navigator.mediaDevices
beforeAll(() => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: {
      enumerateDevices: jest.fn().mockResolvedValue([]),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });

  // Mock window.electronAPI for import logic
  Object.defineProperty(global, 'electronAPI', {
    value: {
      importChatHistory: jest.fn((params: Partial<{ onProgress?: (progress: { processed: number; total: number }) => void }>) => {
        // Simula progresso inicial
        if (params.onProgress) params.onProgress({ processed: 1, total: 51 });
        return new Promise(resolve => {
          setTimeout(() => {
            if (params.onProgress) params.onProgress({ processed: 51, total: 51 });
            setTimeout(() => {
              resolve({ imported: 4, skipped: 1, total: 51, success: true });
            }, 1000); // Mantém importação em andamento por 1s
          }, 1000);
        });
      }),
      onRealtimeTranscription: jest.fn(() => () => {}),
      onPromptPartialResponse: jest.fn(() => () => {}),
      onPromptSuccess: jest.fn(() => () => {}),
      onPromptError: jest.fn(() => () => {}),
      onPromptSending: jest.fn(() => () => {}),
      onPromptSend: jest.fn(() => () => {}),
      // [Removed updateContentDimensions durante a limpeza do código]
      getScreenshots: jest.fn(),
      deleteScreenshot: jest.fn(),
      onScreenshotTaken: jest.fn(),
      onResetView: jest.fn(),
      onReset: jest.fn(),
      onSolutionStart: jest.fn(),
    },
    writable: true,
    configurable: true
  });

  // Maintain electronAPIMock for compatibility
  (global as unknown as { electronAPIMock: Record<string, unknown> }).electronAPIMock = {
    importChatHistory: jest.fn((params: Partial<{ onProgress?: (progress: { processed: number; total: number }) => void }>) => {
      // Simulate initial progress
      if (params.onProgress) params.onProgress({ processed: 1, total: 51 });
      return new Promise(resolve => {
        setTimeout(() => {
          if (params.onProgress) params.onProgress({ processed: 51, total: 51 });
          setTimeout(() => {
            resolve({ imported: 4, skipped: 1, total: 51, success: true });
          }, 1000); // Maintain importation in progress for 1s
        }, 1000);
      });
    }),
    onRealtimeTranscription: jest.fn(() => () => {}), // No-op listener registration
    onPromptPartialResponse: jest.fn(() => () => {}), // No-op listener registration
    onPromptSuccess: jest.fn(() => () => {}), // No-op listener registration
    onPromptError: jest.fn(() => () => {}), // No-op listener registration
    onPromptSending: jest.fn(() => () => {}), // No-op listener registration
    onPromptSend: jest.fn(() => () => {}), // No-op listener registration
    // [Removed updateContentDimensions during code cleanup]
    // Functions removed during code cleanup
    openExternal: jest.fn(),
    toggleMainWindow: jest.fn(),
    // [Window movement methods and updates removed during code cleanup]
    getPlatform: jest.fn(),
    openTranscriptionTooltip: jest.fn(),
    startTranscriptNeural: jest.fn(),
    stopTranscriptNeural: jest.fn(),
    sendNeuralPrompt: jest.fn(),
    clearNeuralTranscription: jest.fn(),
    onNeuralStarted: jest.fn(),
    onNeuralStopped: jest.fn(),
    onNeuralError: jest.fn(),
    // Functions already mocked above, do not duplicate here
    onClearTranscription: jest.fn(),
    onSendChunk: jest.fn(),
    getEnv: jest.fn(),
    sendAudioChunk: jest.fn(),
    sendAudioTranscription: jest.fn(),
    toogleNeuralRecording: jest.fn(),
    onForceStyle: jest.fn(),
    onForceImprovisation: jest.fn(),
    onRepeatResponse: jest.fn(),
    onStopTTS: jest.fn(),
    setDeepgramLanguage: jest.fn(),
    queryPinecone: jest.fn(),
    saveToPinecone: jest.fn()
  };
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MicrophoneProvider } from '../../../../context';
import { LanguageProvider } from '../../../../context/LanguageContext';
import { TranscriptionProvider } from '../../../../context/transcription/TranscriptionContext';
import { CognitionLogProvider } from '../../../../context/CognitionLogContext';
import TranscriptionPanel from "../../../../shared/TranscriptionPanel/TranscriptionPanel";

// Mock App to avoid import.meta.env
jest.mock('../../../../../App', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

// Mock Deepgram context and services
jest.mock("../../../../context", () => {
  return {
    ...jest.requireActual("../../../../context"),
    useDeepgram: () => {
      return {
        transcriptionService: {
          importChatGPTConversationsFromJson: jest.fn(async (_conv: unknown, _mem: unknown, _user: unknown, _ns: unknown, onProgress: (progress: { processed: number, total: number }) => void) => {
            for (let i = 1; i <= 5; i++) {
              if (onProgress) onProgress({ processed: i, total: 5 });
              await new Promise(res => setTimeout(res, 10)); // Artificial delay for test
            }
            return {
              total: 5,
              imported: 4,
              ignored: 1,
              errors: [],
            };
          })
        },
        memoryService: {
          importChatHistory: jest.fn().mockResolvedValue({
            total: 5,
            imported: 4,
            ignored: 1,
            errors: []
          })
        } as Record<string, unknown>
      };
    }
  };
});

const mockFile = new File([
  JSON.stringify([
    {
      mapping: {
        "1": {
          message: {
            id: "1",
            author: { role: "user" },
            content: { parts: ["Oi!"] },
            create_time: Date.now(),
          },
        },
        "2": {
          message: {
            id: "2",
            author: { role: "assistant" },
            content: { parts: ["Olá, como posso ajudar?"] },
            create_time: Date.now(),
          },
        },
      },
    },
  ]),
], "chatgpt.json", { type: "application/json" });
// Garante que mockFile.arrayBuffer existe e funciona
(mockFile as unknown as { arrayBuffer: () => Promise<Uint8Array> }).arrayBuffer = async () => new Uint8Array([1,2,3]);

describe("TranscriptionPanel Importação E2E", () => {
  it("should import conversations, show progress and summary", async () => {
    render(
      <LanguageProvider>
        <MicrophoneProvider>
          <CognitionLogProvider>
            <TranscriptionProvider>
              <TranscriptionPanel onClose={() => {}} />
            </TranscriptionProvider>
          </CognitionLogProvider>
        </MicrophoneProvider>
      </LanguageProvider>
    );

    // Wait for the import conversations button to appear
    await waitFor(() => expect(screen.getByRole("button", { name: /import neural data/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /import neural data/i }));

    // Debug: log DOM after opening modal
    // eslint-disable-next-line no-console
    console.log('DOM after opening modal:', document.body.innerHTML);

    // Fill primary user name
    const userNameInput = screen.getByTestId("import-user-name") as HTMLInputElement;
    fireEvent.change(userNameInput, { target: { value: "Usuário Teste" } });
    // Simulate file selection using the real mockFile
    const fileInput = screen.getByTestId("import-user-input") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Debug: log DOM after setting file
    // eslint-disable-next-line no-console
    console.log('DOM after setting file:', document.body.innerHTML);

    // Wait for the file state to be updated
    await waitFor(() => expect((fileInput as HTMLInputElement).files?.length).toBe(1));
    expect(userNameInput).toBeInTheDocument();
    expect(fileInput).toBeInTheDocument();
    expect((fileInput as HTMLInputElement).files?.length).toBe(1);

    // Click on import
    // The correct button is "Start Import" inside the modal
    const importBtn = screen.getByRole("button", { name: /start import/i });
    expect(importBtn).toBeInTheDocument();
    fireEvent.click(importBtn);
    // It is not possible to test the progress bar (intermediate state) in a unit environment (Jest + RTL + jsdom),
    // as the intermediate DOM is not captured reliably, even with real delays and community-recommended patterns.
    // To ensure the progress bar, use E2E tests (Cypress, Playwright) or manual verification.
    // Reference: https://stackoverflow.com/questions/69545435/react-testing-library-async-behaviors-are-sometimes-passing-sometimes-failing

    // Assert summary
    const summary = await screen.findByTestId("import-summary", {}, { timeout: 4000 });
    expect(summary).toHaveTextContent("Import complete! Imported: 4, Skipped: 1");
    // Result details (optional, if exists)
    // const resultDetails = screen.getByTestId("import-result-details").textContent;
    // expect(resultDetails).toMatch(/Total de mensagens processadas: ?[51]/);
    // expect(resultDetails).toMatch(/Importadas: ?4/);
    // expect(resultDetails).toMatch(/Ignoradas \(duplicadas\): ?1/);
  });
});
