import React from 'react';
import { getAvatarStyle, getTextColor } from '../utils/profileColors';

/**
 * UserAvatar — deterministic gradient background per userId
 *
 * Props:
 *   user       { userId, username, profilePhotoUrl }
 *   size       'xs' | 'sm' | 'md' | 'lg' | 'xl'
 *   className  extra classes
 *   ring       show gradient ring border
 */
const sizeMap = {
  xs: { box: 'w-6 h-6',   text: 'text-[10px]', ring: 'ring-[1.5px]' },
  sm: { box: 'w-8 h-8',   text: 'text-xs',     ring: 'ring-2' },
  md: { box: 'w-10 h-10', text: 'text-sm',      ring: 'ring-2' },
  lg: { box: 'w-14 h-14', text: 'text-lg',      ring: 'ring-[3px]' },
  xl: { box: 'w-20 h-20', text: 'text-2xl',     ring: 'ring-4' },
};

const UserAvatar = ({ user, size = 'md', className = '', ring = false }) => {
  const { box, text, ring: ringClass } = sizeMap[size] || sizeMap.md;
  const userId = user?.userId || user?._id || '';
  const initial = user?.username?.[0]?.toUpperCase() || '?';
  const textColor = getTextColor(userId);
  const avatarStyle = getAvatarStyle(userId);

  const ringStyle = ring ? {
    padding: '2px',
    background: `linear-gradient(135deg, ${avatarStyle.background.match(/#[0-9a-f]{6}/gi)?.[0] || '#6366f1'}, ${avatarStyle.background.match(/#[0-9a-f]{6}/gi)?.[1] || '#8b5cf6'})`,
  } : {};

  return (
    <div
      className={`${box} rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center font-bold select-none ${ring ? ringClass + ' ring-offset-1' : ''} ${className}`}
      style={user?.profilePhotoUrl ? {} : { ...avatarStyle, color: textColor }}
      aria-label={user?.username || 'User avatar'}
    >
      {user?.profilePhotoUrl ? (
        <img
          src={user.profilePhotoUrl}
          alt={user.username}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className={text}>{initial}</span>
      )}
    </div>
  );
};

export default UserAvatar;
