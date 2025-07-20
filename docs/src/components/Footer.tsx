import React from 'react';
import { Github, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: t('footer.resources'), href: '#features' },
      { name: t('footer.download'), href: '#download' }
    ],
    community: [
      { name: 'GitHub', href: 'https://github.com/guiferrarib/orch-mind' }
    ],
    legal: [
      { name: t('footer.license'), href: 'https://github.com/guiferrarib/orch-mind/blob/main/LICENSE' }
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
              <span className="text-2xl font-orbitron-title gradient-text">Orch-Mind</span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              {t('footer.description')}
            </p>
            {/* Premium Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((link, index) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`relative p-3 text-gray-400 hover:text-white bg-gradient-to-br from-gray-900/60 via-gray-800/40 to-gray-900/60 rounded-xl border border-gray-600/30 hover:border-cyan-400/50 transition-all duration-300 transform hover:scale-125 hover:rotate-6 group shadow-lg hover:shadow-cyan-500/25`}
                  aria-label={link.label}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-cyan-500/10 to-blue-500/10"></div>
                  <link.icon className="relative z-10 group-hover:animate-pulse" size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Product links - Premium Style */}
          <div>
            <h3 className="text-lg font-orbitron-title mb-6 text-white">
              {t('footer.product')}
            </h3>
            <ul className="space-y-4">
              {footerLinks.product.map((link, index) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="group flex items-center text-gray-400 hover:text-cyan-300 transition-all duration-300 font-montserrat hover:translate-x-2"
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="w-1 h-1 bg-cyan-400 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <span className="group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-blue-400 group-hover:bg-clip-text transition-all duration-300">
                      {link.name}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Community links */}
          <div>
            <h3 className="text-lg font-orbitron-title mb-6 text-white">{t('footer.community')}</h3>
            <ul className="space-y-4">
              {footerLinks.community.map((link, index) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center text-gray-400 hover:text-cyan-300 transition-all duration-300 font-montserrat hover:translate-x-2"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="w-1 h-1 bg-cyan-400 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <span className="group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-blue-400 group-hover:bg-clip-text transition-all duration-300">
                      {link.name}
                    </span>
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
              <p className="flex items-center font-montserrat">
                © {currentYear} Orch-Mind. {t('footer.copyrightStart')}{' '}
                <Heart className="w-4 h-4 mx-1 text-red-500" fill="currentColor" />
                {t('footer.copyrightEnd')}
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              {footerLinks.legal.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-400 hover:text-white transition-colors duration-200 font-montserrat"
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
            <p className="text-gray-500 text-xs font-montserrat">
              {t('footer.additionalInfo')}
              <br />
              {t('footer.builtWith')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
