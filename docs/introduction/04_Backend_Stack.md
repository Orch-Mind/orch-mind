# Tech Stack: Backend

O Orch-Mind opera com uma arquitetura híbrida e poderosa, projetada para maximizar tanto a privacidade quanto a performance. Combinamos uma plataforma desktop robusta, um motor de IA local e serviços de nuvem opcionais para entregar uma experiência completa.

## 1. A Plataforma Desktop

### Electron: O Orquestrador

- **O que é?**: Um framework para criar aplicações desktop nativas com tecnologias web (JavaScript, HTML, CSS).
- **Por que usamos?**: Electron nos permite ter uma base de código unificada para a UI (com React) e o backend da aplicação (com Node.js), facilitando a comunicação entre eles. O **Main Process** do Electron atua como o cérebro da aplicação, gerenciando janelas, menus e, mais importante, invocando e se comunicando com os scripts Python que executam as tarefas de IA.
- **No Orch-Mind**: O diretório `electron/` contém o código do Main Process. Ele é responsável por iniciar os processos de treinamento, gerenciar o ciclo de vida dos modelos no Ollama e expor funcionalidades do sistema operacional para a interface de usuário de forma segura através do `preload.ts`.

### Electron Store: A Memória da Aplicação

- **O que é?**: Uma biblioteca simples para persistir dados de forma local e síncrona.
- **Por que usamos?**: Para salvar as configurações do usuário de forma robusta e de fácil acesso, como chaves de API, tema da UI, ou o último modelo utilizado.
- **No Orch-Mind**: Garante que suas preferências sejam mantidas entre as sessões, carregando-as na inicialização da aplicação.

### Electron Updater: Evolução Contínua

- **O que é?**: O módulo oficial do ecossistema Electron para gerenciar atualizações automáticas.
- **Por que usamos?**: Para garantir que os usuários tenham acesso às últimas funcionalidades e correções de segurança de forma transparente e sem esforço.
- **No Orch-Mind**: O sistema verifica periodicamente por novas versões no GitHub Releases e guia o usuário pelo processo de atualização quando uma nova versão está disponível.

## 2. O Motor de IA (Python)

### Unsloth: Acelerador de Treinamento

- **O que é?**: Uma biblioteca de otimização de alto desempenho para o fine-tuning de LLMs.
- **Por que usamos?**: Reduz drasticamente o consumo de memória (VRAM) e aumenta a velocidade do treinamento LoRA em até 2x, permitindo treinar modelos maiores e mais rápido no mesmo hardware.
- **No Orch-Mind**: É a nossa principal ferramenta de otimização. O `TrainingOrchestrator` em Python detecta automaticamente se uma GPU **NVIDIA (CUDA)** está disponível para ativar o Unsloth. Em hardware **Apple Silicon**, o sistema recorre à aceleração **Metal Performance Shaders (MPS)** nativa do PyTorch.

### llama.cpp: O Conversor para Inferência

- **O que é?**: Um conjunto de ferramentas em C++ para rodar LLMs com máxima eficiência em CPUs e GPUs.
- **Por que usamos?**: Embora não o usemos para inferência direta, sua ferramenta de conversão de modelos é essencial para nós. Ela transforma os modelos treinados no formato **GGUF**, que é altamente otimizado para a inferência local.
- **No Orch-Mind**: Após um treinamento LoRA ser concluído e o adaptador ser mesclado ao modelo base, usamos o `llama.cpp` para quantizar e converter o modelo final para GGUF. Este arquivo GGUF é então o que o Ollama serve para a inferência.

## 3. Protocolo de Contexto do Modelo (MCP)

### MCP: O Cérebro Simbólico

- **O que é?**: Um framework proprietário desenvolvido para o Orch-Mind que permite à IA raciocinar, planejar e usar ferramentas de forma estruturada.
- **Por que usamos?**: O MCP separa o LLM (o cérebro neural) das suas capacidades de ação (o cérebro simbólico). Isso permite que a IA execute tarefas complexas, como "pesquisar na web, resumir os três primeiros resultados e depois salvar em um arquivo", de forma confiável.
- **No Orch-Mind**: É a cola que une tudo. Os pacotes `@modelcontextprotocol/*` no `package.json` implementam essa arquitetura, permitindo o pensamento sequencial, o gerenciamento de memória e a interação com ferramentas como o Puppeteer.

## 4. Dados e Inferência Local

### Ollama: O Servidor de Modelos

- **O que é?**: Uma plataforma que serve e gerencia modelos de linguagem localmente através de uma API REST.
- **Por que usamos?**: Simplifica drasticamente a execução de LLMs. Em vez de gerenciarmos processos complexos, simplesmente fazemos uma chamada de API para o servidor Ollama, que cuida de carregar o modelo na memória e executar a inferência.
- **No Orch-Mind**: É o nosso motor de inferência padrão. Todos os modelos GGUF, sejam eles baixados ou treinados localmente, são servidos pelo Ollama para garantir uma experiência 100% offline e privada.

### DuckDB: O Banco de Dados Vetorial

- **O que é?**: Um banco de dados analítico embutido, de alta performance.
- **Por que usamos?**: Pela sua capacidade de realizar buscas vetoriais (ANN) de forma extremamente rápida e diretamente no processo da aplicação, sem a necessidade de um servidor de banco de dados separado.
- **No Orch-Mind**: Armazena os embeddings (vetores) de todos os documentos, conversas e notas. É o que permite a funcionalidade de "busca semântica", encontrando informações com base no significado, e não apenas em palavras-chave.

### Hyperswarm: A Rede P2P

- **O que é?**: Uma coleção de módulos para construir aplicações P2P (peer-to-peer) em Node.js.
- **Por que usamos?**: Para criar uma rede descentralizada onde os usuários podem compartilhar conhecimento (na forma de adaptadores LoRA) de forma segura e sem um servidor central.
- **No Orch-Mind**: É a base da nossa funcionalidade de compartilhamento federado. O `hypercore-crypto` é usado para garantir que todas as conexões e transferências de dados na rede sejam criptografadas e seguras.

## 5. Ferramentas Web e Serviços Externos

### Bing Search API: Os Olhos para o Mundo

- **O que é?**: Um serviço da Microsoft que fornece acesso programático aos resultados de busca do Bing.
- **Por que usamos?**: Para dar ao Orch-Mind a capacidade de acessar informações em tempo real da internet, superando a limitação de conhecimento dos modelos de linguagem.
- **No Orch-Mind**: É um serviço **opcional**. Se o usuário fornecer uma chave de API, a IA pode usar a ferramenta de busca para responder a perguntas sobre eventos atuais ou tópicos não cobertos em seus dados de treinamento.

### Puppeteer & Cheerio: Os Extratores de Conteúdo

- **O que são?**: Puppeteer é um navegador "headless" (sem interface) que pode ser controlado por código. Cheerio é uma biblioteca para analisar e extrair dados de HTML.
- **Por que usamos?**: Uma busca na web retorna apenas links. Para obter o conhecimento real, precisamos visitar essas páginas e extrair seu conteúdo.
- **No Orch-Mind**: Após a API do Bing retornar uma lista de URLs, o Puppeteer (controlado pelo MCP) "visita" as páginas mais promissoras. Em seguida, o Cheerio analisa o HTML da página para extrair o texto principal, que é então usado pela IA.

### Serviços Descontinuados

- **`Deepgram`**: Anteriormente usado para transcrição de áudio em tempo real. A funcionalidade foi descontinuada.
- **`API da OpenAI`**: Era uma opção para gerar embeddings na importação de históricos do ChatGPT. A funcionalidade foi descontinuada.
