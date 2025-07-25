import React, { useState, useEffect } from 'react';
import { Download as DownloadIcon, Monitor, Smartphone, Github, ExternalLink } from 'lucide-react';
import { detectOS, getDownloadUrl, getOSDisplayName, detectMacArchitecture, getMacArchitectureDisplayName, type OSType, type MacArchitecture } from '../utils/detectOS';
import { useLanguage } from '../contexts/LanguageContext';

const Download: React.FC = () => {
  const { t } = useLanguage();
  const [detectedOS, setDetectedOS] = useState<OSType>('unknown');
  const [detectedMacArch, setDetectedMacArch] = useState<MacArchitecture>('unknown');
  const [selectedMacArch, setSelectedMacArch] = useState<MacArchitecture>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [showMacDropdown, setShowMacDropdown] = useState(false);

  useEffect(() => {
    const os = detectOS();
    setDetectedOS(os);
    
    // If it's macOS, detect and pre-select the architecture
    if (os === 'macos') {
      const macArch = detectMacArchitecture();
      setDetectedMacArch(macArch);
      setSelectedMacArch(macArch);
    }
  }, []);

  const handleDownload = (os: OSType = detectedOS, macArch?: MacArchitecture) => {
    setIsLoading(true);
    const url = getDownloadUrl(os, macArch);
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
      format: '.exe',
      version: 'v0.0.1'
    },
    {
      os: 'macos' as OSType,
      name: 'macOS',
      icon: '🍎',
      size: '~210 MB',
      format: '.pkg',
      version: 'v0.0.1'
    }
  ];

  const systemRequirements: Record<Exclude<OSType, 'unknown' | 'linux'>, string[]> = {
    windows: ['Windows 10/11', t('download.specs.ram'), t('download.specs.gpu.nvidia'), t('download.specs.storage')],
    macos: ['macOS 12+', t('download.specs.ram'), t('download.specs.chip'), t('download.specs.storage')]
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
                  onClick={() => {
                    if (detectedOS === 'macos') {
                      handleDownload(detectedOS, detectedMacArch);
                    } else {
                      handleDownload();
                    }
                  }}
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
                    {isLoading ? t('download.downloading') : (
                      detectedOS === 'macos' && detectedMacArch !== 'unknown'
                        ? `${t('download.downloadFor')} macOS (${getMacArchitectureDisplayName(detectedMacArch)})`
                        : `${t('download.downloadFor')} ${getOSDisplayName(detectedOS)}`
                    )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          {downloadOptions.map((option) => (
            <div
              key={option.os}
              className={`glass-effect rounded-xl p-6 text-center hover:bg-white/10 transition-all duration-300 transform hover:scale-105 ${
                detectedOS === option.os ? 'ring-2 ring-blue-500/50' : ''
              }`}
            >
              <div className="text-4xl mb-4">{option.icon}</div>
              <h3 className="text-xl font-montserrat mb-2">{option.name}</h3>
              <div className="text-gray-400 text-sm mb-4 space-y-1">
                <p>{option.size} • {option.format}</p>
                <p className="text-cyan-400 font-medium">{option.version}</p>
              </div>
              {option.os === 'macos' ? (
                <div className="relative">
                  {/* Download button with dropdown */}
                  <div className="relative">
                    <div className="btn-secondary w-full mb-4 flex items-center justify-between p-0 overflow-hidden">
                      {/* Main button area */}
                      <button
                        onClick={() => {
                          if (selectedMacArch !== 'unknown') {
                            handleDownload(option.os, selectedMacArch);
                          } else {
                            setShowMacDropdown(!showMacDropdown);
                          }
                        }}
                        className="flex-1 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                      >
                        {selectedMacArch === 'unknown' 
                          ? 'Escolher arquitetura' 
                          : `${t('download.downloadButton')} (${selectedMacArch === 'arm64' ? 'Apple Silicon' : 'Intel'})`
                        }
                      </button>
                      
                      {/* Dropdown toggle area */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMacDropdown(!showMacDropdown);
                        }}
                        className="px-3 py-3 border-l border-gray-600 hover:bg-white/5 transition-colors"
                        aria-label="Toggle architecture selection menu"
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform duration-200 ${
                            showMacDropdown ? 'rotate-180' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Dropdown menu */}
                    {showMacDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setSelectedMacArch('arm64');
                            setShowMacDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-600 last:border-b-0 rounded-t-lg"
                        >
                          <div className="font-medium text-white">Apple Silicon</div>
                          <div className="text-xs text-gray-400">M1, M2, M3 chips</div>
                          {detectedMacArch === 'arm64' && (
                            <div className="text-xs text-cyan-400 mt-1">✓ Detectado</div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMacArch('intel');
                            setShowMacDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors rounded-b-lg"
                        >
                          <div className="font-medium text-white">Intel</div>
                          <div className="text-xs text-gray-400">x64 processors</div>
                          {detectedMacArch === 'intel' && (
                            <div className="text-xs text-cyan-400 mt-1">✓ Detectado</div>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleDownload(option.os)}
                  className="btn-secondary w-full mb-4"
                >
                  {t('download.downloadButton')}
                </button>
              )}
              
              {/* System requirements */}
              <div className="text-left">
                <h4 className="text-sm font-montserrat text-gray-300 mb-2">{t('download.requirements')}</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  {option.os !== 'unknown' && option.os !== 'linux' && systemRequirements[option.os as keyof typeof systemRequirements]?.map((req: string, index: number) => (
                    <li key={index}>• {req}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Additional options */}
        <div className="flex justify-center">
          {/* Mobile app info */}
          <div className="glass-effect rounded-xl p-6 flex flex-col h-full max-w-md">
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
