# Orch-Mind: IA para Todos 🇧🇷

![License](https://img.shields.io/badge/license-MIT%20%2F%20Apache--2.0-green) ![Version](https://img.shields.io/badge/version-0.0.1-brightgreen) ![AI](https://img.shields.io/badge/AI-Federated-purple) ![LoRA](https://img.shields.io/badge/LoRA-P2P%20Sharing-orange) ![Gemma](https://img.shields.io/badge/Gemma-3%20%7C%203n-red) ![Platform](https://img.shields.io/badge/platform-Electron-lightgrey.svg)

**A Primeira Plataforma de IA Federada do Brasil, projetada para democratizar o acesso à Inteligência Artificial com total privacidade e controle para o usuário.**

Nossa missão é transformar a IA em uma ferramenta acessível para todos: de leigos e microempreendedores a grandes empresas e pesquisadores. Com o Orch-Mind, qualquer pessoa pode treinar, personalizar e usar sua própria IA sem precisar de conhecimento técnico aprofundado.

---

## ✨ Recursos Principais

- 🧠 **Treine Sua Própria IA**: Use seus próprios dados para criar modelos de IA especialistas (adaptadores LoRA) de forma intuitiva e visual.

- 🔒 **Privacidade Total por Design**: Seus dados e o processo de treinamento **nunca saem do seu computador**. O que é seu, fica com você.

- 🌐 **Rede Federada e Descentralizada**: Compartilhe e baixe "personalidades" de IA (adaptadores) através de uma rede P2P segura, sem nunca expor seus dados brutos.

- ✨ **Combine Habilidades**: Faça a fusão de diferentes adaptadores para criar IAs novas e ainda mais poderosas. Combine um especialista em direito com um especialista em marketing, por exemplo.

- 📚 **Importe Conhecimento Existente**: Aproveite suas conversas do ChatGPT para ensinar e atualizar sua IA local.

- 🚀 **Execução Local com Ollama**: Todos os modelos rodam de forma eficiente na sua máquina, garantindo velocidade e independência da nuvem.

---

## 🚀 Comece a Usar

Para começar a desenvolver e contribuir com o Orch-Mind, siga os passos abaixo.

### 1. Pré-requisitos

- **Node.js**: Versão 20.x (LTS) ou superior.
- **npm**: Instalado junto com o Node.js.
- **Git**: Para clonar o repositório.
- **Python (Opcional)**: Necessário para habilitar o treinamento de LoRA. Recomendamos Python 3.9+.

Para um guia detalhado, consulte nosso **[Guia de Setup para Desenvolvedores](./docs/Developer_Setup.md)**.

### 2. Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/guiferrarib/orch-mind.git

# 2. Entre no diretório
cd orch-mind

# 3. Instale as dependências
npm install
```

### 3. Executando em Modo de Desenvolvimento

```bash
# Inicia o frontend e o backend do Electron com hot-reload
npm run dev
```

Após executar o comando, a janela do Orch-Mind aparecerá, pronta para o desenvolvimento.

---

## 🏗️ Arquitetura e Tecnologias

O Orch-Mind é uma aplicação desktop robusta que combina o melhor do desenvolvimento web com o poder do processamento de IA local.

- **Interface (Frontend)**: `React` com `TypeScript`, `Vite` para build e `TailwindCSS` para o design.
- **Aplicação (Backend)**: `Electron` para criar a aplicação desktop multiplataforma.
- **Inteligência Artificial (IA)**: Scripts em `Python` que utilizam `MLX` (para Apple Silicon) e `PyTorch` para o treinamento de modelos, e `Ollama` para a inferência local.
- **Banco de Dados**: `DuckDB` para armazenamento e consultas analíticas.

Para uma visão aprofundada da estrutura de pastas, veja o documento **[Estrutura do Projeto](./docs/introduction/02_Project_Structure.md)**.

---

## 🤝 Como Contribuir

Estamos construindo uma comunidade aberta e acolhedora! Se você tem interesse em contribuir com código, documentação, ou ideias, sua ajuda é muito bem-vinda.

Por favor, leia nosso **[Guia de Contribuição](./docs/Contributing.md)** para entender nosso fluxo de trabalho, padrões de commit e como submeter suas pull requests.

## 📜 Licença

Este projeto é distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
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

Veja [CONTRIBUTING.md](./docs/Contributing.md) para diretrizes detalhadas.

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

Construído com ❤️ pela comunidade Orch-Mind

---

© 2025 Guilherme Ferrari Bréscia | Brazil

This repository is not just software — it is an invocation of structure into soul.
