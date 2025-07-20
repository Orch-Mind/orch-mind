import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import NetworkEffect from './NetworkEffect';

const Hero: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center section-padding overflow-hidden">
      <NetworkEffect />
      <div className="container-custom text-center relative z-10">
        {/* Logo and Main heading */}
        <div className="mb-8">
          <div className="flex justify-center mb-8 relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-cyan-400/30 to-blue-500/20 rounded-full blur-3xl scale-150 animate-pulse"></div>
            <img 
              src="/orch-mind-logo.png" 
              alt="Orch-Mind Logo" 
              className="w-24 h-24 md:w-32 md:h-32 object-contain animate-pulse relative z-10"
              style={{ 
                filter: 'drop-shadow(0 0 25px rgba(59, 130, 246, 0.8)) brightness(1.4) contrast(1.3)',
                mixBlendMode: 'screen'
              }}
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-orbitron-title mb-4">
            <span className="gradient-text">{t('hero.title.orch')}</span>
          </h1>
          <h2 className="text-xl md:text-2xl font-montserrat-bold text-blue-200 mb-8 max-w-3xl mx-auto leading-relaxed">
            {t('hero.title.first')} <span className="font-normal text-blue-300">{t('hero.title.world')}</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-4">
            {t('hero.subtitle.imagine')} <strong className="text-white">{t('hero.subtitle.no')}</strong>
          </p>
          <p className="text-xl md:text-2xl text-amber-300 font-bold max-w-3xl mx-auto">
            {t('hero.promise.free')}
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <a
            href="#download"
            className="btn-primary text-lg font-montserrat-bold px-8 py-4 flex items-center space-x-3 group hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300"
          >
            <span>{t('cta.revolution')}</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-200" />
          </a>
          <a
            href="https://github.com/guiferrarib/orch-mind"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-900/80 border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-400/25 px-8 py-4 text-lg font-montserrat transform hover:scale-105 transition-all duration-300 rounded-lg backdrop-blur-sm"
          >
            {t('cta.open-source')}
          </a>
        </div>
        
        {/* Microcopy */}
        <div className="mb-12">
          <p className="text-sm text-gray-400 font-montserrat max-w-md mx-auto text-center leading-relaxed">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            {t('hero.microcopy')}
          </p>
        </div>

        {/* Status badges - NFT Style with single line alignment */}
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
            <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-gradient-to-br from-green-900/40 via-green-800/30 to-green-700/40 text-green-300 rounded-2xl text-xs md:text-sm font-montserrat border border-green-400/30 backdrop-blur-sm hover:scale-110 hover:shadow-lg hover:shadow-green-400/25 transition-all duration-300 shadow-md hover:border-green-300/50 cursor-pointer group">
              <span className="text-base group-hover:animate-bounce flex-shrink-0">🏆</span>
              <span className="font-semibold truncate">{t('badge.made-brazil')}</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-700/40 text-red-300 rounded-2xl text-xs md:text-sm font-montserrat border border-red-400/30 backdrop-blur-sm hover:scale-110 hover:shadow-lg hover:shadow-red-400/25 transition-all duration-300 shadow-md hover:border-red-300/50 cursor-pointer">
              <span className="text-base flex-shrink-0">🔒</span>
              <span className="font-semibold truncate">{t('badge.no-spying')}</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-amber-700/40 text-amber-300 rounded-2xl text-xs md:text-sm font-montserrat border border-amber-400/30 backdrop-blur-sm hover:scale-110 hover:shadow-lg hover:shadow-amber-400/25 transition-all duration-300 shadow-md hover:border-amber-300/50 cursor-pointer">
              <span className="text-base animate-pulse flex-shrink-0">💎</span>
              <span className="font-semibold truncate">{t('badge.always-free')}</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-700/40 text-blue-300 rounded-2xl text-xs md:text-sm font-montserrat border border-blue-400/30 backdrop-blur-sm hover:scale-110 hover:shadow-lg hover:shadow-blue-400/25 transition-all duration-300 shadow-md hover:border-blue-300/50 cursor-pointer">
              <span className="text-base flex-shrink-0">🌐</span>
              <span className="font-semibold truncate">{t('badge.works-offline')}</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-purple-700/40 text-purple-300 rounded-2xl text-xs md:text-sm font-montserrat border border-purple-400/30 backdrop-blur-sm hover:scale-110 hover:shadow-lg hover:shadow-purple-400/25 transition-all duration-300 shadow-md hover:border-purple-300/50 cursor-pointer group">
              <span className="text-base animate-pulse group-hover:animate-bounce flex-shrink-0">⚡</span>
              <span className="font-semibold truncate">{t('badge.zero-delay')}</span>
            </div>
          </div>
        </div>

        {/* Modern scroll indicator - Positioned below badges */}
        <div className="mt-16 flex flex-col items-center space-y-2 opacity-70 hover:opacity-100 transition-opacity duration-300">
          <span className="text-xs text-gray-400 font-montserrat tracking-wider uppercase">{t('scroll.explore')}</span>
          <div className="flex flex-col items-center animate-bounce">
            <ChevronDown className="w-5 h-5 text-blue-400" />
            <ChevronDown className="w-4 h-4 text-blue-400/60 -mt-2" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
