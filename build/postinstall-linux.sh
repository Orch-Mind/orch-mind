#!/bin/bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Post-installation script for Orch-OS on Linux
# Installs Docker, Ollama, Python, and LoRA training dependencies

# --- Funções de Logging ---
log() {
    echo "[Orch-OS Post-Install] $1"
}

# --- Detecção de Distribuição ---
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        DISTRO="rhel"
    elif [ -f /etc/debian_version ]; then
        DISTRO="debian"
    else
        DISTRO="unknown"
    fi
    
    log "Distribuição detectada: $DISTRO $VERSION"
}

# --- Instalação do Python e pip ---
install_python() {
    log "Instalando Python 3.11 e dependências..."
    
    case $DISTRO in
        ubuntu|debian|pop|elementary|mint|linuxmint|zorin)
            log "Instalando Python para distribuição baseada em Debian/Ubuntu..."
            
            # Atualiza repositórios
            sudo apt-get update
            
            # Instala Python 3.11 e ferramentas
            sudo apt-get install -y software-properties-common
            sudo add-apt-repository -y ppa:deadsnakes/ppa
            sudo apt-get update
            sudo apt-get install -y \
                python3.11 \
                python3.11-pip \
                python3.11-dev \
                python3.11-venv \
                python3-pip \
                build-essential \
                curl \
                wget \
                git
            
            # Configura alternativas
            sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
            ;;
            
        fedora|centos|rhel|rocky|almalinux)
            log "Instalando Python para distribuição baseada em RHEL/Fedora..."
            
            if command -v dnf &> /dev/null; then
                PKG_MANAGER="dnf"
            else
                PKG_MANAGER="yum"
            fi
            
            sudo $PKG_MANAGER update -y
            sudo $PKG_MANAGER install -y \
                python3.11 \
                python3.11-pip \
                python3.11-devel \
                python3-pip \
                gcc \
                gcc-c++ \
                make \
                curl \
                wget \
                git
            ;;
            
        arch|manjaro)
            log "Instalando Python para Arch Linux..."
            
            sudo pacman -Syu --noconfirm
            sudo pacman -S --noconfirm \
                python \
                python-pip \
                base-devel \
                curl \
                wget \
                git
            ;;
            
        opensuse|sles)
            log "Instalando Python para openSUSE..."
            
            sudo zypper refresh
            sudo zypper install -y \
                python311 \
                python311-pip \
                python311-devel \
                python3-pip \
                gcc \
                gcc-c++ \
                make \
                curl \
                wget \
                git
            ;;
            
        *)
            log "Distribuição não suportada diretamente. Tentando instalação genérica..."
            # Tenta usar pip para instalar dependências mesmo sem Python 3.11
            ;;
    esac
    
    # Verifica se Python está disponível
    for py_cmd in python3.11 python3.10 python3.9 python3; do
        if command -v $py_cmd &> /dev/null; then
            log "Python encontrado: $py_cmd ($($py_cmd --version))"
            PYTHON_CMD=$py_cmd
            break
        fi
    done
    
    if [ -z "$PYTHON_CMD" ]; then
        log "Erro: Python compatível não encontrado após instalação."
        return 1
    fi
}

# --- Instalação das Dependências Python para LoRA Training ---
install_python_dependencies() {
    log "Instalando dependências Python para treinamento LoRA..."
    
    if [ -z "$PYTHON_CMD" ]; then
        log "Erro: Python não está disponível."
        return 1
    fi
    
    log "Usando Python: $PYTHON_CMD"
    
    # Verifica se CUDA está disponível
    log "Verificando suporte CUDA..."
    if command -v nvidia-smi &> /dev/null; then
        log "NVIDIA GPU detectada - instalando pacotes CUDA"
        CUDA_AVAILABLE=true
    else
        log "NVIDIA GPU não detectada - instalando pacotes CPU-only"
        CUDA_AVAILABLE=false
    fi
    
    # Instala dependências essenciais
    log "Instalando dependências Python essenciais..."
    
    # Atualiza pip primeiro
    $PYTHON_CMD -m pip install --upgrade pip --user
    
    # Pacotes básicos para todos os casos
    BASIC_PACKAGES=(
        "torch"
        "transformers>=4.36.0" 
        "datasets"
        "accelerate"
        "peft>=0.7.0"
        "trl"
    )
    
    # Adiciona bitsandbytes se CUDA estiver disponível
    if [ "$CUDA_AVAILABLE" = true ]; then
        BASIC_PACKAGES+=("bitsandbytes")
    fi
    
    for package in "${BASIC_PACKAGES[@]}"; do
        log "Instalando $package..."
        $PYTHON_CMD -m pip install "$package" --user --upgrade --quiet
        if [ $? -ne 0 ]; then
            log "Aviso: Falha ao instalar $package"
        fi
    done
    
    # Testa a instalação
    log "Testando instalação das dependências..."
    $PYTHON_CMD -c "import torch; import transformers; import datasets; import peft; print('✅ Dependências Python instaladas com sucesso!')" 2>/dev/null
    if [ $? -eq 0 ]; then
        log "✅ Todas as dependências Python foram instaladas com sucesso!"
    else
        log "⚠️ Algumas dependências podem não ter sido instaladas corretamente."
    fi
}

