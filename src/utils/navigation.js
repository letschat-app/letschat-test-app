import { dismissModalsAndRun } from '../hooks/useBackClose';

export const CHATS_HOME_ROUTE = '/chats';

// Secondary root pages sitting at Level 1 on top of /chats
export const LEVEL1_ROUTES = new Set([
  '/pulses',
  '/rooms',
  '/calendar',
  '/search',
  '/profile',
  '/starred',
  '/labs',
  '/batch-message',
]);

const CHATS_ANCHOR_SESSION_KEY = 'lcChatsRootActive';
const FORCE_SPACES_SESSION_KEY = 'lcForceShowSpacesForChat';

function getHistoryIdx() {
  if (typeof window === 'undefined') return 0;
  return typeof window.history.state?.idx === 'number' ? window.history.state.idx : 0;
}

export function markChatsAnchor() {
  try {
    if (getHistoryIdx() === 0) {
      sessionStorage.setItem(CHATS_ANCHOR_SESSION_KEY, '1');
    }
  } catch { /* ignore storage unavailability */ }
}

export function clearChatsAnchor() {
  try {
    sessionStorage.removeItem(CHATS_ANCHOR_SESSION_KEY);
  } catch { /* ignore storage unavailability */ }
}

export function hasChatsAnchor() {
  try {
    return sessionStorage.getItem(CHATS_ANCHOR_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function consumeForceShowSpacesForChat() {
  try {
    const val = sessionStorage.getItem(FORCE_SPACES_SESSION_KEY);
    if (val) sessionStorage.removeItem(FORCE_SPACES_SESSION_KEY);
    return val;
  } catch {
    return null;
  }
}

/**
 * Return cleanly to /chats at history idx 0 so System Back from /chats exits the app
 * instead of stepping back into Pulses, Search, Batch Messaging, or menu routes.
 */
export function resetToChats(navigate, { chatId, state } = {}) {
  dismissModalsAndRun(() => {
    if (chatId != null) {
      try {
        sessionStorage.setItem('mobileSpaceListChatId', String(chatId));
        sessionStorage.setItem(FORCE_SPACES_SESSION_KEY, String(chatId));
      } catch { /* ignore storage unavailability */ }
    }

    const idx = getHistoryIdx();
    const isChatsPath =
      typeof window !== 'undefined' &&
      (window.location.pathname === CHATS_HOME_ROUTE || window.location.pathname === '/');

    if (isChatsPath && idx === 0) {
      markChatsAnchor();
      if (state) {
        navigate(CHATS_HOME_ROUTE, { replace: true, state });
      }
      return;
    }

    if (idx > 0 && hasChatsAnchor()) {
      navigate(-idx);
      return;
    }

    if (idx === 0) {
      markChatsAnchor();
    }
    navigate(CHATS_HOME_ROUTE, { replace: true, state });
  });
}

/**
 * Navigate from root tabs, swipe tabs, top-bar Search, menu items, or batch trigger:
 * - Returning to /chats unwinds cleanly to idx 0.
 * - Opening a Level-1 route from /chats pushes onto depth 1 (so System Back returns to /chats).
 * - Switching between Level-1 routes replaces in place at depth 1 (so tabs/menu never stack).
 */
export function navigateFromNav(navigate, targetPath, currentPathname) {
  if (targetPath === CHATS_HOME_ROUTE) {
    resetToChats(navigate);
    return;
  }

  dismissModalsAndRun(() => {
    const activePath =
      typeof window !== 'undefined' ? window.location.pathname : (currentPathname || '');
    const idx = getHistoryIdx();

    if (activePath === targetPath && typeof window !== 'undefined' && !window.location.search) {
      return;
    }

    if (activePath === CHATS_HOME_ROUTE || activePath === '/') {
      markChatsAnchor();
      navigate(targetPath, { replace: false });
      return;
    }

    if (idx > 1 && hasChatsAnchor()) {
      const onPop = () => {
        window.removeEventListener('popstate', onPop);
        navigate(targetPath, { replace: true });
      };
      window.addEventListener('popstate', onPop);
      navigate(-(idx - 1));
      return;
    }

    navigate(targetPath, { replace: true });
  });
}

/**
 * Unified UI "<" Back handler for Level-1 pages and detail sub-pages.
 * Detail routes (e.g. /profile/:targetUserId, /starred?chatid=...) pop to their caller;
 * Level-1 routes always return to /chats at history idx 0.
 */
export function navigateBackOrChats(navigate, { isDetail = false } = {}) {
  dismissModalsAndRun(() => {
    const idx = getHistoryIdx();

    if (isDetail) {
      if (idx > 0) {
        navigate(-1);
      } else {
        navigate(CHATS_HOME_ROUTE, { replace: true });
      }
      return;
    }

    resetToChats(navigate);
  });
}
