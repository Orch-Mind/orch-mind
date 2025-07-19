# Orch-Mind

## Federated AI Training, Learning & Distribution Platform

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![License](https://img.shields.io/badge/license-MIT%20%2F%20Apache--2.0-green)
![AI](https://img.shields.io/badge/AI-Federated-purple)
![LoRA](https://img.shields.io/badge/LoRA-P2P%20Sharing-orange)
![Gemma](https://img.shields.io/badge/Gemma-3%20%7C%203n-red)

Orch-Mind é uma plataforma revolucionária de treinamento, aprendizado e distribuição de IA federada. Construída como um aplicativo desktop Electron, permite o compartilhamento peer-to-peer de adaptadores LoRA e treinamento descentralizado baseado nos modelos Gemma 3 e Gemma 3n.

> "Democratizando o treinamento de IA através da colaboração federada"

---

## 🌟 Visão Geral

Orch-Mind transforma o paradigma tradicional de treinamento de IA ao criar uma rede federada onde usuários podem:

- **Treinar modelos LoRA** baseados em Gemma 3 e Gemma 3n localmente
- **Compartilhar adaptadores** através de uma rede P2P segura
- **Colaborar no aprendizado** sem centralização de dados
- **Distribuir conhecimento** de forma descentralizada e democrática

A plataforma opera como um ecossistema completo de IA federada, combinando poder computacional distribuído com privacidade de dados e colaboração inteligente.

---

## 🚀 Principais Recursos

### 🔄 Treinamento Federado de LoRA

- Treinamento local de adaptadores LoRA baseados em Gemma 3/3n
- Otimização distribuída sem compartilhamento de dados brutos
- Agregação inteligente de gradientes entre peers
- Suporte para fine-tuning especializado por domínio

### 🌐 Rede P2P de Adaptadores

- Descoberta automática de peers na rede
- Compartilhamento seguro de adaptadores LoRA
- Sistema de reputação e validação de qualidade
- Sincronização distribuída de modelos

### 🧠 Modelos Base Suportados

- **Gemma 3**: Modelo base para tarefas gerais
- **Gemma 3n**: Versão otimizada para eficiência
- Suporte para múltiplas variantes e tamanhos
- Carregamento dinâmico de checkpoints

### 📊 Monitoramento e Analytics

- Dashboard em tempo real do treinamento
- Métricas de performance distribuída
- Visualização de topologia da rede P2P
- Logs detalhados de colaboração federada

---

## 🛠️ Instalação

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/guiferrarib/orch-mind.git
cd orch-mind
npm install
```

### Desenvolvimento

```bash
# Iniciar em modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar testes
npm test

# Build do Electron
npm run electron:build
```

### Requisitos do Sistema

- **Node.js**: >= 18.0.0
- **RAM**: Mínimo 8GB (recomendado 16GB+)
- **GPU**: CUDA compatível (opcional, mas recomendado)
- **Armazenamento**: 10GB+ de espaço livre
- **Rede**: Conexão estável para P2P

## 🏗️ Arquitetura Técnica

### Frontend (React + TypeScript)

``
src/
├── components/          # Componentes UI (347 arquivos)
├── domain/core/neural/  # Interfaces neurais core
├── services/           # Lógica de negócio
├── hooks/              # React hooks customizados
└── utils/              # Utilitários e helpers
``

### Backend (Electron)

``
electron/
├── main/               # Processo principal
├── preload/            # Scripts de preload
├── services/           # Serviços do sistema
└── p2p/                # Rede P2P e comunicação
``

### Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Electron, Node.js
- **Banco de Dados**: DuckDB (analytics), SQLite (metadados)
- **IA/ML**: TensorFlow.js, ONNX Runtime
- **P2P**: libp2p, WebRTC
- **Audio**: Deepgram (transcrição)
- **Testes**: Jest, Playwright

---

## 🔬 Como Funciona

### 1. Inicialização do Peer

```typescript
// Conecta à rede P2P
const peer = await OrchMind.connect({
  nodeId: generateNodeId(),
  network: 'mainnet',
  capabilities: ['gemma3', 'gemma3n']
});
```

### 2. Treinamento Local

```typescript
// Configura treinamento LoRA
const trainer = new LoRATrainer({
  baseModel: 'gemma-3-7b',
  dataset: localDataset,
  rank: 16,
  alpha: 32
});

const adapter = await trainer.train();
```

### 3. Compartilhamento P2P

```typescript
// Publica adaptador na rede
await peer.publishAdapter({
  adapter: adapter,
  metadata: {
    domain: 'conversational',
    performance: metrics,
    validation: signature
  }
});
```

---

## 🌐 Rede Federada

### Descoberta de Peers

- **DHT (Distributed Hash Table)**: Localização eficiente de peers
- **mDNS**: Descoberta local automática
- **Bootstrap Nodes**: Pontos de entrada confiáveis

### Consenso e Validação

- **Proof of Training**: Validação de adaptadores através de métricas
- **Reputation System**: Sistema de reputação baseado em contribuições
- **Quality Gates**: Filtros automáticos de qualidade

### Segurança

- **Criptografia E2E**: Comunicação segura entre peers
- **Assinaturas Digitais**: Verificação de autenticidade
- **Sandboxing**: Execução isolada de modelos

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. **Fork** o repositório
2. **Crie** uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** um Pull Request

### Áreas de Contribuição

- 🧠 **Algoritmos de IA**: Melhorias nos algoritmos de treinamento federado
- 🌐 **Rede P2P**: Otimizações de conectividade e descoberta
- 🎨 **Interface**: Melhorias na experiência do usuário
- 📊 **Analytics**: Novas métricas e visualizações
- 🔒 **Segurança**: Auditorias e melhorias de segurança

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para diretrizes detalhadas.

---

## 📄 Licença

Este projeto é licenciado sob dupla licença:

- [MIT License](LICENSE-MIT)
- [Apache License 2.0](LICENSE-APACHE)

Você pode escolher qualquer uma das licenças ao usar este software.

---

## 📞 Suporte

- **GitHub Issues**: Para bugs e solicitações de feature

---

## 🏆 Reconhecimentos

Orch-Mind é construído sobre os ombros de gigantes:

- **Google**: Pelos modelos Gemma 3 e Gemma 3n
- **Ollama**: Model store e inferência
- **Hugging Face**: Pela infraestrutura de transformers e treinamento
- **HolePunch**: Pela stack de rede P2P
- **Electron**: Pela plataforma desktop multiplataforma
- **Comunidade Open Source**: Por todas as bibliotecas e ferramentas

---

Construído com ❤️ pela comunidade de IA federada

---

© 2025 Guilherme Ferrari Bréscia | Brazil

This repository is not just software — it is an invocation of structure into soul.
