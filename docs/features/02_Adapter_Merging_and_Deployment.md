# Feature: Fusão de Adaptadores e Implantação no Ollama

Depois de treinar um ou mais adaptadores LoRA, o Orch-Mind oferece uma funcionalidade poderosa: a capacidade de combiná-los. A fusão (ou *merge*) de adaptadores permite criar novas IAs especialistas que unem as habilidades de diferentes modelos treinados, abrindo um leque de possibilidades para personalização.

## 1. Por que Fundir Adaptadores?

Imagine que você treinou um adaptador para ser um especialista em seus documentos jurídicos e outro para ser um especialista em seus e-mails de atendimento ao cliente. E se você pudesse ter uma única IA que entende de ambos os contextos?

A fusão de adaptadores permite exatamente isso. Você pode combinar:

- **Habilidades Diversas**: Juntar um adaptador de "escrita criativa" com um de "revisão técnica".
- **Conhecimento Incremental**: Fundir um adaptador antigo com um novo que foi treinado com dados mais recentes.
- **Colaboração Comunitária**: Combinar um adaptador que você treinou com outro que você baixou da rede P2P.

## 2. Estratégias de Fusão

O Orch-Mind, através do `LoRAMergeService.ts`, oferece diferentes estratégias para a fusão, cada uma com suas vantagens:

- **`arithmetic_mean` (Média Aritmética)**: Esta é a abordagem mais simples. Os pesos dos adaptadores são simplesmente somados e divididos pelo número de adaptadores. É uma ótima maneira de combinar habilidades de forma equilibrada.
- **`weighted_average` (Média Ponderada)**: Permite que você dê mais importância a certos adaptadores. Por exemplo, você pode fundir um adaptador de "juridiquês" (peso 0.7) com um de "linguagem casual" (peso 0.3) para criar uma IA que é primariamente formal, mas com um toque de naturalidade.
- **`svd_merge` (Fusão SVD)**: Uma técnica mais avançada que usa a Decomposição em Valores Singulares (SVD) para encontrar uma combinação mais otimizada dos pesos. Pode produzir resultados superiores, especialmente ao combinar múltiplos adaptadores complexos.

## 3. O Processo de Fusão e Implantação

O processo é orquestrado pelo `LoRAMergeService.ts` no Main Process do Electron, que por sua vez invoca um script Python para a matemática pesada.

1. **Requisição de Fusão**: O usuário seleciona na UI os adaptadores que deseja fundir, a estratégia e um nome para o novo adaptador. Isso gera uma `MergeRequest`.
2. **Validação**: O serviço primeiro valida se os adaptadores são compatíveis (por exemplo, se foram treinados a partir do mesmo modelo base).
3. **Execução do Script Python**: Um arquivo de configuração temporário é criado e passado para um script Python especializado. Este script carrega os adaptadores selecionados e executa a fusão matemática de acordo com a estratégia escolhida.
4. **Criação do Novo Adaptador**: O script salva o resultado como um novo conjunto de pesos de adaptador LoRA no diretório `adapters/merged/`.
5. **Geração de Metadados**: O `LoRAMergeService` cria um arquivo `orch_merge_metadata.json` junto com o novo adaptador. Este arquivo é crucial, pois rastreia quais adaptadores foram usados na fusão, a estratégia, a data e quem o criou, garantindo a proveniência e a reprodutibilidade.
6. **Registro e Preparação para Implantação**: O novo adaptador fundido é registrado no sistema principal do Orch-Mind. Neste ponto, ele ainda não está "vivo".
7. **Implantação no Ollama**: Em um passo subsequente (geralmente iniciado pelo usuário na UI), o sistema pega o modelo base original e o adaptador recém-fundido, realiza a fusão final em um modelo completo e o implanta no **Ollama**. A partir deste momento, o novo modelo aparece na lista do Ollama e está pronto para ser usado para inferência (chat).

Este ciclo completo — treinar, fundir, implantar — é o que dá ao usuário do Orch-Mind um controle sem precedentes sobre a personalização de sua própria Inteligência Artificial.
