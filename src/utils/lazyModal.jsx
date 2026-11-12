import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '../components/common/ToastProvider';

const CHUNK_LOAD_TIMEOUT_MS = 4000;
let lastOfflineAlertAt = 0;

/**
 * Code-splits a click-only modal/picker via dynamic import while handling offline/stalled
 * chunk load failures gracefully: fails fast after 4s, shows a small alert, and remains retryable.
 */
export function lazyModal(importer) {
  let cachedComponent = null;
  let inflightPromise = null;

  return function LazyModalWrapper({ __onLoadError, ...props }) {
    const toast = useToast();
    const [Component, setComponent] = useState(() => cachedComponent);

    const toastRef = useRef(toast);
    toastRef.current = toast;

    const closeHandlerRef = useRef(__onLoadError || props.onClose || props.onCancel);
    closeHandlerRef.current = __onLoadError || props.onClose || props.onCancel;

    useEffect(() => {
      if (cachedComponent) {
        setComponent(() => cachedComponent);
        return;
      }

      let cancelled = false;
      if (!inflightPromise) {
        let timeoutId;
        const importPromise = importer()
          .then((mod) => {
            const Resolved = mod?.default || mod;
            cachedComponent = Resolved;
            return Resolved;
          });
        importPromise.catch(() => {});

        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Chunk load timed out'));
          }, CHUNK_LOAD_TIMEOUT_MS);
        });

        inflightPromise = Promise.race([importPromise, timeoutPromise])
          .finally(() => {
            clearTimeout(timeoutId);
            inflightPromise = null;
          });
      }

      inflightPromise
        .then((Loaded) => {
          if (!cancelled && Loaded) {
            setComponent(() => Loaded);
          }
        })
        .catch(() => {
          if (cancelled) return;
          const now = Date.now();
          if (now - lastOfflineAlertAt > 2000) {
            lastOfflineAlertAt = now;
            toastRef.current?.error?.('Please check your internet connection and try again.');
          }
          closeHandlerRef.current?.();
        });

      return () => {
        cancelled = true;
      };
    }, []);

    if (!Component) return null;
    return <Component {...props} />;
  };
}
