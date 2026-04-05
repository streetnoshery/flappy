import React from 'react';

const SkeletonCard = () => (
  <div className="card p-4 space-y-3 animate-fade-up">
    <div className="flex items-center gap-3">
      <div className="skeleton w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton h-2.5 w-20 rounded" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-5/6 rounded" />
      <div className="skeleton h-3 w-4/6 rounded" />
    </div>
    <div className="flex gap-4 pt-1">
      <div className="skeleton h-7 w-16 rounded-xl" />
      <div className="skeleton h-7 w-16 rounded-xl" />
      <div className="skeleton h-7 w-16 rounded-xl" />
    </div>
  </div>
);

export default SkeletonCard;
