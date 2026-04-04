import React from 'react';
import { Shield } from 'lucide-react';

/* Decorative animated blobs in the background */
const Blobs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow" />
    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow" style={{ animationDelay: '2s' }} />
  </div>
);

const AuthLayout = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center px-4 py-10 relative">
    <Blobs />

    {/* Card */}
    <div className="relative z-10 w-full max-w-md animate-slide-up">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-card border border-white/60 px-8 py-10">
        {children}
      </div>

      {/* Trust signal */}
      <div className="flex items-center justify-center gap-2 mt-5 text-xs text-slate-400">
        <Shield className="w-3.5 h-3.5" />
        <span>Secured with 256-bit encryption</span>
      </div>
    </div>
  </div>
);

export default AuthLayout;
