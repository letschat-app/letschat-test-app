/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextIdRef = useRef(1);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = nextIdRef.current++;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration ?? 4000), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info, addToast }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'center',
            pointerEvents: 'none',
            maxWidth: '90vw',
            width: 'max-content'
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 18px',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: '500',
                lineHeight: '1.4',
                color: '#ffffff',
                backgroundColor:
                  t.type === 'error'
                    ? 'var(--danger-color, #f43f5e)'
                    : t.type === 'success'
                    ? 'var(--success-color, #10b981)'
                    : 'var(--accent-solid, #5b5fee)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                animation: 'toastFadeIn 0.2s ease-out',
                maxWidth: '100%',
                wordBreak: 'break-word'
              }}
            >
              {t.type === 'error' && <AlertCircle size={18} style={{ flexShrink: 0 }} />}
              {t.type === 'success' && <Check size={18} style={{ flexShrink: 0 }} />}
              {t.type === 'info' && <Info size={18} style={{ flexShrink: 0 }} />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback for non-rendered contexts
    return {
      success: (msg) => console.log('[Toast success]', msg),
      error: (msg) => console.error('[Toast error]', msg),
      info: (msg) => console.info('[Toast info]', msg),
      addToast: () => {}
    };
  }
  return ctx;
}

export default ToastProvider;
