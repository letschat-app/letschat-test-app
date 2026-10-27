import React, { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * Shared Sheet Component:
 * - Mobile (<768px): Bottom sheet, full width, 18px top radius, max-height 85vh.
 * - Desktop (>=768px): Centered modal dialog, max-width 400px, 16px radius.
 * - Focus traps / restores to trigger element on close.
 * - Accessible: Escape key & backdrop click dismissal.
 */
const ProfileSheet = ({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  onSave,
  saveLabel = 'Save',
  saveDisabled = false,
  saving = false,
  isDesktop = false
}) => {
  const sheetRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement;
      // Focus first input or button in the sheet
      setTimeout(() => {
        if (sheetRef.current) {
          const focusable = sheetRef.current.querySelector('input:not([disabled]), textarea:not([disabled]), button:not([disabled])');
          if (focusable) focusable.focus();
        }
      }, 50);
    } else {
      if (previouslyFocusedElement.current && typeof previouslyFocusedElement.current.focus === 'function') {
        previouslyFocusedElement.current.focus();
      }
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, saving]);

  if (!isOpen) return null;

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
    >
      <div
        ref={sheetRef}
        style={isDesktop ? styles.desktopCard : styles.mobileSheet}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Bar */}
        {!isDesktop && <div style={styles.dragBar} />}

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerText}>
            <h3 id="sheet-title" style={styles.title}>{title}</h3>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={styles.closeBtn}
            aria-label="Close"
            className="profile-interactive-btn"
          >
            <X size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={styles.body}>
          {children}
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={styles.cancelBtn}
            className="profile-interactive-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled || saving}
            style={{
              ...styles.saveBtn,
              opacity: (saveDisabled || saving) ? 0.6 : 1,
              cursor: (saveDisabled || saving) ? 'not-allowed' : 'pointer'
            }}
            className="profile-primary-btn"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving...
              </>
            ) : (
              saveLabel
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    boxSizing: 'border-box'
  },
  mobileSheet: {
    width: '100%',
    maxHeight: '85vh',
    backgroundColor: 'var(--bg-card, #1c1c1f)',
    borderTopLeftRadius: '18px',
    borderTopRightRadius: '18px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box',
    boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
    animation: 'profileSheetSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  desktopCard: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'var(--bg-card, #1c1c1f)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
    margin: 'auto',
    animation: 'profileModalScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  dragBar: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: 'var(--border-color)',
    margin: '10px auto 0 auto',
    opacity: 0.8
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px 18px 12px 18px',
    borderBottom: '1px solid var(--border-color)',
    gap: '12px'
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.3'
  },
  subtitle: {
    margin: 0,
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  body: {
    padding: '16px 18px',
    overflowY: 'auto',
    flex: 1,
    boxSizing: 'border-box'
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '12px 18px',
    borderTop: '1px solid var(--border-color)',
    boxSizing: 'border-box'
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  saveBtn: {
    padding: '8px 18px',
    borderRadius: '10px',
    backgroundColor: 'var(--accent-color)',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  }
};

export default ProfileSheet;
