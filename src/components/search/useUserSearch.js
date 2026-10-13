import { useState, useEffect, useRef, useCallback } from 'react';
import { API } from '../../service/UserAuth';
import userDiscoveryStore from '../../service/UserDiscoveryStore';
import { normalizeIdentifier } from '../../service/ChatUtils';

/**
 * useUserSearch Hook
 * Manages search query, debouncing, keyboard navigation indices, local-first search,
 * remote fallback search with AbortController, own account checks, and recent searches.
 */
export const useUserSearch = (showToast) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState({ type: 'idle', text: '' });
  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isCapped, setIsCapped] = useState(false);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  });

  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const currentUserId = localStorage.getItem('userid');

  const addRecentSearch = useCallback((term) => {
    if (!term || !term.trim()) return;
    const cleaned = term.trim();
    setRecentSearches(prev => {
      const updated = [cleaned, ...prev.filter(item => item !== cleaned)].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
    if (showToast) showToast('Recent searches cleared');
  }, [showToast]);

  const executeSearch = useCallback(async (searchQuery) => {
    const rawTrimmed = searchQuery.trim();
    if (!rawTrimmed) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setResults([]);
      setSelectedUser(null);
      setStatus({ type: 'idle', text: '' });
      setActiveIndex(-1);
      setIsCapped(false);
      return;
    }

    const currentReqId = ++requestIdRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const normalizedQuery = normalizeIdentifier(rawTrimmed);
    const lowQuery = rawTrimmed.toLowerCase();

    // Check if user is searching for their own account
    const myUsername = (localStorage.getItem('username') || '').toLowerCase();
    const myEmail = (localStorage.getItem('email') || '').toLowerCase();
    const myId = (currentUserId || '').toLowerCase();

    if (
      lowQuery === myId ||
      normalizedQuery === myId.toUpperCase() ||
      (myEmail && lowQuery === myEmail) ||
      (myUsername && lowQuery === myUsername)
    ) {
      setResults([]);
      setSelectedUser(null);
      setStatus({ type: 'own', text: 'That is your own account.' });
      setActiveIndex(-1);
      setIsCapped(false);
      return;
    }

    setStatus({ type: 'loading', text: 'Searching...' });
    setSelectedUser(null);

    // 1. Local Search First
    const discoveryUsers = userDiscoveryStore.users || [];
    const localMatches = discoveryUsers.filter(u => {
      if (!u || String(u.userId) === String(currentUserId)) return false;
      const uName = (u.userName || u.publicName || '').toLowerCase();
      const uId = String(u.userId || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return uName.includes(lowQuery) || uId.includes(lowQuery) || (uEmail && uEmail.includes(lowQuery));
    });

    if (localMatches.length > 0) {
      if (requestIdRef.current !== currentReqId) return;
      const cappedResults = localMatches.slice(0, 20);
      setResults(cappedResults);
      setIsCapped(localMatches.length > 20);
      setStatus({ type: 'results', text: '' });
      setActiveIndex(-1);
      addRecentSearch(rawTrimmed);
      return;
    }

    // 2. Fallback to Remote Endpoints if 0 local matches
    try {
      let data = null;
      let resp = await fetch(`${API}/user/search/${encodeURIComponent(normalizedQuery)}`, {
        signal: controller.signal
      });

      if (!resp.ok) {
        resp = await fetch(`${API}/user/search?query=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal
        });
      }

      if (!resp.ok && rawTrimmed.includes('@')) {
        resp = await fetch(`${API}/user/getme`, {
          headers: { 'User-Id': rawTrimmed },
          signal: controller.signal
        });
      }

      if (requestIdRef.current !== currentReqId) return;

      if (resp && resp.ok) {
        const json = await resp.json();
        data = Array.isArray(json) ? json : [json];
      }

      if (data && data.length > 0) {
        const filteredRemote = data.filter(u => String(u.userId || u.id) !== String(currentUserId));
        if (filteredRemote.length > 0) {
          setResults(filteredRemote.slice(0, 20));
          setIsCapped(filteredRemote.length > 20);
          setStatus({ type: 'results', text: '' });
          setActiveIndex(-1);
          addRecentSearch(rawTrimmed);
          return;
        }
      }

      // If empty result
      setResults([]);
      setIsCapped(false);
      setStatus({ type: 'empty', text: `No user found for "${rawTrimmed}"` });
      setActiveIndex(-1);

    } catch (err) {
      if (err.name === 'AbortError') return;
      if (requestIdRef.current !== currentReqId) return;
      console.error('[useUserSearch] Search error:', err);
      setResults([]);
      setIsCapped(false);
      setStatus({ type: 'error', text: 'Search failed.' });
      setActiveIndex(-1);
    }
  }, [currentUserId, addRecentSearch]);

  // Debounced search trigger (300ms)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedUser(null);
      setStatus({ type: 'idle', text: '' });
      setActiveIndex(-1);
      setIsCapped(false);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, executeSearch]);

  const selectUser = useCallback((user) => {
    setSelectedUser(user);
    setStatus({ type: 'selected', text: '' });
    if (user && (user.userName || user.userId)) {
      addRecentSearch(user.userName || user.userId);
    }
  }, [addRecentSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedUser(null);
    setStatus({ type: 'idle', text: '' });
    setActiveIndex(-1);
    setIsCapped(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    query,
    setQuery,
    status,
    setStatus,
    results,
    selectedUser,
    setSelectedUser,
    activeIndex,
    setActiveIndex,
    isCapped,
    recentSearches,
    clearRecentSearches,
    executeSearch,
    selectUser,
    clearSearch,
  };
};
