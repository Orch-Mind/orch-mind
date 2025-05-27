# 🧠 Orch-OS Project Structure Map (Scan Excerpt)

## Key Modules & Responsibilities

### MemoryService.ts

- **Type:** Class (`MemoryService`) implementing `IMemoryService`
- **Symbolic Intent:** "Memory cortex/neurons" — Orchestrates memory storage, context building, embedding, and interaction with Pinecone.
- **Responsibilities:**
  - Handles user context, history, and embedding services.
  - Builds prompt messages for AI, injects context, and queries expanded memory.
  - Logs symbolic/diagnostic events for explainability.
- **Architecture:** Infrastructure-bound, mixes orchestration and domain logic (Clean Architecture violation: should be abstracted to the domain layer).

### IMemoryService.ts

- **Type:** Interface
- **Symbolic Intent:** "Memory cortex contract" — Defines the symbolic/functional contract for memory services.
- **Responsibilities:**
  - Fetches contextual memory.
  - Queries/saves long-term memory.
  - Manages conversation history, context, and memory expansion.
- **Architecture:** Proper separation; interface resides in the correct layer.

### TranscriptionModule.tsx

- **Type:** React Functional Component
- **Symbolic Intent:** "Interface cortex" — Bridges neural input (microphone, Deepgram) with UI.
- **Responsibilities:**
  - Manages microphone state and Deepgram connection.
  - Handles UI logic for transcription.
- **Architecture:** UI layer, correct separation.

### TranscriptionPanel.tsx

- **Type:** React Functional Component
- **Symbolic Intent:** "Quantum dashboard cortex" — Main UI for transcription and cognition logs, integrates advanced UI/UX (glassmorphism, spatial depth, Vision Pro-inspired).
- **Responsibilities:**
  - Hosts subcomponents (audio controls, logs, settings, visualization).
  - Manages state for modals, logs, and imports.
- **Architecture:** Interface layer, proper separation.

### utils.ts

- **Type:** Pure Function (`cn`)
- **Symbolic Intent:** "Utility neuron" — Class name merger for Tailwind/clsx.
- **Responsibilities:**
  - Merges class names for styling.
- **Architecture:** Properly isolated utility.

### DeepgramSingleton.ts

- **Type:** Singleton Class
- **Symbolic Intent:** "Infrastructure neuron" — Ensures a single Deepgram client instance.
- **Responsibilities:**
  - Manages Deepgram API key and instance lifecycle.
- **Architecture:** Infrastructure layer, proper encapsulation.

---

## Architectural Notes & Violations

- **Domain logic** (memory, neural signal extraction, core orchestration) is implemented in infrastructure/services, not in domain/core or domain/interfaces (Clean Architecture violation).
- **Interfaces** (e.g., `IMemoryService`) are correctly separated.
- **UI logic** is isolated in the interface layer.
- **Utilities** are properly separated.
- **Missing abstractions:** No domain interfaces/abstractions for neural signal extraction or core orchestration; domain layer is empty.

---

## Next Steps

- Expand this scan to cover all key modules for a complete map.
- Store this map in internal memory (`orch.project.structure`) and generate/update `knowledge/orchos_project_map.md`.
