// INeuralSignalService.ts
// Symbolic: Contract for neural signal extraction cortex
import { NeuralSignalResponse } from '../../../components/context/deepgram/interfaces/neural/NeuralSignalTypes';

export interface INeuralSignalService {
  generateNeuralSignal(
    prompt: string,
    temporaryContext?: string,
    language?: string
  ): Promise<NeuralSignalResponse>;
}
