import React from 'react';
import { ArrowRight, Brain, Network, Shield, ChevronDown } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center section-padding">
      <div className="container-custom text-center relative z-10">
        {/* Logo and Main heading */}
        <div className="mb-8">
          <div className="flex justify-center mb-8">
            <img 
              src="/orch-mind-logo.png" 
              alt="Orch-Mind Logo" 
              className="w-24 h-24 md:w-32 md:h-32 object-contain animate-pulse"
              style={{ 
                filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.6)) brightness(1.3) contrast(1.2)',
                mixBlendMode: 'screen'
              }}
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Orch-Mind</span>
            <br />
            <span className="text-white">IA para Todos</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            A primeira IA federada brasileira que democratiza o treinamento de inteligência artificial. 
            Qualquer pessoa pode criar seus próprios adapters de IA, com total privacidade e inclusão tecnológica.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-4xl mx-auto">
          <div className="glass-effect rounded-lg p-6 transform hover:scale-105 transition-all duration-300">
            <Brain className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Treinamento Simples</h3>
            <p className="text-gray-400 text-sm">Interface intuitiva para pessoas leigas treinarem suas próprias IAs</p>
          </div>
          <div className="glass-effect rounded-lg p-6 transform hover:scale-105 transition-all duration-300">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Privacidade Total</h3>
            <p className="text-gray-400 text-sm">Todos os dados ficam no seu computador, sem vazamentos</p>
          </div>
          <div className="glass-effect rounded-lg p-6 transform hover:scale-105 transition-all duration-300">
            <Network className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Compartilhamento P2P</h3>
            <p className="text-gray-400 text-sm">Compartilhe apenas os adapters, mantendo seus dados privados</p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <a
            href="#download"
            className="btn-primary flex items-center space-x-2 group px-8 py-4 text-lg font-semibold"
          >
            <span>Baixar Agora</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </a>
          <a
            href="https://github.com/guiferrarib/orch-mind"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary px-8 py-4 text-lg font-semibold"
          >
            Ver no GitHub
          </a>
        </div>

        {/* Status badges - Fixed alignment */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-4">
            <div className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-400 rounded-xl text-sm font-medium border border-green-500/20 backdrop-blur-sm hover:scale-105 transition-transform duration-200 shadow-lg min-w-fit">
              <span className="text-lg">🇧🇷</span>
              <span className="whitespace-nowrap">Primeira IA Federada Brasileira</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-400 rounded-xl text-sm font-medium border border-blue-500/20 backdrop-blur-sm hover:scale-105 transition-transform duration-200 shadow-lg min-w-fit">
              <span className="text-lg">👥</span>
              <span className="whitespace-nowrap">Inclusão Tecnológica</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-400 rounded-xl text-sm font-medium border border-purple-500/20 backdrop-blur-sm hover:scale-105 transition-transform duration-200 shadow-lg min-w-fit">
              <span className="text-lg">🔒</span>
              <span className="whitespace-nowrap">100% Privado</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-amber-500/10 to-yellow-600/10 text-amber-400 rounded-xl text-sm font-medium border border-amber-500/20 backdrop-blur-sm hover:scale-105 transition-transform duration-200 shadow-lg min-w-fit">
              <span className="text-lg">💬</span>
              <span className="whitespace-nowrap">Importa ChatGPT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-2 opacity-70 hover:opacity-100 transition-opacity duration-300">
        <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">Explore mais</span>
        <div className="flex flex-col items-center animate-bounce">
          <ChevronDown className="w-5 h-5 text-blue-400" />
          <ChevronDown className="w-4 h-4 text-blue-400/60 -mt-2" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
