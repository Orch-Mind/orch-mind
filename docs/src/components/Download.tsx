import React, { useState, useEffect } from 'react';
import { Download as DownloadIcon, Monitor, Smartphone, Github, ExternalLink } from 'lucide-react';
import { detectOS, getDownloadUrl, getOSDisplayName, type OSType } from '../utils/detectOS';
import { useLanguage } from '../contexts/LanguageContext';

const Download: React.FC = () => {
  const { t } = useLanguage();
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
    windows: ['Windows 10/11', t('download.specs.ram'), t('download.specs.gpu.nvidia'), t('download.specs.storage')],
    macos: ['macOS 12+', t('download.specs.ram'), t('download.specs.chip'), t('download.specs.storage')],
    linux: ['Ubuntu 20.04+', t('download.specs.ram'), t('download.specs.gpu.cuda'), t('download.specs.storage')]
  };

  return (
    <section id="download" className="section-padding relative">
      <div className="container-custom">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-orbitron-title mb-6">
            <span className="gradient-text">{t('download.title')}</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6 font-montserrat">
            {t('download.subtitle')}
          </p>
          
          {/* Experimental disclaimer - Subtle Style */}
          <div className="mb-8">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm text-amber-200/80 font-montserrat bg-amber-900/15 border border-amber-600/25 rounded-xl px-3 py-2 sm:px-4 backdrop-blur-sm text-center break-words">
                <span className="inline-flex items-center mr-1 sm:mr-2">
                  <span className="w-1.5 h-1.5 bg-amber-400/70 rounded-full mr-1 sm:mr-2 animate-pulse"></span>
                  <span className="text-amber-300/60 text-xs">🚧</span>
                </span>
                <span className="break-words">{t('hero.disclaimer')}</span>
              </p>
            </div>
          </div>
          
          {/* Main download button - Premium NFT Style */}
          {detectedOS !== 'unknown' && (
            <div className="mb-12">
              <div className="relative inline-block">
                <button
                  onClick={() => handleDownload()}
                  disabled={isLoading}
                  className="relative bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white text-base sm:text-lg font-montserrat-bold px-6 sm:px-12 py-3 sm:py-4 rounded-xl border border-cyan-400/50 hover:border-cyan-300 shadow-lg hover:shadow-cyan-500/25 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 sm:space-x-3 mx-auto overflow-hidden"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.6), 0 0 60px rgba(6, 182, 212, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                  }}
                >
                  {/* Glow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <DownloadIcon className={`relative z-10 w-6 h-6 ${isLoading ? 'animate-bounce' : 'group-hover:scale-125 group-hover:rotate-12'} transition-transform duration-300`} />
                  <span className="relative z-10">
                    {isLoading ? t('download.downloading') : `${t('download.downloadFor')} ${getOSDisplayName(detectedOS)}`}
                  </span>
                  
                  {/* Pulse effect */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)' }}></div>
                </button>
              </div>
              
              {/* Simple microcopy */}
              <div className="mt-4">
                <p className="text-sm text-gray-400 font-montserrat">
                  {t('download.detected')} {getOSDisplayName(detectedOS)} • {t('download.freeOpenSource')}
                </p>
              </div>
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
              <h3 className="text-xl font-montserrat mb-2">{option.name}</h3>
              <p className="text-gray-400 text-sm mb-4">
                {option.size} • {option.format}
              </p>
              <button
                onClick={() => handleDownload(option.os)}
                className="btn-secondary w-full mb-4"
              >
                {t('download.downloadButton')}
              </button>
              
              {/* System requirements */}
              <div className="text-left">
                <h4 className="text-sm font-montserrat text-gray-300 mb-2">{t('download.requirements')}</h4>
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
          <div className="glass-effect rounded-xl p-6 flex flex-col h-full">
            <div>
              <div className="flex items-center mb-4">
                <Github className="w-8 h-8 text-gray-300 mr-3" />
                <h3 className="text-xl font-montserrat-bold">{t('download.github.title')}</h3>
              </div>
              <p className="text-gray-400 mb-6 font-montserrat">
                {t('download.github.desc')}
              </p>
            </div>
            <a
              href="https://github.com/guiferrarib/orch-mind/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary font-montserrat flex items-center space-x-2 mt-auto w-fit"
            >
              <span>{t('download.github.button')}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Mobile app info */}
          <div className="glass-effect rounded-xl p-6 flex flex-col h-full">
            <div>
              <div className="flex items-center mb-4">
                <Smartphone className="w-8 h-8 text-gray-300 mr-3" />
                <h3 className="text-xl font-montserrat-bold">{t('download.mobile.title')}</h3>
              </div>
              <p className="text-gray-400 mb-6 font-montserrat">
                {t('download.mobile.desc')}
              </p>
            </div>
            <div className="btn-secondary font-montserrat flex items-center space-x-2 opacity-50 cursor-not-allowed mt-auto w-fit">
              <span>{t('download.mobile.button')}</span>
              <Monitor className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Installation instructions */}
        <div className="mt-16 glass-effect rounded-xl p-8">
          <h3 className="text-2xl font-montserrat-bold mb-6 text-center gradient-text">
            {t('download.installation.title')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-montserrat-bold text-blue-400 mb-3">{t('download.installation.step1.title')}</h4>
              <p className="text-gray-300 font-montserrat">
                {t('download.installation.step1.desc')}
              </p>
            </div>
            <div>
              <h4 className="font-montserrat-bold text-purple-400 mb-3">{t('download.installation.step2.title')}</h4>
              <p className="text-gray-300 font-montserrat">
                {t('download.installation.step2.desc')}
              </p>
            </div>
            <div>
              <h4 className="font-montserrat-bold text-green-400 mb-3">{t('download.installation.step3.title')}</h4>
              <p className="text-gray-300 font-montserrat">
                {t('download.installation.step3.desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Download;
