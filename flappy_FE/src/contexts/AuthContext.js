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

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { user } = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      // Remove confirmPassword field before sending to API
      const { confirmPassword, ...signupData } = userData;
      const response = await authAPI.signup(signupData);
      const { user } = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};