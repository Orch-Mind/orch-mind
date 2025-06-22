# ConversationalChat - Refatoração

## Visão Geral

O componente `ConversationalChat` foi refatorado aplicando os princípios SOLID, DRY e KISS para melhorar a manutenibilidade, testabilidade e clareza do código.

## Princípios Aplicados

### SRP (Single Responsibility Principle)
- Cada manager e hook tem uma única responsabilidade bem definida
- O componente principal agora apenas orquestra as interações

### DRY (Don't Repeat Yourself)
- Lógica compartilhada extraída para managers e hooks reutilizáveis
- Eliminação de código duplicado

### KISS (Keep It Simple Stupid)
- Componentes mais simples e focados
- Fácil de entender e modificar

## Arquitetura

### Managers

#### ConversationManager
- **Responsabilidade**: Gerenciar sincronização e estado de conversas
- **Localização**: `/managers/ConversationManager.ts`

#### StreamingManager
- **Responsabilidade**: Gerenciar estado de streaming e thinking
- **Localização**: `/managers/StreamingManager.ts`

#### MessageProcessor
- **Responsabilidade**: Processar mensagens de entrada/saída e respostas de IA
- **Localização**: `/managers/MessageProcessor.ts`

### Hooks Customizados

#### useConversationSync
- **Responsabilidade**: Hook que encapsula uso do ConversationManager
- **Localização**: `/hooks/useConversationSync.ts`

#### useStreamingHandlers
- **Responsabilidade**: Expor handlers de streaming no window
- **Localização**: `/hooks/useStreamingHandlers.ts`

#### useProcessingStatus
- **Responsabilidade**: Gerenciar status de processamento
- **Localização**: `/hooks/useProcessingStatus.ts`

### Componente Principal

#### ConversationalChatRefactored
- **Responsabilidade**: Orquestrar interações entre managers e componentes de UI
- **Localização**: `/ConversationalChatRefactored.tsx`

## Mudanças Principais

1. **Separação de Responsabilidades**: O componente original de ~1000 linhas foi dividido em múltiplos arquivos menores e focados

2. **Melhor Testabilidade**: Managers e hooks podem ser testados isoladamente

3. **Manutenibilidade**: Código mais fácil de entender e modificar

4. **Performance**: Mantém otimizações originais com React.memo

## Migração

O componente mantém a mesma interface (props) do original, permitindo uma migração transparente. O arquivo original foi preservado como `ConversationalChat.original.tsx` para referência.

## Estrutura de Arquivos

```
ConversationalChat/
├── index.tsx                    # Exporta componente com memo
├── ConversationalChatRefactored.tsx # Componente principal
├── managers/
│   ├── ConversationManager.ts   # Gerencia conversas
│   ├── StreamingManager.ts      # Gerencia streaming
│   └── MessageProcessor.ts      # Processa mensagens
├── hooks/
│   ├── useConversationSync.ts   # Hook de sincronização
│   ├── useStreamingHandlers.ts  # Hook de streaming
│   └── useProcessingStatus.ts   # Hook de status
└── ConversationalChat.original.tsx # Arquivo original (backup)
``` 