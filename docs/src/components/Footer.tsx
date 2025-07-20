import React from 'react';
import { Github, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'Recursos', href: '#features' },
      { name: 'Download', href: '#download' }
    ],
    community: [
      { name: 'GitHub', href: 'https://github.com/guiferrarib/orch-mind' }
    ],
    legal: [
      { name: 'Licença', href: 'https://github.com/guiferrarib/orch-mind/blob/main/LICENSE' }
    ]
  };

  const socialLinks = [
    { icon: Github, href: 'https://github.com/guiferrarib/orch-mind', label: 'GitHub' }
  ];

  return (
    <footer className="relative bg-gray-900/50 border-t border-gray-800">
      <div className="container-custom section-padding">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <img 
                src="/orch-mind-logo.png" 
                alt="Orch-Mind Logo" 
                className="w-10 h-10 object-contain"
                style={{ 
                  filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5)) brightness(1.2) contrast(1.1)',
                  mixBlendMode: 'screen'
                }}
              />
              <span className="text-2xl font-bold gradient-text">Orch-Mind</span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Plataforma revolucionária de treinamento de IA federada. Código aberto, descentralizada 
              e desenvolvida pela comunidade para o futuro da inteligência artificial.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-all duration-200 transform hover:scale-110"
                  aria-label={link.label}
                >
                  <link.icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Produto</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Community links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Comunidade</h3>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>


        </div>

        {/* Bottom section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              <p className="flex items-center">
                © {currentYear} Orch-Mind. Feito com{' '}
                <Heart className="w-4 h-4 mx-1 text-red-500" fill="currentColor" />
                pela comunidade.
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              {footerLinks.legal.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
          
          {/* Additional info */}
          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-xs">
              Orch-Mind is an open-source project. All code is available under MIT license.
              <br />
              This website is built with React, Vite, and Tailwind CSS.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
