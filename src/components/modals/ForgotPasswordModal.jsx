import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, Mail, Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, RotateCcw } from 'lucide-react';
import { forgotPasswordSendOtp, forgotPasswordVerifyOtp, forgotPasswordReset } from '../../service/UserAuth';
import { savePendingOtpSession, clearPendingOtpSession, getPendingOtpSession } from '../../service/otpSessionManager';
import { normalizeIdentifier } from '../../service/ChatUtils';

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
        if (onResetComplete) {
          onResetComplete(cleanId);
        }
        onClose();
        alert('Password has been reset successfully! You can now log in with your new password.');
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
              <div style={styles.inputWrapper}>
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
