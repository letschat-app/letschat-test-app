/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useBackClose from '../../hooks/useBackClose';

const PromptContext = createContext(null);

export function PromptProvider({ children }) {
  const [promptState, setPromptState] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const prompt = useCallback((options, fallbackDefault = '') => {
    return new Promise((resolve) => {
      let title = 'Prompt';
      let message = '';
      let defaultValue = fallbackDefault;
      let placeholder = '';
      let confirmText = 'OK';
      let cancelText = 'Cancel';

      if (typeof options === 'string') {
        message = options;
        if (typeof fallbackDefault === 'string') defaultValue = fallbackDefault;
      } else if (options && typeof options === 'object') {
        title = options.title || title;
        message = options.message || '';
        defaultValue = options.defaultValue || options.value || '';
        placeholder = options.placeholder || '';
        confirmText = options.confirmText || confirmText;
        cancelText = options.cancelText || cancelText;
      }

      setInputValue(defaultValue);
      setPromptState({
        title,
        message,
        placeholder,
        confirmText,
        cancelText,
        resolve
      });
    });
  }, []);

  const handleAction = useCallback((result) => {
    if (promptState?.resolve) {
      promptState.resolve(result);
    }
    setPromptState(null);
    setInputValue('');
  }, [promptState]);

  useBackClose(Boolean(promptState), () => handleAction(null));

  useEffect(() => {
    if (promptState) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [promptState]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAction(inputValue);
  };

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      {typeof document !== 'undefined' && promptState && createPortal(
        <div
          role="presentation"
          onClick={() => handleAction(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000002,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'promptFadeIn 0.15s ease-out'
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-label={promptState.title}
            onSubmit={handleSubmit}
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
              {promptState.title}
            </h3>

            {promptState.message && (
              <p
                style={{
                  margin: 0,
                  fontSize: '14.5px',
                  lineHeight: '1.5',
                  color: 'var(--text-secondary)'
                }}
              >
                {promptState.message}
              </p>
            )}

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={promptState.placeholder}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '16px',
                outline: 'none'
              }}
            />

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
                onClick={() => handleAction(null)}
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
                {promptState.cancelText}
              </button>

              <button
                type="submit"
                style={{
                  minHeight: '44px',
                  minWidth: '80px',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'var(--accent-solid, #5b5fee)',
                  color: 'var(--text-on-accent, #ffffff)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {promptState.confirmText}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </PromptContext.Provider>
  );
}

export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) {
    return async () => null;
  }
  return ctx.prompt;
}

export default PromptProvider;
