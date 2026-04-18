import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  /**
   * Step 1: Validate credentials → returns { otpRequired, email, rawEmail }
   */
  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    return response.data; // { otpRequired, email (masked), rawEmail }
  };

  /**
   * Step 2: Verify OTP → completes login, stores user
   */
  const verifyOtp = async ({ email, otp }) => {
    const response = await authAPI.verifyOtp({ email, otp });
    const { user, accessToken } = response.data;
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
    return response.data;
  };

  /**
   * Resend OTP to user's email
   */
  const resendOtp = async (email) => {
    const response = await authAPI.resendOtp({ email });
    return response.data;
  };

  const signup = async (userData) => {
    const { confirmPassword, ...signupData } = userData;
    const response = await authAPI.signup(signupData);
    return response.data; // { otpRequired, email (masked), rawEmail }
  };

  /**
   * Verify OTP after signup → completes registration, stores user
   */
  const verifySignupOtp = async ({ email, otp }) => {
    const response = await authAPI.verifySignupOtp({ email, otp });
    const { user, accessToken } = response.data;
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', accessToken);
    setUser(user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const value = {
    user,
    login,
    verifyOtp,
    resendOtp,
    signup,
    verifySignupOtp,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
