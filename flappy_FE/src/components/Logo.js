import React from 'react';

const Logo = ({ size = 'md', variant = 'default', className = '' }) => {
  const sizes = {
    sm: { width: 24, height: 24, text: 'text-lg' },
    md: { width: 32, height: 32, text: 'text-xl' },
    lg: { width: 40, height: 40, text: 'text-2xl' },
    xl: { width: 48, height: 48, text: 'text-3xl' }
  };

  const currentSize = sizes[size];

  // Logo with bird icon
  const BirdLogo = () => (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <svg
          width={currentSize.width}
          height={currentSize.height}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bird body */}
          <ellipse cx="20" cy="18" rx="8" ry="6" fill="#3B82F6" />
          
          {/* Bird head */}
          <circle cx="12" cy="12" r="6" fill="#3B82F6" />
          
          {/* Wing */}
          <ellipse cx="22" cy="16" rx="4" ry="3" fill="#1D4ED8" />
          
          {/* Beak */}
          <polygon points="6,12 2,10 6,14" fill="#F59E0B" />
          
          {/* Eye */}
          <circle cx="10" cy="10" r="1.5" fill="white" />
          <circle cx="10" cy="10" r="0.8" fill="black" />
          
          {/* Tail feathers */}
          <ellipse cx="28" cy="20" rx="2" ry="4" fill="#1D4ED8" />
          <ellipse cx="26" cy="22" rx="1.5" ry="3" fill="#2563EB" />
        </svg>
      </div>
      <span className={`font-bold text-primary-600 ${currentSize.text}`}>
        Flappy
      </span>
    </div>
  );

  // Simple text logo
  const TextLogo = () => (
    <div className={`${className}`}>
      <span className={`font-bold text-primary-600 ${currentSize.text}`}>
        Flappy
      </span>
    </div>
  );

  // Logo with wing icon
  const WingLogo = () => (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <svg
          width={currentSize.width}
          height={currentSize.height}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Wing shape */}
          <path
            d="M8 16C8 16 12 8 20 12C28 16 24 24 16 20C8 16 8 16 8 16Z"
            fill="#3B82F6"
          />
          <path
            d="M10 16C10 16 13 10 19 13C25 16 22 22 16 19C10 16 10 16 10 16Z"
            fill="#1D4ED8"
          />
          <circle cx="16" cy="16" r="2" fill="white" />
        </svg>
      </div>
      <span className={`font-bold text-primary-600 ${currentSize.text}`}>
        Flappy
      </span>
    </div>
  );

  // Circular logo
  const CircleLogo = () => (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className="rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center"
        style={{ width: currentSize.width, height: currentSize.height }}
      >
        <span className="text-white font-bold text-sm">F</span>
      </div>
      <span className={`font-bold text-primary-600 ${currentSize.text}`}>
        Flappy
      </span>
    </div>
  );

  switch (variant) {
    case 'bird':
      return <BirdLogo />;
    case 'text':
      return <TextLogo />;
    case 'wing':
      return <WingLogo />;
    case 'circle':
      return <CircleLogo />;
    default:
      return <BirdLogo />;
  }
};

export default Logo;