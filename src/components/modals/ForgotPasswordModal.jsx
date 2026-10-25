import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, RotateCcw } from 'lucide-react';
import { forgotPasswordSendOtp, forgotPasswordVerifyOtp, forgotPasswordReset, loginUser } from '../../service/UserAuth';
import { initWebsocket } from '../../service/Websocket';
import { savePendingOtpSession, clearPendingOtpSession, getPendingOtpSession } from '../../service/otpSessionManager';
import { normalizeIdentifier } from '../../service/ChatUtils';

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
        {/* LEVEL 0: Initial Standing Pose */}
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

        {/* LEVEL 1: Basic / Ready Stance */}
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

        {/* LEVEL 2: Fair (Lifting to waist) */}
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

        {/* LEVEL 3: Good (Cleans bar to chest) */}
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

        {/* LEVEL 4: Strong (Overhead Triumph!) */}
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

export default function ForgotPasswordModal({ isOpen, onClose, onResetComplete, initialIdentifier = '' }) {
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP, 3 = Set New Password
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

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

  // Resume pending session if available
  useEffect(() => {
    if (!isOpen) return;
    const session = getPendingOtpSession();
    if (session && session.flow === 'FORGOT_PASSWORD' && session.payload?.identifier) {
      setIdentifier(session.payload.identifier);
      if (session.payload.resetToken) {
        setResetToken(session.payload.resetToken);
        setStep(3);
      } else {
        setStep(2);
      }
      setInfoMsg(session.promptMessage || `A verification code was sent to your registered email.`);
    } else if (initialIdentifier) {
      setIdentifier(initialIdentifier);
    }
  }, [isOpen, initialIdentifier]);

  // Focus OTP input on step 2
  useEffect(() => {
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanId = normalizeIdentifier(identifier.trim());
    if (!cleanId) {
      setErrorMsg('Please enter your UserId, Email, or Username');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPasswordSendOtp(cleanId);
      const data = res.data;

      if (data?.status === 'SUCCESS' || data?.status === 'success' || res.status === 200 || res.status === 201) {
        savePendingOtpSession({
          flow: 'FORGOT_PASSWORD',
          payload: { identifier: cleanId },
          promptMessage: `Enter the code sent to your email to reset password for ${cleanId}`
        });
        setStep(2);
        setResendCooldown(60);
        setInfoMsg(data?.message || `Verification code sent to the email associated with ${cleanId}.`);
      } else {
        setErrorMsg(data?.message || 'Failed to send reset code. Please check your details.');
      }
    } catch (err) {
      console.error('Forgot password send OTP error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to send reset code. Please check your details.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    try {
      const cleanId = normalizeIdentifier(identifier.trim());
      const res = await forgotPasswordSendOtp(cleanId);
      const data = res.data;
      setResendCooldown(60);
      setInfoMsg(data?.message || 'A fresh 6-digit code has been sent to your email.');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
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
      const cleanId = normalizeIdentifier(identifier.trim());
      const res = await forgotPasswordVerifyOtp({
        identifier: cleanId,
        otp: cleanOtp
      });
      const data = res.data;

      if (data?.status === 'SUCCESS' || data?.resetToken || res.status === 200) {
        const token = data?.resetToken;
        if (!token) {
          setErrorMsg('Verification succeeded, but reset token was missing.');
          return;
        }

        setResetToken(token);
        // Update pending session with resetToken so if reloaded, user lands on Step 3
        savePendingOtpSession({
          flow: 'FORGOT_PASSWORD',
          payload: { identifier: cleanId, resetToken: token },
          promptMessage: `Verification code verified. Set a new password for ${cleanId}`
        });

        setStep(3);
        setInfoMsg('Code verified! Please create a strong new password.');
      } else {
        setErrorMsg(data?.message || 'Invalid or expired code. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password verify error:', err);
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
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
      const cleanId = normalizeIdentifier(identifier.trim());
      const res = await forgotPasswordReset({
        identifier: cleanId,
        resetToken: resetToken,
        newPassword: newPassword
      });
      const data = res.data;

      if (data?.status === 'SUCCESS' || res.status === 200) {
        clearPendingOtpSession();
        try {
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
            onClose();
            navigate("/chats", { replace: true });
            return;
          }
        } catch (loginErr) {
          console.warn("[ForgotPasswordModal] Auto login after reset error:", loginErr);
        }
        if (onResetComplete) {
          onResetComplete(cleanId);
        }
        onClose();
        navigate("/login", { replace: true });
      } else {
        setErrorMsg(data?.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password reset error:', err);
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    clearPendingOtpSession();
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            {step === 1 ? <KeyRound size={22} color="var(--accent-text)" /> : step === 2 ? <ShieldCheck size={22} color="var(--accent-text)" /> : <Lock size={22} color="var(--success-color)" />}
          </div>
          <h2 style={styles.title}>
            {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify Reset Code' : 'Set New Password'}
          </h2>
          <p style={styles.subtitle}>
            {step === 1
              ? 'Enter your UserId or Email to receive a 6-digit recovery code.'
              : step === 2
              ? `Enter the 6-digit code sent to your registered email.`
              : 'Choose a strong password with at least 6 characters.'}
          </p>
        </div>

        {/* Step Progress Dots */}
        <div style={styles.progressRow}>
          <div style={{ ...styles.progressDot, backgroundColor: step >= 1 ? 'var(--accent-text)' : 'var(--text-muted)' }} />
          <div style={{ ...styles.progressLine, backgroundColor: step >= 2 ? 'var(--accent-text)' : 'var(--border-color)' }} />
          <div style={{ ...styles.progressDot, backgroundColor: step >= 2 ? 'var(--accent-text)' : 'var(--text-muted)' }} />
          <div style={{ ...styles.progressLine, backgroundColor: step >= 3 ? 'var(--accent-text)' : 'var(--border-color)' }} />
          <div style={{ ...styles.progressDot, backgroundColor: step >= 3 ? 'var(--success-color)' : 'var(--text-muted)' }} />
        </div>

        {/* Info / Success banner */}
        {infoMsg && (
          <div style={styles.infoBox}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Identifier Input Form */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>UserId or Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. user@example.com or AAA001"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setErrorMsg('');
                  }}
                  style={styles.input}
                />
              </div>
            </div>

            <button type="submit" disabled={loading || !identifier.trim()} style={{ ...styles.primaryBtn, opacity: (loading || !identifier.trim()) ? 0.6 : 1 }}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  Send Recovery Code
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button type="button" onClick={handleCancel} style={styles.cancelBtn}>
              Cancel & Return to Login
            </button>
          </form>
        )}

        {/* Step 2: 6-Digit OTP Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>6-Digit Recovery Code</label>
              <input
                ref={otpInputRef}
                type="text"
                maxLength={6}
                required
                placeholder="••••••"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ''));
                  setErrorMsg('');
                }}
                style={styles.otpInput}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleResendOtp}
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
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Change identifier
              </button>
            </div>

            <button type="submit" disabled={loading || otp.length !== 6} style={{ ...styles.primaryBtn, opacity: (loading || otp.length !== 6) ? 0.6 : 1 }}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Code
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button type="button" onClick={handleCancel} style={styles.cancelBtn}>
              Cancel
            </button>
          </form>
        )}

        {/* Step 3: New Password Form */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ ...styles.inputWrapper, flex: 1 }}>
                  <Lock size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
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
                  placeholder="Re-enter password"
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

            <button type="submit" disabled={loading || !newPassword || !confirmPassword} style={{ ...styles.primaryBtn, backgroundColor: 'var(--success-color)', opacity: (loading || !newPassword || !confirmPassword) ? 0.6 : 1 }}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  Reset Password & Finish
                  <CheckCircle2 size={18} />
                </>
              )}
            </button>

            <button type="button" onClick={handleCancel} style={styles.cancelBtn}>
              Cancel
            </button>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box'
  },
  modal: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color))',
    borderRadius: '24px',
    padding: '32px 28px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  iconCircle: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-tint)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px'
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4'
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    margin: '4px 0 10px 0'
  },
  progressDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'all 0.3s ease'
  },
  progressLine: {
    width: '24px',
    height: '2px',
    transition: 'all 0.3s ease'
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
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '12px',
    backgroundColor: 'var(--accent-color)',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '6px'
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '6px',
    textAlign: 'center'
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
