import React from 'react';

const EyeIcon = ({ status }) => {
  if (status === 'sending') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3-7 10-7 10 7 10 7" />
        <path d="M2 12s3 3 10 3 10-3 10-3" strokeDasharray="2 2" />
        <circle cx="12" cy="10" r="2" fill="gray" stroke="currentColor" />
      </svg>
    );
  } else if (status === 'pending') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3-7 10-7 10 7 10 7" />
        <path d="M2 12s3 7 10 7 10-7 10-7" />
      </svg>
    );
  } else if (status === 'delivered') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" fill="black" stroke="currentColor" />
      </svg>
    );
  } else if (status === 'read') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" fill="white" stroke="currentColor" />
      </svg>
    );
  }
  return null;
};

export default EyeIcon;
