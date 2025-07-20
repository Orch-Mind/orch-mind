import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt-BR' | 'en-US';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get initial language from localStorage or default to Portuguese
  const getInitialLanguage = (): Language => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('orch-mind-language') as Language;
      if (saved && (saved === 'pt-BR' || saved === 'en-US')) {
        return saved;
      }
      // Detect browser language
      const browserLang = navigator.language;
      if (browserLang.startsWith('pt')) return 'pt-BR';
      if (browserLang.startsWith('en')) return 'en-US';
    }
    return 'pt-BR'; // Default to Portuguese
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('orch-mind-language', lang);
      // Update document lang attribute
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    // Update document lang on mount
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || translations['pt-BR'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Translations object
const translations: Record<Language, Record<string, string>> = {
  'pt-BR': {
    // Hero Section
    'hero.title.orch': 'Orch-Mind',
    'hero.title.first': 'A primeira IA federada para leigos',
    'hero.title.world': 'do mundo, feita no Brasil.',
    'hero.disclaimer': 'Estágio Alpha Experimental — Participe do nascimento de uma nova era da IA.',
    'hero.subtitle.imagine': 'Imagina ter uma inteligência artificial só sua, rodando direto no seu computador.',
    'hero.subtitle.no': 'Sem servidor na nuvem, sem mensalidade, sem esperar!',
    'hero.promise.free': 'É de graça. Sem assinatura. Sem censura. Tecnologia brasileira para todos.',
    'hero.promise.yours': 'Inovação brasileira levando IA para o mundo todo.',
    
    // CTA Buttons
    'cta.revolution': 'Experimente Agora',
    'cta.open-source': '💾 Código Aberto',
    
    // Microcopy
    'hero.microcopy': 'Totalmente offline. Seus dados nunca saem do seu aparelho.',
    
    // Badges
    'badge.made-brazil': 'Made in Brazil',
    'badge.no-spying': 'Sem Servidor Cloud',
    'badge.always-free': 'É de Graça Sempre',
    'badge.works-offline': 'Roda Sem Internet',
    'badge.zero-delay': 'Delay ZERO',
    
    // Features
    'feature.simple.title': 'Treinamento Simples',
    'feature.simple.desc': 'Interface intuitiva para pessoas leigas treinarem suas próprias IAs',
    'feature.privacy.title': 'Privacidade Total',
    'feature.privacy.desc': 'Todos os dados ficam no seu computador, sem vazamentos',
    'feature.p2p.title': 'Compartilhamento P2P',
    'feature.p2p.desc': 'Compartilhe apenas os adapters, mantendo seus dados privados',
    
    // Navigation
    'nav.home': 'Início',
    'nav.features': 'Recursos',
    'nav.download': 'Download',
    'nav.ecosystem': 'Ecossistema',
    
    // Scroll Indicator
    'scroll.explore': 'Explore mais',
    
    // Language Selector
    'lang.portuguese': 'Português',
    'lang.english': 'English',
    
    // Download Section
    'download.title': 'Comece Agora',
    'download.subtitle': 'Democratize a IA em poucos minutos. Baixe gratuitamente e comece a treinar sua própria inteligência artificial com total privacidade.',
    'download.downloading': 'Iniciando Download...',
    'download.downloadFor': 'Baixar para',
    'download.detected': 'Detectado:',
    'download.freeOpenSource': '100% Gratuito • Código Aberto • Privacidade Total',
    'download.downloadButton': 'Baixar',
    'download.requirements': 'Requisitos:',
    'download.github.title': 'Versões GitHub',
    'download.github.desc': 'Acesse todas as versões, notas de lançamento e código fonte no nosso repositório GitHub.',
    'download.github.button': 'Ver Todas as Versões',
    'download.mobile.title': 'App Mobile',
    'download.mobile.desc': 'App mobile em breve para iOS e Android. Monitore o progresso do treinamento em qualquer lugar.',
    'download.mobile.button': 'Em Breve',
    'download.installation.title': 'Guia de Instalação Rápida',
    'download.installation.step1.title': '1. Baixar',
    'download.installation.step1.desc': 'Clique no botão de download para sua plataforma. O instalador será salvo na sua pasta de downloads.',
    'download.installation.step2.title': '2. Instalar',
    'download.installation.step2.desc': 'Execute o instalador e siga o assistente de configuração. Todas as dependências serão instaladas automaticamente.',
    'download.installation.step3.title': '3. Executar',
    'download.installation.step3.desc': 'Abra o Orch-Mind da sua pasta de aplicativos e comece a explorar o treinamento de IA federada.',
    'download.specs.ram': 'Mínimo 8GB RAM',
    'download.specs.storage': '10GB de armazenamento',
    'download.specs.gpu.nvidia': 'GPU NVIDIA GTX 1060+',
    'download.specs.gpu.cuda': 'GPU CUDA compatível',
    'download.specs.chip': 'Chip M1/M2 ou Intel',
    
    // Footer
    'footer.product': 'Produto',
    'footer.community': 'Comunidade', 
    'footer.legal': 'Legal',
    'footer.resources': 'Recursos',
    'footer.download': 'Download',
    'footer.github': 'GitHub',
    'footer.license': 'Licença',
    'footer.description': 'Plataforma revolucionária de treinamento de IA federada. Código aberto, descentralizada e desenvolvida pela comunidade para o futuro da inteligência artificial.',
    'footer.copyrightStart': 'Feito com',
    'footer.copyrightEnd': 'pela comunidade.',
    'footer.additionalInfo': 'Orch-Mind é um projeto de código aberto. Todo código está disponível sob licença MIT.',
    'footer.builtWith': 'Este site foi construído com React, Vite e Tailwind CSS.',
    
    // Features Section
    'features.title': 'IA Democrática',
    'features.subtitle': 'Tecnologia acessível para estudantes, microempreendedores, empresas, universidades e pesquisadores. Qualquer pessoa pode treinar sua própria inteligência artificial.',
    'features.intuitive.title': 'Interface Intuitiva',
    'features.intuitive.desc': 'Qualquer pessoa pode treinar sua IA sem conhecimento técnico avançado',
    'features.privacy.title': 'Privacidade Total',
    'features.privacy.desc': 'Todos os seus dados ficam no seu computador. Sem servidores externos ou vazamentos',
    'features.chatgpt.title': 'Importa ChatGPT',
    'features.chatgpt.desc': 'Importe suas conversas do ChatGPT para treinar sua IA com seu histórico pessoal',
    'features.adapters.title': 'Adapters Compartilhados',
    'features.adapters.desc': 'Compartilhe apenas os adapters de IA, mantendo seus dados privados e seguros',
    'features.business.title': 'Para Todos os Negócios',
    'features.business.desc': 'Ideal para estudantes, microempreendedores, empresas, universidades e grupos de pesquisa',
    'features.brazilian.title': 'Primeira IA Federada 🇧🇷',
    'features.brazilian.desc': 'Orgulhosamente brasileira, pioneira em IA federada na América Latina',
    'features.fast.title': 'Treinamento Rápido',
    'features.fast.desc': 'Tecnologia LoRA para treinamento eficiente sem precisar de supercomputadores',
    'features.inclusion.title': 'Inclusão Digital',
    'features.inclusion.desc': 'Democratiza o acesso à IA, quebrando barreiras tecnológicas e econômicas',
    'features.specs.title': 'Especificações Técnicas',
    'features.specs.subtitle': 'Construído com tecnologias modernas para performance otimizada, segurança e escalabilidade. Primeira IA federada 100% brasileira.',
    'features.specs.interface': 'Interface',
    'features.specs.ai-engine': 'Motor de IA',
    'features.specs.storage': 'Armazenamento',
    'features.specs.network': 'Rede Federada',
    'features.specs.requirements': 'Requisitos do Sistema',
    
    // Technical Specifications Details
    'features.specs.responsive': 'Responsivo & Moderno',
    'features.specs.training': 'Treinamento Local',
    'features.specs.websearch': 'Busca na Web',
    'features.specs.privatedata': 'Dados Privados',
    'features.specs.backup': 'Backup Seguro',
    'features.specs.zerocloud': 'Zero Cloud',
    'features.specs.p2p': 'P2P Networking',
    'features.specs.lorashare': 'Compartilhamento LoRA',
    'features.specs.autoupdate': 'Auto-Update',
    'features.specs.madeinbrazil': '🇧🇷 Made in Brazil',
    
    // System Requirements Details
    'features.req.ram': 'RAM: 8GB mínimo',
    'features.req.storage': 'Armazenamento: 10GB',
    'features.req.gpu.nvidia': 'GPU: NVIDIA GTX 1060+',
    'features.req.gpu.cuda': 'GPU: CUDA compatível',
    'features.req.chip': 'Chip: M1/M2 ou Intel',
    
    // Download Section
    'download.main-title': 'Baixar Orch-Mind',
    'download.main-subtitle': 'Comece sua jornada com IA federada brasileira',
    'download.specs-title': 'Especificações Técnicas',
    'download.specs-subtitle': 'Tecnologia de ponta desenvolvida no Brasil',
    'download.specs.system': 'Requisitos do Sistema',
    'download.specs.gpu': 'GPU recomendada',
    'download.specs.os': 'Windows, macOS, Linux',
    'download.specs.features': 'Recursos Técnicos',
    'download.specs.models': 'Modelos Gemma 3 e 3n',
    'download.specs.lora': 'Adaptadores LoRA',
    'download.specs.p2p': 'Protocolo P2P',
    'download.specs.encryption': 'Criptografia E2E',
    'download.button.windows': 'Baixar para Windows',
    'download.button.mac': 'Baixar para macOS',
    'download.button.linux': 'Baixar para Linux',
    'download.version': 'Versão',
    'download.size': 'Tamanho',
    'download.free': 'Gratuito',
  },
  
  'en-US': {
    // Hero Section
    'hero.title.orch': 'Orch-Mind',
    'hero.title.first': 'The first federated AI for laypeople',
    'hero.title.world': 'worldwide, made in Brazil.',
    'hero.disclaimer': 'Alpha Experimental Stage — Participate in the birth of a new AI era.',
    'hero.subtitle.imagine': 'Imagine having your own artificial intelligence, running directly on your computer.',
    'hero.subtitle.no': 'No cloud servers, no monthly fees, no waiting!',
    'hero.promise.free': 'It\'s free. No subscription. No censorship. Brazilian technology for everyone.',
    'hero.promise.yours': 'Brazilian innovation bringing AI to the entire world.',
    
    // CTA Buttons
    'cta.revolution': 'Try It Now',
    'cta.open-source': '💾 Open Source',
    
    // Microcopy
    'hero.microcopy': 'Completely offline. Your data never leaves your device.',
    
    // Badges
    'badge.made-brazil': 'Made in Brazil',
    'badge.no-spying': 'No Cloud Servers',
    'badge.always-free': 'Always Free',
    'badge.works-offline': 'Works Offline',
    'badge.zero-delay': 'Zero Delay',
    
    // Features
    'feature.simple.title': 'Simple Training',
    'feature.simple.desc': 'Intuitive interface for laypeople to train their own AIs',
    'feature.privacy.title': 'Total Privacy',
    'feature.privacy.desc': 'All data stays on your computer, no leaks',
    'feature.p2p.title': 'P2P Sharing',
    'feature.p2p.desc': 'Share only adapters, keep your data private',
    
    // Navigation
    'nav.home': 'Home',
    'nav.features': 'Features',
    'nav.download': 'Download',
    'nav.ecosystem': 'Ecosystem',
    
    // Scroll Indicator
    'scroll.explore': 'Explore more',
    
    // Language Selector
    'lang.portuguese': 'Português',
    'lang.english': 'English',
    
    // Download Section
    'download.title': 'Start Now',
    'download.subtitle': 'Democratize AI in minutes. Download for free and start training your own artificial intelligence with total privacy.',
    'download.downloading': 'Starting Download...',
    'download.downloadFor': 'Download for',
    'download.detected': 'Detected:',
    'download.freeOpenSource': '100% Free • Open Source • Total Privacy',
    'download.downloadButton': 'Download',
    'download.requirements': 'Requirements:',
    'download.github.title': 'GitHub Releases',
    'download.github.desc': 'Access all versions, release notes and source code on our GitHub repository.',
    'download.github.button': 'View All Versions',
    'download.mobile.title': 'Mobile App',
    'download.mobile.desc': 'Mobile app coming soon for iOS and Android. Monitor training progress anywhere.',
    'download.mobile.button': 'Coming Soon',
    'download.installation.title': 'Quick Installation Guide',
    'download.installation.step1.title': '1. Download',
    'download.installation.step1.desc': 'Click the download button for your platform. The installer will be saved to your downloads folder.',
    'download.installation.step2.title': '2. Install',
    'download.installation.step2.desc': 'Run the installer and follow the setup wizard. All dependencies will be installed automatically.',
    'download.installation.step3.title': '3. Run',
    'download.installation.step3.desc': 'Open Orch-Mind from your applications folder and start exploring federated AI training.',
    
    // System Requirements Specs
    'download.specs.ram': 'Minimum 8GB RAM',
    'download.specs.storage': '10GB storage space',
    'download.specs.gpu.nvidia': 'NVIDIA GTX 1060+ GPU',
    'download.specs.gpu.cuda': 'CUDA compatible GPU',
    'download.specs.chip': 'M1/M2 or Intel chip',
    
    // Footer
    'footer.product': 'Product',
    'footer.community': 'Community',
    'footer.legal': 'Legal',
    'footer.resources': 'Features',
    'footer.download': 'Download',
    'footer.github': 'GitHub',
    'footer.license': 'License',
    'footer.description': 'Revolutionary federated AI training platform. Open source, decentralized and developed by the community for the future of artificial intelligence.',
    'footer.copyrightStart': 'Made with',
    'footer.copyrightEnd': 'by the community.',
    'footer.additionalInfo': 'Orch-Mind is an open-source project. All code is available under MIT license.',
    'footer.builtWith': 'This website is built with React, Vite, and Tailwind CSS.',
    
    // Features Section
    'features.title': 'Democratic AI',
    'features.subtitle': 'Accessible technology for students, micro-entrepreneurs, companies, universities and researchers. Anyone can train their own artificial intelligence.',
    'features.intuitive.title': 'Intuitive Interface',
    'features.intuitive.desc': 'Anyone can train their AI without advanced technical knowledge',
    'features.privacy.title': 'Total Privacy',
    'features.privacy.desc': 'All your data stays on your computer. No external servers or leaks',
    'features.chatgpt.title': 'Import ChatGPT',
    'features.chatgpt.desc': 'Import your ChatGPT conversations to train your AI with your personal history',
    'features.adapters.title': 'Shared Adapters',
    'features.adapters.desc': 'Share only AI adapters, keeping your data private and secure',
    'features.business.title': 'For All Businesses',
    'features.business.desc': 'Ideal for students, micro-entrepreneurs, companies, universities and research groups',
    'features.brazilian.title': 'First Federated AI 🇧🇷',
    'features.brazilian.desc': 'Proudly Brazilian, pioneer in federated AI in Latin America',
    'features.fast.title': 'Fast Training',
    'features.fast.desc': 'LoRA technology for efficient training without needing supercomputers',
    'features.inclusion.title': 'Digital Inclusion',
    'features.inclusion.desc': 'Democratizes AI access, breaking technological and economic barriers',
    'features.specs.title': 'Technical Specifications',
    'features.specs.subtitle': 'Built with modern technologies for optimized performance, security and scalability. First 100% Brazilian federated AI.',
    'features.specs.interface': 'Interface',
    'features.specs.ai-engine': 'AI Engine',
    'features.specs.storage': 'Storage',
    'features.specs.network': 'Federated Network',
    'features.specs.requirements': 'System Requirements',
    
    // Technical Specifications Details
    'features.specs.responsive': 'Responsive & Modern',
    'features.specs.training': 'Local Training',
    'features.specs.websearch': 'Web Search',
    'features.specs.privatedata': 'Private Data',
    'features.specs.backup': 'Secure Backup',
    'features.specs.zerocloud': 'Zero Cloud',
    'features.specs.p2p': 'P2P Networking',
    'features.specs.lorashare': 'LoRA Sharing',
    'features.specs.autoupdate': 'Auto-Update',
    'features.specs.madeinbrazil': '🇧🇷 Made in Brazil',
    
    // System Requirements Details
    'features.req.ram': 'RAM: 8GB minimum',
    'features.req.storage': 'Storage: 10GB',
    'features.req.gpu.nvidia': 'GPU: NVIDIA GTX 1060+',
    'features.req.gpu.cuda': 'GPU: CUDA compatible',
    'features.req.chip': 'Chip: M1/M2 or Intel',
    'features.ai-engine': 'AI Engine',
    'features.ai-engine.desc': 'Based on the most advanced Gemma 3 and 3n models',
    'features.federated': 'Federated Learning',
    'features.federated.desc': 'Share knowledge without exposing private data',
    'features.p2p': 'P2P Network',
    'features.p2p.desc': 'Connect directly with other users',
    'features.offline': 'Works Offline',
    'features.offline.desc': 'Complete AI without internet dependency',
    'features.research': 'Web Research',
    'features.research.desc': 'Automatic search on Google, Bing and DuckDuckGo',
    
    // Download Section
    'download.main-title': 'Download Orch-Mind',
    'download.main-subtitle': 'Start your Brazilian federated AI journey',
    'download.specs-title': 'Technical Specifications',
    'download.specs-subtitle': 'Cutting-edge technology developed in Brazil',
    'download.specs.system': 'System Requirements',
    'download.specs.gpu': 'GPU recommended',
    'download.specs.os': 'Windows, macOS, Linux',
    'download.specs.features': 'Technical Features',
    'download.specs.models': 'Gemma 3 and 3n Models',
    'download.specs.lora': 'LoRA Adapters',
    'download.specs.p2p': 'P2P Protocol',
    'download.specs.encryption': 'E2E Encryption',
    'download.button.windows': 'Download for Windows',
    'download.button.mac': 'Download for macOS',
    'download.button.linux': 'Download for Linux',
    'download.version': 'Version',
    'download.size': 'Size',
    'download.free': 'Free',
  }
};
