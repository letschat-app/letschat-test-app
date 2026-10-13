import React, { useEffect } from 'react';

/**
 * Toast Component
 * Accessible, non-blocking toast notification that displays at the bottom center
 * of the viewport and automatically dismisses after duration (default 2000ms).
 */
const Toast = ({ message, onClose, duration = 2000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="search-toast-container"
    >
      <span className="search-toast-text">{message}</span>
    </div>
  );
};

export default Toast;
