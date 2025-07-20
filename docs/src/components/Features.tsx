import React from 'react';
import { 
  Brain, 
  Network, 
  Shield, 
  Zap, 
  Users, 
  Database,
  Globe,
  Cpu 
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Features: React.FC = () => {
  const { t } = useLanguage();
  const features = [
    {
      icon: Brain,
      titleKey: 'features.intuitive.title',
      descKey: 'features.intuitive.desc',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      icon: Shield,
      titleKey: 'features.privacy.title',
      descKey: 'features.privacy.desc',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      icon: Database,
      titleKey: 'features.chatgpt.title',
      descKey: 'features.chatgpt.desc',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20'
    },
    {
      icon: Network,
      titleKey: 'features.adapters.title',
      descKey: 'features.adapters.desc',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    },
    {
      icon: Users,
      titleKey: 'features.business.title',
      descKey: 'features.business.desc',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20'
    },
    {
      icon: Globe,
      titleKey: 'features.brazilian.title',
      descKey: 'features.brazilian.desc',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    },
    {
      icon: Zap,
      titleKey: 'features.fast.title',
      descKey: 'features.fast.desc',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      icon: Cpu,
      titleKey: 'features.inclusion.title',
      descKey: 'features.inclusion.desc',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20'
    }
  ];

  return (
    <section id="features" className="section-padding relative">
      <div className="container-custom">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-orbitron-title mb-6">
            <span className="gradient-text">{t('features.title')}</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto font-montserrat">
            {t('features.subtitle')}
          </p>
        </div>

        {/* Features grid - Premium NFT Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.titleKey}
              className={`relative bg-gradient-to-br from-gray-900/60 via-gray-800/40 to-gray-900/60 rounded-2xl p-6 border border-gray-600/30 backdrop-blur-sm hover:scale-110 hover:border-opacity-60 transition-all duration-500 transform group cursor-pointer shadow-lg hover:shadow-2xl`}
              style={{ 
                animationDelay: `${index * 0.15}s`,
                boxShadow: `0 0 0 1px ${feature.color.includes('blue') ? 'rgba(59, 130, 246, 0.1)' : feature.color.includes('green') ? 'rgba(34, 197, 94, 0.1)' : feature.color.includes('cyan') ? 'rgba(6, 182, 212, 0.1)' : feature.color.includes('purple') ? 'rgba(147, 51, 234, 0.1)' : feature.color.includes('yellow') ? 'rgba(245, 158, 11, 0.1)' : feature.color.includes('orange') ? 'rgba(249, 115, 22, 0.1)' : feature.color.includes('indigo') ? 'rgba(99, 102, 241, 0.1)' : 'rgba(59, 130, 246, 0.1)'}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 25px ${feature.color.includes('blue') ? 'rgba(59, 130, 246, 0.3)' : feature.color.includes('green') ? 'rgba(34, 197, 94, 0.3)' : feature.color.includes('cyan') ? 'rgba(6, 182, 212, 0.3)' : feature.color.includes('purple') ? 'rgba(147, 51, 234, 0.3)' : feature.color.includes('yellow') ? 'rgba(245, 158, 11, 0.3)' : feature.color.includes('orange') ? 'rgba(249, 115, 22, 0.3)' : feature.color.includes('indigo') ? 'rgba(99, 102, 241, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 0 1px ${feature.color.includes('blue') ? 'rgba(59, 130, 246, 0.1)' : feature.color.includes('green') ? 'rgba(34, 197, 94, 0.1)' : feature.color.includes('cyan') ? 'rgba(6, 182, 212, 0.1)' : feature.color.includes('purple') ? 'rgba(147, 51, 234, 0.1)' : feature.color.includes('yellow') ? 'rgba(245, 158, 11, 0.1)' : feature.color.includes('orange') ? 'rgba(249, 115, 22, 0.1)' : feature.color.includes('indigo') ? 'rgba(99, 102, 241, 0.1)' : 'rgba(59, 130, 246, 0.1)'}`;
              }}
            >
              {/* Glow effect overlay */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                   style={{ background: `linear-gradient(135deg, ${feature.color.includes('blue') ? 'rgba(59, 130, 246, 0.05)' : feature.color.includes('green') ? 'rgba(34, 197, 94, 0.05)' : feature.color.includes('cyan') ? 'rgba(6, 182, 212, 0.05)' : feature.color.includes('purple') ? 'rgba(147, 51, 234, 0.05)' : feature.color.includes('yellow') ? 'rgba(245, 158, 11, 0.05)' : feature.color.includes('orange') ? 'rgba(249, 115, 22, 0.05)' : feature.color.includes('indigo') ? 'rgba(99, 102, 241, 0.05)' : 'rgba(59, 130, 246, 0.05)'} 0%, transparent 100%)` }}></div>
              
              <div className="relative z-10">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className={`absolute inset-0 ${feature.bgColor} rounded-full blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    <feature.icon className={`relative w-12 h-12 ${feature.color} group-hover:scale-110 transition-transform duration-300`} />
                  </div>
                </div>
                <h3 className="text-xl font-montserrat-bold mb-4 text-center text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-500 group-hover:bg-clip-text transition-all duration-300">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed font-montserrat text-center group-hover:text-gray-300 transition-colors duration-300">
                  {t(feature.descKey)}
                </p>
                

              </div>
            </div>
          ))}
        </div>

        {/* Especificações Técnicas */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-orbitron-title mb-4 gradient-text">{t('features.specs.title')}</h3>
            <p className="text-gray-300 max-w-2xl mx-auto font-montserrat">
              {t('features.specs.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-effect rounded-lg p-6 text-center hover:scale-105 transition-transform duration-200">
              <h4 className="text-lg font-montserrat-bold mb-3 text-blue-400">{t('features.specs.interface')}</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>React 18 + TypeScript</div>
                <div>Vite + TailwindCSS</div>
                <div>Electron Desktop</div>
                <div>{t('features.specs.responsive')}</div>
              </div>
            </div>
            
            <div className="glass-effect rounded-lg p-6 text-center hover:scale-105 transition-transform duration-200">
              <h4 className="text-lg font-montserrat-bold mb-3 text-purple-400">{t('features.specs.ai-engine')}</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>Gemma 3 & Gemma 3n</div>
                <div>LoRA Adapters</div>
                <div>{t('features.specs.training')}</div>
                <div>{t('features.specs.websearch')}</div>
              </div>
            </div>
            
            <div className="glass-effect rounded-lg p-6 text-center hover:scale-105 transition-transform duration-200">
              <h4 className="text-lg font-montserrat-bold mb-3 text-green-400">{t('features.specs.storage')}</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>DuckDB Local</div>
                <div>{t('features.specs.privatedata')}</div>
                <div>{t('features.specs.backup')}</div>
                <div>{t('features.specs.zerocloud')}</div>
              </div>
            </div>
            
            <div className="glass-effect rounded-lg p-6 text-center hover:scale-105 transition-transform duration-200">
              <h4 className="text-lg font-montserrat-bold mb-3 text-cyan-400">{t('features.specs.network')}</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>{t('features.specs.p2p')}</div>
                <div>{t('features.specs.lorashare')}</div>
                <div>{t('features.specs.autoupdate')}</div>
                <div>{t('features.specs.madeinbrazil')}</div>
              </div>
            </div>
          </div>
          
          {/* Requisitos do Sistema */}
          <div className="mt-12 glass-effect rounded-lg p-8">
            <h3 className="text-2xl font-montserrat-bold mb-6 text-center gradient-text">{t('features.specs.requirements')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
              <div className="text-center">
                <h5 className="font-montserrat-bold text-blue-400 mb-3">Windows 10/11</h5>
                <div className="space-y-1 text-gray-300">
                  <div>• {t('features.req.ram')}</div>
                  <div>• {t('features.req.gpu.nvidia')}</div>
                  <div>• {t('features.req.storage')}</div>
                </div>
              </div>
              <div className="text-center">
                <h5 className="font-montserrat-bold text-green-400 mb-3">macOS 12+</h5>
                <div className="space-y-1 text-gray-300">
                  <div>• {t('features.req.ram')}</div>
                  <div>• {t('features.req.chip')}</div>
                  <div>• {t('features.req.storage')}</div>
                </div>
              </div>
              <div className="text-center">
                <h5 className="font-montserrat-bold text-orange-400 mb-3">Linux Ubuntu 20+</h5>
                <div className="space-y-1 text-gray-300">
                  <div>• {t('features.req.ram')}</div>
                  <div>• {t('features.req.gpu.cuda')}</div>
                  <div>• {t('features.req.storage')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
