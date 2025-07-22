# Feature: Banco de Dados Vetorial com DuckDB

O sistema de memória de longo prazo é uma das funcionalidades mais poderosas do Orch-Mind. Ele permite que a IA "lembre" de conversas passadas, documentos e conhecimentos, respondendo com mais contexto e precisão. Esta funcionalidade é construída sobre um banco de dados vetorial local e privado, utilizando **DuckDB**.

## 1. Por que DuckDB?

DuckDB é um banco de dados analítico, embutido e de alta performance. Nós o escolhemos por várias razões:

-   **Privacidade Total**: O banco de dados é um único arquivo (`.duckdb`) que fica no computador do usuário. Nenhum dado de memória jamais sai do seu dispositivo.
-   **Performance**: É extremamente rápido para consultas complexas, ideal para buscas de similaridade vetorial.
-   **Zero Configuração**: Por ser embutido, não requer um servidor separado. Ele roda diretamente dentro do processo do Electron.
-   **Extensibilidade**: Suporta extensões, como a **VSS (Vector Similarity Search)**, que oferece funções otimizadas para calcular a similaridade entre vetores.

## 2. Arquitetura da Memória

A interação com o DuckDB é projetada em camadas, seguindo os princípios SOLID para garantir manutenibilidade e clareza.

1.  **`ipcHandlers.ts`**: A camada mais externa, que recebe os comandos da interface do usuário (React), como `import-chatgpt-history` ou `query-memory`.

2.  **`DuckDBHelper.ts`**: Atua como uma **Fachada (Facade Pattern)**, fornecendo uma API simples e limpa para as operações de banco de dados. Ele mantém a compatibilidade com partes mais antigas do código, mas delega todas as chamadas para a nova arquitetura.

3.  **`DuckDBVectorDatabase.ts`**: É o coração da lógica de banco de dados. Ele orquestra as operações, mas delega as responsabilidades específicas para componentes menores:
    -   **`DuckDBConnectionManager`**: Gerencia a conexão com o arquivo do banco de dados.
    -   **`DuckDBTableManager`**: É responsável por criar e garantir que a tabela `vectors` exista com o esquema correto.
    -   **`VectorQueryBuilder`**: Constrói dinamicamente as queries SQL para inserção e busca, utilizando *prepared statements* para prevenir SQL Injection.

## 3. Fluxo de Importação do ChatGPT

Quando um usuário importa seu histórico do ChatGPT, um processo sofisticado é iniciado:

1.  **Parsing**: O arquivo `.zip` ou `.json` é lido e as conversas são extraídas pelo `ChatGPTParser`.
2.  **Deduplicação**: O `DeduplicationService` verifica quais mensagens já existem no banco de dados para evitar duplicatas.
3.  **Chunking**: As mensagens longas são divididas em pedaços menores (`chunks`) pelo `TextChunker` para otimizar a geração de embeddings.
4.  **Embedding**: O `EmbeddingService` usa um modelo de linguagem (via Ollama) para converter cada `chunk` de texto em um vetor numérico (embedding). Esse vetor captura o significado semântico do texto.
5.  **Armazenamento**: O `VectorStorageService` envia os vetores em lotes para o `DuckDBHelper`, que finalmente os salva na tabela `vectors` do DuckDB.

## 4. Como a Busca Semântica Funciona

Quando você faz uma pergunta à IA, o Orch-Mind usa a busca vetorial para encontrar o contexto mais relevante em sua memória:

1.  Sua pergunta é convertida em um vetor de embedding, usando o mesmo modelo de linguagem.
2.  O `DuckDBVectorDatabase` executa uma query SQL para comparar o vetor da sua pergunta com todos os vetores armazenados na tabela `vectors`.
3.  A busca utiliza a função `list_cosine_similarity` (ou a função otimizada da extensão VSS, se disponível) para calcular a "distância" semântica entre os vetores.
4.  Os resultados com a maior similaridade (score mais alto) são retornados. Esses `chunks` de texto são então injetados no prompt final enviado ao modelo de IA, dando a ele o contexto necessário para fornecer uma resposta precisa e personalizada.

Este sistema transforma o Orch-Mind de uma simples ferramenta de IA em um verdadeiro assistente pessoal com memória de longo prazo, totalmente privado e sob seu controle.
