import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, User, Phone, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import PasswordStrength from '../../components/auth/PasswordStrength';
import Logo from '../../components/Logo';

const emailRegex    = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex    = /^[0-9]{10}$/;
const usernameRegex = /^[a-zA-Z0-9_]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const password = watch('password', '');
  const watchedFields = watch(['email', 'username', 'phone', 'password', 'confirmPassword']);
  const isFormEmpty = watchedFields.some(f => !f || f.trim() === '');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await signup(data);
      toast.success('Account created! Welcome to Flappy 🎉');
      navigate('/');
    } catch (error) {
      const msg = error.response?.data?.message;
      Array.isArray(msg) ? msg.forEach(m => toast.error(m)) : toast.error(msg || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Header */}
      <div className="text-center mb-8">
        <Logo size="lg" variant="bird" className="justify-center mb-5" />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
        <p className="text-sm text-slate-500 mt-1">Join Flappy and start sharing</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthInput
          label="Email"
          icon={Mail}
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: emailRegex, message: 'Enter a valid email address' },
          })}
        />

        <AuthInput
          label="Username"
          icon={User}
          type="text"
          placeholder="your_username"
          error={errors.username?.message}
          {...register('username', {
            required: 'Username is required',
            minLength: { value: 3, message: 'At least 3 characters' },
            pattern: { value: usernameRegex, message: 'Letters, numbers and underscores only' },
          })}
        />

        <AuthInput
          label="Phone Number"
          icon={Phone}
          type="tel"
          placeholder="10-digit number"
          maxLength="10"
          error={errors.phone?.message}
          onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); }}
          {...register('phone', {
            required: 'Phone number is required',
            pattern: { value: phoneRegex, message: 'Must be exactly 10 digits' },
          })}
        />

        <div>
          <AuthInput
            label="Password"
            icon={Lock}
            type="password"
            placeholder="Create a strong password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
              pattern: { value: passwordRegex, message: 'Must include uppercase, lowercase, number & special char' },
            })}
          />
          <PasswordStrength password={password} />
        </div>

        <AuthInput
          label="Confirm Password"
          icon={Lock}
          type="password"
          placeholder="Repeat your password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: v => v === password || 'Passwords do not match',
          })}
        />

        <div className="pt-1">
          <AuthButton type="submit" loading={loading} disabled={isFormEmpty}>
            {loading ? 'Creating account…' : 'Create account'}
          </AuthButton>
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
