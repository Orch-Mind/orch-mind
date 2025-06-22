# Batch Enrichment Implementation Guide

## Overview

This document describes the implementation of batch processing for semantic enrichment of neural signals in Orch-OS. The system now exclusively uses batch processing for improved efficiency when processing multiple neural signals.

## Key Changes - Simplified Architecture

### 1. Single Method Approach

We simplified the architecture by removing individual enrichment methods and using only batch processing:

- **Removed**: `enrichSemanticQueryForSignal` (individual method)
- **Renamed**: `enrichSemanticQueryBatch` → `enrichSemanticQuery` (now the only method)

This follows the KISS (Keep It Simple, Stupid) and YAGNI (You Aren't Gonna Need It) principles.

### 2. Centralized Prompt Management

All prompts remain centralized in `src/shared/utils/neuralPromptBuilder.ts`:

- **Batch Enrichment**: `buildBatchEnrichSystemPrompt()` and `buildBatchEnrichUserPrompt()`
- Both Ollama and HuggingFace services use the same prompts

### 3. Updated Interfaces

#### ISemanticEnricher
```typescript
export interface ISemanticEnricher {
  enrichSemanticQuery(
    signals: Array<{
      core: string;
      query: string;
      intensity: number;
      context?: string;
    }>,
    language?: string
  ): Promise<Array<{ enrichedQuery: string; keywords: string[] }>>;
}
```

#### IOpenAIService
The same method signature is used in IOpenAIService.

### 4. Service Implementations

- **OllamaNeuralSignalService**: Implements batch enrichment with centralized prompts
- **HuggingFaceNeuralSignalService**: Uses identical implementation
- **HuggingFaceServiceFacade**: Simple proxy to neural signal service
- **OllamaServiceFacade**: Updated to use batch method

### 5. NeuralSignalEnricher

Simplified to only use batch processing:
- No more checking for method availability
- No fallback to individual processing
- Simple error handling returns original queries on failure

### 6. Function Schema Registry

The schema name remains `enrichSemanticQueryBatch` for clarity about its batch processing nature, while the TypeScript method is named `enrichSemanticQuery` for simplicity.

## Prompt Engineering Best Practices

### Language Specification

Following best practices from prompt engineering guides, we implemented a multi-layered approach to language specification:

1. **System Prompt Level**: Language is now passed as a parameter to `buildSystemPrompt(language)` and `buildBatchEnrichSystemPrompt(signalCount, language)`
   - Clear directive: `LANGUAGE DIRECTIVE: All text content must be generated in ${targetLanguage}`
   - Reinforcement in field descriptions

2. **User Prompt Level**: Clear language instructions in the user prompt
   - Header specifying language: `NEURAL SIGNALS TO ENRICH IN ${targetLanguage}`
   - Reminder before tool call: `REMINDER: ALL enrichedQuery and keywords must be in ${targetLanguage}`

3. **Benefits of This Approach**:
   - **Consistency**: Language is specified at multiple levels
   - **Clarity**: No ambiguity about the expected output language
   - **Flexibility**: Easy to change language per request
   - **Robustness**: Multiple reinforcements ensure compliance

### Example Prompt Structure

System Prompt:
```
LANGUAGE DIRECTIVE: Generate ALL content exclusively in Portuguese.
...
• enrichedQuery for each signal - capturing hidden connections & meaning in Portuguese
• keywords for each signal - 3–8 strings per signal in Portuguese
```

User Prompt:
```
NEURAL SIGNALS TO ENRICH IN Portuguese:
...
OUTPUT LANGUAGE: Portuguese
REMINDER: ALL enrichedQuery and keywords must be in Portuguese.
```

This multi-level approach ensures the LLM consistently generates content in the requested language.

## Performance Benefits

- **Single LLM Call**: Process N signals with 1 call instead of N calls
- **Reduced Latency**: Especially beneficial with network overhead
- **Better Resource Utilization**: More efficient use of compute resources

## Usage Example

```typescript
// Process multiple signals at once
const enrichedSignals = await enrichService.enrichSemanticQuery(
  signals.map(signal => ({
    core: signal.core,
    query: signal.query,
    intensity: signal.intensity,
    context: signal.context
  })),
  language
);
```

## Architecture Benefits

1. **Simplicity**: One method to maintain instead of two
2. **Consistency**: All enrichments go through the same path
3. **Performance**: Always uses the most efficient approach
4. **Maintainability**: Less code to test and debug

## Error Handling

If batch enrichment fails, the system returns the original queries:
```typescript
catch (error) {
  LoggingUtils.logError('Batch enrichment failed', error);
  // Return signals with original queries as fallback
  return signals.map(signal => ({
    ...signal,
    topK: signal.topK || Math.round(5 + (signal.intensity || 0) * 10)
  }));
}
```

## Applied Corrections

### December 2024 Update

Following an audit, these corrections were applied:

1. **OllamaServiceFacade**: Removed the deprecated `enrichSemanticQueryForSignal` method and added the batch `enrichSemanticQuery` method
2. **INeuralSignalService**: Updated interface to use batch method signature
3. **Method References**: Removed all references to `enrichSemanticQueryForSignal` across the codebase
4. **Consistency**: All services now implement the same batch interface

The implementation is now 100% complete with no references to the old individual enrichment methods.

### Language Handling Improvements

Based on prompt engineering best practices:

1. **System Prompts**: Now accept language as a parameter
2. **Multi-level Specification**: Language is specified in both system and user prompts
3. **Clear Directives**: Explicit instructions like "LANGUAGE DIRECTIVE" and "OUTPUT LANGUAGE"
4. **Field-level Reinforcement**: Language specified in individual field descriptions

## Migration Notes

For existing code using the old methods:
1. Replace calls to `enrichSemanticQueryForSignal` with `enrichSemanticQuery` 
2. Wrap single signals in an array
3. Extract the first element from the result array if processing a single signal

## Future Improvements

1. **Adaptive Batching**: Automatically split very large batches
2. **Parallel Batches**: Process multiple batches in parallel for very large datasets
3. **Caching**: Cache enrichment results for frequently seen patterns
4. **Metrics**: Add performance monitoring and optimization analytics 