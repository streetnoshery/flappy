import React, { useState, useEffect } from 'react';
import { X, Copy, Share2, MessageCircle, Mail, Link2, Facebook, Twitter, Linkedin } from 'lucide-react';
import toast from 'react-hot-toast';

const ShareModal = ({ isOpen, onClose, post }) => {
  const [copied, setCopied] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const postUrl = `${window.location.origin}/post/${post._id}`;
  const shareText = `Check out this post by ${post.userId?.username}: "${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = postUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Flappy Post',
          text: shareText,
          url: postUrl,
        });
        toast.success('Shared successfully!');
        onClose();
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: copied ? Link2 : Copy,
      action: handleCopyLink,
      color: 'text-gray-600 hover:text-gray-800',
      bgColor: 'hover:bg-gray-50',
    },
    {
      name: 'Share via System',
      icon: Share2,
      action: handleNativeShare,
      color: 'text-blue-600 hover:text-blue-800',
      bgColor: 'hover:bg-blue-50',
      show: navigator.share || true, // Always show as fallback to copy
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      action: () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${postUrl}`)}`;
        window.open(whatsappUrl, '_blank');
        toast.success('Opening WhatsApp...');
        onClose();
      },
      color: 'text-green-600 hover:text-green-800',
      bgColor: 'hover:bg-green-50',
    },
    {
      name: 'Twitter',
      icon: Twitter,
      action: () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`;
        window.open(twitterUrl, '_blank');
        toast.success('Opening Twitter...');
        onClose();
      },
      color: 'text-blue-400 hover:text-blue-600',
      bgColor: 'hover:bg-blue-50',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      action: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
        window.open(facebookUrl, '_blank');
        toast.success('Opening Facebook...');
        onClose();
      },
      color: 'text-blue-600 hover:text-blue-800',
      bgColor: 'hover:bg-blue-50',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      action: () => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
        window.open(linkedinUrl, '_blank');
        toast.success('Opening LinkedIn...');
        onClose();
      },
      color: 'text-blue-700 hover:text-blue-900',
      bgColor: 'hover:bg-blue-50',
    },
    {
      name: 'Email',
      icon: Mail,
      action: () => {
        const emailUrl = `mailto:?subject=${encodeURIComponent('Check out this post from Flappy')}&body=${encodeURIComponent(`${shareText}\n\n${postUrl}`)}`;
        window.location.href = emailUrl;
        toast.success('Opening email client...');
        onClose();
      },
      color: 'text-gray-600 hover:text-gray-800',
      bgColor: 'hover:bg-gray-50',
    },
  ];

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Share Post</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Post Preview */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              {post.userId?.profilePhotoUrl ? (
                <img
                  src={post.userId.profilePhotoUrl}
                  alt={post.userId.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm text-gray-600 font-medium">
                  {post.userId?.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{post.userId?.username}</p>
              <p className="text-xs text-gray-500">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <p className="text-gray-700 text-sm line-clamp-3 whitespace-pre-wrap">
            {post.content}
          </p>
        </div>

        {/* Share Options */}
        <div className="p-4">
          <div className="grid grid-cols-1 gap-2">
            {shareOptions
              .filter(option => option.show !== false)
              .map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.name}
                    onClick={option.action}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${option.bgColor} ${option.color} text-left w-full`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{option.name}</span>
                    {option.name === 'Copy Link' && copied && (
                      <span className="ml-auto text-xs text-green-600">Copied!</span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* URL Display */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Post URL:</p>
          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
            <input
              type="text"
              value={postUrl}
              readOnly
              className="flex-1 bg-transparent text-xs text-gray-600 outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Copy URL"
            >
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;