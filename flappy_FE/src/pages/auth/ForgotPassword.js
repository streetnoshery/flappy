import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import PasswordStrength from '../../components/auth/PasswordStrength';
import Logo from '../../components/Logo';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * 3-step verified password reset:
 *  Step 1 — Enter email → OTP sent
 *  Step 2 — Enter OTP  → one-time resetToken returned
 *  Step 3 — Enter new password + resetToken → password updated
 */
const ForgotPassword = () => {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);

  // persisted across steps
  const [email, setEmail]           = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp]               = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* ── Step 1: submit email ──────────────────── */
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ email });
      setMaskedEmail(res.data.email ?? email);
      setStep(2);
      toast.success('OTP sent — check your inbox');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: verify OTP ────────────────────── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('OTP must be 6 digits');
    setLoading(true);
    try {
      const res = await authAPI.verifyResetOtp({ email, otp });
      setResetToken(res.data.resetToken);
      setStep(3);
      toast.success('OTP verified — set your new password');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3: set new password ──────────────── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword)                               return toast.error('Please enter a new password');
    if (newPassword !== confirmPassword)            return toast.error('Passwords do not match');
    if (!passwordRegex.test(newPassword))
      return toast.error('Password must be 8+ chars with uppercase, lowercase, number & special char');
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, resetToken, newPassword });
      toast.success('Password reset! You can now log in.');
      window.location.href = '/login';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ['Email', 'Verify OTP', 'New Password'];

  return (
    <AuthLayout>
      {/* Header */}
      <div className="text-center mb-8">
        <Logo size="lg" variant="bird" className="justify-center mb-5" />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {step === 1 ? 'Forgot password?' : step === 2 ? 'Verify your email' : 'Set new password'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {step === 1 && 'Enter your email and we\'ll send you an OTP'}
          {step === 2 && `Enter the 6-digit code sent to ${maskedEmail}`}
          {step === 3 && 'Choose a strong password to secure your account'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, idx) => {
          const s = idx + 1;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
                  s < step  ? 'bg-green-500 text-white' :
                  s === step ? 'bg-btn-gradient text-white shadow-glow' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {s < step ? <ShieldCheck className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-[10px] font-medium ${s === step ? 'text-primary-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {s < STEPS.length && (
                <div className={`flex-1 h-0.5 rounded mb-4 transition-all duration-500 ${step > s ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <AuthInput
            label="Email address"
            icon={Mail}
            type="email"
            placeholder="your@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <div className="pt-1">
            <AuthButton type="submit" loading={loading} disabled={!email.trim()}>
              {loading ? 'Sending OTP…' : 'Send reset OTP'}
            </AuthButton>
          </div>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-sm text-primary-700">
            A 6-digit OTP was sent to <strong>{maskedEmail}</strong>. Check your inbox (and spam folder).
          </div>
          <AuthInput
            label="OTP Code"
            icon={ShieldCheck}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="tracking-widest text-center text-lg font-mono"
          />
          <div className="flex gap-3 pt-1">
            <AuthButton type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </AuthButton>
            <AuthButton type="submit" loading={loading} disabled={otp.length !== 6} className="flex-1">
              {loading ? 'Verifying…' : 'Verify OTP'}
            </AuthButton>
          </div>
        </form>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <AuthInput
              label="New Password"
              icon={Lock}
              type="password"
              placeholder="Create a strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <PasswordStrength password={newPassword} />
          </div>
          <AuthInput
            label="Confirm New Password"
            icon={Lock}
            type="password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <div className="pt-1">
            <AuthButton
              type="submit"
              loading={loading}
              disabled={!newPassword || !confirmPassword}
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
