# Guia de Teste - Persistência do Estado de Processamento do Chat

## Como Testar a Funcionalidade

### 1. Preparação
- Abra o console do navegador (F12)
- Certifique-se de ter pelo menos 2 conversas criadas
- Execute `window.debugProcessingStates()` para ver o estado atual

### 2. Teste Básico

1. **Inicie um processamento**:
   - Na Conversa A, envie uma mensagem para a IA
   - Você verá no console: `[CHAT] Sending message for conversation: [ID]`
   - Quando começar a processar: `[CHAT] Started processing for conversation: [ID]`

2. **Troque de conversa durante o processamento**:
   - Assim que ver "Processing..." ou os três pontos animados, mude para a Conversa B
   - Você verá no console: `[CHAT] Saved processing state for conversation: [ID]`

3. **Volte para a conversa anterior**:
   - Retorne para a Conversa A
   - Você deve ver:
     - `[CHAT] Checking saved state for conversation: [ID]`
     - `[CHAT] Restored processing state for conversation: [ID]`
     - A animação de processamento deve continuar
     - Se havia resposta parcial, ela deve aparecer

### 3. Comandos de Debug

Execute no console do navegador:

```javascript
// Ver todos os estados salvos
window.debugProcessingStates()

// Ver detalhes de uma conversa específica
// Substitua CONVERSATION_ID pelo ID real
processingStatesMap.get('CONVERSATION_ID')

// Limpar manualmente um estado (se necessário)
processingStatesMap.delete('CONVERSATION_ID')
```

### 4. O que Verificar

✅ **Funcionando corretamente se**:
- O indicador de processamento (três pontos) persiste ao voltar
- Respostas parciais da IA são mostradas durante processamento
- Logs mostram "Saved" e "Restored" adequadamente
- `window.debugProcessingStates()` mostra estados salvos

❌ **Problemas se**:
- O processamento para ao trocar de conversa
- Não há logs de "Saved processing state"
- O estado não é restaurado ao voltar
- A resposta da IA é perdida

### 5. Cenários de Teste

#### Cenário 1: Troca Rápida
1. Envie mensagem na Conversa A
2. Imediatamente (< 1 segundo) mude para Conversa B
3. Volte para Conversa A
4. O processamento deve continuar

#### Cenário 2: Múltiplas Conversas
1. Envie mensagem na Conversa A
2. Mude para B, envie mensagem
3. Mude para C, envie mensagem
4. Volte para A e B - ambas devem manter seus estados

#### Cenário 3: Resposta Parcial
1. Envie uma pergunta complexa que gere resposta longa
2. Quando a IA começar a responder (texto aparecendo), mude de conversa
3. Volte - a resposta parcial deve estar visível

### 6. Solução de Problemas

Se não estiver funcionando:

1. **Verifique os logs do console**:
   - Procure por erros JavaScript
   - Verifique se há logs `[CHAT]`

2. **Verifique o Map global**:
   ```javascript
   console.log(processingStatesMap)
   ```

3. **Force um salvamento manual** (para teste):
   ```javascript
   processingStatesMap.set('test-id', {
     isProcessing: true,
     aiResponse: 'Teste de resposta',
     startTime: Date.now()
   })
   ```

4. **Verifique se o build está atualizado**:
   - Pare o servidor (Ctrl+C)
   - Execute `npm run dev` novamente

### 7. Limitações Conhecidas

- Estados expiram após 5 minutos
- Se o navegador for recarregado, todos os estados são perdidos
- A persistência é apenas em memória (não é salva no banco de dados) 