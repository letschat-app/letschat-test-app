import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API } from '../service/UserAuth';

/**
 * Validates username / nickname availability and similarity via GET /api/user/check-username
 *
 * @param {Object} options
 * @param {string} options.username - The username / nickname input
 * @param {string} [options.originalName] - Current saved name; if unchanged, check is skipped
 * @param {string} [options.excludeUserId] - Current user ID to prevent self-collisions
 * @param {number} [options.debounceMs=400] - Debounce delay in ms (default 400ms)
 */
export const useUsernameCheck = ({
  username = '',
  originalName = '',
  excludeUserId = '',
  debounceMs = 400
} = {}) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'checking' | 'allow' | 'warn' | 'block'
  const [decision, setDecision] = useState(null); // 'ALLOW' | 'WARN' | 'BLOCK' | null
  const [score, setScore] = useState(null);
  const [message, setMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);

  const trimmed = (username || '').trim();
  const trimmedOriginal = (originalName || '').trim();
  const isUnchanged = Boolean(trimmedOriginal && trimmed.toLowerCase() === trimmedOriginal.toLowerCase());

  // Direct helper to perform the check
  const checkApi = useCallback(async (nameToCheck, cancelSignal) => {
    try {
      setIsChecking(true);
      setStatus('checking');

      const base = API.endsWith('/api') ? API : `${API}/api`;
      const params = new URLSearchParams({ username: nameToCheck });
      if (excludeUserId) {
        params.append('excludeUserId', excludeUserId);
      }

      const res = await axios.get(`${base}/user/check-username?${params.toString()}`, {
        signal: cancelSignal
      });

      const data = res.data || {};
      const returnedDecision = (data.decision || '').toUpperCase();
      const returnedScore = typeof data.score === 'number' ? data.score : null;
      const returnedMsg = data.message || '';

      setScore(returnedScore);
      setDecision(returnedDecision);

      if (returnedDecision === 'ALLOW' || (returnedScore !== null && returnedScore < 6.0)) {
        setStatus('allow');
        setMessage(returnedMsg || 'Username is available');
      } else if (returnedDecision === 'WARN' || (returnedScore !== null && returnedScore >= 6.0 && returnedScore < 8.0)) {
        setStatus('warn');
        setMessage(returnedMsg || 'Username is somewhat similar to an existing username. You can proceed if this is intended.');
      } else {
        // BLOCK (>= 8.0)
        setStatus('block');
        setMessage(returnedMsg || 'Too similar to an existing username. Please choose another username.');
      }
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'CanceledError') {
        return; // Request was aborted due to new keystroke
      }
      console.error('[useUsernameCheck] Validation error:', err);

      const errData = err.response?.data;
      if (errData && errData.decision) {
        const returnedDecision = (errData.decision || '').toUpperCase();
        setDecision(returnedDecision);
        setScore(errData.score || null);
        setMessage(errData.message || 'Username check failed.');
        setStatus(returnedDecision.toLowerCase());
      } else {
        // Fallback network/server failure - do not permanently block, but report warning
        setStatus('idle');
        setMessage('');
      }
    } finally {
      setIsChecking(false);
    }
  }, [excludeUserId]);

  useEffect(() => {
    // Clear any previous debounce timer and active request
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 1. Empty input
    if (!trimmed) {
      setStatus('idle');
      setDecision(null);
      setScore(null);
      setMessage('');
      setIsChecking(false);
      return;
    }

    // 2. Unchanged original name (skip check)
    if (isUnchanged) {
      setStatus('allow');
      setDecision('ALLOW');
      setScore(0);
      setMessage('Current name');
      setIsChecking(false);
      return;
    }

    // 3. Minimum length check (< 3 characters)
    if (trimmed.length < 3) {
      setStatus('block');
      setDecision('BLOCK');
      setScore(null);
      setMessage('Username must be at least 3 characters');
      setIsChecking(false);
      return;
    }

    // 4. Debounce API call (400ms)
    setIsChecking(true);
    setStatus('checking');

    timerRef.current = setTimeout(() => {
      abortControllerRef.current = new AbortController();
      checkApi(trimmed, abortControllerRef.current.signal);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [trimmed, isUnchanged, debounceMs, checkApi]);

  // Can the user proceed?
  const canProceed = Boolean(
    !isChecking &&
    (isUnchanged || status === 'allow' || status === 'warn') &&
    trimmed.length >= 3
  );

  const isBlocked = Boolean(status === 'block' || (!isUnchanged && trimmed.length > 0 && trimmed.length < 3));

  return {
    status,        // 'idle' | 'checking' | 'allow' | 'warn' | 'block'
    decision,      // 'ALLOW' | 'WARN' | 'BLOCK' | null
    score,         // number | null
    message,       // display message
    isChecking,    // boolean loader state
    canProceed,    // boolean: safe to submit
    isBlocked,     // boolean: must block submission
    isUnchanged    // boolean: matches original name
  };
};

export default useUsernameCheck;
