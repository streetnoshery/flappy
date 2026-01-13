import React from 'react';
import Logo from '../components/Logo';

const LogoShowcase = () => {
  const variants = ['bird', 'wing', 'circle', 'text'];
  const sizes = ['sm', 'md', 'lg', 'xl'];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Flappy Logo Showcase</h1>
          <p className="text-gray-600">Choose your preferred logo style and size</p>
        </div>

        {/* Logo Variants */}
        <div className="space-y-12">
          {variants.map((variant) => (
            <div key={variant} className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 capitalize">
                {variant} Logo
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {sizes.map((size) => (
                  <div key={size} className="text-center">
                    <div className="bg-gray-50 rounded-lg p-6 mb-4 flex items-center justify-center min-h-[100px]">
                      <Logo size={size} variant={variant} />
                    </div>
                    <p className="text-sm text-gray-600 capitalize">Size: {size}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Usage Examples */}
        <div className="mt-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Usage Examples</h2>
          
          <div className="space-y-8">
            {/* Navbar Example */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Navbar</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Logo size="md" variant="bird" />
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">Menu items...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Page Example */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Login Page</h3>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Logo size="xl" variant="bird" className="justify-center mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Sign in to Flappy</h2>
              </div>
            </div>

            {/* Different Backgrounds */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Different Backgrounds</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-lg border text-center">
                  <Logo size="lg" variant="bird" className="justify-center" />
                  <p className="text-sm text-gray-600 mt-2">White Background</p>
                </div>
                <div className="bg-gray-900 p-6 rounded-lg text-center">
                  <Logo size="lg" variant="bird" className="justify-center" />
                  <p className="text-sm text-gray-400 mt-2">Dark Background</p>
                </div>
                <div className="bg-primary-600 p-6 rounded-lg text-center">
                  <div className="filter brightness-0 invert">
                    <Logo size="lg" variant="bird" className="justify-center" />
                  </div>
                  <p className="text-sm text-primary-100 mt-2">Brand Background</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="mt-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Implementation Guide</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Basic Usage</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import Logo from './components/Logo';

// Default bird logo
<Logo />

// Different variants
<Logo variant="bird" />
<Logo variant="wing" />
<Logo variant="circle" />
<Logo variant="text" />

// Different sizes
<Logo size="sm" />
<Logo size="md" />
<Logo size="lg" />
<Logo size="xl" />

// Custom styling
<Logo className="justify-center mb-4" />`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoShowcase;