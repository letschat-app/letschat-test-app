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
  signupInit,
  loginUser
} from '../../service/UserAuth';
import { initWebsocket } from '../../service/Websocket';

const WeightlifterAvatar = ({ score }) => {
  const safeScore = score || 0;

  return (
    <div style={{ width: "64px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes idleBreath {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes waistHold {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes chestHold {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        @keyframes overheadTriumph {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.02); }
        }
        @keyframes sparkleGlow {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.25); }
        }
      `}</style>

      <svg width="64" height="40" viewBox="0 0 64 40" style={{ overflow: "visible" }}>
        {safeScore === 0 && (
          <g style={{ animation: "idleBreath 2s ease-in-out infinite" }}>
            <line x1="8" y1="36" x2="30" y2="36" stroke="var(--text-secondary)" strokeWidth="2" />
            <rect x="5" y="31" width="3.5" height="10" rx="1.5" fill="var(--text-muted)" />
            <rect x="29.5" y="31" width="3.5" height="10" rx="1.5" fill="var(--text-muted)" />
            <circle cx="44" cy="11" r="5" fill="var(--accent-text)" stroke="var(--accent-text)" strokeWidth="1.5" />
            <line x1="39.5" y1="10" x2="48.5" y2="10" stroke="var(--danger-color)" strokeWidth="1.8" />
            <circle cx="42.5" cy="11" r="0.8" fill="var(--bg-secondary)" />
            <circle cx="45.5" cy="11" r="0.8" fill="var(--bg-secondary)" />
            <line x1="44" y1="16" x2="44" y2="27" stroke="var(--accent-text)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 44 18 L 39 22 L 42 26" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M 44 18 L 49 22 L 46 26" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M 44 27 L 41 37 M 44 27 L 47 37" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
        {safeScore === 1 && (
          <g style={{ animation: "idleBreath 1.5s ease-in-out infinite" }}>
            <line x1="16" y1="34" x2="48" y2="34" stroke="var(--text-secondary)" strokeWidth="2" />
            <rect x="12" y="29" width="4" height="10" rx="1.5" fill="var(--warning-color)" />
            <rect x="48" y="29" width="4" height="10" rx="1.5" fill="var(--warning-color)" />
            <circle cx="32" cy="15" r="5" fill="#fde047" stroke="var(--warning-color)" strokeWidth="1.5" />
            <line x1="28" y1="14" x2="36" y2="14" stroke="var(--danger-color)" strokeWidth="1.8" />
            <line x1="32" y1="20" x2="32" y2="28" stroke="var(--warning-color)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 32 21 L 22 34 M 32 21 L 42 34" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
            <path d="M 32 28 L 26 36 M 32 28 L 38 36" stroke="var(--warning-color)" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
        {safeScore === 2 && (
          <g style={{ animation: "waistHold 1s ease-in-out infinite" }}>
            <line x1="16" y1="26" x2="48" y2="26" stroke="var(--text-secondary)" strokeWidth="2" />
            <rect x="12" y="21" width="4" height="10" rx="1.5" fill="#eab308" />
            <rect x="48" y="21" width="4" height="10" rx="1.5" fill="#eab308" />
            <circle cx="32" cy="13" r="5" fill="#fde047" stroke="#eab308" strokeWidth="1.5" />
            <line x1="32" y1="18" x2="32" y2="28" stroke="var(--warning-color)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 32 20 L 22 26 M 32 20 L 42 26" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 32 28 L 27 36 M 32 28 L 37 36" stroke="#ca8a04" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
        {safeScore === 3 && (
          <g style={{ animation: "chestHold 0.9s ease-in-out infinite" }}>
            <line x1="16" y1="18" x2="48" y2="18" stroke="#ffffff" strokeWidth="2" />
            <rect x="12" y="13" width="4" height="10" rx="1.5" fill="var(--accent-text)" />
            <rect x="48" y="13" width="4" height="10" rx="1.5" fill="var(--accent-text)" />
            <circle cx="32" cy="12" r="5" fill="var(--accent-text)" stroke="var(--accent-text)" strokeWidth="1.5" />
            <line x1="32" y1="17" x2="32" y2="28" stroke="var(--accent-text)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 32 19 L 24 18 M 32 19 L 40 18" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 32 28 L 27 36 M 32 28 L 37 36" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
        {safeScore === 4 && (
          <g style={{ animation: "overheadTriumph 1.1s ease-in-out infinite" }}>
            <text x="6" y="8" fontSize="8" style={{ animation: "sparkleGlow 0.8s infinite" }}>✨</text>
            <text x="50" y="8" fontSize="8" style={{ animation: "sparkleGlow 0.8s infinite 0.4s" }}>✨</text>
            <line x1="14" y1="8" x2="50" y2="8" stroke="#ffffff" strokeWidth="2.5" />
            <rect x="10" y="3" width="4" height="10" rx="1.5" fill="var(--success-color)" />
            <rect x="50" y="3" width="4" height="10" rx="1.5" fill="var(--success-color)" />
            <path d="M 32 18 L 22 9 M 32 18 L 42 9" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="16" r="5" fill="#6ee7b7" stroke="var(--success-color)" strokeWidth="1.5" />
            <line x1="32" y1="21" x2="32" y2="30" stroke="var(--success-color)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 32 30 L 26 37 M 32 30 L 38 37" stroke="var(--success-color)" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
};

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

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "transparent", percent: 0 };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: "", color: "var(--warning-color)", percent: 25 };
    if (score === 2) return { score: 2, label: "Fair", color: "#eab308", percent: 50 };
    if (score === 3) return { score: 3, label: "Good", color: 'var(--accent-text)', percent: 75 };
    return { score: 4, label: "Strong", color: "var(--success-color)", percent: 100 };
  };

  const passwordStrength = getPasswordStrength(newPassword);

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
            if (session.payload.displayName) {
              localStorage.setItem('displayName', session.payload.displayName);
            } else if (session.payload.username) {
              localStorage.setItem('displayName', session.payload.username);
            }
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
        try {
          const cleanId = session.payload.identifier;
          const loginRes = await loginUser({
            userId: cleanId,
            password: newPassword,
          });
          const loginData = loginRes.data;
          if (
            loginData?.status === "SUCCESS" ||
            loginData === "login succesfull" ||
            loginData?.message === "login succesfull" ||
            loginRes.status === 200 ||
            loginRes.status === 201
          ) {
            const loggedUserId = loginData?.userId || loginData?.userid || loginData?.id || loginData?.data?.userId || cleanId;
            localStorage.setItem("userid", loggedUserId);
            if (loginData?.email) localStorage.setItem("email", loginData.email);
            if (loginData?.profile) localStorage.setItem("profile", loginData.profile);
            if (loginData?.username || loginData?.publicName) {
              localStorage.setItem("username", String(loginData.username || loginData.publicName).trim().toLowerCase());
            } else if (loginData?.userName) {
              localStorage.setItem("username", String(loginData.userName).trim().toLowerCase());
            }
            if (loginData?.displayName || loginData?.privateName) {
              localStorage.setItem("displayName", String(loginData.displayName || loginData.privateName).trim());
            } else if (loginData?.userName) {
              localStorage.setItem("displayName", String(loginData.userName).trim());
            }
            if (loginData?.is2FAEnabled !== undefined) {
              localStorage.setItem("is2FAEnabled", String(loginData.is2FAEnabled));
            }
            initWebsocket();
            navigate("/chats", { replace: true });
            return;
          }
        } catch (loginErr) {
          console.warn("[PendingOtpModal] Auto login after reset error:", loginErr);
        }
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
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ ...styles.inputWrapper, flex: 1 }}>
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
                {/* Weightlifter Companion Box alongside the inputbox */}
                <div
                  style={{
                    width: "72px",
                    height: "44px",
                    flexShrink: 0,
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}
                  title="Password strength companion"
                >
                  <WeightlifterAvatar score={passwordStrength.score} />
                </div>
              </div>

              {/* Clean subtle 4-segment strength indicator */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "6px" }}>
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    style={{
                      height: "3px",
                      borderRadius: "2px",
                      backgroundColor: (newPassword && passwordStrength.score >= seg) ? passwordStrength.color : "var(--bg-hover)",
                      transition: "background-color 0.3s ease"
                    }}
                  />
                ))}
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