# --- Instalação do Docker ---
install_docker() {
    log "Iniciando a instalação do Docker..."
    
    case $DISTRO in
        ubuntu|debian|pop|elementary|mint|linuxmint|zorin)
            log "Instalando Docker para distribuição baseada em Debian/Ubuntu..."
            
            # Remova versões antigas
            log "Removendo versões antigas do Docker (se existirem)..."
            sudo apt-get remove -y docker docker-engine docker.io containerd runc || true
            
            # Instala dependências
            log "Instalando dependências..."
            sudo apt-get update
            sudo apt-get install -y \
                ca-certificates \
                curl \
                gnupg \
                lsb-release
            
            # Adiciona chaves GPG oficiais do Docker
            log "Adicionando chaves GPG do Docker..."
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$DISTRO/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            
            # Configura repositório Docker
            log "Configurando repositório do Docker..."
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO \
            $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Instala Docker Engine
            log "Instalando Docker Engine..."
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
            # Configura o usuário atual para usar Docker sem sudo
            log "Configurando permissões para Docker..."
            sudo usermod -aG docker $USER
            ;;
            
        fedora|centos|rhel|rocky|almalinux)
            log "Instalando Docker para distribuição baseada em RHEL/Fedora..."
            
            if command -v dnf &> /dev/null; then
                PKG_MANAGER="dnf"
            else
                PKG_MANAGER="yum"
            fi
            
            # Remove versões antigas
            sudo $PKG_MANAGER remove -y docker docker-client docker-client-latest docker-common \
                docker-latest docker-latest-logrotate docker-logrotate docker-engine
                
            # Instala dependências
            sudo $PKG_MANAGER install -y yum-utils
            
            # Adiciona repositório Docker
            sudo yum-config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            
            # Instala Docker
            sudo $PKG_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
            # Configura o usuário atual
            sudo usermod -aG docker $USER
            ;;
            
        arch|manjaro)
            log "Instalando Docker para Arch Linux..."
            
            sudo pacman -S --noconfirm docker docker-compose
            sudo usermod -aG docker $USER
            ;;
            
        opensuse|sles)
            log "Instalando Docker para openSUSE..."
            
            sudo zypper install -y docker docker-compose
            sudo usermod -aG docker $USER
            ;;
            
        *)
            log "Erro: Distribuição não suportada para instalação automática do Docker."
            log "Por favor, instale o Docker manualmente: https://docs.docker.com/engine/install/"
            return 1
            ;;
    esac
    
    # Inicia e habilita o serviço Docker
    log "Iniciando o serviço Docker..."
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Testa a instalação
    if docker --version &> /dev/null; then
        log "✅ Docker instalado com sucesso!"
        docker --version
    else
        log "⚠️ Docker pode não ter sido instalado corretamente."
    fi
}

# --- Instalação do Ollama ---
install_ollama() {
    log "Iniciando a instalação do Ollama..."
    
    # Baixa e executa o script oficial de instalação
    log "Baixando script de instalação oficial do Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    
    if [ $? -eq 0 ]; then
        log "✅ Ollama instalado com sucesso!"
        
        # Inicia o serviço Ollama se systemd estiver disponível
        if command -v systemctl &> /dev/null; then
            log "Iniciando serviço Ollama..."
            sudo systemctl start ollama
            sudo systemctl enable ollama
        fi
        
        # Testa a instalação
        if command -v ollama &> /dev/null; then
            ollama --version
        fi
    else
        log "Erro: Falha na instalação do Ollama."
        return 1
    fi
}

# --- Execução Principal ---
log "=== Iniciando pós-instalação do Orch-OS para Linux ==="

# Detecta a distribuição Linux
detect_distro

# Instala componentes na ordem correta
log "1/4 Instalando Python..."
install_python

log "2/4 Instalando dependências Python para LoRA..."
install_python_dependencies

log "3/4 Instalando Docker..."
install_docker

log "4/4 Instalando Ollama..."
install_ollama

log ""
log "✅ Instalação concluída com sucesso!"
log "🎉 Orch-OS está pronto para uso, incluindo treinamento LoRA!"
log ""
log "📋 Próximos passos:"
log "1. Faça logout e login novamente para aplicar as permissões do Docker"
log "2. Execute 'docker run hello-world' para testar o Docker"
log "3. Execute 'ollama --version' para verificar o Ollama"
log "4. Execute o Orch-OS"
log ""
log "⚠️ IMPORTANTE: Você precisa fazer logout/login para que as alterações de grupo do Docker tenham efeito!"

exit 0