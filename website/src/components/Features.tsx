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

const Features: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: 'Interface Intuitiva',
      description: 'Qualquer pessoa pode treinar sua IA sem conhecimento técnico avançado',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      icon: Shield,
      title: 'Privacidade Total',
      description: 'Todos os seus dados ficam no seu computador. Sem servidores externos ou vazamentos',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      icon: Database,
      title: 'Importa ChatGPT',
      description: 'Importe suas conversas do ChatGPT para treinar sua IA com seu histórico pessoal',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20'
    },
    {
      icon: Network,
      title: 'Adapters Compartilhados',
      description: 'Compartilhe apenas os adapters de IA, mantendo seus dados privados e seguros',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    },
    {
      icon: Users,
      title: 'Para Todos os Negócios',
      description: 'Ideal para estudantes, microempreendedores, empresas, universidades e grupos de pesquisa',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20'
    },
    {
      icon: Globe,
      title: 'Primeira IA Federada 🇧🇷',
      description: 'Orgulhosamente brasileira, pioneira em IA federada na América Latina',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    },
    {
      icon: Zap,
      title: 'Treinamento Rápido',
      description: 'Tecnologia LoRA para treinamento eficiente sem precisar de supercomputadores',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      icon: Cpu,
      title: 'Inclusão Digital',
      description: 'Democratiza o acesso à IA, quebrando barreiras tecnológicas e econômicas',
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">IA Democrática</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Tecnologia acessível para estudantes, microempreendedores, empresas, universidades e pesquisadores. 
            Qualquer pessoa pode treinar sua própria inteligência artificial.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-effect rounded-xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-4">
                <feature.icon className={`w-12 h-12 ${feature.color} group-hover:scale-110 transition-transform duration-300`} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-500 group-hover:bg-clip-text transition-all duration-300">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Especificações Técnicas */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4 gradient-text">Especificações Técnicas</h3>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Construído com tecnologias modernas para performance otimizada, segurança e escalabilidade. 
              Primeira IA federada 100% brasileira.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-effect rounded-lg p-6 text-center hover:scale-105 transition-transform duration-200">
              <h4 className="text-lg font-semibold mb-3 text-blue-400">Interface</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>React 18 + TypeScript</div>
                <div>Vite + TailwindCSS</div>
                <div>Electron Desktop</div>
                <div>Responsivo & Moderno</div>
              </div>
            </div>
            
            <div className="glass-effect rounded-lg p-6 text-center hover:scale-105 transition-transform duration-200">
              <h4 className="text-lg font-semibold mb-3 text-purple-400">Motor de IA</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>Gemma 3 & Gemma 3n</div>
                <div>LoRA Adapters</div>
                <div>Treinamento Local</div>
                <div>Busca na Web</div>
              </div>
            </div>
            
            <div className="glass-effect rounded-lg p-6 text-center hover:scale-105 transition-transform duration-200">
              <h4 className="text-lg font-semibold mb-3 text-green-400">Armazenamento</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>DuckDB Local</div>
                <div>Dados Privados</div>
                <div>Backup Seguro</div>
                <div>Zero Cloud</div>
              </div>
            </div>
            
            <div className="glass-effect rounded-lg p-6 text-center hover:scale-105 transition-transform duration-200">
              <h4 className="text-lg font-semibold mb-3 text-cyan-400">Rede Federada</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>P2P Networking</div>
                <div>Compartilhamento LoRA</div>
                <div>Auto-Update</div>
                <div>🇧🇷 Made in Brazil</div>
              </div>
            </div>
          </div>
          
          {/* Requisitos do Sistema */}
          <div className="mt-12 glass-effect rounded-lg p-8">
            <h4 className="text-xl font-semibold mb-6 text-center gradient-text">Requisitos do Sistema</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
              <div className="text-center">
                <h5 className="font-semibold text-blue-400 mb-3">Windows 10/11</h5>
                <div className="space-y-1 text-gray-300">
                  <div>• RAM: 8GB mínimo</div>
                  <div>• GPU: NVIDIA GTX 1060+</div>
                  <div>• Armazenamento: 10GB</div>
                </div>
              </div>
              <div className="text-center">
                <h5 className="font-semibold text-green-400 mb-3">macOS 12+</h5>
                <div className="space-y-1 text-gray-300">
                  <div>• RAM: 8GB mínimo</div>
                  <div>• Chip: M1/M2 ou Intel</div>
                  <div>• Armazenamento: 10GB</div>
                </div>
              </div>
              <div className="text-center">
                <h5 className="font-semibold text-orange-400 mb-3">Linux Ubuntu 20+</h5>
                <div className="space-y-1 text-gray-300">
                  <div>• RAM: 8GB mínimo</div>
                  <div>• GPU: CUDA compatível</div>
                  <div>• Armazenamento: 10GB</div>
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
