# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orch-OS (Orchestrated Symbolism) is an Electron desktop application implementing a "symbolic artificial brain system" - a consciousness simulation platform that bridges cognitive science, computational theory, and consciousness studies. The system operates through neural signal extraction, parallel cognitive cores, and a symbolic collapse engine for fusing contradictory interpretations.

## Development Commands

### Running the Application

```bash
# Primary development command - cleans ports, builds, and starts with hot reload
npm run dev

# Alternative if ports are stuck
npm run dev:safe

# Run tests
npm test
npm run test:watch    # Watch mode
npm run test:coverage # With coverage

# Linting
npm run lint
npm run lint:fix

# Build for production
npm run dist

# Performance monitoring
npm run monitor-performance
```

### Port Management

The application runs on port 54321. If you encounter port conflicts:

```bash
npm run kill-port     # Kill processes on port 54321
npm run kill-electron # Kill any running Electron processes
npm run cleanup       # Full cleanup (ports + dist folders)
```

## Architecture

### Technology Stack

- **Frontend**: React 19.1.0 + TypeScript + Tailwind CSS
- **Desktop**: Electron 36.2.0
- **Build**: Vite with custom Electron integration
- **AI/ML**: HuggingFace Transformers, OpenAI SDK, Deepgram SDK
- **Database**: DuckDB (native for Electron) + Pinecone (vector storage)
- **3D**: Three.js with React Three Fiber

### Core Architecture

The system implements a modular cognitive architecture with parallel processing cores:

1. **Neural Signal Processing** (`/src/components/context/deepgram/symbolic-cortex/`)
   - `NeuralSignalExtractor`: Transforms inputs into symbolic stimuli
   - `SymbolicPatternDetector`: Identifies patterns and emotional tones
   - `SuperpositionLayer`: Manages quantum-inspired state superposition

2. **Cognitive Cores** (10 specialized processing modules)
   - Memory (Hippocampus analog) - Associative recall
   - Valence (Amygdala) - Emotional processing
   - Shadow - Contradiction detection/integration
   - Self - Identity and value processing
   - Metacognitive - Self-reflection
   - Soul - Existential meaning processing
   - Language - Linguistic structuring
   - Social - Relational dynamics
   - Archetype - Pattern recognition
   - Creativity - Novel connections

3. **Integration Services** (`/src/components/context/deepgram/symbolic-cortex/integration/`)
   - `DefaultNeuralIntegrationService`: Core orchestration
   - `OpenAICollapseStrategyService`: GPT-based collapse strategy
   - `HuggingFaceCollapseStrategyService`: Local model strategy

### Key Services

- **Memory Service** (`/src/components/context/services/memory/`)
  - Manages context, history, and embeddings
  - Integrates with Pinecone for vector storage
  - Handles conversation memory and expansion

- **Transcription Service** (`/src/components/context/deepgram/`)
  - Real-time speech processing via Deepgram
  - Audio streaming and transcription management

- **Cognition Logging** (`/src/components/features/transcription/CognitionLogs.tsx`)
  - Real-time visualization of cognitive processing
  - Tracks neural signals, core activations, and collapses

### Directory Structure

``
/electron         - Electron main process code
/src             - React application (renderer process)
  /components    - UI components and core logic
    /context     - Core services and providers
    /features    - Feature-specific components
    /ui          - Reusable UI components
  /tests         - Test files
/public          - Static assets including 3D models
/scripts         - Build and utility scripts
``

## Testing Approach

Tests use Jest with React Testing Library. Test files are colocated with source files using `.test.ts` or `.spec.ts` extensions. Key test areas:

- Neural signal processing
- Memory services
- Component rendering
- Integration between cognitive cores

## Important Considerations

1. **Port 54321** is hardcoded throughout the system - always use this port
2. **Electron + Vite** setup requires careful handling of Node.js polyfills
3. **DuckDB** uses native bindings in Electron (not WASM)
4. **HuggingFace models** are loaded locally via transformers.js
5. **Memory expansion** uses Pinecone for vector similarity search
6. **Real-time processing** requires careful state management to avoid UI blocking

## Environment Variables

The system uses `.env` files for configuration:

- `DEEPGRAM_API_KEY` - For speech transcription
- `OPENAI_API_KEY` - For GPT integration
- `PINECONE_API_KEY` - For vector database
- `PINECONE_ENVIRONMENT` - Pinecone region
- `PINECONE_INDEX` - Index name for memory storage

## Build Targets

- **macOS**: ARM64 DMG
- **Windows**: NSIS installer
- **Linux**: AppImage

All builds are configured in `package.json` under the `build` section.
