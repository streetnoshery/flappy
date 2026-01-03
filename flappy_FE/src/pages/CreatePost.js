import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { Image, FileText, Film } from 'lucide-react';
import { postsAPI } from '../services/api';
import toast from 'react-hot-toast';

const CreatePost = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [postType, setPostType] = useState('text');
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const content = watch('content', '');

  const createPostMutation = useMutation(
    (data) => postsAPI.createPost(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('homeFeed');
        toast.success('Post created successfully!');
        navigate('/');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create post');
      },
    }
  );

  const onSubmit = (data) => {
    createPostMutation.mutate({
      ...data,
      type: postType,
    });
  };

  const postTypes = [
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'image', label: 'Image', icon: Image },
    { id: 'gif', label: 'GIF', icon: Film },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Post</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Post Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Post Type
            </label>
            <div className="flex space-x-4">
              {postTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPostType(type.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      postType === type.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              {...register('content', { required: 'Content is required' })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="What's on your mind?"
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
            )}
            <div className="mt-2 text-sm text-gray-500">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter image or GIF URL"
              />
              {errors.mediaUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.mediaUrl.message}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPostMutation.isLoading}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
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