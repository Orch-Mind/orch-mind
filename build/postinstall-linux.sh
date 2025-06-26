#!/bin/bash

# --- Funções de Logging ---
log() {
    echo "[Orch-OS Linux Post-Install] $1"
}

# --- Detectar distribuição Linux ---
detect_distribution() {
    log "Detectando distribuição Linux..."
    
    # Checando arquivo os-release (padrão moderno)
    if [ -f /etc/os-release ]; then
        # Pegando ID da distribuição
        . /etc/os-release
        DISTRO=$ID
        log "Distribuição detectada: $DISTRO"
        return 0
    fi
    
    # Métodos alternativos de detecção
    if [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        DISTRO=$DISTRIB_ID
        DISTRO=${DISTRO,,} # Converte para minúsculo
        log "Distribuição detectada via lsb-release: $DISTRO"
        return 0
    fi
    
    # Verificação por arquivos específicos
    if [ -f /etc/debian_version ]; then
        DISTRO="debian"
        log "Distribuição detectada via debian_version: $DISTRO"
        return 0
    elif [ -f /etc/fedora-release ]; then
        DISTRO="fedora"
        log "Distribuição detectada via fedora-release: $DISTRO"
        return 0
    elif [ -f /etc/redhat-release ]; then
        DISTRO="rhel"
        log "Distribuição detectada via redhat-release: $DISTRO"
        return 0
    elif [ -f /etc/arch-release ]; then
        DISTRO="arch"
        log "Distribuição detectada via arch-release: $DISTRO"
        return 0
    else
        DISTRO="unknown"
        log "Não foi possível detectar a distribuição"
        return 1
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
            
        fedora)
            log "Instalando Docker para Fedora..."
            
            # Instala utilitários necessários
            sudo dnf -y install dnf-plugins-core
            
            # Adiciona repositório Docker
            sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            
            # Instala Docker
            sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
            # Inicia Docker
            sudo systemctl start docker
            sudo systemctl enable docker
            
            # Configura o usuário atual para usar Docker sem sudo
            sudo usermod -aG docker $USER
            ;;
            
        rhel|centos|alma|rocky)
            log "Instalando Docker para RHEL/CentOS..."
            
            # Instala utilitários necessários
            sudo yum install -y yum-utils
            
            # Configura repositório Docker
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            
            # Instala Docker
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
            # Inicia e habilita Docker
            sudo systemctl start docker
            sudo systemctl enable docker
            
            # Configura o usuário atual para usar Docker sem sudo
            sudo usermod -aG docker $USER
            ;;
            
        arch|manjaro|endeavouros)
            log "Instalando Docker para Arch Linux..."
            
            # Instala Docker do repositório oficial
            sudo pacman -S --noconfirm docker
            
            # Inicia e habilita Docker
            sudo systemctl start docker.service
            sudo systemctl enable docker.service
            
            # Configura o usuário atual para usar Docker sem sudo
            sudo usermod -aG docker $USER
            ;;
            
        opensuse*|suse)
            log "Instalando Docker para openSUSE..."
            
            # Instala Docker
            sudo zypper in -y docker
            
            # Inicia e habilita Docker
            sudo systemctl start docker
            sudo systemctl enable docker
            
            # Configura o usuário atual para usar Docker sem sudo
            sudo usermod -aG docker $USER
            ;;
            
        *)
            log "Distribuição não suportada para instalação automatizada do Docker."
            log "Por favor, instale o Docker manualmente seguindo as instruções em: https://docs.docker.com/engine/install/"
            return 1
            ;;
    esac
    
    log "Docker instalado com sucesso!"
    return 0
}

# --- Instalação do Ollama ---
install_ollama() {
    log "Iniciando a instalação do Ollama..."
    
    # O Ollama oferece um script de instalação universal para Linux
    curl -fsSL https://ollama.com/install.sh | sh
    
    if [ $? -ne 0 ]; then
        log "Falha na instalação do Ollama usando o script oficial."
        log "Tentando método alternativo..."
        
        # Baixar o binário direto
        TEMP_DIR=$(mktemp -d)
        cd $TEMP_DIR
        
        curl -L https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64 -o ollama
        chmod +x ollama
        
        # Move para o local correto
        sudo mv ollama /usr/local/bin/
        
        # Limpeza
        cd -
        rm -rf $TEMP_DIR
        
        if [ -f /usr/local/bin/ollama ]; then
            log "Ollama instalado manualmente em /usr/local/bin/"
        else
            log "Falha na instalação manual do Ollama."
            return 1
        fi
    else
        log "Ollama instalado com sucesso!"
    fi
    
    return 0
}

# --- Execução Principal ---
log "Executando script de pós-instalação Linux..."

# Detecta a distribuição
detect_distribution

# Instala Docker e Ollama
install_docker
install_ollama

log "Script de pós-instalação concluído."

exit 0