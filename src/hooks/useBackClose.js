import { useEffect, useRef } from 'react';

// Module-level stack for open modals/overlays
const modalStack = [];
let nextModalId = 1;
let isProgrammaticBack = false;
let pendingProgrammaticCallbacks = [];
let globalListenersAttached = false;
let currentHref = typeof window !== 'undefined' ? window.location.href : '';

function flushPendingProgrammaticCallbacks() {
  if (pendingProgrammaticCallbacks.length === 0) return;
  const callbacks = [...pendingProgrammaticCallbacks];
  pendingProgrammaticCallbacks = [];
  callbacks.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error('Error running post-modal-close callback:', err);
    }
  });
}

function ensureGlobalListeners() {
  if (globalListenersAttached || typeof window === 'undefined') return;
  globalListenersAttached = true;
  currentHref = window.location.href;

  window.addEventListener('popstate', (e) => {
    // If triggered programmatically by our own history.back() / history.go() on UI close, ignore modal pop
    if (isProgrammaticBack) {
      isProgrammaticBack = false;
      currentHref = window.location.href;
      flushPendingProgrammaticCallbacks();
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
              flushPendingProgrammaticCallbacks();
            }
          }
        }
      }
    };
  }, [isOpen]);
}

/**
 * Dismisses all open useBackClose overlays and unwinds their pushed `{ lcModal }`
 * history entries before invoking `callback` (e.g. a route change).
 */
export function dismissModalsAndRun(callback) {
  if (typeof window === 'undefined') {
    callback?.();
    return;
  }

  ensureGlobalListeners();

  if (modalStack.length > 0) {
    let popCount = 0;
    const active = [...modalStack];
    modalStack.length = 0;

    for (let i = active.length - 1; i >= 0; i--) {
      const item = active[i];
      if (item.pushed && !item.closedViaPopstate) {
        popCount += 1;
      }
      // Mark closed before onClose so React effect cleanup does not trigger a second history.back()
      item.closedViaPopstate = true;
      try {
        item.onCloseRef.current?.();
      } catch (err) {
        console.error('Error closing modal before navigation:', err);
      }
    }

    if (popCount > 0 && window.history.state?.lcModal != null) {
      if (typeof callback === 'function') {
        pendingProgrammaticCallbacks.push(callback);
      }
      isProgrammaticBack = true;
      try {
        window.history.go(-popCount);
        return;
      } catch {
        isProgrammaticBack = false;
        flushPendingProgrammaticCallbacks();
        return;
      }
    }
  }

  if (isProgrammaticBack) {
    if (typeof callback === 'function') {
      pendingProgrammaticCallbacks.push(callback);
    }
    return;
  }

  callback?.();
}

export default useBackClose;
