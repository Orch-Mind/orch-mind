# Ollama Settings Component - Sistema Reativo

## Arquitetura

Este componente utiliza um sistema **event-driven** para gerenciar atualizações de estado de forma eficiente, eliminando a necessidade de polling constante.

## Como Funciona

### Sistema de Eventos

Em vez de verificar constantemente o estado dos modelos (polling), o componente agora reage a eventos específicos:

```typescript
// Eventos disponíveis
MODEL_EVENTS = {
  MODEL_DOWNLOADED: 'model:downloaded',
  MODEL_REMOVED: 'model:removed',
  MODELS_CHANGED: 'models:changed',
  DOWNLOAD_STARTED: 'download:started',
  DOWNLOAD_COMPLETED: 'download:completed',
  DOWNLOAD_FAILED: 'download:failed',
}
```

### Fluxo de Dados

1. **Ação do Usuário** → Dispara operação (download/remove)
2. **Operação Completa** → Emite evento apropriado
3. **Hook Reativo** → Escuta evento e atualiza estado
4. **UI Atualiza** → Reflete novo estado automaticamente

### Vantagens

- ✅ **Sem Polling**: Não consome recursos verificando constantemente
- ✅ **Reatividade Real**: Atualizações apenas quando necessário
- ✅ **Performance**: Reduz chamadas desnecessárias à API
- ✅ **Manutenibilidade**: Código mais limpo e previsível

### Atualização Manual

Ainda é possível forçar uma atualização manual através do botão "Atualizar" caso necessário.

## Estrutura de Arquivos

```
OllamaSettings/
├── index.tsx                    # Componente principal
├── hooks/
│   ├── useOllamaModels.ts      # Hook reativo com eventos
│   ├── useModelDownload.ts     # Gerencia downloads com eventos
│   └── useModelStatus.ts       # Status do vLLM
├── utils/
│   ├── modelEvents.ts          # Sistema de eventos
│   └── modelUtils.ts           # Utilitários
└── services/
    └── ollamaService.ts        # Comunicação com API
```

## Exemplo de Uso

```typescript
// Hook escuta eventos automaticamente
const { availableModels, refreshData } = useOllamaModels();

// Download emite evento ao completar
await downloadModel('llama3.2:latest');
// UI atualiza automaticamente!

// Atualização manual ainda disponível
await refreshData();
``` 