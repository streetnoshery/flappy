import React from 'react';

const Spinner = () => (
  <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const AuthButton = ({ children, loading, disabled, variant = 'primary', className = '', ...props }) => {
  const base = 'relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: `
      bg-btn-gradient text-white shadow-md
      hover:shadow-glow hover:scale-[1.01] active:scale-[0.99]
      focus:ring-primary-400
      disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-md
    `,
    secondary: `
      bg-white text-slate-700 border border-slate-200
      hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99]
      focus:ring-slate-300
      disabled:opacity-50
    `,
    ghost: `
      text-primary-600 hover:bg-primary-50 active:scale-[0.99]
      focus:ring-primary-300
    `,
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
};

export default AuthButton;
