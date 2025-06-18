// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useState } from "react";

interface TranscriptionDataState {
  transcriptionData: any[];
  interimResults: any;
  diarizationData: any;
}

interface TranscriptionDataActions {
  handleTranscriptionData: (data: any) => void;
  handleInterimUpdate: (interim: any) => void;
  clearTranscriptionData: () => void;
}

/**
 * Hook for managing transcription data
 * Following Single Responsibility Principle
 */
export function useTranscriptionData(
  deepgramTranscriptionRef: React.MutableRefObject<any>
): TranscriptionDataState & TranscriptionDataActions {
  const [transcriptionData, setTranscriptionData] = useState<any>([]);
  const [interimResults, setInterimResults] = useState<any>({});
  const [diarizationData, setDiarizationData] = useState<any>({});

  /**
   * Process transcription data from Deepgram
   */
  const handleTranscriptionData = useCallback(
    (data: any) => {
      // Handle formatted object with speaker identification
      if (data && typeof data === "object" && data.text) {
        const processedData = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          text: data.text,
          speaker: data.speaker,
          isFinal: data.isFinal,
          channel: data.channel,
        };

        if (data.isFinal) {
          setTranscriptionData((prev: any) => [...prev, processedData]);

          if (deepgramTranscriptionRef.current) {
            deepgramTranscriptionRef.current.addTranscription(data.text);
            console.log(
              `📝 Transcription "${data.text}" sent to DeepgramTranscriptionService`
            );
          }
        } else {
          setInterimResults((prev: any) => {
            const key = `${data.channel}-${data.speaker}-${data.text.substring(
              0,
              20
            )}`;
            return { ...prev, [key]: processedData };
          });
        }
        return;
      }

      // Handle default Deepgram format
      if (!data || !data.channel || !data.channel.alternatives) return;

      const processedData = {
        ...data,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };

      // Extract diarization information
      if (data.channel.alternatives[0].words?.length > 0) {
        const words = data.channel.alternatives[0].words;
        const speakerMap: Record<string, string> = {};

        words.forEach((word: any) => {
          if (word.speaker && word.speaker !== null) {
            speakerMap[word.speaker] = word.speaker;
          }
        });

        if (Object.keys(speakerMap).length > 0) {
          setDiarizationData((prev: { speakers: any }) => ({
            ...prev,
            speakers: { ...prev.speakers, ...speakerMap },
          }));
        }
      }

      // Extract and save transcription text
      const transcriptionText =
        data.channel?.alternatives?.[0]?.transcript || "";
      if (transcriptionText && deepgramTranscriptionRef.current) {
        deepgramTranscriptionRef.current.addTranscription(transcriptionText);
        console.log(
          `📝 Transcription in Deepgram format "${transcriptionText}" sent to DeepgramTranscriptionService`
        );
      }

      setTranscriptionData((prev: any) => [...prev, processedData]);

      // Clear corresponding interim results
      if (processedData.channel?.alternatives) {
        const transcriptKey =
          processedData.channel.alternatives[0].transcript.trim();
        setInterimResults((prev: any) => {
          const newInterim = { ...prev };
          delete newInterim[transcriptKey];
          return newInterim;
        });
      }
    },
    [deepgramTranscriptionRef]
  );

  /**
   * Update interim results (real-time transcription)
   */
  const handleInterimUpdate = useCallback((interim: any) => {
    if (!interim?.channel?.alternatives) return;

    const alt = interim.channel.alternatives[0];
    if (!alt) return;

    const transcriptKey = alt.transcript.trim();
    if (!transcriptKey) return;

    setInterimResults((prev: any) => ({
      ...prev,
      [transcriptKey]: {
        ...interim,
        id: `interim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      },
    }));
  }, []);

  /**
   * Clear transcription data
   */
  const clearTranscriptionData = useCallback(() => {
    setTranscriptionData([]);
    setInterimResults({});
  }, []);

  return {
    transcriptionData,
    interimResults,
    diarizationData,
    handleTranscriptionData,
    handleInterimUpdate,
    clearTranscriptionData,
  };
}
