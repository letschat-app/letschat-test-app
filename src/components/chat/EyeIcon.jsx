import React from 'react';

const ORDER = { sending: 0, uploading: 0, pending: 1, delivered: 2, read: 3, 'media-opened': 3 };

const EyeIcon = ({ status }) => {
  const level = ORDER[status];
  if (level === undefined) return null;
  const labels = ['Sending', 'Pending', 'Delivered', 'Read'];
  const displayLevel = Math.min(level, 3);
  return (
    <svg className={`status-eye s${displayLevel}`} width="12" height="12" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
         role="img" aria-label={labels[displayLevel]}>
      <path d="M2 12s3-7 10-7 10 7 10 7" />
      <path className="lid2" pathLength="1" d="M2 12s3 7 10 7 10-7 10-7" />
      <circle className="pup" cx="12" cy="12" r="3" />
    </svg>
  );
};

export default EyeIcon;
