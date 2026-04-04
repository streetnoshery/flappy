import React from 'react';

const checks = [
  { key: 'length',    label: '8+ characters',          test: p => p.length >= 8 },
  { key: 'uppercase', label: 'Uppercase letter',        test: p => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'Lowercase letter',        test: p => /[a-z]/.test(p) },
  { key: 'number',    label: 'Number',                  test: p => /\d/.test(p) },
  { key: 'special',   label: 'Special char (@$!%*?&)',  test: p => /[@$!%*?&]/.test(p) },
];

const levels = [
  { label: 'Very weak', color: 'bg-red-500' },
  { label: 'Weak',      color: 'bg-orange-500' },
  { label: 'Fair',      color: 'bg-yellow-500' },
  { label: 'Good',      color: 'bg-blue-500' },
  { label: 'Strong',    color: 'bg-emerald-500' },
];

const PasswordStrength = ({ password }) => {
  if (!password) return null;

  const passed = checks.filter(c => c.test(password));
  const score  = passed.length; // 0–5
  const level  = levels[Math.max(0, score - 1)];

  return (
    <div className="mt-2 space-y-2 animate-fade-in">
      {/* Bar */}
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? level.color : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Strength: <span className="font-medium text-slate-700">{level.label}</span>
      </p>
      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map(c => {
          const ok = c.test(password);
          return (
            <span key={c.key} className={`text-xs flex items-center gap-1 transition-colors ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span>{ok ? '✓' : '○'}</span> {c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default PasswordStrength;
