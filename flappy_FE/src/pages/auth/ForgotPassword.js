import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Key, Lock, ArrowLeft, Copy, CheckCheck } from 'lucide-react';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import PasswordStrength from '../../components/auth/PasswordStrength';
import Logo from '../../components/Logo';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetTokenInfo, setResetTokenInfo] = useState(null);
  const [formData, setFormData] = useState({
    username: '', resetToken: '', newPassword: '', confirmPassword: '',
  });

  const set = (field) => (e) => setFormData(p => ({ ...p, [field]: e.target.value }));

  const copyToken = async () => {
    await navigator.clipboard.writeText(resetTokenInfo.resetToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) return toast.error('Please enter your username');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ username: formData.username });
      setResetTokenInfo(res.data);
      setStep(2);
      toast.success('Reset token generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate reset token');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!formData.resetToken.trim()) return toast.error('Please enter the reset token');
    if (!formData.newPassword)       return toast.error('Please enter a new password');
    if (formData.newPassword !== formData.confirmPassword) return toast.error('Passwords do not match');
    if (!passwordRegex.test(formData.newPassword))
      return toast.error('Password must be 8+ chars with uppercase, lowercase, number & special char');

    setLoading(true);
    try {
      const res = await authAPI.resetPassword({
        username: formData.username,
        resetToken: formData.resetToken,
        newPassword: formData.newPassword,
      });
      toast.success('Password reset! Redirecting…');
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Header */}
      <div className="text-center mb-8">
        <Logo size="lg" variant="bird" className="justify-center mb-5" />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {step === 1 ? 'Forgot password?' : 'Reset password'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {step === 1
            ? 'Enter your username to get a reset token'
            : 'Enter the token and choose a new password'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map(s => (
          <React.Fragment key={s}>
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
              s <= step ? 'bg-btn-gradient text-white shadow-glow' : 'bg-slate-100 text-slate-400'
            }`}>
              {s < step ? '✓' : s}
            </div>
            {s < 2 && <div className={`flex-1 h-0.5 rounded transition-all duration-500 ${step > s ? 'bg-primary-500' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 ? (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <AuthInput
            label="Username"
            icon={User}
            type="text"
            placeholder="Enter your username"
            value={formData.username}
            onChange={set('username')}
          />
          <div className="pt-1">
            <AuthButton type="submit" loading={loading} disabled={!formData.username.trim()}>
              {loading ? 'Generating token…' : 'Get reset token'}
            </AuthButton>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {/* Token display box */}
          {resetTokenInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
              <p className="text-xs font-semibold text-amber-700 mb-2">Your reset token:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-amber-800 bg-amber-100 rounded-lg px-3 py-2 break-all">
                  {resetTokenInfo.resetToken}
                </code>
                <button
                  type="button"
                  onClick={copyToken}
                  className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors flex-shrink-0"
                  title="Copy token"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                Expires: {new Date(resetTokenInfo.expiresAt).toLocaleString()}
              </p>
            </div>
          )}

          <AuthInput
            label="Reset Token"
            icon={Key}
            type="text"
            placeholder="Paste the reset token"
            value={formData.resetToken}
            onChange={set('resetToken')}
            className="font-mono"
          />

          <div>
            <AuthInput
              label="New Password"
              icon={Lock}
              type="password"
              placeholder="Create a strong password"
              value={formData.newPassword}
              onChange={set('newPassword')}
            />
            <PasswordStrength password={formData.newPassword} />
          </div>

          <AuthInput
            label="Confirm New Password"
            icon={Lock}
            type="password"
            placeholder="Repeat your new password"
            value={formData.confirmPassword}
            onChange={set('confirmPassword')}
          />

          <div className="flex gap-3 pt-1">
            <AuthButton
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </AuthButton>
            <AuthButton
              type="submit"
              loading={loading}
              disabled={!formData.resetToken || !formData.newPassword || !formData.confirmPassword}
              className="flex-1"
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </AuthButton>
          </div>
        </form>
      )}

      {/* Footer */}
      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
