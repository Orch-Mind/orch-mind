# 🐳 Orch-OS P2P Docker Testing Environment

Este diretório contém um ambiente Docker completo para testar o sistema P2P de compartilhamento de adapters do Orch-OS. O peer simulado permite validar download de adapters, detecção de peers, e funcionalidade de merge sem precisar configurar múltiplas instâncias manualmente.

## 🎯 Funcionalidades

### ✅ **Peer Simulator Completo**
- **Hyperswarm P2P**: Usa a mesma biblioteca do Orch-OS principal
- **Adapters Realistas**: 2 adapters mock com arquivos safetensors reais
- **API REST**: Endpoints para monitoramento e controle
- **Health Checks**: Monitoramento automático de saúde
- **Logs Detalhados**: Debug completo das operações P2P

### ✅ **Adapters Mock Inclusos**
1. **gemma3-test-adapter** (64MB)
   - Base model: `gemma3:latest`
   - LoRA rank: 32, alpha: 64
   - Treinamento: 850 steps, dataset 42 exemplos
   
2. **llama3-coding-adapter** (32MB)
   - Base model: `llama3.1:latest`
   - LoRA rank: 16, alpha: 32
   - Especializado em coding tasks

### ✅ **Rede Docker Otimizada**
- **Bridge Network**: Comunicação isolada entre containers
- **Port Mapping**: Acesso HTTP na porta 3001
- **Volume Persistence**: Dados persistem entre restarts
- **Health Monitoring**: Verificação automática de status

## 🚀 Quick Start

### 1. **Iniciar Peer Simulado**
```bash
# Executar script automatizado
./docker/scripts/start-peer.sh

# Ou manualmente
cd docker
docker-compose up -d peer-simulator
```

### 2. **Verificar Status**
```bash
# Health check
curl http://localhost:3001/health

# Lista de adapters
curl http://localhost:3001/api/adapters | jq .

# Status do container
docker-compose ps
```

### 3. **Testar P2P no Orch-OS**
1. Abra o Orch-OS
2. Clique no ícone WiFi → Share settings
3. Conecte na sala "Community"
4. Verifique se os adapters aparecem na lista "Available"
5. Teste download de um adapter
6. Teste merge com adapters locais

## 🧪 Testes Automatizados

### **Suite de Testes Completa**
```bash
./docker/scripts/test-p2p.sh
```

**Testes Inclusos:**
- ✅ Health check do peer
- ✅ Lista de adapters disponíveis
- ✅ Configuração de rede
- ✅ Funcionalidade de salas P2P
- ✅ Logs do container
- ✅ Sistema de arquivos

### **Testes Manuais Recomendados**

#### **1. Detecção de Peers**
- [ ] Peer aparece na sala Community
- [ ] Adapters são listados corretamente
- [ ] Metadados estão completos

#### **2. Download de Adapters**
- [ ] Download inicia corretamente
- [ ] Progresso é mostrado
- [ ] Checksum é validado
- [ ] Adapter aparece na lista local

#### **3. Merge de Adapters**
- [ ] Toggle de merge funciona
- [ ] Seleção múltipla funciona
- [ ] Estratégias de merge executam
- [ ] Adapter merged é criado

## 📁 Estrutura do Projeto

```
docker/
├── peer-simulator/              # Container do peer simulado
│   ├── Dockerfile              # Imagem Node.js com Hyperswarm
│   ├── package.json            # Dependências P2P
│   ├── src/
│   │   └── index.js           # Script principal do peer
│   └── adapters/              # Adapters mock para compartilhamento
│       ├── gemma3-test-adapter/
│       │   ├── adapter_config.json
│       │   └── adapter_model.safetensors (64MB)
│       └── llama3-coding-adapter/
│           ├── adapter_config.json
│           └── adapter_model.safetensors (32MB)
├── docker-compose.yml          # Orquestração dos containers
├── scripts/
│   ├── start-peer.sh          # Script de inicialização
│   └── test-p2p.sh           # Suite de testes
└── README.md                  # Esta documentação
```

## 🔧 API Endpoints

