import React, { useState, useEffect } from 'react';
import { Download as DownloadIcon, Monitor, Smartphone, Github, ExternalLink } from 'lucide-react';
import { detectOS, getDownloadUrl, getOSDisplayName, type OSType } from '../utils/detectOS';

const Download: React.FC = () => {
  const [detectedOS, setDetectedOS] = useState<OSType>('unknown');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setDetectedOS(detectOS());
  }, []);

  const handleDownload = (os: OSType = detectedOS) => {
    setIsLoading(true);
    const url = getDownloadUrl(os);
    window.open(url, '_blank');
    
    // Reset loading state after a short delay
    setTimeout(() => setIsLoading(false), 2000);
  };

  const downloadOptions = [
    {
      os: 'windows' as OSType,
      name: 'Windows',
      icon: '🪟',
      size: '~160 MB',
      format: '.exe'
    },
    {
      os: 'macos' as OSType,
      name: 'macOS',
      icon: '🍎',
      size: '~210 MB',
      format: '.pkg'
    },
    {
      os: 'linux' as OSType,
      name: 'Linux',
      icon: '🐧',
      size: '~160 MB',
      format: '.AppImage'
    }
  ];

  const systemRequirements: Record<Exclude<OSType, 'unknown'>, string[]> = {
    windows: ['Windows 10/11', 'Mínimo 8GB RAM', 'GPU NVIDIA GTX 1060+', '10GB de armazenamento'],
    macos: ['macOS 12+', 'Mínimo 8GB RAM', 'Chip M1/M2 ou Intel', '10GB de armazenamento'],
    linux: ['Ubuntu 20.04+', 'Mínimo 8GB RAM', 'GPU CUDA compatível', '10GB de armazenamento']
  };

  return (
    <section id="download" className="section-padding relative">
      <div className="container-custom">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">Comece Agora</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Democratize a IA em poucos minutos. Baixe gratuitamente e comece a treinar 
            sua própria inteligência artificial com total privacidade.
          </p>
          
          {/* Main download button */}
          {detectedOS !== 'unknown' && (
            <div className="mb-12">
              <button
                onClick={() => handleDownload()}
                disabled={isLoading}
                className="btn-primary text-lg px-12 py-4 flex items-center space-x-3 mx-auto group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DownloadIcon className={`w-6 h-6 ${isLoading ? 'animate-bounce' : 'group-hover:scale-110'} transition-transform duration-200`} />
                <span>
                  {isLoading ? 'Iniciando Download...' : `Baixar para ${getOSDisplayName(detectedOS)}`}
                </span>
              </button>
              <p className="text-sm text-gray-400 mt-3">
                Detectado: {getOSDisplayName(detectedOS)} • 100% Gratuito • Código Aberto • Privacidade Total
              </p>
            </div>
          )}
        </div>

        {/* Download options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {downloadOptions.map((option) => (
            <div
              key={option.os}
              className={`glass-effect rounded-xl p-6 text-center hover:bg-white/10 transition-all duration-300 transform hover:scale-105 ${
                detectedOS === option.os ? 'ring-2 ring-blue-500/50' : ''
              }`}
            >
              <div className="text-4xl mb-4">{option.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{option.name}</h3>
              <p className="text-gray-400 text-sm mb-4">
                {option.size} • {option.format}
              </p>
              <button
                onClick={() => handleDownload(option.os)}
                className="btn-secondary w-full mb-4"
              >
                Baixar
              </button>
              
              {/* System requirements */}
              <div className="text-left">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Requisitos:</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  {option.os !== 'unknown' && systemRequirements[option.os]?.map((req, index) => (
                    <li key={index}>• {req}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Additional options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* GitHub releases */}
          <div className="glass-effect rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Github className="w-8 h-8 text-gray-300 mr-3" />
              <h3 className="text-xl font-semibold">Versões GitHub</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Acesse todas as versões, notas de lançamento e código fonte no nosso repositório GitHub.
            </p>
            <a
              href="https://github.com/guiferrarib/orch-mind/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center space-x-2"
            >
              <span>Ver Todas as Versões</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Mobile app info */}
          <div className="glass-effect rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Smartphone className="w-8 h-8 text-gray-300 mr-3" />
              <h3 className="text-xl font-semibold">App Mobile</h3>
            </div>
            <p className="text-gray-400 mb-4">
              App mobile em breve para iOS e Android. Monitore o progresso do treinamento em qualquer lugar.
            </p>
            <div className="btn-secondary inline-flex items-center space-x-2 opacity-50 cursor-not-allowed">
              <span>Em Breve</span>
              <Monitor className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Installation instructions */}
        <div className="mt-16 glass-effect rounded-xl p-8">
          <h3 className="text-2xl font-semibold mb-6 text-center gradient-text">
            Guia de Instalação Rápida
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-semibold text-blue-400 mb-3">1. Baixar</h4>
              <p className="text-gray-300">
                Clique no botão de download para sua plataforma. O instalador será salvo na sua pasta de downloads.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-purple-400 mb-3">2. Instalar</h4>
              <p className="text-gray-300">
                Execute o instalador e siga o assistente de configuração. Todas as dependências serão instaladas automaticamente.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-400 mb-3">3. Executar</h4>
              <p className="text-gray-300">
                Abra o Orch-Mind da sua pasta de aplicativos e comece a explorar o treinamento de IA federada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Download;
