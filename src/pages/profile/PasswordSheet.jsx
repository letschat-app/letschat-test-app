import React from 'react';
import ProfileSheet from './ProfileSheet';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

/**
 * Change Password Sheet:
 * Three secure fields with visibility toggles, client-side validation,
 * inline error/success messaging, and 2FA flow integration.
 */
const PasswordSheet = ({
  isOpen,
  onClose,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showCurrentPw,
  setShowCurrentPw,
  showNewPw,
  setShowNewPw,
  showConfirmPw,
  setShowConfirmPw,
  onSubmit,
  submitting,
  error,
  successMsg,
  isDesktop
}) => {
  const canSubmit = currentPassword && newPassword && confirmPassword && newPassword.length >= 6 && !submitting;

  return (
    <ProfileSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      subtitle="Update your login password securely."
      onSave={onSubmit}
      saveLabel="Update Password"
      saveDisabled={!canSubmit}
      saving={submitting}
      isDesktop={isDesktop}
    >
      <form onSubmit={onSubmit} style={styles.form}>
        {/* Current Password */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Current Password</label>
          <div style={styles.inputWrapper}>
            <input
              type={showCurrentPw ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              style={styles.input}
              disabled={submitting}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw(!showCurrentPw)}
              style={styles.eyeBtn}
              tabIndex={-1}
              aria-label="Toggle current password visibility"
            >
              {showCurrentPw ? <EyeOff size={16} color="var(--text-secondary)" /> : <Eye size={16} color="var(--text-secondary)" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>New Password</label>
          <div style={styles.inputWrapper}>
            <input
              type={showNewPw ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={styles.input}
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              style={styles.eyeBtn}
              tabIndex={-1}
              aria-label="Toggle new password visibility"
            >
              {showNewPw ? <EyeOff size={16} color="var(--text-secondary)" /> : <Eye size={16} color="var(--text-secondary)" />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Confirm New Password</label>
          <div style={styles.inputWrapper}>
            <input
              type={showConfirmPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={styles.input}
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              style={styles.eyeBtn}
              tabIndex={-1}
              aria-label="Toggle confirm password visibility"
            >
              {showConfirmPw ? <EyeOff size={16} color="var(--text-secondary)" /> : <Eye size={16} color="var(--text-secondary)" />}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorText}>
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMsg && (
          <div style={styles.successRow}>
            <CheckCircle2 size={16} color="var(--success-color, #10b981)" />
            <span style={styles.successText}>{successMsg}</span>
          </div>
        )}
      </form>
    </ProfileSheet>
  );
};

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%'
  },
  input: {
    width: '100%',
    padding: '10px 40px 10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorText: {
    fontSize: '12px',
    color: 'var(--danger-color, #ef4444)',
    fontWeight: '500',
    lineHeight: '1.4'
  },
  successRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)'
  },
  successText: {
    fontSize: '12px',
    color: 'var(--success-color, #10b981)',
    fontWeight: '600'
  }
};

export default PasswordSheet;
