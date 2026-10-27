import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API } from '../service/UserAuth';

/**
 * Validates username / nickname availability and similarity via GET /api/user/check-username
 * 
 * Features:
 * 1. Debounced execution (default 400ms).
 * 2. Minimum length check (>= 3 chars) before making network requests.
 * 3. Client-side regex format validation (alphanumeric, dots, underscores).
 * 4. In-flight request cancellation (AbortController) to avoid race conditions.
 * 5. Stale response protection (ignores results for superseded text).
 * 6. In-memory session cache so backspacing and retyping never re-fetches.
 *
 * @param {Object} options
 * @param {string} options.username - The username / nickname input
 * @param {string} [options.originalName] - Current saved name; if unchanged, check is skipped
 * @param {string} [options.excludeUserId] - Current user ID to prevent self-collisions
 * @param {number} [options.debounceMs=400] - Debounce delay in ms
 */
export const useUsernameCheck = ({
  username = '',
  originalName = '',
  excludeUserId = '',
  debounceMs = 400,
  minLength = 3
} = {}) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'checking' | 'allow' | 'warn' | 'block'
  const [decision, setDecision] = useState(null); // 'ALLOW' | 'WARN' | 'BLOCK' | null
  const [score, setScore] = useState(null);
  const [message, setMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);
  const cacheRef = useRef(new Map()); // Session cache: Map<string, { status, decision, score, message }>
  const currentInputRef = useRef('');

  const trimmed = (username || '').trim();
  const trimmedOriginal = (originalName || '').trim();
  const isUnchanged = Boolean(trimmedOriginal && trimmed.toLowerCase() === trimmedOriginal.toLowerCase());

  currentInputRef.current = trimmed;

  // Direct helper to perform the API check
  const checkApi = useCallback(async (nameToCheck, cancelSignal) => {
    const cacheKey = `${nameToCheck.toLowerCase()}__${excludeUserId || ''}`;

    // 1. Check in-memory cache first
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      if (currentInputRef.current.toLowerCase() === nameToCheck.toLowerCase()) {
        setStatus(cached.status);
        setDecision(cached.decision);
        setScore(cached.score);
        setMessage(cached.message);
        setIsChecking(false);
      }
      return;
    }

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

      // Ignore stale response if user has typed something else
      if (currentInputRef.current.toLowerCase() !== nameToCheck.toLowerCase()) {
        return;
      }

      const data = res.data || {};
      const returnedDecision = (data.decision || '').toUpperCase();
      const returnedScore = typeof data.score === 'number' ? data.score : null;
      const returnedMsg = data.message || '';

      let nextStatus = 'allow';
      let nextMsg = returnedMsg || 'Username is available';

      if (returnedDecision === 'ALLOW' || (returnedScore !== null && returnedScore < 6.0)) {
        nextStatus = 'allow';
        nextMsg = returnedMsg || 'Username is available';
      } else if (returnedDecision === 'WARN' || (returnedScore !== null && returnedScore >= 6.0 && returnedScore < 8.0)) {
        nextStatus = 'warn';
        nextMsg = returnedMsg || 'Available but similar to existing username';
      } else {
        // BLOCK (>= 8.0 or taken)
        nextStatus = 'block';
        nextMsg = returnedMsg || 'Username is already taken';
      }

      // Store in session cache
      const cacheValue = {
        status: nextStatus,
        decision: returnedDecision,
        score: returnedScore,
        message: nextMsg
      };
      cacheRef.current.set(cacheKey, cacheValue);

      setStatus(nextStatus);
      setDecision(returnedDecision);
      setScore(returnedScore);
      setMessage(nextMsg);
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'CanceledError') {
        return; // Request was aborted due to new keystroke
      }

      // Ignore stale errors
      if (currentInputRef.current.toLowerCase() !== nameToCheck.toLowerCase()) {
        return;
      }

      console.error('[useUsernameCheck] Validation error:', err);

      const errData = err.response?.data;
      if (errData && errData.decision) {
        const returnedDecision = (errData.decision || '').toUpperCase();
        const returnedStatus = returnedDecision.toLowerCase();
        const errVal = {
          status: returnedStatus,
          decision: returnedDecision,
          score: errData.score || null,
          message: errData.message || 'Username check failed.'
        };
        cacheRef.current.set(cacheKey, errVal);
        setDecision(returnedDecision);
        setScore(errData.score || null);
        setMessage(errVal.message);
        setStatus(returnedStatus);
      } else {
        // Fallback network/server failure - do not permanently block
        setStatus('idle');
        setMessage('');
      }
    } finally {
      if (currentInputRef.current.toLowerCase() === nameToCheck.toLowerCase()) {
        setIsChecking(false);
      }
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

    // 3. Client-side length rule (< minLength characters)
    if (trimmed.length < minLength) {
      setStatus('block');
      setDecision('BLOCK');
      setScore(null);
      setMessage(minLength > 3 ? `Username must be more than ${minLength - 1} characters` : 'Username must be at least 3 characters');
      setIsChecking(false);
      return;
    }

    // 4. Client-side length rule (> 30 characters)
    if (trimmed.length > 30) {
      setStatus('block');
      setDecision('BLOCK');
      setScore(null);
      setMessage('Username cannot exceed 30 characters');
      setIsChecking(false);
      return;
    }

    // 5. Client-side valid character rule (alphanumeric, underscore, dot)
    const validPattern = /^[a-zA-Z0-9_.]+$/;
    if (!validPattern.test(trimmed)) {
      setStatus('block');
      setDecision('BLOCK');
      setScore(10.0);
      setMessage('Only letters, numbers, dots, and underscores allowed');
      setIsChecking(false);
      return;
    }

    // 5.5 Client-side reserved names rule (letschat, admin, system, server, etc.)
    const reservedWords = ['letschat', 'admin', 'administrator', 'system', 'sysadmin', 'server', 'root', 'support', 'moderator', 'bot'];
    const norm = trimmed.toLowerCase()
      .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
      .replace(/[^a-z0-9]/g, '');
    const noDigits = norm.replace(/\d+$/, '');
    const tokens = trimmed.toLowerCase().split(/[^a-z0-9]+/);

    const isReserved = norm.includes('letschat') ||
      reservedWords.includes(norm) ||
      (noDigits && reservedWords.includes(noDigits)) ||
      tokens.some(t => {
        const nt = t.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
        const ntNoDigits = nt.replace(/\d+$/, '');
        return reservedWords.includes(nt) || (ntNoDigits && reservedWords.includes(ntNoDigits));
      });

    if (isReserved) {
      setStatus('block');
      setDecision('BLOCK');
      setScore(10.0);
      setMessage('Username is already taken');
      setIsChecking(false);
      return;
    }

    // 6. Fast session cache check before waiting for debounce
    const cacheKey = `${trimmed.toLowerCase()}__${excludeUserId || ''}`;
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      setStatus(cached.status);
      setDecision(cached.decision);
      setScore(cached.score);
      setMessage(cached.message);
      setIsChecking(false);
      return;
    }

    // 7. Debounce API call (default 400ms)
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
  }, [trimmed, isUnchanged, debounceMs, checkApi, excludeUserId, minLength]);

  // Can the user proceed?
  const canProceed = Boolean(
    !isChecking &&
    (isUnchanged || status === 'allow' || status === 'warn') &&
    trimmed.length >= minLength
  );

  const isBlocked = Boolean(status === 'block' || (!isUnchanged && trimmed.length > 0 && trimmed.length < minLength));

  return {
    status,        // 'idle' | 'checking' | 'allow' | 'warn' | 'block'
    decision,      // 'ALLOW' | 'WARN' | 'BLOCK' | null
    score,         // number | null
    message,       // display message
    isChecking,    // boolean loader state (spinner)
    canProceed,    // boolean: safe to submit
    isBlocked,     // boolean: must block submission
    isUnchanged    // boolean: matches original name
  };
};

export default useUsernameCheck;
