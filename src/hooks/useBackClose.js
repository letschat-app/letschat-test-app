import { useEffect, useRef } from 'react';

// Module-level stack for open modals/overlays
const modalStack = [];
let nextModalId = 1;
let isProgrammaticBack = false;
let globalListenersAttached = false;
let currentHref = typeof window !== 'undefined' ? window.location.href : '';

function ensureGlobalListeners() {
  if (globalListenersAttached || typeof window === 'undefined') return;
  globalListenersAttached = true;
  currentHref = window.location.href;

  window.addEventListener('popstate', (e) => {
    // If triggered programmatically by our own history.back() on UI close, ignore
    if (isProgrammaticBack) {
      isProgrammaticBack = false;
      return;
    }

    // Check if the URL/hash changed (route change during modal open)
    const newHref = window.location.href;
    const urlChanged = newHref !== currentHref && !e.state?.lcModal;
    currentHref = newHref;

    if (urlChanged) {
      // Route changed while modals were open: close all modals without calling history.back()
      if (modalStack.length > 0) {
        const remaining = [...modalStack];
        modalStack.length = 0;
        remaining.reverse().forEach((item) => {
          item.closedViaPopstate = true;
          try {
            item.onCloseRef.current?.();
          } catch (err) {
            console.error('Error closing modal on route change:', err);
          }
        });
        return;
      }
    }

    // Modal on top of stack: pop and close it
    if (modalStack.length > 0) {
      const top = modalStack.pop();
      top.closedViaPopstate = true;
      try {
        top.onCloseRef.current?.();
      } catch (err) {
        console.error('Error closing modal on popstate:', err);
      }
    }
  });

  // Global Escape key listener - closes the topmost modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const top = modalStack[modalStack.length - 1];
      try {
        top.onCloseRef.current?.();
      } catch (err) {
        console.error('Error closing modal on Escape:', err);
      }
    }
  }, true);
}

/**
 * Hook to allow browser back button and Escape key to close modals, sheets, and overlays.
 *
 * @param {boolean} isOpen - Whether the modal/overlay is currently open.
 * @param {Function} onClose - Callback invoked when the modal should close.
 */
export function useBackClose(isOpen = true, onClose) {
  const idRef = useRef(null);
  if (idRef.current === null) {
    idRef.current = nextModalId++;
  }
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    ensureGlobalListeners();
  }, []);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const id = idRef.current;

    // Idempotency: avoid pushing duplicate entries for the same modal
    let entry = modalStack.find((m) => m.id === id);
    if (!entry) {
      entry = {
        id,
        onCloseRef,
        pushed: true,
        closedViaPopstate: false,
      };
      modalStack.push(entry);
      currentHref = window.location.href;
      window.history.pushState({ lcModal: id }, '', window.location.href);
    } else {
      entry.onCloseRef = onCloseRef;
      entry.closedViaPopstate = false;
    }

    return () => {
      const index = modalStack.findIndex((m) => m.id === id);
      if (index !== -1) {
        const [removed] = modalStack.splice(index, 1);
        if (removed && removed.pushed && !removed.closedViaPopstate) {
          if (typeof window !== 'undefined' && window.history.state?.lcModal === id) {
            isProgrammaticBack = true;
            try {
              window.history.back();
            } catch {
              isProgrammaticBack = false;
            }
          }
        }
      }
    };
  }, [isOpen]);
}

export default useBackClose;
