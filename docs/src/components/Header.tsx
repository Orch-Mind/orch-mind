import React, { useState, useEffect } from 'react';
import { Menu, Github, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: t('nav.home'), href: '#home' },
    { name: t('nav.features'), href: '#features' },
    { name: t('nav.download'), href: '#download' },
  ];

  const socialLinks = [
    { icon: Github, href: 'https://github.com/guiferrarib/orch-mind', label: 'GitHub' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'glass-effect shadow-lg' : 'bg-transparent'
    }`}>
      <nav className="container-custom section-padding py-4">
        <div className="flex items-center justify-between relative">
          {/* Logo - Left (Clickable) */}
          <a 
            href="#home" 
            className="flex items-center space-x-3 group cursor-pointer transition-all duration-300 hover:scale-105"
            aria-label={t('nav.home')}
          >
            <img 
              src="/orch-mind-logo.png" 
              alt="Orch-Mind Logo" 
              className="w-10 h-10 object-contain group-hover:drop-shadow-lg transition-all duration-300"
              style={{ 
                filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5)) brightness(1.2) contrast(1.1)',
                mixBlendMode: 'screen'
              }}
            />
            <span className="text-2xl font-orbitron-title gradient-text group-hover:text-cyan-300 transition-colors duration-300">Orch-Mind</span>
          </a>

          {/* Desktop Navigation - Section Navigation Style */}
          <div className="hidden md:flex items-center space-x-6 absolute left-1/2 transform -translate-x-1/2">
            {navItems.map((item, index) => (
              <a
                key={item.name}
                href={item.href}
                className="relative group text-gray-300 hover:text-cyan-300 transition-all duration-300 font-montserrat px-3 py-2 rounded-lg hover:scale-105 hover:shadow-sm"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="relative z-10 transition-all duration-300">
                  {item.name}
                </span>
                {/* Subtle dot indicator for section navigation */}
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 scale-0 group-hover:scale-100"></div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-cyan-500/5"></div>
              </a>
            ))}
          </div>

          {/* Social Links and Language Selector - Premium Style */}
          <div className="hidden lg:flex items-center space-x-3">
            {socialLinks.map((link, index) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="relative p-2 text-gray-400 hover:text-white bg-gray-800/30 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-cyan-400/50 transition-all duration-300 transform hover:scale-110 group backdrop-blur-sm"
                aria-label={link.label}
                style={{ animationDelay: `${index * 0.1}s` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-cyan-500/10 to-blue-500/10"></div>
                <link.icon className="relative z-10 group-hover:animate-pulse" size={18} />
              </a>
            ))}
            <LanguageSelector />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors duration-200"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 glass-effect rounded-lg">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-300 hover:text-white transition-colors duration-200 font-montserrat px-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="flex items-center justify-center space-x-4 pt-4 border-t border-gray-700">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                    aria-label={link.label}
                  >
                    <link.icon size={20} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
