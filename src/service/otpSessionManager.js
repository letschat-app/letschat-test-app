const OTP_STORAGE_KEY = 'letschat_pending_otp';

/**
 * @typedef {Object} PendingOtpSession
 * @property {'SIGNUP' | 'FORGOT_PASSWORD' | 'CHANGE_PASSWORD' | '2FA_TOGGLE' | '2FA_LOGIN'} flow
 * @property {Record<string, any>} payload
 * @property {number} expiresAt
 * @property {string} promptMessage
 */

/**
 * Save active OTP request session to localStorage.
 * Backend OTPs expire in 10 minutes.
 * @param {Omit<PendingOtpSession, 'expiresAt'> & { expiresAt?: number }} session
 */
export const savePendingOtpSession = (session) => {
  const data = {
    ...session,
    expiresAt: session.expiresAt || (Date.now() + 10 * 60 * 1000) // 10 minutes window
  };
  try {
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('letschat_pending_otp_changed', { detail: data }));
  } catch (e) {
    console.error("[otpSessionManager] Failed to save pending OTP session:", e);
  }
};

/**
 * Get active pending OTP session if it exists and has not expired.
 * @returns {PendingOtpSession | null}
 */
export const getPendingOtpSession = () => {
  const raw = localStorage.getItem(OTP_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session || typeof session !== 'object') {
      clearPendingOtpSession();
      return null;
    }
    if (Date.now() > session.expiresAt) {
      clearPendingOtpSession();
      return null;
    }
    return session;
  } catch (e) {
    clearPendingOtpSession();
    return null;
  }
};

/**
 * Clear any active pending OTP session.
 */
export const clearPendingOtpSession = () => {
  try {
    localStorage.removeItem(OTP_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('letschat_pending_otp_changed', { detail: null }));
  } catch (e) {
    console.error("[otpSessionManager] Failed to clear pending OTP session:", e);
  }
};
