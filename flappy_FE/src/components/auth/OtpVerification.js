import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import AuthButton from './AuthButton';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

const OtpVerification = ({ maskedEmail, rawEmail, onVerify, onResend, onBack, loading }) => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // take last digit
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    setError('');

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = useCallback(async () => {
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    try {
      await onVerify(otpString);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP';
      setError(msg);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }, [otp, onVerify]);

  // Submit when all digits filled
  useEffect(() => {
    if (otp.every((d) => d !== '') && !loading) {
      handleSubmit();
    }
  }, [otp, loading, handleSubmit]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await onResend();
      setCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend OTP';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const isComplete = otp.every((d) => d !== '');

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
        aria-label="Go back to login"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Verify your identity</h2>
        <p className="text-sm text-slate-500 mt-1.5">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-slate-700">{maskedEmail}</span>
        </p>
      </div>

      {/* OTP Inputs */}
      <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            aria-label={`OTP digit ${index + 1}`}
            className={`
              w-12 h-14 text-center text-xl font-bold rounded-xl border-2
              transition-all duration-200 outline-none
              ${digit ? 'border-primary-400 bg-primary-50/50' : 'border-slate-200 bg-white'}
              ${error ? 'border-red-300 bg-red-50/30' : ''}
              focus:border-primary-500 focus:shadow-input focus:bg-white
            `}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 text-center mb-4 animate-fade-in" role="alert">
          ⚠ {error}
        </p>
      )}

      {/* Verify button */}
      <AuthButton
        type="button"
        loading={loading}
        disabled={!isComplete}
        onClick={handleSubmit}
      >
        {loading ? 'Verifying…' : 'Verify & Sign in'}
      </AuthButton>

      {/* Resend */}
      <div className="text-center mt-5">
        {cooldown > 0 ? (
          <p className="text-sm text-slate-400">
            Resend code in{' '}
            <span className="font-semibold text-slate-600">
              {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OtpVerification;
