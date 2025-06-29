#!/bin/bash

# --- Funções de Logging ---
log() {
    echo "[Orch-OS Post-Install] $1"
}

# --- Instalação do Python (Homebrew) ---
install_python() {
    log "Verificando instalação do Python..."
    
    # Verifica se Python 3.11 está disponível
    if command -v python3.11 &> /dev/null; then
        log "Python 3.11 já está instalado."
        return 0
    fi
    
    # Verifica se Homebrew está instalado
    if ! command -v brew &> /dev/null; then
        log "Homebrew não encontrado. Instalando Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Adiciona Homebrew ao PATH
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    log "Instalando Python 3.11 via Homebrew..."
    brew install python@3.11
    
    # Verifica se a instalação foi bem-sucedida
    if command -v python3.11 &> /dev/null; then
        log "Python 3.11 instalado com sucesso."
        python3.11 --version
    else
        log "Erro: Falha na instalação do Python 3.11."
        return 1
    fi
}

# --- Instalação das Dependências Python para LoRA Training ---
install_python_dependencies() {
    log "Instalando dependências Python para treinamento LoRA..."
    
    # Encontra Python compatível
    PYTHON_CMD=""
    for py_cmd in python3.11 python3.10 python3.9 python3; do
        if command -v $py_cmd &> /dev/null; then
            PYTHON_CMD=$py_cmd
            break
        fi
    done
    
    if [ -z "$PYTHON_CMD" ]; then
        log "Erro: Python compatível não encontrado."
        return 1
    fi
    
    log "Usando Python: $PYTHON_CMD"
    
    # Verifica se CUDA está disponível (opcional no macOS)
    log "Verificando suporte CUDA..."
    if command -v nvidia-smi &> /dev/null; then
        log "CUDA detectado - instalando pacotes completos"
        CUDA_AVAILABLE=true
    else
        log "CUDA não detectado - instalando pacotes CPU-only"
        CUDA_AVAILABLE=false
    fi
    
    # Instala dependências essenciais
    log "Instalando dependências essenciais..."
    
    # Atualiza pip primeiro
    $PYTHON_CMD -m pip install --upgrade pip --user --break-system-packages
    
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
        $PYTHON_CMD -m pip install "$package" --user --break-system-packages --upgrade --quiet
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
    log "Iniciando a instalação do Docker Desktop..."
    DOCKER_DMG_URL="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
    TEMP_DMG_PATH="/tmp/Docker.dmg"

    log "Baixando o Docker de $DOCKER_DMG_URL..."
    curl -L -o "$TEMP_DMG_PATH" "$DOCKER_DMG_URL"
    if [ $? -ne 0 ]; then
        log "Erro: Falha no download do Docker."
        return 1
    fi

    log "Montando a imagem do Docker..."
    hdiutil attach "$TEMP_DMG_PATH" -nobrowse -quiet
    if [ $? -ne 0 ]; then
        log "Erro: Falha ao montar o DMG do Docker."
        rm "$TEMP_DMG_PATH"
        return 1
    fi

    log "Copiando o Docker para a pasta de Aplicativos..."
    cp -R "/Volumes/Docker/Docker.app" "/Applications/"
    if [ $? -ne 0 ]; then
        log "Erro: Falha ao copiar o Docker.app."
    else
        log "Docker instalado com sucesso."
    fi

    log "Desmontando a imagem do Docker..."
    hdiutil detach "/Volumes/Docker" -quiet

    log "Limpando o arquivo DMG..."
    rm "$TEMP_DMG_PATH"
}

# --- Instalação do Ollama ---
install_ollama() {
    log "Iniciando a instalação do Ollama..."
    # O Ollama para macOS é um app que, ao ser executado, instala a CLI.
    OLLAMA_ZIP_URL="https://ollama.com/download/Ollama-darwin.zip"
    TEMP_ZIP_PATH="/tmp/Ollama.zip"
    TEMP_UNZIP_PATH="/tmp/OllamaApp"

    log "Baixando o Ollama de $OLLAMA_ZIP_URL..."
    curl -L -o "$TEMP_ZIP_PATH" "$OLLAMA_ZIP_URL"
    if [ $? -ne 0 ]; then
        log "Erro: Falha no download do Ollama."
        return 1
    fi

    log "Extraindo o Ollama..."
    unzip -o "$TEMP_ZIP_PATH" -d "$TEMP_UNZIP_PATH"

    log "Copiando o Ollama para a pasta de Aplicativos..."
    cp -R "$TEMP_UNZIP_PATH/Ollama.app" "/Applications/"
    if [ $? -ne 0 ]; then
        log "Erro: Falha ao copiar o Ollama.app."
    else
        log "Ollama.app copiado com sucesso. A CLI será instalada na primeira execução."
    fi

    log "Limpando arquivos temporários..."
    rm -rf "$TEMP_ZIP_PATH" "$TEMP_UNZIP_PATH"
}

# --- Execução Principal ---
log "Executando script de pós-instalação do Orch-OS..."

# Instala componentes na ordem correta
install_python
install_python_dependencies
install_docker
install_ollama

log "✅ Script de pós-instalação concluído com sucesso!"
log "🎉 Orch-OS está pronto para uso, incluindo treinamento LoRA!"
log ""
log "📋 Próximos passos:"
log "1. Abra o Docker Desktop e aceite os termos"
log "2. Abra o Ollama para instalar a CLI"
log "3. Execute o Orch-OS"

exit 0
