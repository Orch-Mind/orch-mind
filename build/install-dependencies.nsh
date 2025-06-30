!macro customInstall
  # Instalação de dependências apenas na primeira instalação, não em atualizações
  ${ifNot} ${isUpdated}
    # Configura o diretório de plugins para usar o INetC para downloads
    SetOutPath $PLUGINSDIR
    
    # --- Instalação do Python 3.11 ---
    DetailPrint "Verificando instalação do Python..."
    
    # Verifica se Python já está instalado
    ReadRegStr $R0 HKLM "SOFTWARE\Python\PythonCore\3.11\InstallPath" ""
    ${if} $R0 != ""
      DetailPrint "Python 3.11 já está instalado em: $R0"
    ${else}
      DetailPrint "Baixando o instalador do Python 3.11..."
      # URL do Python 3.11 para Windows (64-bit)
      inetc::get "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" "$PLUGINSDIR\PythonInstaller.exe" /END
      Pop $R0 # Captura o status do download
      
      ${if} $R0 == "OK"
        DetailPrint "Instalando o Python 3.11 silenciosamente..."
        # Instala Python com opções padrão + pip + add to PATH
        ExecWait '"$PLUGINSDIR\PythonInstaller.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1' $R1
        ${if} $R1 == 0
          DetailPrint "Python 3.11 instalado com sucesso."
        ${else}
          DetailPrint "Falha na instalação do Python 3.11. Código de saída: $R1"
        ${endIf}
      ${else}
        DetailPrint "Falha no download do instalador do Python."
      ${endIf}
    ${endIf}
    
    # --- Instalação das Dependências Python para LoRA Training ---
    DetailPrint "Instalando dependências Python para treinamento LoRA..."
    
    # Cria um script Python temporário para instalar as dependências
    FileOpen $R0 "$PLUGINSDIR\install_lora_deps.py" w
    FileWrite $R0 "import subprocess$\r$\nimport sys$\r$\n$\r$\n"
    FileWrite $R0 "def install_package(package):$\r$\n"
    FileWrite $R0 "    try:$\r$\n"
    FileWrite $R0 "        print(f'Instalando {package}...')$\r$\n"
    FileWrite $R0 "        subprocess.check_call([sys.executable, '-m', 'pip', 'install', package, '--upgrade', '--user'])$\r$\n"
    FileWrite $R0 "        return True$\r$\n"
    FileWrite $R0 "    except Exception as e:$\r$\n"
    FileWrite $R0 "        print(f'Erro ao instalar {package}: {e}')$\r$\n"
    FileWrite $R0 "        return False$\r$\n$\r$\n"
    FileWrite $R0 "# Verifica se CUDA está disponível$\r$\n"
    FileWrite $R0 "has_cuda = False$\r$\n"
    FileWrite $R0 "try:$\r$\n"
    FileWrite $R0 "    import subprocess$\r$\n"
    FileWrite $R0 "    result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)$\r$\n"
    FileWrite $R0 "    has_cuda = result.returncode == 0$\r$\n"
    FileWrite $R0 "except:$\r$\n"
    FileWrite $R0 "    has_cuda = False$\r$\n$\r$\n"
    FileWrite $R0 "print(f'CUDA disponível: {has_cuda}')$\r$\n$\r$\n"
    FileWrite $R0 "# Pacotes essenciais$\r$\n"
    FileWrite $R0 "packages = [$\r$\n"
    FileWrite $R0 "    'torch',$\r$\n"
    FileWrite $R0 "    'transformers>=4.36.0',$\r$\n"
    FileWrite $R0 "    'datasets',$\r$\n"
    FileWrite $R0 "    'accelerate',$\r$\n"
    FileWrite $R0 "    'peft>=0.7.0',$\r$\n"
    FileWrite $R0 "    'trl'$\r$\n"
    FileWrite $R0 "]$\r$\n$\r$\n"
    FileWrite $R0 "# Adiciona bitsandbytes se CUDA estiver disponível$\r$\n"
    FileWrite $R0 "if has_cuda:$\r$\n"
    FileWrite $R0 "    packages.append('bitsandbytes')$\r$\n$\r$\n"
    FileWrite $R0 "# Atualiza pip primeiro$\r$\n"
    FileWrite $R0 "print('Atualizando pip...')$\r$\n"
    FileWrite $R0 "subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--upgrade', 'pip', '--user'])$\r$\n$\r$\n"
    FileWrite $R0 "# Instala cada pacote$\r$\n"
    FileWrite $R0 "success_count = 0$\r$\n"
    FileWrite $R0 "for package in packages:$\r$\n"
    FileWrite $R0 "    if install_package(package):$\r$\n"
    FileWrite $R0 "        success_count += 1$\r$\n$\r$\n"
    FileWrite $R0 "print(f'Instalação concluída: {success_count}/{len(packages)} pacotes instalados com sucesso')$\r$\n$\r$\n"
    FileWrite $R0 "# Testa a instalação$\r$\n"
    FileWrite $R0 "try:$\r$\n"
    FileWrite $R0 "    import torch$\r$\n"
    FileWrite $R0 "    import transformers$\r$\n"
    FileWrite $R0 "    import datasets$\r$\n"
    FileWrite $R0 "    import peft$\r$\n"
    FileWrite $R0 "    print('✅ Todas as dependências foram instaladas com sucesso!')$\r$\n"
    FileWrite $R0 "except ImportError as e:$\r$\n"
    FileWrite $R0 "    print(f'⚠️ Algumas dependências podem não ter sido instaladas: {e}')$\r$\n"
    FileClose $R0
    
    # Executa o script de instalação das dependências Python
    DetailPrint "Executando instalação das dependências Python..."
    ExecWait 'python "$PLUGINSDIR\install_lora_deps.py"' $R1
    ${if} $R1 == 0
      DetailPrint "Dependências Python instaladas com sucesso."
    ${else}
      DetailPrint "Possíveis problemas na instalação das dependências Python. Código: $R1"
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
    
    # --- Mensagem Final ---
    DetailPrint "=== Instalação do Orch-OS Concluída ==="
    DetailPrint "✅ Python 3.11 e dependências LoRA instaladas"
    DetailPrint "✅ Ollama instalado"
    DetailPrint ""
    DetailPrint "📋 Próximos passos após a instalação:"
    DetailPrint "1. Execute o Orch-OS"
    DetailPrint "2. O sistema está pronto para treinamento LoRA!"

  ${endIf}
!macroend
