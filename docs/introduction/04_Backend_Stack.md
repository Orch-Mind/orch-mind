# Tech Stack: Backend e Inteligência Artificial

O backend do Orch-Mind é onde a verdadeira mágica acontece. É um sistema híbrido que combina a robustez de uma aplicação desktop com o poder de processamento de scripts Python especializados em IA. Essa camada é responsável por tudo, desde o gerenciamento da aplicação até o treinamento e a execução dos modelos de linguagem.

## 1. Electron: O Orquestrador

- **O que é?**: Um framework para criar aplicações desktop nativas com tecnologias web (JavaScript, HTML, CSS).
- **Por que usamos?**: Electron nos permite ter uma base de código unificada para a UI (com React) e o backend da aplicação (com Node.js), facilitando a comunicação entre eles. O **Main Process** do Electron atua como o cérebro da aplicação, gerenciando janelas, menus, e, mais importante, invocando e se comunicando com os scripts Python que executam as tarefas de IA.
- **No Orch-Mind**: O diretório `electron/` contém o código do Main Process. Ele é responsável por iniciar os processos de treinamento, gerenciar o ciclo de vida dos modelos no Ollama e expor funcionalidades do sistema operacional para a interface de usuário de forma segura através do `preload.ts`.

## 2. Python: O Motor da IA

Os scripts localizados em `scripts/python/` são o coração do processamento de IA. Eles são chamados pelo Electron para realizar as tarefas mais intensivas.

### Bibliotecas Chave de IA:

- **`torch`**: A fundação de tudo. É o framework de deep learning que usamos para todas as operações com tensores e para a construção e treinamento dos modelos.
- **`transformers` (Hugging Face)**: Fornece os blocos de construção essenciais, incluindo as arquiteturas de modelos pré-treinados (como Gemma) e os tokenizers.
- **`peft` (Parameter-Efficient Fine-Tuning)**: Esta é a biblioteca central para o nosso processo de fine-tuning. Ela implementa a técnica **LoRA (Low-Rank Adaptation)**, que nos permite treinar e adaptar grandes modelos de linguagem de forma muito eficiente, modificando apenas uma pequena fração dos parâmetros do modelo. É isso que torna o treinamento no Orch-Mind viável em hardware de consumidor.
- **`accelerate` (Hugging Face)**: Simplifica a execução dos scripts de treinamento em diferentes hardwares (CPU, GPU), gerenciando automaticamente o posicionamento de tensores e otimizando o processo.
- **`bitsandbytes`**: Uma biblioteca crucial para a democratização da IA. Ela nos permite carregar modelos usando técnicas de quantização (8-bit e 4-bit), o que reduz drasticamente o consumo de memória RAM e VRAM, tornando possível rodar e treinar modelos grandes em computadores pessoais.

## 3. Ollama: Inferência Local

- **O que é?**: Uma ferramenta que simplifica a execução de grandes modelos de linguagem localmente.
- **Por que usamos?**: Ollama gerencia todo o ciclo de vida do modelo para inferência (ou seja, para usar o modelo depois de treinado). Após nosso script Python treinar e mesclar um adaptador LoRA com o modelo base, o resultado final é implantado no Ollama. Ele cuida de servir o modelo através de uma API local, que a nossa aplicação consome para interagir com a IA.
- **No Orch-Mind**: Usamos o Ollama como nosso *model store* e servidor de inferência. Isso garante que, em linha com nossa filosofia de privacidade, os modelos rodem 100% offline no computador do usuário.

## 4. Pears (Hyperswarm): Rede P2P

- **O que é?**: Pears é uma tecnologia para comunicação P2P (peer-to-peer) baseada no protocolo **Hyperswarm**.
- **Por que usamos?**: É a espinha dorsal da nossa IA Federada. Usamos a rede P2P para permitir que os usuários compartilhem seus **adaptadores LoRA** treinados diretamente uns com os outros, sem um servidor central. Isso cria uma rede de conhecimento descentralizada onde a comunidade pode colaborar e se beneficiar mutuamente, sem nunca comprometer a privacidade dos dados de treinamento originais.

## 5. DuckDB: Banco de Dados Vetorial

- **O que é?**: Um banco de dados analítico embutido, de alta performance.
- **Por que usamos?**: Utilizamos o DuckDB com extensões que o transformam em um **banco de dados vetorial**. Quando um usuário importa um backup do ChatGPT ou adiciona novos conhecimentos, nós convertemos esses textos em vetores (embeddings) e os armazenamos no DuckDB. Isso permite buscas semânticas ultrarrápidas, onde a IA pode encontrar informações relevantes baseadas no significado, e não apenas em palavras-chave.

Juntas, essas tecnologias formam um ecossistema poderoso e privado, permitindo que o Orch-Mind entregue uma experiência de IA de ponta diretamente no desktop do usuário.
