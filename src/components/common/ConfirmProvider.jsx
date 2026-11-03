/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useBackClose from '../../hooks/useBackClose';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const confirmBtnRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      if (typeof options === 'string') {
        options = { message: options };
      }
      setConfirmState({
        title: options.title || 'Confirm Action',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        danger: Boolean(options.danger),
        resolve
      });
    });
  }, []);

  const handleAction = useCallback((result) => {
    if (confirmState?.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState(null);
  }, [confirmState]);

  useBackClose(Boolean(confirmState), () => handleAction(false));

  useEffect(() => {
    if (confirmState) {
      confirmBtnRef.current?.focus();
    }
  }, [confirmState]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {typeof document !== 'undefined' && confirmState && createPortal(
        <div
          role="presentation"
          onClick={() => handleAction(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000001,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'confirmFadeIn 0.15s ease-out'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={confirmState.title}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-primary)'
              }}
            >
              {confirmState.title}
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: '14.5px',
                lineHeight: '1.5',
                color: 'var(--text-secondary)'
              }}
            >
              {confirmState.message}
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                marginTop: '8px'
              }}
            >
              <button
                type="button"
                onClick={() => handleAction(false)}
                style={{
                  minHeight: '44px',
                  minWidth: '80px',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {confirmState.cancelText}
              </button>

              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => handleAction(true)}
                style={{
                  minHeight: '44px',
                  minWidth: '80px',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: confirmState.danger
                    ? 'var(--danger-color, #f43f5e)'
                    : 'var(--accent-solid, #5b5fee)',
                  color: 'var(--text-on-accent, #ffffff)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async () => true;
  }
  return ctx.confirm;
}

export default ConfirmProvider;
