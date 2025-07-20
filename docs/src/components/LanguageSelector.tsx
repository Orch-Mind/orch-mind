import React, { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage, type Language } from '../contexts/LanguageContext';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'pt-BR', label: t('lang.portuguese'), flag: '🇧🇷' },
    { code: 'en-US', label: t('lang.english'), flag: '🇺🇸' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  const handleLanguageChange = (langCode: Language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 transition-all duration-200 text-sm font-medium text-gray-300 hover:text-white backdrop-blur-sm"
        aria-label="Select language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:flex items-center space-x-1">
          <span className="text-base">{currentLanguage.flag}</span>
          <span>{currentLanguage.code.split('-')[0].toUpperCase()}</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-600/30 py-2 z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-700/50 transition-colors duration-200 flex items-center space-x-3 ${
                  language === lang.code 
                    ? 'text-blue-400 bg-gray-700/30' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{lang.label}</span>
                  <span className="text-xs text-gray-500">{lang.code}</span>
                </div>
                {language === lang.code && (
                  <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
