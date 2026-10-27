import React, { useEffect } from 'react';
import { LogOut, X, Loader2 } from 'lucide-react';

/**
 * Logout Confirmation Modal
 * Prevents accidental logouts across desktop and mobile views.
 */
const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, loading = false }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={styles.closeBtn}
          title="Cancel"
          aria-label="Close"
        >
          <X size={18} color="var(--text-secondary)" />
        </button>

        {/* Danger Icon Header */}
        <div style={styles.iconCircle}>
          <LogOut size={24} color="var(--danger-color, #ef4444)" />
        </div>

        {/* Title & Description */}
        <h3 id="logout-title" style={styles.title}>
          Log out of LetsChat?
        </h3>
        <p style={styles.description}>
          Are you sure you want to log out? You will need to sign back in with your credentials to access your chats and messages.
        </p>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={styles.confirmBtn}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut size={16} />
                Log Out
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    boxSizing: 'border-box'
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: '380px',
    backgroundColor: 'var(--bg-card, #18181b)',
    border: '1px solid var(--border-color, #27272a)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'border-box',
    color: 'var(--text-primary, #ffffff)'
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconCircle: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: 'var(--danger-tint, rgba(239, 68, 68, 0.12))',
    border: '1px solid var(--danger-tint-border, rgba(239, 68, 68, 0.25))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary, #ffffff)'
  },
  description: {
    margin: '0 0 24px 0',
    fontSize: '13px',
    color: 'var(--text-secondary, #a1a1aa)',
    lineHeight: '1.5'
  },
  actions: {
    display: 'flex',
    width: '100%',
    gap: '12px'
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '10px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color, #3f3f46)',
    color: 'var(--text-primary, #ffffff)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
  confirmBtn: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '10px',
    backgroundColor: 'var(--danger-color, #ef4444)',
    border: 'none',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'opacity 0.15s ease'
  }
};

export default LogoutConfirmModal;
