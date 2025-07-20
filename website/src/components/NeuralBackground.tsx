import React from 'react';

const NeuralBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20" />
      
      {/* Neural network lines */}
      <div className="neural-lines">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
              <stop offset="50%" stopColor="rgba(168, 85, 247, 0.5)" />
              <stop offset="100%" stopColor="rgba(236, 72, 153, 0.3)" />
            </linearGradient>
          </defs>
          
          {/* Animated neural network pattern */}
          <g stroke="url(#line-gradient)" strokeWidth="1" fill="none" opacity="0.6">
            <path d="M100,200 Q300,100 500,200 T900,200" className="animate-pulse-slow" />
            <path d="M200,300 Q400,200 600,300 T1000,300" className="animate-pulse-slow" style={{animationDelay: '1s'}} />
            <path d="M150,400 Q350,300 550,400 T950,400" className="animate-pulse-slow" style={{animationDelay: '2s'}} />
            <path d="M50,500 Q250,400 450,500 T850,500" className="animate-pulse-slow" style={{animationDelay: '3s'}} />
          </g>
          
          {/* Neural nodes */}
          <g fill="url(#line-gradient)">
            <circle cx="100" cy="200" r="4" className="animate-glow" />
            <circle cx="500" cy="200" r="4" className="animate-glow" style={{animationDelay: '0.5s'}} />
            <circle cx="900" cy="200" r="4" className="animate-glow" style={{animationDelay: '1s'}} />
            <circle cx="200" cy="300" r="4" className="animate-glow" style={{animationDelay: '1.5s'}} />
            <circle cx="600" cy="300" r="4" className="animate-glow" style={{animationDelay: '2s'}} />
            <circle cx="1000" cy="300" r="4" className="animate-glow" style={{animationDelay: '2.5s'}} />
          </g>
        </svg>
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full animate-float opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default NeuralBackground;
