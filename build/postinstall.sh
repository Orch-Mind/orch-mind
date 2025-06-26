#!/bin/bash

# --- Funções de Logging ---
log() {
    echo "[Orch-OS Post-Install] $1"
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
log "Executando script de pós-instalação..."

install_docker
install_ollama

log "Script de pós-instalação concluído."

exit 0
