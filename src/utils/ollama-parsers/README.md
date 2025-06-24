# OllamaToolCallParser - Arquitetura Modular

## Visão Geral

Esta é uma implementação refatorada do `OllamaToolCallParser` seguindo os princípios SOLID, DRY e KISS. A arquitetura foi modularizada para facilitar manutenção, extensibilidade e testabilidade.

## Princípios Aplicados

### SOLID

- **Single Responsibility Principle (SRP)**: Cada parser é responsável por apenas um formato específico
- **Open/Closed Principle (OCP)**: Facilmente extensível para novos formatos sem modificar código existente
- **Liskov Substitution Principle (LSP)**: Todos os parsers implementam a mesma interface `IToolCallParser`
- **Interface Segregation Principle (ISP)**: Interface específica e mínima para parsers
- **Dependency Inversion Principle (DIP)**: O parser principal depende de abstrações (interfaces), não de implementações

### DRY (Don't Repeat Yourself)

- Lógica comum extraída para `ParserUtils`
- Parsing de argumentos centralizado em `ArgumentParser`
- Reutilização de código entre parsers

### KISS (Keep It Simple, Stupid)

- Cada parser tem uma implementação simples e focada
- Interface clara e intuitiva
- Separação de complexidade em módulos menores

## Estrutura de Arquivos

```
ollama-parsers/
├── interfaces/
│   └── IToolCallParser.ts      # Interface base para todos os parsers
├── utils/
│   └── ParserUtils.ts          # Utilitários comuns (DRY)
├── parsers/
│   ├── JSONArrayParser.ts      # Parser para formato JSON array
│   ├── DirectCallParser.ts     # Parser para chamadas diretas
│   ├── ToolCallsFormatParser.ts # Parser para formato [TOOL_CALLS]
│   ├── MarkdownJSONParser.ts   # Parser para blocos markdown
│   ├── XMLParser.ts            # Parser para formato XML
│   └── helpers/
│       └── ArgumentParser.ts   # Parser auxiliar para argumentos
├── OllamaToolCallParser.ts     # Parser principal (composição)
└── README.md                   # Esta documentação
```

## Como Adicionar um Novo Parser

1. Crie uma classe que implemente `IToolCallParser`:

```typescript
export class MyNewParser implements IToolCallParser {
  readonly formatName = "My Format";
  
  canParse(content: string): boolean {
    // Lógica para detectar se o conteúdo pode ser parseado
    return content.includes("meu_formato");
  }
  
  parse(content: string): ToolCall[] {
    // Lógica de parsing
    return [];
  }
}
```

2. Adicione o parser na lista em `OllamaToolCallParser.ts`:

```typescript
constructor() {
  this.parsers = [
    new MarkdownJSONParser(),
    new JSONArrayParser(),
    new MyNewParser(), // Adicione aqui
    // ...
  ];
}
```

## Parsers Disponíveis

### JSONArrayParser
- Formatos: `[{"name":"func", "arguments":{}}]` ou `{"name":"func", "parameters":{}}`
- Usado por: mistral:latest, llama3.1:latest

### DirectCallParser
- Formato: `functionName(arg1:value1, arg2:value2)`
- Usado por: gemma3:latest

### ToolCallsFormatParser
- Formato: `[TOOL_CALLS][...]`
- Usado por: mistral-nemo:latest

### MarkdownJSONParser
- Formatos: ` ```tool {...}``` ` ou ` ```json {...}``` `
- Usado por: gemma3:latest (blocos tool)

### XMLParser
- Formato: `<tool_call><function>name</function><parameters>{}</parameters></tool_call>`
- Usado por: alguns modelos experimentais

## Exemplo de Uso

```typescript
import { OllamaToolCallParser } from './OllamaToolCallParser';

const parser = new OllamaToolCallParser();
const content = 'activateBrainArea(core:"planning", intensity:0.8)';
const toolCalls = parser.parse(content);

console.log(toolCalls);
// Output: [{ type: "function", function: { name: "activateBrainArea", arguments: {...} } }]
```

## Testes

Os testes estão localizados em `src/tests/ollama-parser-refactor.test.ts` e cobrem todos os formatos suportados.

Para executar os testes:

```bash
npm test -- src/tests/ollama-parser-refactor.test.ts
```

## Benefícios da Refatoração

1. **Manutenibilidade**: Código organizado e fácil de entender
2. **Extensibilidade**: Adicionar novos parsers sem modificar código existente
3. **Testabilidade**: Cada parser pode ser testado isoladamente
4. **Reutilização**: Código comum centralizado em utilitários
5. **Performance**: Parsers são executados em ordem de prioridade
6. **Debugging**: Logs específicos por formato facilitam troubleshooting 