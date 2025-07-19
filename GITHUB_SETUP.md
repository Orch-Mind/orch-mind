# 🔐 GitHub Secrets Setup para Orch-OS

Este guia mostra como configurar os secrets necessários para o deploy automático funcionar.

## 📋 Pré-requisitos

- Acesso de administrador ao repositório `guiferrarib/orch-mind`
- Conta GitHub com permissões adequadas

## 🔑 Passo 1: Criar Personal Access Token

### 1.1 Acessar GitHub Settings
1. Vá para [GitHub.com](https://github.com)
2. Clique no seu avatar (canto superior direito)
3. Settings → Developer settings → Personal access tokens → **Tokens (classic)**

### 1.2 Gerar Novo Token
1. Clique em **"Generate new token (classic)"**
2. **Note**: `Orch-Mind Release Token`
3. **Expiration**: `No expiration` (ou 1 ano)
4. **Scopes** - Marque as seguintes permissões:

```
✅ repo (Full control of private repositories)
  ✅ repo:status
  ✅ repo_deployment  
  ✅ public_repo
  ✅ repo:invite
  ✅ security_events

✅ write:packages (Upload packages to GitHub Package Registry)
  ✅ read:packages

✅ read:org (Read org and team membership, read org projects)
```

5. Clique em **"Generate token"**
6. **⚠️ IMPORTANTE**: Copie o token imediatamente (você não verá ele novamente!)

## 🏗️ Passo 2: Configurar Secret no Repositório

### 2.1 Acessar Repository Settings
1. Vá para: `https://github.com/guiferrarib/orch-mind`
2. Clique na aba **Settings**
3. No menu lateral: **Secrets and variables** → **Actions**

### 2.2 Adicionar Secret
1. Clique em **"New repository secret"**
2. **Name**: `GH_TOKEN`
3. **Secret**: Cole o token que você copiou
4. Clique em **"Add secret"**

## ✅ Passo 3: Verificar Configuração

### 3.1 Testar o Setup
Execute localmente para verificar se tudo está funcionando:

```bash
# Teste o script de publish
npm run publish:patch
```

### 3.2 Verificar Workflow
1. Vá para: `https://github.com/guiferrarib/orch-mind/actions`
2. Você deve ver o workflow **"Release"** disponível
3. Pode testar clicando em **"Run workflow"**

## 🚀 Passo 4: Primeiro Deploy

### 4.1 Deploy via Script Local
```bash
# Cria versão 0.0.3 e publica
npm run publish:patch
```

### 4.2 Deploy via GitHub Actions
1. Vá para Actions → Release workflow
2. Clique **"Run workflow"**
3. Digite a versão: `v0.0.3`
4. Clique **"Run workflow"**

## 🔍 Verificação Final

Após o deploy, verifique:

1. **GitHub Releases**: `https://github.com/guiferrarib/orch-mind/releases`
   - Nova release deve aparecer
   - Arquivos `.pkg`, `.exe`, `.AppImage` devem estar anexados
   - Arquivos `latest*.yml` devem estar presentes

2. **Auto-Update Files**:
   - `latest.yml` (Windows/Linux)
   - `latest-mac.yml` (macOS)
   - `latest-linux.yml` (Linux específico)

3. **Logs do Workflow**:
   - Sem erros de autenticação
   - Upload bem-sucedido dos arquivos

## 🚨 Troubleshooting

### Erro: "Bad credentials"
- Verifique se o token foi copiado corretamente
- Confirme se o secret `GH_TOKEN` foi criado no repositório
- Verifique se o token tem as permissões corretas

### Erro: "Resource not accessible by integration"
- Token precisa da permissão `repo` completa
- Para repositórios privados, precisa de `repo` full access

### Erro: "API rate limit exceeded"
- Token pessoal tem limite maior que o GITHUB_TOKEN padrão
- Aguarde alguns minutos e tente novamente

## 📊 Monitoramento

### Logs de Deploy
- **GitHub Actions**: Logs detalhados de cada step
- **Local**: Output colorido do script `publish.js`

### Release Analytics
- **Downloads**: GitHub mostra estatísticas de download
- **Auto-updates**: Logs no electron-log dos usuários

## 🔄 Manutenção

### Renovar Token
- Tokens têm data de expiração
- Configure lembretes para renovar antes do vencimento
- Atualize o secret `GH_TOKEN` com o novo token

### Backup do Token
- **⚠️ NUNCA** commite o token no código
- Mantenha uma cópia segura (gerenciador de senhas)
- Documente onde está armazenado para a equipe

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do GitHub Actions
2. Consulte o `DEPLOYMENT.md` para troubleshooting
3. Verifique se todas as dependências estão instaladas
4. Confirme se o repositório tem as permissões corretas

**Status**: ✅ Configuração completa para deploy automático com electron-updater