### **Health Check**
```bash
GET http://localhost:3001/health
```
**Resposta:**
```json
{
  "status": "healthy",
  "peerId": "docker-peer-simulator",
  "connections": 0,
  "adapters": 2,
  "activeRooms": ["orch-os-general-public-community-room-v1"],
  "uptime": 123.45
}
```

### **Lista de Adapters**
```bash
GET http://localhost:3001/api/adapters
```
**Resposta:**
```json
[
  {
    "name": "gemma3-test-adapter",
    "size": 67108864,
    "checksum": "a1b2c3d4...",
    "topic": "abc123...",
    "metadata": {
      "base_model": "gemma3:latest",
      "lora_rank": 32,
      "training_steps": 850
    }
  }
]
```

### **Entrar em Sala**
```bash
POST http://localhost:3001/api/join-room/ROOM_CODE
```

## 🐛 Debugging

### **Logs em Tempo Real**
```bash
docker logs -f orch-os-peer-simulator
```

### **Inspecionar Container**
```bash
# Status detalhado
docker inspect orch-os-peer-simulator

# Executar comandos no container
docker exec -it orch-os-peer-simulator /bin/sh

# Verificar arquivos de adapters
docker exec orch-os-peer-simulator ls -la /app/adapters/
```

### **Problemas Comuns**

#### **Container não inicia**
```bash
# Verificar logs
docker-compose logs peer-simulator

# Rebuild da imagem
docker-compose build --no-cache peer-simulator
```

#### **Adapters não aparecem no Orch-OS**
1. Verificar se o peer está na mesma sala
2. Confirmar que o Orch-OS está conectado
3. Verificar logs do peer simulado
4. Testar API `/api/adapters` diretamente

#### **Download falha**
1. Verificar checksums dos arquivos
2. Confirmar conectividade de rede
3. Verificar logs de ambos os lados
4. Testar com adapter menor primeiro

## 🌐 Configuração de Rede

### **Rede Bridge Padrão**
- **Nome**: `orch-p2p-network`
- **Subnet**: `172.20.0.0/16`
- **Gateway**: `172.20.0.1`

### **Portas Expostas**
- **3001**: HTTP API do peer
- **49737**: P2P Hyperswarm (padrão)

### **Para Rede Macvlan (Avançado)**
```yaml
# Adicionar ao docker-compose.yml
networks:
  macvlan_network:
    driver: macvlan
    driver_opts:
      parent: eth0
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
```

## 🔄 Comandos Úteis

### **Gerenciamento de Containers**
```bash
# Iniciar
docker-compose up -d peer-simulator

# Parar
docker-compose down

# Restart
docker-compose restart peer-simulator

# Rebuild
docker-compose build --no-cache peer-simulator

# Logs
docker-compose logs -f peer-simulator
```

### **Limpeza**
```bash
# Remover containers e volumes
docker-compose down --volumes --remove-orphans

# Limpar imagens não utilizadas
docker image prune -f

# Reset completo
docker system prune -a --volumes
```

## 🎯 Próximos Passos

### **Melhorias Planejadas**
- [ ] **Multi-peer**: Suporte para múltiplos peers simultâneos
- [ ] **Adapter Generator**: Script para criar adapters mock customizados
- [ ] **Performance Tests**: Benchmarks de transferência
- [ ] **Network Simulation**: Simulação de latência e perda de pacotes
- [ ] **Monitoring Dashboard**: Interface web para monitoramento

### **Integração CI/CD**
- [ ] **GitHub Actions**: Testes automatizados em PRs
- [ ] **Docker Hub**: Publicação de imagens
- [ ] **Performance Regression**: Detecção de degradação

## 📞 Suporte

### **Logs de Debug**
```bash
# Ativar debug completo
export DEBUG=orch-os:*
docker-compose restart peer-simulator
```

### **Verificação de Saúde**
```bash
# Script de diagnóstico
./docker/scripts/test-p2p.sh
```

### **Contato**
- **Issues**: GitHub Issues do projeto
- **Documentação**: `/docs` no repositório principal
- **Logs**: Sempre incluir logs completos em reports

---

**🎉 Ambiente Docker P2P pronto para testes robustos do sistema de compartilhamento de adapters!** 