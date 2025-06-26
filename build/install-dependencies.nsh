!macro customInstall
  # Instalação de dependências apenas na primeira instalação, não em atualizações
  ${ifNot} ${isUpdated}
    # Configura o diretório de plugins para usar o INetC para downloads
    SetOutPath $PLUGINSDIR

    # --- Instalação do Docker ---
    DetailPrint "Baixando o instalador do Docker Desktop..."
    # URL de download do Docker Desktop para Windows
    inetc::get "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" "$PLUGINSDIR\DockerInstaller.exe" /END
    Pop $R0 # Captura o status do download

    ${if} $R0 == "OK"
      DetailPrint "Instalando o Docker Desktop silenciosamente..."
      # Executa o instalador do Docker em modo silencioso
      ExecWait '"$PLUGINSDIR\DockerInstaller.exe" install --quiet' $R1
      ${if} $R1 == 0
        DetailPrint "Docker Desktop instalado com sucesso."
      ${else}
        DetailPrint "Falha na instalação do Docker Desktop. Código de saída: $R1"
      ${endIf}
    ${else}
      DetailPrint "Falha no download do instalador do Docker."
    ${endIf}

    # --- Instalação do Ollama ---
    DetailPrint "Baixando o instalador do Ollama..."
    # URL de download do Ollama para Windows
    inetc::get "https://ollama.com/download/OllamaSetup.exe" "$PLUGINSDIR\OllamaSetup.exe" /END
    Pop $R0 # Captura o status do download

    ${if} $R0 == "OK"
      DetailPrint "Instalando o Ollama..."
      # Nota: Não há um comando de instalação silenciosa documentado para o Ollama.
      # Esta etapa pode exigir interação do usuário.
      # Tentando uma execução padrão.
      ExecWait '"$PLUGINSDIR\OllamaSetup.exe"' $R1
      ${if} $R1 == 0
        DetailPrint "Instalador do Ollama executado com sucesso."
      ${else}
        DetailPrint "Falha ao executar o instalador do Ollama. Código de saída: $R1"
      ${endIf}
    ${else}
      DetailPrint "Falha no download do instalador do Ollama."
    ${endIf}

  ${endIf}
!macroend
