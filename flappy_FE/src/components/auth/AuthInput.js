import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const AuthInput = React.forwardRef(({
  label,
  icon: Icon,
  type = 'text',
  error,
  className = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Icon className={`w-4 h-4 transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-primary-500'}`} />
          </div>
        )}
        <input
          ref={ref}
          type={inputType}
          className={`
            w-full rounded-xl border bg-white/70 text-slate-900 text-sm
            transition-all duration-200 outline-none
            placeholder:text-slate-400
            ${Icon ? 'pl-10' : 'pl-4'}
            ${isPassword ? 'pr-11' : 'pr-4'}
            py-3
            ${error
              ? 'border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
              : 'border-slate-200 focus:border-primary-400 focus:shadow-input'
            }
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 animate-fade-in" role="alert">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
});

AuthInput.displayName = 'AuthInput';
export default AuthInput;
