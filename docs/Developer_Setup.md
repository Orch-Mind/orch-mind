# Guia de Setup para Desenvolvedores

Este guia irá ajudá-lo a configurar o ambiente de desenvolvimento do Orch-Mind para que você possa começar a contribuir com o projeto.

## 1. Pré-requisitos

Antes de começar, certifique-se de que você tem os seguintes softwares instalados em sua máquina:

- **Node.js**: Versão 20.x (LTS) ou superior. Recomendamos o uso da versão LTS mais recente para garantir compatibilidade e estabilidade. Você pode baixar em [nodejs.org](https://nodejs.org/).
- **npm**: O projeto utiliza `npm` como gerenciador de pacotes padrão e inclui um arquivo `package-lock.json` para garantir a consistência das dependências.
- **Git**: Para clonar o repositório.
- **(Opcional, mas recomendado) Python**: Para habilitar as funcionalidades de treinamento de LoRA e fusão de adaptadores. O serviço de treinamento do Orch-Mind é otimizado para rodar em hardware Apple Silicon usando a biblioteca **[MLX](https://github.com/ml-explore/mlx)** da Apple e também possui fallbacks para outras plataformas usando **PyTorch**. Ter uma instalação de Python (3.9+) no sistema é recomendado.

## 2. Clonando o Repositório

Abra seu terminal e clone o repositório do Orch-Mind do GitHub:

```bash
git clone https://github.com/guiferrarib/orch-mind.git
cd orch-mind
```

## 3. Instalando as Dependências

Dentro do diretório do projeto, instale todas as dependências necessárias usando `npm`:

```bash
npm install
```

Este processo pode levar alguns minutos, pois irá baixar todas as bibliotecas que o projeto utiliza, incluindo Electron, React, Vite e outras.

## 4. Executando o Ambiente de Desenvolvimento

Após a instalação das dependências, você pode iniciar o ambiente de desenvolvimento com um único comando:

```bash
npm run dev
```

Este comando fará o seguinte:

1. **Limpar builds antigos**: Remove os diretórios `dist` e `dist-electron` para garantir um início limpo.
2. **Iniciar o Servidor Vite**: Inicia um servidor de desenvolvimento para o frontend em React (o processo de renderização).
3. **Iniciar o Electron**: Inicia a aplicação desktop, que irá carregar o frontend do servidor Vite.

Se tudo correr bem, a janela do aplicativo Orch-Mind deverá aparecer na sua tela. Agora você está pronto para fazer alterações no código. O Vite e o Electron irão recarregar automaticamente a aplicação conforme você salva seus arquivos.

## 5. Scripts Úteis

O `package.json` contém outros scripts úteis para o desenvolvimento:

- `npm run lint`: Executa o ESLint para verificar a qualidade e o estilo do código.
- `npm run lint:fix`: Tenta corrigir automaticamente os problemas de linting.
- `npm test`: Executa a suíte de testes com Jest.
- `npm run build`: Compila o frontend e o backend para produção.
- `npm run dist`: Empacota a aplicação em um instalador para sua plataforma (ex: .dmg para macOS, .exe para Windows).
