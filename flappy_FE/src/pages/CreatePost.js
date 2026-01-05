import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { Image, FileText, Film, AlertCircle } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const CreatePost = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { isPostTypeEnabled, getEnabledPostTypes, loading: flagsLoading } = useFeatureFlags();
  const [postType, setPostType] = useState('text');
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const submissionInProgress = useRef(false);

  const content = watch('content', '');

  // Check if user is authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please login to create posts');
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const createPostMutation = useMutation(
    (data) => postsAPI.createPost(data),
    {
      // Prevent multiple mutations with the same variables
      mutationKey: ['createPost'],
      onMutate: () => {
        submissionInProgress.current = true;
      },
      onSuccess: () => {
        submissionInProgress.current = false;
        queryClient.invalidateQueries('homeFeed');
        toast.success('Post created successfully!');
        navigate('/');
      },
      onError: (error) => {
        submissionInProgress.current = false;
        const errorMessage = error.response?.data?.message;
        if (Array.isArray(errorMessage)) {
          errorMessage.forEach(msg => toast.error(msg));
        } else {
          toast.error(errorMessage || 'Failed to create post');
        }
      },
      // Prevent retry on mutation failure
      retry: false,
    }
  );

  const onSubmit = useCallback((data) => {
    // Prevent multiple submissions
    if (createPostMutation.isLoading || submissionInProgress.current) {
      console.log('Submission already in progress, ignoring duplicate submission');
      return;
    }

    try {
      if (!isPostTypeEnabled(postType)) {
        toast.error(`${postType} posts are currently disabled`);
        return;
      }
    } catch (error) {
      console.error('Error checking post type enabled:', error);
      toast.error('Error validating post type');
      return;
    }
    
    console.log('Submitting post creation:', { type: postType, content: data.content });
    createPostMutation.mutate({
      ...data,
      type: postType,
    });
  }, [createPostMutation, isPostTypeEnabled, postType]);

  const allPostTypes = useMemo(() => [
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'image', label: 'Image', icon: Image },
    { id: 'gif', label: 'GIF', icon: Film },
  ], []);

  // Filter post types based on feature flags
  const availablePostTypes = useMemo(() => 
    allPostTypes.filter(type => isPostTypeEnabled(type.id)),
    [allPostTypes, isPostTypeEnabled]
  );

  // Get enabled types once to avoid function calls in useEffect dependencies
  const enabledTypes = useMemo(() => {
    try {
      return getEnabledPostTypes();
    } catch (error) {
      console.error('Error getting enabled post types:', error);
      return ['text'];
    }
  }, [getEnabledPostTypes]);

  // Set default post type to first available if current is not enabled
  React.useEffect(() => {
    if (!flagsLoading && enabledTypes.length > 0) {
      try {
        if (!isPostTypeEnabled(postType)) {
          setPostType(enabledTypes[0]);
        }
      } catch (error) {
        console.error('Error checking post type enabled:', error);
        setPostType('text'); // Fallback to text
      }
    }
  }, [flagsLoading, postType, isPostTypeEnabled, enabledTypes]);

  if (authLoading || flagsLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="flex space-x-4">
                <div className="h-10 bg-gray-200 rounded w-20"></div>
                <div className="h-10 bg-gray-200 rounded w-20"></div>
                <div className="h-10 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Create New Post</h1>

        {availablePostTypes.length === 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mr-2" />
              <p className="text-sm sm:text-base text-yellow-800">No post types are currently available. Please contact support.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {/* Post Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
              Post Type
            </label>
            <div className="flex flex-wrap gap-2 sm:gap-4">
              {availablePostTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPostType(type.id)}
                    disabled={createPostMutation.isLoading}
                    className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 text-sm sm:text-base ${
                      postType === type.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Show disabled post types with explanation */}
            {allPostTypes.length > availablePostTypes.length && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-600">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Coming soon
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allPostTypes
                    .filter(type => !isPostTypeEnabled(type.id))
                    .map(type => {
                      const Icon = type.icon;
                      return (
                        <span
                          key={type.id}
                          className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-200 text-gray-500 rounded text-xs sm:text-sm"
                        >
                          <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{type.label}</span>
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              {...register('content', { required: 'Content is required' })}
              rows={4}
              disabled={createPostMutation.isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50 text-sm sm:text-base"
              placeholder="What's on your mind?"
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
            )}
            <div className="mt-2 text-xs sm:text-sm text-gray-500">
              {content.length}/500 characters
            </div>
          </div>

          {/* Media URL (for image/gif posts) */}
          {(postType === 'image' || postType === 'gif') && (
            <div>
              <label htmlFor="mediaUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Media URL
              </label>
              <input
                {...register('mediaUrl', { 
                  required: postType !== 'text' ? 'Media URL is required' : false 
                })}
                type="url"
                disabled={createPostMutation.isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 text-sm sm:text-base"
                placeholder="Enter image or GIF URL"
              />
              {errors.mediaUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.mediaUrl.message}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Debug button for testing auth */}
            <button
              type="button"
              onClick={async () => {
                try {
                  // Check local storage first
                  const user = localStorage.getItem('user');
                  
                  console.log('🔍 [DEBUG] Current auth state:', {
                    hasUser: !!user,
                    user: user ? JSON.parse(user) : null
                  });
                  
                  if (!user) {
                    toast.error('No user data found. Please login again.');
                    return;
                  }
                  
                  const response = await postsAPI.testAuth();
                  toast.success('Auth test successful!');
                  console.log('Auth test response:', response.data);
                } catch (error) {
                  toast.error('Auth test failed: ' + (error.response?.data?.message || error.message));
                  console.error('Auth test error:', error);
                }
              }}
              disabled={createPostMutation.isLoading}
              className="w-full sm:w-auto px-4 py-2 text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors disabled:opacity-50 text-sm"
            >
              Test Auth
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={createPostMutation.isLoading}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPostMutation.isLoading || availablePostTypes.length === 0}
              className="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors text-sm"
            >
              {createPostMutation.isLoading ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;