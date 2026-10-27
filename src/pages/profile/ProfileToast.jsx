import React, { useEffect } from 'react';

/**
 * Short toast notification (auto-hides after ~2 seconds)
 * Replaces intrusive alert() popups across the profile page.
 */
const ProfileToast = ({ message, onClose, duration = 2000 }) => {
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
      style={styles.toast}
    >
      {message}
    </div>
  );
};

const styles = {
  toast: {
    position: 'fixed',
    bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--bg-card, #1c1c1f)',
    color: 'var(--text-primary, #ffffff)',
    border: '1px solid var(--border-color, #2e2e32)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    borderRadius: '12px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '500',
    zIndex: 99999,
    pointerEvents: 'none',
    textAlign: 'center',
    maxWidth: '90vw',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    animation: 'profileToastFadeIn 0.2s ease-out'
  }
};

export default ProfileToast;
