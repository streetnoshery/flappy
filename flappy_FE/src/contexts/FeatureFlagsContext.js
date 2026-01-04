import React, { createContext, useContext, useState, useEffect } from 'react';
import { featureFlagsAPI } from '../services/api';

const FeatureFlagsContext = createContext();

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
};

export const FeatureFlagsProvider = ({ children }) => {
  const [featureFlags, setFeatureFlags] = useState({
    enableImagePosts: false,
    enableGifPosts: false,
    enableVideoUploads: false,
    enableAdvancedSearch: false,
  });
  const [enabledPostTypes, setEnabledPostTypes] = useState(['text']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  const fetchFeatureFlags = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch feature flags
      const flagsResponse = await featureFlagsAPI.getFeatureFlags();
      setFeatureFlags(flagsResponse.data);
      
      // Fetch enabled post types
      const postTypesResponse = await featureFlagsAPI.getEnabledPostTypes();
      setEnabledPostTypes(postTypesResponse.data.enabledTypes);
      
      console.log('🚩 [FEATURE_FLAGS] Feature flags loaded', {
        flags: flagsResponse.data,
        enabledPostTypes: postTypesResponse.data.enabledTypes
      });
    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] Failed to load feature flags', error);
      setError('Failed to load feature flags');
      // Set default values on error
      setFeatureFlags({
        enableImagePosts: false,
        enableGifPosts: false,
        enableVideoUploads: false,
        enableAdvancedSearch: false,
      });
      setEnabledPostTypes(['text']);
    } finally {
      setLoading(false);
    }
  };

  const isFeatureEnabled = (feature) => {
    return featureFlags[feature] || false;
  };

  const isPostTypeEnabled = (type) => {
    return enabledPostTypes.includes(type);
  };

  const getEnabledPostTypes = () => {
    return enabledPostTypes;
  };

  const refreshFeatureFlags = () => {
    fetchFeatureFlags();
  };

  const value = {
    featureFlags,
    enabledPostTypes,
    loading,
    error,
    isFeatureEnabled,
    isPostTypeEnabled,
    getEnabledPostTypes,
    refreshFeatureFlags,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};