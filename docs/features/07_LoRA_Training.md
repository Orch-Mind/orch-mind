# Feature: Treinamento de Adaptadores LoRA

O coração do Orch-Mind é a capacidade de permitir que qualquer usuário, mesmo sem conhecimento técnico, treine seus próprios modelos de IA. Isso é feito através de uma técnica de fine-tuning (ajuste fino) de alta eficiência chamada **LoRA (Low-Rank Adaptation)**.

## 1. O que é LoRA?

Em vez de retreinar um modelo de linguagem gigante do zero (o que custaria milhares de dólares), o LoRA congela o modelo original e treina apenas uma pequena camada de "pesos" adicionais, chamada de **adaptador**. Este adaptador, que é muito pequeno (geralmente alguns megabytes), aprende a especializar o modelo base em uma nova tarefa ou estilo de conversação.

**Vantagens:**

-   **Eficiência**: O treinamento é rápido e pode ser feito em computadores de consumo.
-   **Portabilidade**: Os adaptadores são pequenos e fáceis de compartilhar.
-   **Privacidade**: O treinamento ocorre inteiramente no computador do usuário. Seus dados nunca saem do seu dispositivo.

## 2. O Processo de Treinamento no Orch-Mind

O `LoRATrainingService.ts` orquestra um fluxo de trabalho automatizado e robusto para garantir que o treinamento seja acessível e eficaz.

1.  **Seleção de Dados**: O usuário seleciona as conversas (por exemplo, do histórico do ChatGPT importado) que deseja usar como material de treinamento.

2.  **Configuração do Ambiente (Automático)**: Esta é uma etapa crucial para a usabilidade. O Orch-Mind verifica se existe um ambiente Python (`venv`) com as dependências corretas (`torch`, `transformers`, etc.) no diretório `lora-training`. Se não existir ou estiver corrompido, o serviço o cria e instala tudo o que é necessário automaticamente. O usuário não precisa se preocupar em configurar o Python.

3.  **Preparação do Dataset**: As conversas selecionadas são processadas e convertidas para um formato de `pergunta` e `resposta` (`dataset.jsonl`), que é o formato que o script de treinamento espera.

4.  **Cálculo de Passos Otimizado**: O serviço analisa o tamanho do dataset e calcula o número ideal de passos de treinamento. Ele é inteligente o suficiente para saber se este é um treinamento inicial ou um ajuste fino de um adaptador já existente, ajustando os parâmetros para obter a melhor qualidade possível sem "superaquecer" (overfitting) o modelo.

5.  **Execução do Treinamento**: O `LoRATrainingService` executa o script Python `lora.py`, que utiliza a biblioteca `ml-explore/mlx` da Apple para realizar o treinamento de forma otimizada em hardware Apple Silicon (e com fallbacks para outras plataformas).

6.  **Monitoramento em Tempo Real**: O serviço monitora a saída do script Python, capturando logs de progresso e enviando-os para a interface do usuário. O usuário pode acompanhar o treinamento passo a passo.

7.  **Criação e Implantação do Adaptador**: Uma vez que o treinamento é concluído, o novo adaptador LoRA é salvo. O usuário pode então "implantar" (deploy) este adaptador. O processo de implantação utiliza o Ollama para fundir o adaptador com o modelo base, criando um novo modelo final e especializado (ex: `gemma:latest-meu-assistente`) que pode ser usado imediatamente para conversas.
