# Guia de Contribuição

Ficamos felizes com o seu interesse em contribuir para o Orch-Mind! Toda contribuição é bem-vinda, seja ela um relatório de bug, uma sugestão de nova funcionalidade ou um Pull Request com código.

Este documento fornece as diretrizes para garantir que o processo de contribuição seja o mais tranquilo possível.

## 1. Como Relatar um Bug

Se você encontrou um bug, por favor, abra uma **[Issue no nosso repositório do GitHub](https://github.com/guiferrarib/orch-mind/issues/new?assignees=&labels=bug&template=bug_report.md&title=)**. Ao relatar um bug, inclua o máximo de detalhes possível:

- **Versão do Orch-Mind**: Especifique a versão que você está usando.
- **Plataforma**: Informe seu sistema operacional (ex: macOS, Windows, Linux).
- **Passos para Reproduzir**: Descreva detalhadamente como podemos reproduzir o bug.
- **Comportamento Esperado**: O que você esperava que acontecesse?
- **Comportamento Atual**: O que de fato aconteceu? Inclua screenshots ou vídeos, se possível.
- **Logs**: Se houver logs de erro no console do Electron, inclua-os no relatório.

## 2. Sugerindo Melhorias

Se você tem uma ideia para uma nova funcionalidade ou uma melhoria em uma existente, sinta-se à vontade para abrir uma **[Issue no GitHub](https://github.com/guiferrarib/orch-mind/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=)**. Descreva sua ideia em detalhes, explicando o problema que ela resolve e por que seria uma adição valiosa ao projeto.

## 3. Seu Primeiro Pull Request

Se você está pronto para contribuir com código, siga os passos abaixo:

1. **Fork o Repositório**: Faça um fork do repositório principal do Orch-Mind para a sua conta do GitHub.

2. **Clone seu Fork**: Clone o seu fork para a sua máquina local.

   ```bash
   git clone https://github.com/SEU-USUARIO/orch-mind.git
   cd orch-mind
   ```

3. **Crie uma Branch**: Crie uma nova branch para a sua contribuição. Use um nome descritivo (ex: `feature/nova-visualizacao` ou `fix/bug-login`).

   ```bash
   git checkout -b nome-da-sua-branch
   ```

4. **Faça suas Alterações**: Implemente sua funcionalidade ou correção de bug. Siga as convenções de código do projeto (usamos ESLint para garantir a consistência).

5. **Teste suas Alterações**: Certifique-se de que a aplicação ainda funciona corretamente. Execute os testes para garantir que você não quebrou nada.

   ```bash
   npm test
   ```

6. **Faça o Commit**: Faça o commit das suas alterações usando o padrão **[Conventional Commits](https://www.conventionalcommits.org/)**. Isso nos ajuda a manter um histórico claro e a automatizar o versionamento. A mensagem deve ter o formato `<tipo>(<escopo>): <descrição>`.

   - **Tipos comuns**: `feat` (nova feature), `fix` (correção de bug), `docs` (mudanças na documentação), `refactor` (refatoração de código), `test` (adição de testes).

   Exemplo:

   ```bash
   git commit -m "feat(p2p): Adiciona criptografia na transferência de arquivos"
   ```

   ```bash
   git commit -m "feat: Adiciona nova visualização de dados"
   ```

   ```bash
   git commit -m "fix: Corrige problema de renderização no Windows"
   ```

7. **Push para o seu Fork**: Envie suas alterações para o seu fork no GitHub.

   ```bash
   git push origin nome-da-sua-branch
   ```

8. **Abra um Pull Request**: Vá para o repositório principal do Orch-Mind no GitHub e abra um Pull Request da sua branch para a branch `main` do repositório principal. Descreva suas alterações em detalhes no PR.

## 4. Código de Conduta

Esperamos que todos os contribuidores sigam um código de conduta que promova um ambiente aberto, acolhedor e respeitoso. As interações devem ser profissionais e construtivas.

A equipe do projeto irá revisar seu Pull Request, fornecer feedback e, uma vez aprovado, fazer o merge para a base de código principal. Obrigado por ajudar a tornar o Orch-Mind melhor!
