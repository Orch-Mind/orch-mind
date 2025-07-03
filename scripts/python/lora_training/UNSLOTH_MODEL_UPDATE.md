# Atualização dos Modelos Unsloth - Orch-OS LoRA System

## 📋 Resumo das Mudanças

Atualizados os mappings de modelos no sistema LoRA do Orch-OS para usar os **modelos Unsloth mais recentes e otimizados**, baseados na [documentação oficial do Unsloth](https://docs.unsloth.ai/).

## 🔄 Modelos Atualizados

### Mapeamento Anterior → Novo

| Modelo Ollama | Modelo Anterior | Modelo Unsloth Atual |
|---------------|-----------------|----------------------|
| `gemma3:latest` | `unsloth/gemma-2-2b-it` | `unsloth/gemma-3-1b-it-GGUF` |
| `gemma2:latest` | `unsloth/gemma-2-2b-it` | `unsloth/gemma-3-1b-it-GGUF` |
| `qwen3:latest` | `Qwen/Qwen2-1.5B-Instruct` | `unsloth/Qwen3-8B-GGUF` |
| `qwen2:latest` | `Qwen/Qwen2-1.5B-Instruct` | `unsloth/Qwen3-8B-GGUF` |
| `mistral:latest` | `unsloth/mistral-7b-instruct-v0.2` | `unsloth/mistral-7b-v0.3` |
| `mistral-nemo:latest` | *(não existia)* | `unsloth/Mistral-Nemo-Instruct-2407` |
| `llama3.1:latest` | `unsloth/llama-3.1-8b-Instruct` | `unsloth/Llama-3.1-8B-Instruct-GGUF` |
| `llama3:latest` | `unsloth/llama-3-8b-Instruct` | `unsloth/Llama-3.1-8B-Instruct-GGUF` |

## 🆕 Novos Modelos Suportados

### 1. **Gemma 3 1B Instruct GGUF**
- **Modelo**: `unsloth/gemma-3-1b-it-GGUF`
- **Tamanho**: 1B parâmetros
- **Vantagens**: Mais leve, inferência rápida, otimizado pelo Unsloth
- **Uso**: Ideal para fine-tuning eficiente com recursos limitados

### 2. **Qwen3 8B GGUF**
- **Modelo**: `unsloth/Qwen3-8B-GGUF`
- **Tamanho**: 8B parâmetros
- **Vantagens**: Multilingual, raciocínio forte, formato GGUF
- **Uso**: Excelente para tarefas complexas e multilíngues

### 3. **Mistral Nemo Instruct 2407**
- **Modelo**: `unsloth/Mistral-Nemo-Instruct-2407`
- **Tamanho**: 7B parâmetros
- **Vantagens**: Otimizado para instruction following e coding
- **Uso**: Ideal para tarefas de programação e seguimento de instruções

### 4. **Mistral 7B v0.3**
- **Modelo**: `unsloth/mistral-7b-v0.3`
- **Tamanho**: 7B parâmetros
- **Vantagens**: Versão atualizada do Mistral base
- **Uso**: Propósito geral, eficiente

### 5. **Llama 3.1 8B Instruct GGUF**
- **Modelo**: `unsloth/Llama-3.1-8B-Instruct-GGUF`
- **Tamanho**: 8B parâmetros
- **Vantagens**: Última versão do Llama com formato GGUF
- **Uso**: Propósito geral, performance forte

## 🎯 Benefícios da Atualização

### 1. **Performance Otimizada**
- Modelos especificamente otimizados pelo Unsloth para fine-tuning
- Melhor eficiência de memória durante o treinamento
- Tempos de treinamento mais rápidos

### 2. **Formato GGUF**
- Suporte nativo ao formato GGUF para inferência
- Compatibilidade direta com Ollama
- Melhor compressão e performance

### 3. **Modelos Mais Recentes**
- Versões mais atualizadas dos modelos base
- Melhorias de performance e capacidades
- Correções de bugs e otimizações

### 4. **Fallback Inteligente**
- Sistema de fallback atualizado para usar modelos Unsloth
- Detecção automática de famílias de modelos
- Compatibilidade com modelos personalizados

## 🔧 Arquivos Modificados

### 1. **ollama_lora_training.py**
- Atualizado `get_huggingface_model_name()` com novos mappings
- Melhorado sistema de fallback
- Adicionado suporte para Mistral Nemo

### 2. **test_model_mapping.py** *(novo)*
- Script de teste para validar mappings
- Testa todos os modelos e fallbacks
- Informações detalhadas sobre cada modelo

## 📊 Testes de Validação

### ✅ Testes Executados
- **14/14 mappings** testados com sucesso
- **Sistema completo** validado
- **Compatibilidade** com llama.cpp confirmada
- **Registry consistency** mantida

### 🧪 Cobertura de Testes
- Mappings diretos (gemma3, qwen3, mistral, llama3.1)
- Fallbacks por família (llama4 → Llama-3.1, gemma4 → Gemma-3)
- Modelos personalizados (mistral-custom, qwen-custom)
- Modelos desconhecidos (fallback para Llama-3.1)

## 🚀 Como Usar

### Para Treinar com Novos Modelos:
```bash
# Exemplo com Gemma 3
python3 ollama_lora_training.py \
  --model "gemma3:latest" \
  --data "training_data.jsonl" \
  --output "my_adapter"

# Exemplo com Qwen3
python3 ollama_lora_training.py \
  --model "qwen3:latest" \
  --data "training_data.jsonl" \
  --output "qwen_adapter"

# Exemplo com Mistral Nemo
python3 ollama_lora_training.py \
  --model "mistral-nemo:latest" \
  --data "training_data.jsonl" \
  --output "nemo_adapter"
```

### Para Testar os Mappings:
```bash
python3 test_model_mapping.py
```

### Para Testar o Sistema Completo:
```bash
python3 test_complete_system.py
```

## 📈 Compatibilidade

### ✅ Suportado
- **macOS** (Apple Silicon + Intel)
- **Linux** (Ubuntu, Debian, CentOS, Arch)
- **Windows** (com WSL recomendado)

### 🔗 Dependências
- Python 3.9-3.12
- PyTorch
- Transformers
- PEFT
- Unsloth
- Ollama

## 🔮 Próximos Passos

1. **Llama 4 Support**: Aguardando disponibilidade do Llama 4 no Unsloth
2. **Gemma 4 Support**: Monitorando lançamento do Gemma 4
3. **Qwen 4 Support**: Preparando para próxima versão do Qwen
4. **Auto-Update**: Sistema automático de detecção de novos modelos Unsloth

## 📚 Referências

- [Unsloth Documentation](https://docs.unsloth.ai/)
- [Unsloth GitHub](https://github.com/unslothai/unsloth)
- [Unsloth Model Hub](https://huggingface.co/unsloth)
- [Llama 4 Documentation](https://docs.unsloth.ai/basics/tutorial-how-to-run-and-fine-tune-llama-4)

---

**Data da Atualização**: Janeiro 2025  
**Versão**: 2.0  
**Status**: ✅ Implementado e Testado 