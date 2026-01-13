import React from 'react';

const Favicon = ({ size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="16" cy="16" r="16" fill="#3B82F6" />
      
      {/* Bird silhouette */}
      <ellipse cx="20" cy="18" rx="6" ry="4" fill="white" />
      <circle cx="14" cy="14" r="4" fill="white" />
      <polygon points="10,14 8,12 10,16" fill="#F59E0B" />
      <circle cx="13" cy="13" r="1" fill="#3B82F6" />
      <ellipse cx="24" cy="19" rx="1.5" ry="2.5" fill="white" />
    </svg>
  );
};

export default Favicon;