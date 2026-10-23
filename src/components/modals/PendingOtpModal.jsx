import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound, Lock, User, Mail, Loader2, CheckCircle2, AlertCircle, RotateCcw, X, Eye, EyeOff } from 'lucide-react';
import { getPendingOtpSession, clearPendingOtpSession, savePendingOtpSession } from '../../service/otpSessionManager';
import {
  forgotPasswordVerifyOtp,
  forgotPasswordReset,
  forgotPasswordSendOtp,
  changePassword,
  changePasswordSendOtp,
  verifyAndToggle2FA,
  send2FAOtp,
  verify2FALogin,
  signupVerify,
  signupInit
} from '../../service/UserAuth';
import { initWebsocket } from '../../service/Websocket';

export default function PendingOtpModal() {
  const [session, setSession] = useState(() => getPendingOtpSession());
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);

  // Sub-step for FORGOT_PASSWORD after OTP is verified
  const [forgotStep, setForgotStep] = useState('otp'); // 'otp' | 'reset'
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const otpInputRef = useRef(null);
  const navigate = useNavigate();

  // Listen to pending OTP session updates across windows / components
  useEffect(() => {
    const handleSessionChange = () => {
      const active = getPendingOtpSession();
      setSession(active);
      setErrorMsg('');
      setInfoMsg('');
      setOtp('');
      if (active?.payload?.resetToken) {
        setResetToken(active.payload.resetToken);
        setForgotStep('reset');
      } else {
        setForgotStep('otp');
      }
    };

    window.addEventListener('letschat_pending_otp_changed', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);

    return () => {
      window.removeEventListener('letschat_pending_otp_changed', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, []);

  // Expiry countdown timer (10 mins from backend)
  useEffect(() => {
    if (!session) return;
    const updateTime = () => {
      const diff = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setRemainingTime(diff);
      if (diff === 0) {
        clearPendingOtpSession();
        setSession(null);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus OTP input when visible
  useEffect(() => {
    if (session && forgotStep === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [session, forgotStep]);

  if (!session) return null;

  const currentUserId = localStorage.getItem('userid');

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getFlowDetails = () => {
    switch (session.flow) {
      case 'FORGOT_PASSWORD':
        return {
          title: forgotStep === 'otp' ? 'Verify Password Reset Code' : 'Set New Password',
          icon: forgotStep === 'otp' ? <KeyRound size={24} color="var(--accent-text)" /> : <Lock size={24} color="var(--success-color)" />,
          badge: 'Password Reset',
          color: 'var(--accent-text)'
        };
      case 'CHANGE_PASSWORD':
        return {
          title: 'Confirm Password Change',
          icon: <Lock size={24} color="var(--accent-text)" />,
          badge: 'Security Verification',
          color: 'var(--accent-text)'
        };
      case '2FA_TOGGLE':
        return {
          title: session.payload?.enable ? 'Enable Two-Factor Authentication' : 'Disable Two-Factor Authentication',
          icon: <ShieldCheck size={24} color={session.payload?.enable ? 'var(--success-color)' : 'var(--warning-color)'} />,
          badge: '2FA Security Challenge',
          color: session.payload?.enable ? 'var(--success-color)' : 'var(--warning-color)'
        };
      case '2FA_LOGIN':
        return {
          title: '2FA Verification Required',
          icon: <ShieldCheck size={24} color="var(--accent-text)" />,
          badge: 'Account Protection',
          color: 'var(--accent-text)'
        };
      case 'SIGNUP':
        return {
          title: 'Verify Email Registration',
          icon: <Mail size={24} color="var(--accent-text)" />,
          badge: 'Account Setup',
          color: 'var(--accent-text)'
        };
      default:
        return {
          title: 'Security Verification',
          icon: <ShieldCheck size={24} color="var(--accent-text)" />,
          badge: 'Verification',
          color: 'var(--accent-text)'
        };
    }
  };

  const flowDetails = getFlowDetails();

  // Handle Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    try {
      if (session.flow === 'FORGOT_PASSWORD') {
        const id = session.payload?.identifier;
        if (id) await forgotPasswordSendOtp(id);
      } else if (session.flow === 'CHANGE_PASSWORD') {
        if (currentUserId) await changePasswordSendOtp(currentUserId);
      } else if (session.flow === '2FA_TOGGLE') {
        if (currentUserId) await send2FAOtp(Boolean(session.payload?.enable), currentUserId);
      } else if (session.flow === 'SIGNUP') {
        if (session.payload) await signupInit(session.payload);
      }

      setResendCooldown(60);
      setInfoMsg('A fresh verification code has been sent to your registered email.');
    } catch (err) {
      console.error('[PendingOtpModal] Resend error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to resend code.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Submission
  const handleSubmitOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      switch (session.flow) {
        case 'FORGOT_PASSWORD': {
          const res = await forgotPasswordVerifyOtp({
            identifier: session.payload.identifier,
            otp: cleanOtp
          });
          const data = res.data;
          if (data?.status === 'SUCCESS' || data?.resetToken || res.status === 200) {
            const token = data?.resetToken;
            setResetToken(token);
            setForgotStep('reset');
            // Update session so reload stays on reset step
            savePendingOtpSession({
              ...session,
              payload: { ...session.payload, resetToken: token }
            });
            setInfoMsg('Verification code confirmed! Please choose a new password.');
          } else {
            setErrorMsg(data?.message || 'Invalid or expired code. Please try again.');
          }
          break;
        }

        case 'CHANGE_PASSWORD': {
          const res = await changePassword({
            currentPassword: session.payload.currentPassword,
            newPassword: session.payload.newPassword,
            otp: cleanOtp
          }, currentUserId);
          const data = res.data;
          if (data?.status === 'SUCCESS' || res.status === 200) {
            clearPendingOtpSession();
            setSession(null);
            alert('Password updated successfully!');
          } else {
            setErrorMsg(data?.message || 'Invalid verification code. Password not updated.');
          }
          break;
        }

        case '2FA_TOGGLE': {
          const nextEnable = Boolean(session.payload.enable);
          const res = await verifyAndToggle2FA({
            enable: nextEnable,
            otp: cleanOtp
          }, currentUserId);
          const data = res.data;
          if (data?.status === 'success' || data?.status === 'SUCCESS' || res.status === 200) {
            clearPendingOtpSession();
            setSession(null);
            localStorage.setItem('is2FAEnabled', String(nextEnable));
            window.dispatchEvent(new CustomEvent('2fa_status_changed', { detail: { is2FAEnabled: nextEnable } }));
            alert(data?.message || `Two-factor authentication successfully ${nextEnable ? 'enabled' : 'disabled'}!`);
          } else {
            setErrorMsg(data?.message || 'Invalid verification code. 2FA setting not updated.');
          }
          break;
        }

        case '2FA_LOGIN': {
          const res = await verify2FALogin({
            identifier: session.payload.identifier,
            otp: cleanOtp
          });
          const data = res.data;
          if (data?.status === 'SUCCESS' || data === 'login succesfull' || res.status === 200 || res.status === 201) {
            clearPendingOtpSession();
            setSession(null);
            const loggedUserId = data?.userId || data?.userid || data?.id || session.payload.identifier;
            localStorage.setItem('userid', loggedUserId);
            if (data?.email) localStorage.setItem('email', data.email);
            if (data?.username || data?.publicName) localStorage.setItem('username', data.username || data.publicName);
            if (data?.is2FAEnabled !== undefined) localStorage.setItem('is2FAEnabled', String(data.is2FAEnabled));
            initWebsocket();
            navigate('/chats', { replace: true });
          } else {
            setErrorMsg(data?.message || 'Invalid 2FA code. Please try again.');
          }
          break;
        }

        case 'SIGNUP': {
          const res = await signupVerify({
            email: session.payload.email,
            otp: cleanOtp
          });
          const data = res.data;
          const createdUserId = typeof data === 'string' ? data : data?.userId || data?.userid || data?.id;
          if (createdUserId) {
            clearPendingOtpSession();
            setSession(null);
            localStorage.setItem('userid', createdUserId);
            if (session.payload.email) localStorage.setItem('email', session.payload.email);
            if (session.payload.username) localStorage.setItem('username', session.payload.username);
            initWebsocket();
            navigate('/chats', { replace: true });
          } else {
            setErrorMsg('Registration completed, but User ID was not returned. Please try logging in.');
          }
          break;
        }

        default:
          setErrorMsg('Unknown verification flow.');
      }
    } catch (err) {
      console.error('[PendingOtpModal] Submit error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Verification failed. Please check the OTP code and try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Setting New Password for FORGOT_PASSWORD
  const handleResetPasswordSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPasswordReset({
        identifier: session.payload.identifier,
        resetToken: resetToken,
        newPassword: newPassword
      });
      const data = res.data;

      if (data?.status === 'SUCCESS' || res.status === 200) {
        clearPendingOtpSession();
        setSession(null);
        alert('Password has been reset successfully! You can now log in with your new password.');
        navigate('/login', { replace: true });
      } else {
        setErrorMsg(data?.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('[PendingOtpModal] Reset password error:', err);
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    clearPendingOtpSession();
    setSession(null);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Top Tag & Close Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: `${flowDetails.color}20`,
            color: flowDetails.color,
            border: `1px solid ${flowDetails.color}40`
          }}>
            {flowDetails.badge}
          </span>
          <button
            onClick={handleCancel}
            title="Cancel & Dismiss"
            style={styles.closeBtn}
          >
            <X size={18} />
          </button>
        </div>

        {/* Header */}
        <div style={styles.header}>
          <div style={{ ...styles.iconCircle, backgroundColor: `${flowDetails.color}15` }}>
            {flowDetails.icon}
          </div>
          <h2 style={styles.title}>{flowDetails.title}</h2>
          <p style={styles.subtitle}>
            {forgotStep === 'otp'
              ? (session.promptMessage || 'Please enter the 6-digit code sent to your email.')
              : 'Enter a strong new password with at least 6 characters.'}
          </p>
        </div>

        {/* Countdown Pill */}
        {forgotStep === 'otp' && remainingTime > 0 && (
          <div style={styles.timerPill}>
            <span>Code expires in: </span>
            <span style={{ fontWeight: '700', color: remainingTime < 60 ? 'var(--danger-color)' : 'var(--accent-text)' }}>
              {formatTimer(remainingTime)}
            </span>
          </div>
        )}

        {/* Info Box */}
        {infoMsg && (
          <div style={styles.infoBox}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Error Box */}
        {errorMsg && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* OTP Input Form */}
        {forgotStep === 'otp' ? (
          <form onSubmit={handleSubmitOtp} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>6-Digit Verification Code</label>
              <input
                ref={otpInputRef}
                type="text"
                maxLength={6}
                required
                autoFocus
                placeholder="123456"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ''));
                  setErrorMsg('');
                }}
                style={styles.otpInput}
              />
            </div>

            {/* Resend Action */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? 'var(--text-secondary)' : 'var(--accent-text)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={14} />
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Verification Code'}
              </button>
            </div>

            {/* Submit & Cancel Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleCancel}
                style={styles.cancelBtn}
              >
                Cancel / Exit
              </button>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                style={{
                  ...styles.submitBtn,
                  backgroundColor: flowDetails.color,
                  opacity: (loading || otp.length !== 6) ? 0.6 : 1
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Send / Verify'
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Password Reset Step for FORGOT_PASSWORD */
          <form onSubmit={handleResetPasswordSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  style={{ ...styles.input, paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? <EyeOff size={18} color="var(--text-secondary)" /> : <Eye size={18} color="var(--text-secondary)" />}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  style={{ ...styles.input, paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  {showConfirmPassword ? <EyeOff size={18} color="var(--text-secondary)" /> : <Eye size={18} color="var(--text-secondary)" />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleCancel}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                style={{
                  ...styles.submitBtn,
                  backgroundColor: 'var(--success-color)',
                  opacity: (loading || !newPassword || !confirmPassword) ? 0.6 : 1
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Reset Password & Login'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 100000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box'
  },
  modal: {
    width: '100%',
    maxWidth: '430px',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color))',
    borderRadius: '24px',
    padding: '28px 24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    boxSizing: 'border-box'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px'
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  iconCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '6px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.45',
    textAlign: 'center'
  },
  timerPill: {
    alignSelf: 'center',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-hover)',
    border: '1px solid var(--border-color))',
    padding: '4px 12px',
    borderRadius: '20px',
    display: 'flex',
    gap: '6px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none'
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 40px',
    fontSize: '14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box'
  },
  otpInput: {
    width: '100%',
    padding: '14px',
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '8px',
    textAlign: 'center',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box'
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '12px',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  cancelBtn: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '12px',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border-color))',
    color: 'var(--text-secondary)',
    cursor: 'pointer'
  },
  infoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    color: 'var(--success-color)',
    fontSize: '13px'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '10px',
    backgroundColor: 'var(--danger-tint)',
    border: '1px solid var(--danger-tint)',
    color: 'var(--danger-color)',
    fontSize: '13px'
  }
};
