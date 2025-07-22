# Feature: Busca na Web em Tempo Real

Para garantir que a IA do Orch-Mind não fique limitada ao seu conhecimento pré-treinado ou à memória local, integramos uma poderosa funcionalidade de busca na web. Isso permite que a IA acesse informações atualizadas e responda a perguntas sobre eventos recentes, notícias ou qualquer tópico que exija dados em tempo real.

## 1. A Importância da Busca na Web

-   **Conhecimento Atualizado**: Modelos de linguagem são treinados com dados até uma certa data. A busca na web quebra essa barreira, fornecendo acesso a informações do presente.
-   **Respostas Mais Ricas**: Permite que a IA fundamente suas respostas com fontes e dados concretos da internet.
-   **Ampliação do Contexto**: Combina a memória de longo prazo (DuckDB) com o conhecimento instantâneo da web, criando um sistema de IA híbrido e mais capaz.

## 2. Arquitetura e Fluxo de Execução

A funcionalidade é orquestrada pelo `WebSearchHandler` (`electron/handlers/webSearchHandler.ts`) e segue um fluxo inteligente em duas etapas para garantir a qualidade dos resultados.

**Etapa 1: Busca Inicial com Bing**

1.  Quando o modo de busca na web é ativado, a pergunta do usuário é enviada ao `WebSearchHandler`.
2.  O handler utiliza o **Bing** como motor de busca para encontrar as páginas mais relevantes para a consulta. Em vez de uma API formal, ele simula uma busca normal para obter os resultados, o que aumenta a flexibilidade.
3.  Uma lista de resultados contendo título, URL e um pequeno snippet (resumo) é retornada.

**Etapa 2: Extração e Pontuação de Conteúdo**

Esta é a etapa crucial que diferencia a nossa implementação. Em vez de usar apenas os snippets, o Orch-Mind tenta extrair o conteúdo principal das páginas encontradas.

1.  **Extração de Conteúdo**: O handler visita as URLs dos melhores resultados e, usando bibliotecas como `axios` e `cheerio`, analisa o HTML da página para extrair o texto principal, ignorando menus, anúncios e outros ruídos.
2.  **Limpeza e Normalização**: O texto extraído é cuidadosamente limpo, removendo espaços excessivos, tags HTML e outros artefatos para obter um conteúdo de alta qualidade.
3.  **Pontuação de Qualidade (`contentScore`)**: Um algoritmo interno avalia a qualidade do conteúdo extraído com base em fatores como:
    -   Tamanho do texto (conteúdos muito curtos são penalizados).
    -   Estrutura das frases.
    -   Diversidade de palavras.
4.  **Resiliência**: O sistema é projetado para ser robusto, utilizando múltiplos `User-Agents` para minimizar bloqueios e implementando timeouts para não prender o sistema em páginas lentas.

## 3. Integração com a IA

Os conteúdos extraídos e com a melhor pontuação são então formatados e injetados no prompt final que é enviado ao modelo de linguagem. Isso permite que a IA utilize essas informações frescas e verificadas para construir sua resposta final, citando fontes quando apropriado.

Ao combinar a memória de longo prazo do DuckDB com a capacidade de buscar informações em tempo real na web, o Orch-Mind oferece uma experiência de IA verdadeiramente poderosa, contextualizada e sempre atualizada.
