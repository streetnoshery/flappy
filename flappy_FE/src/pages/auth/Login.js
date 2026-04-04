import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import Logo from '../../components/Logo';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const watchedFields = watch(['emailOrPhone', 'password']);
  const isFormEmpty = watchedFields.some(f => !f || f.trim() === '');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      const msg = error.response?.data?.message;
      Array.isArray(msg) ? msg.forEach(m => toast.error(m)) : toast.error(msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Header */}
      <div className="text-center mb-8">
        <Logo size="lg" variant="bird" className="justify-center mb-5" />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to your Flappy account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthInput
          label="Email or Phone"
          icon={Mail}
          type="text"
          placeholder="you@example.com or 9876543210"
          error={errors.emailOrPhone?.message}
          {...register('emailOrPhone', { required: 'Email or phone is required' })}
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <Link
              to="/forgot-password"
              className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <AuthInput
            icon={Lock}
            type="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />
        </div>

        <div className="pt-1">
          <AuthButton type="submit" loading={loading} disabled={isFormEmpty}>
            {loading ? 'Signing in…' : 'Sign in'}
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
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
          Sign up free
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
