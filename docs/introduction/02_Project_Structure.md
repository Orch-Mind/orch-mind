# Estrutura do Projeto Orch-Mind

Entender a organização dos diretórios e arquivos é fundamental para navegar e contribuir com o projeto. A estrutura do Orch-Mind foi pensada para separar claramente as responsabilidades entre a interface do usuário (frontend), a lógica da aplicação desktop (main process) e os scripts de processamento de IA (backend).

```bash
orch-mind/
├── .github/         # Configurações de CI/CD com GitHub Actions
├── assets/          # Ícones, imagens e outros recursos visuais
├── build/           # Scripts e configurações para o build da aplicação
├── dist/            # Arquivos do frontend após o build (gerado automaticamente)
├── dist-electron/   # Arquivos do main process após o build (gerado automaticamente)
├── electron/        # Código-fonte do Main Process do Electron (backend da aplicação)
├── node_modules/    # Dependências do Node.js
├── release/         # Pacotes da aplicação gerados pelo electron-builder
├── scripts/         # Scripts de automação e o backend de IA em Python
├── src/             # Código-fonte do Frontend em React/TypeScript (Renderer Process)
├── .env             # Arquivo de variáveis de ambiente (não versionado)
├── .eslintrc.json   # Configurações do ESLint para padronização de código
├── electron-builder.yml # Configuração do Electron Builder para empacotamento
├── jest.config.js   # Configurações do Jest para testes
├── package.json     # Dependências e scripts do projeto Node.js
├── tailwind.config.js # Configuração do TailwindCSS
└── vite.config.ts   # Configuração do Vite para o ambiente de desenvolvimento
```

## Descrição dos Diretórios Principais

### `src/`

Este é o coração da interface do usuário (o que o Electron chama de *Renderer Process*). Contém todo o código **React** e **TypeScript** que os usuários veem e com o qual interagem.

- **`src/components/`**: Componentes reutilizáveis da UI (botões, inputs, cards, etc.).
- **`src/pages/` ou `src/views/`**: Componentes que representam as telas principais da aplicação.
- **`src/services/`**: Lógica de negócio do lado do cliente, como chamadas para o backend do Electron.
- **`src/domain/`**: Definições de tipos, interfaces e lógica de domínio central da aplicação.
- **`src/main.tsx`**: O ponto de entrada da aplicação React.

### `electron/`

Aqui reside o **Main Process** do Electron. Este código é executado em um ambiente Node.js e tem acesso total ao sistema operacional. Ele atua como o backend da aplicação desktop, gerenciando janelas, menus e, o mais importante, orquestrando as chamadas para os scripts Python.

- **`electron/main.ts`**: O ponto de entrada do Main Process. É aqui que a aplicação é iniciada e as janelas são criadas.
- **`electron/preload.ts`**: Um script que roda em um contexto privilegiado, atuando como uma ponte segura entre o frontend (`src`) e o backend (`electron`). Ele expõe APIs do Node.js para o Renderer Process de forma controlada.
- **`electron/services/`**: Serviços do lado do backend, como o `LoRAMergeService.ts`, que lidam com a lógica pesada e a comunicação com os scripts Python.

### `scripts/`

Este diretório é fundamental para as capacidades de IA do Orch-Mind. Ele contém todos os scripts de automação e, principalmente, o código **Python** para treinamento e inferência.

- **`scripts/python/`**: Onde a mágica da IA acontece.
  - **`lora_training/`**: Scripts para o fine-tuning de modelos com LoRA/PEFT.
  - **`services/`**: Serviços como `ollama_service.py` e `lora_trainer.py`, que abstraem a complexidade de interagir com o Ollama e gerenciar o processo de treinamento.
- Outros scripts podem incluir automações de build, testes ou tarefas de manutenção.

### `release/`

Este diretório não é versionado e contém os instaladores e executáveis da aplicação (e.g., `.dmg`, `.exe`, `.AppImage`) gerados após o processo de build e empacotamento com o `electron-builder`.

Compreender essa separação de responsabilidades é o primeiro passo para contribuir de forma eficaz com o Orch-Mind. A seguir, mergulharemos nas tecnologias específicas de cada parte da stack.
