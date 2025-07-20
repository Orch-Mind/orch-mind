import React from 'react';
import { CheckCircle, Circle, Clock, Zap } from 'lucide-react';

const Roadmap: React.FC = () => {
  const roadmapItems = [
    {
      phase: 'Fase 1',
      title: 'Fundação',
      status: 'completed',
      quarter: 'Q4 2023',
      items: [
        'Desenvolvimento da aplicação Electron principal',
        'Implementação básica do treinamento LoRA',
        'Design inicial da interface do usuário',
        'Configuração da arquitetura do projeto'
      ]
    },
    {
      phase: 'Fase 2',
      title: 'Rede P2P',
      status: 'completed',
      quarter: 'Q1 2024',
      items: [
        'Protocolo de rede P2P',
        'Infraestrutura de compartilhamento de modelos',
        'Implementação básica de segurança',
        'Programa de testes alfa'
      ]
    },
    {
      phase: 'Fase 3',
      title: 'Integração Blockchain',
      status: 'in-progress',
      quarter: 'Q2 2024',
      items: [
        'Desenvolvimento de contratos inteligentes',
        'Implementação da economia do token',
        'Integração de carteira',
        'Sistema de transações'
      ]
    },
    {
      phase: 'Fase 4',
      title: 'Recursos Avançados',
      status: 'upcoming',
      quarter: 'Q3 2024',
      items: [
        'Otimização avançada de modelos de IA',
        'App mobile multiplataforma',
        'Protocolos de segurança aprimorados',
        'Ferramentas de governança comunitária'
      ]
    },
    {
      phase: 'Fase 5',
      title: 'Expansão do Ecossistema',
      status: 'upcoming',
      quarter: 'Q4 2024',
      items: [
        'Marketplace para modelos de IA',
        'Parcerias empresariais',
        'API para integração de terceiros',
        'Infraestrutura de escala global'
      ]
    },
    {
      phase: 'Fase 6',
      title: 'Visão Futura',
      status: 'planned',
      quarter: '2025+',
      items: [
        'Suporte multi-blockchain',
        'Aprendizado federado avançado',
        'Certificação de modelos de IA',
        'Organização autônoma descentralizada'
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'in-progress':
        return <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />;
      case 'upcoming':
        return <Clock className="w-6 h-6 text-blue-400" />;
      default:
        return <Circle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-400 bg-green-400/10';
      case 'in-progress':
        return 'border-yellow-400 bg-yellow-400/10';
      case 'upcoming':
        return 'border-blue-400 bg-blue-400/10';
      default:
        return 'border-gray-400 bg-gray-400/10';
    }
  };

  return (
    <section id="roadmap" className="section-padding relative">
      <div className="container-custom">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">Roadmap de Desenvolvimento</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Nossa jornada para revolucionar o treinamento de IA federada. 
            Acompanhe nosso progresso e veja o que vem por aí.
          </p>
        </div>

        {/* Progress overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <div className="glass-effect rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">2</div>
            <div className="text-sm text-gray-400">Concluídas</div>
          </div>
          <div className="glass-effect rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">1</div>
            <div className="text-sm text-gray-400">Em Andamento</div>
          </div>
          <div className="glass-effect rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">2</div>
            <div className="text-sm text-gray-400">Próximas</div>
          </div>
          <div className="glass-effect rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-400 mb-1">1</div>
            <div className="text-sm text-gray-400">Planejadas</div>
          </div>
        </div>

        {/* Roadmap timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-400 via-yellow-400 via-blue-400 to-gray-400 transform md:-translate-x-0.5"></div>

          {/* Roadmap items */}
          <div className="space-y-12">
            {roadmapItems.map((item, index) => (
              <div
                key={item.phase}
                className={`relative flex flex-col md:flex-row items-start md:items-center ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Timeline dot */}
                <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 -translate-y-1">
                  <div className={`w-8 h-8 rounded-full border-2 ${getStatusColor(item.status)} flex items-center justify-center`}>
                    {getStatusIcon(item.status)}
                  </div>
                </div>

                {/* Content */}
                <div className={`ml-16 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-8' : 'md:pl-8'}`}>
                  <div className="glass-effect rounded-xl p-6 hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold gradient-text">{item.phase}</h3>
                        <h4 className="text-lg text-white">{item.title}</h4>
                      </div>
                      <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                        {item.quarter}
                      </span>
                    </div>
                    
                    <ul className="space-y-2">
                      {item.items.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start space-x-2 text-sm text-gray-300">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="mt-16 text-center">
          <div className="glass-effect rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold mb-4 gradient-text">
              Junte-se à Nossa Jornada
            </h3>
            <p className="text-gray-300 mb-6">
              Faça parte da revolução da IA federada. Acompanhe nosso progresso, contribua com o desenvolvimento 
              e ajude a moldar o futuro do aprendizado de máquina descentralizado.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/guiferrarib/orch-mind"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Contribuir no GitHub
              </a>
              <a
                href="https://t.me/orchmind"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Entrar na Comunidade
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Roadmap;
