import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { Image, FileText, Film, AlertCircle, Hash, X } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/UserAvatar';
import toast from 'react-hot-toast';

const MAX_CHARS = 500;

const CreatePost = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { isPostTypeEnabled, getEnabledPostTypes, loading: flagsLoading } = useFeatureFlags();
  const [postType, setPostType] = useState('text');
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const submissionInProgress = useRef(false);
  const content = watch('content', '');
  const remaining = MAX_CHARS - (content?.length || 0);

  React.useEffect(() => {
    if (!authLoading && !user) { toast.error('Please login to create posts'); navigate('/login'); }
  }, [user, authLoading, navigate]);

  const createPostMutation = useMutation(
    (data) => postsAPI.createPost(data),
    {
      mutationKey: ['createPost'],
      onMutate: () => { submissionInProgress.current = true; },
      onSuccess: () => {
        submissionInProgress.current = false;
        queryClient.invalidateQueries('homeFeed');
        toast.success('Post published!');
        navigate('/');
      },
      onError: (error) => {
        submissionInProgress.current = false;
        const msg = error.response?.data?.message;
        Array.isArray(msg) ? msg.forEach(m => toast.error(m)) : toast.error(msg || 'Failed to create post');
      },
      retry: false,
    }
  );

  const onSubmit = useCallback((data) => {
    if (createPostMutation.isLoading || submissionInProgress.current) return;
    if (!isPostTypeEnabled(postType)) { toast.error(`${postType} posts are currently disabled`); return; }
    createPostMutation.mutate({ ...data, type: postType });
  }, [createPostMutation, isPostTypeEnabled, postType]);

  const allPostTypes = useMemo(() => [
    { id: 'text',  label: 'Text',  icon: FileText },
    { id: 'image', label: 'Image', icon: Image },
    { id: 'gif',   label: 'GIF',   icon: Film },
  ], []);

  const availablePostTypes = useMemo(() =>
    allPostTypes.filter(t => isPostTypeEnabled(t.id)), [allPostTypes, isPostTypeEnabled]);

  const enabledTypes = useMemo(() => { try { return getEnabledPostTypes(); } catch { return ['text']; } }, [getEnabledPostTypes]);

  React.useEffect(() => {
    if (!flagsLoading && enabledTypes.length > 0 && !isPostTypeEnabled(postType)) {
      setPostType(enabledTypes[0]);
    }
  }, [flagsLoading, postType, isPostTypeEnabled, enabledTypes]);

  if (authLoading || flagsLoading) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card p-6 space-y-4">
          <div className="skeleton h-6 w-32 rounded" />
          <div className="skeleton h-32 w-full rounded-xl" />
          <div className="skeleton h-10 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-900">Create Post</h1>
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          {/* Author row */}
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="md" ring />
            <div>
              <p className="text-sm font-semibold text-slate-900">{user.username}</p>
              <p className="text-xs text-slate-400">Posting publicly</p>
            </div>
          </div>

          {/* Post type selector */}
          {availablePostTypes.length > 1 && (
            <div className="flex gap-2">
              {availablePostTypes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPostType(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                    postType === id
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Textarea */}
          <div>
            <textarea
              {...register('content', { required: 'Content is required', maxLength: { value: MAX_CHARS, message: `Max ${MAX_CHARS} characters` } })}
              rows={5}
              disabled={createPostMutation.isLoading}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none transition-all"
              placeholder="What's on your mind?"
            />
            <div className="flex items-center justify-between mt-1.5">
              {errors.content
                ? <p className="text-xs text-red-500">{errors.content.message}</p>
                : <span className="text-xs text-slate-400 flex items-center gap-1"><Hash className="w-3 h-3" /> Add hashtags with #</span>
              }
              <span className={`text-xs font-medium ${remaining < 50 ? 'text-red-500' : 'text-slate-400'}`}>
                {remaining}
              </span>
            </div>
          </div>

          {/* Media URL */}
          {(postType === 'image' || postType === 'gif') && (
            <div>
              <input
                {...register('mediaUrl', { required: 'Media URL is required' })}
                type="url"
                disabled={createPostMutation.isLoading}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                placeholder="Paste image or GIF URL…"
              />
              {errors.mediaUrl && <p className="mt-1 text-xs text-red-500">{errors.mediaUrl.message}</p>}
            </div>
          )}

          {/* Disabled types notice */}
          {allPostTypes.length > availablePostTypes.length && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Image & GIF posts coming soon
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={createPostMutation.isLoading}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPostMutation.isLoading || !content?.trim()}
              className="flex-1 btn-primary"
            >
              {createPostMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Publishing…
                </span>
              ) : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
