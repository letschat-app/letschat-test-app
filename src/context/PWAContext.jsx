import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const PWAContext = createContext();
export const usePWA = () => useContext(PWAContext);

// ─── Version Key used in localStorage ────────────────────────────────────────
const VERSION_KEY = 'pwa_active_version';

// ─── Timeout for stuck SW activation (ms) ────────────────────────────────────
const STUCK_SW_TIMEOUT = 10000;

export const PWAProvider = ({ children }) => {
  // ── Install Prompt State ──────────────────────────────────────────────────
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // ── Update State ──────────────────────────────────────────────────────────
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);

  // ── Internal Refs (NOT state — they must not cause re-renders) ────────────
  const waitingWorkerRef = useRef(null);   // The new SW waiting to activate
  const refreshingRef = useRef(false);     // Reload lock — prevents double reload
  const toastDismissedRef = useRef(false); // "Later" button state for this session
  const stuckTimerRef = useRef(null);      // Timeout for stuck SW detection

  // ─── Helper: Show Update Toast (with all guards) ──────────────────────────
  const triggerUpdateUI = (registration) => {
    const waiting = registration?.waiting;
    if (!waiting) return;

    // Guard 1: Don't show on first install (no previous controller means fresh install)
    if (!navigator.serviceWorker.controller) {
      console.log('[PWA] First install detected — skipping update toast.');
      return;
    }

    // Guard 2: Session-based dismissal (user clicked "Later")
    if (toastDismissedRef.current) {
      console.log('[PWA] Toast dismissed this session — skipping.');
      return;
    }

    // Store the reference so applyUpdate() can use it
    waitingWorkerRef.current = waiting;
    setUpdateAvailable(true);
    console.log('[PWA] Update available — showing toast.');
  };

  // ─── Helper: Track version from SW message ────────────────────────────────
  const handleSWMessage = (event) => {
    if (event.data?.type === 'SW_ACTIVATED') {
      const incomingVersion = event.data.version;
      const storedVersion = localStorage.getItem(VERSION_KEY);

      console.log(`[PWA] SW activated. Version: ${incomingVersion} (stored: ${storedVersion})`);

      // Update stored version
      localStorage.setItem(VERSION_KEY, incomingVersion);
      setCurrentVersion(incomingVersion);

      // Hide toast if it was showing (update completed)
      setUpdateAvailable(false);
    }
  };

  // ─── Apply Update: User-Controlled Activation ─────────────────────────────
  const applyUpdate = () => {
    // Anti-spam + null guard
    if (!waitingWorkerRef.current || refreshingRef.current) {
      console.warn('[PWA] applyUpdate called but no waiting worker or already refreshing.');
      // Fallback: force reload if stuck
      window.location.reload();
      return;
    }

    console.log('[PWA] Sending SKIP_WAITING to waiting worker...');
    waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });

    // Stuck SW Timeout: if controllerchange doesn't fire in 10s, reload anyway
    stuckTimerRef.current = setTimeout(() => {
      console.warn('[PWA] SW activation timed out — forcing reload.');
      window.location.reload();
    }, STUCK_SW_TIMEOUT);
  };

  // ─── Dismiss Update ("Later" button) ─────────────────────────────────────
  const dismissUpdate = () => {
    toastDismissedRef.current = true;
    setUpdateAvailable(false);
    console.log('[PWA] Update dismissed for this session.');
  };

  // ─── Service Worker Registration & Lifecycle ──────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration = null;

    const setup = async () => {
      try {
        // Register the worker (Compiled by VitePWA)
        const swPath = `${import.meta.env.BASE_URL}service-worker.js`.replace(/\/+/g, '/');
        registration = await navigator.serviceWorker.register(swPath, { scope: import.meta.env.BASE_URL });
        console.log('[PWA] Service Worker registered via Workbox:', registration.scope);

        // ── Guard: Check if an update is ALREADY waiting (handles page refresh) ──
        if (registration.waiting) {
          console.log('[PWA] SW already waiting on load — triggering UI.');
          triggerUpdateUI(registration);
        }

        // ── Lifecycle: Watch for new worker being installed ──
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          console.log('[PWA] New SW installing...');

          installingWorker.onstatechange = () => {
            console.log(`[PWA] Installing worker state: ${installingWorker.state}`);
            if (installingWorker.state === 'installed') {
              // Worker finished installing. Now check if it's waiting.
              if (navigator.serviceWorker.controller) {
                // Existing controller = this is an UPDATE, not first install
                triggerUpdateUI(registration);
              }
              // If no controller, this is a first install — do nothing (silent)
            }
          };
        };

        // ── Check for updates on regain focus (background tab scenario) ──
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(err =>
              console.warn('[PWA] Background update check failed:', err)
            );
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup visibility listener
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);

      } catch (err) {
        console.error('[PWA] Service Worker registration failed:', err);
      }
    };

    setup();

    // ── Controller Change: Reload ONCE when new SW takes over ──
    const handleControllerChange = () => {
      if (!refreshingRef.current) {
        refreshingRef.current = true;
        clearTimeout(stuckTimerRef.current); // Cancel the stuck timer
        console.log('[PWA] Controller changed — signaling FCM refresh and reloading.');
        localStorage.setItem('sw_just_updated', 'true'); // Tell useNotifications to refresh token after reload
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // ── Version Message from SW ──
    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      clearTimeout(stuckTimerRef.current);
    };
  }, []);

  // ─── Install Prompt (PWA Install Banner) ─────────────────────────────────
  useEffect(() => {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    setDeferredPrompt(null);
  };

  return (
    <PWAContext.Provider value={{
      // Install
      deferredPrompt,
      isInstalled,
      installApp,
      // Updates
      updateAvailable,
      currentVersion,
      applyUpdate,
      dismissUpdate,
    }}>
      {children}
    </PWAContext.Provider>
  );
};
