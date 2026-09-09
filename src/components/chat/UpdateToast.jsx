import React, { useEffect, useRef, useState } from 'react';
import { usePWA } from '../../context/PWAContext';

// ─── Styles injected once into the document (not per render) ─────────────────
// Using a module-level flag ensures this runs at most once per page load,
// preventing duplicate <style> nodes regardless of re-renders or StrictMode.
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.setAttribute('data-id', 'sw-update-toast-styles');
  style.textContent = `
    @keyframes swToastSlideIn {
      from { transform: translateX(-50%) translateY(100px); opacity: 0; }
      to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
    }
    @keyframes swToastSlideOut {
      from { transform: translateX(-50%) translateY(0);     opacity: 1; }
      to   { transform: translateX(-50%) translateY(100px); opacity: 0; }
    }
    @keyframes swSpinAnim {
      to { transform: rotate(360deg); }
    }
    .sw-toast-enter {
      animation: swToastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .sw-toast-exit {
      animation: swToastSlideOut 0.3s ease-in forwards;
    }
    .sw-update-btn {
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .sw-update-btn:not(:disabled):hover {
      opacity: 0.9;
      transform: scale(1.02);
    }
    .sw-update-btn:not(:disabled):active {
      transform: scale(0.97);
    }
    .sw-dismiss-btn {
      transition: background 0.15s ease;
    }
    .sw-dismiss-btn:not(:disabled):hover {
      background: rgba(255, 255, 255, 0.1) !important;
    }
    .sw-toast-spinner {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      animation: swSpinAnim 0.8s linear infinite;
      display: inline-block;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * UpdateToast — Non-blocking "New version available" notification.
 *
 * Appears as a sliding premium toast at the bottom of the screen.
 * Does NOT interrupt active sessions — user chooses when to update.
 *
 * Fixes applied:
 *  1. hasMounted flag prevents the hiding animation from flickering on first render.
 *  2. aria-atomic + aria-live for proper screen reader announcement.
 *  3. "Later" is disabled while update is in progress.
 *  4. Styles are injected once at module level, never per render.
 *  5. Updating button uses a clearly distinct muted gradient.
 */
const UpdateToast = () => {
  const { updateAvailable, applyUpdate, dismissUpdate, currentVersion } = usePWA();

  const [visible, setVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Tracks whether the toast has been shown at least once.
  // Prevents the exit animation from running on the very first render.
  const hasMountedVisible = useRef(false);

  // Inject global styles once — not on every render
  injectStyles();

  // ── Animate in when update becomes available ────────────────────────────
  useEffect(() => {
    if (updateAvailable) {
      const timer = setTimeout(() => {
        hasMountedVisible.current = true;
        setVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      setIsUpdating(false);
    }
  }, [updateAvailable]);

  // Don't render anything if there's no update pending
  if (!updateAvailable) return null;

  // ── Determine animation class ───────────────────────────────────────────
  // Only apply exit animation if toast has actually been shown before.
  // This prevents the "hiding" flicker on first mount.
  const animationClass = visible
    ? 'sw-toast-enter'
    : hasMountedVisible.current
      ? 'sw-toast-exit'
      : '';

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleUpdate = () => {
    if (isUpdating) return; // Anti-spam guard
    setIsUpdating(true);
    applyUpdate();
  };

  const handleLater = () => {
    if (isUpdating) return; // Prevent "Later" while update is in progress
    setVisible(false);
    setTimeout(() => dismissUpdate(), 350);
  };

  return (
    <div
      className={animationClass}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        // translateX(-50%) is handled in keyframes above to avoid conflict
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 20px',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(96, 165, 250, 0.25)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(96,165,250,0.1)',
        minWidth: '280px',
        maxWidth: '90vw',
      }}
      // Accessibility: announce the toast content when it appears
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Icon */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '18px',
      }}>
        ✨
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#f1f5f9',
          fontSize: '14px',
          fontWeight: '600',
          letterSpacing: '-0.01em',
        }}>
          New version available
        </div>
        {currentVersion && (
          <div style={{
            color: '#64748b',
            fontSize: '11px',
            marginTop: '1px',
            fontFamily: 'monospace',
          }}>
            {currentVersion}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>

        {/* Later — disabled while updating to prevent state conflict */}
        <button
          className="sw-dismiss-btn"
          onClick={handleLater}
          disabled={isUpdating}
          aria-label="Dismiss update notification"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: isUpdating ? '#475569' : '#94a3b8',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
            opacity: isUpdating ? 0.5 : 1,
          }}
        >
          Later
        </button>

        {/* Update — muted gradient when updating for clearer visual feedback */}
        <button
          className="sw-update-btn"
          onClick={handleUpdate}
          disabled={isUpdating}
          aria-label={isUpdating ? 'Applying update, please wait' : 'Apply update now'}
          style={{
            background: isUpdating
              ? 'linear-gradient(135deg, #334155, #1e293b)' // Muted, distinct "in progress" state
              : 'linear-gradient(135deg, #3b82f6, #2563eb)', // Active blue
            border: 'none',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: isUpdating ? 0.85 : 1,
          }}
        >
          {isUpdating ? (
            <>
              <span className="sw-toast-spinner" aria-hidden="true" />
              Updating...
            </>
          ) : 'Update'}
        </button>

      </div>
    </div>
  );
};

export default UpdateToast;
