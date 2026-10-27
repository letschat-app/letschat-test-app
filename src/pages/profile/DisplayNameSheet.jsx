import React from 'react';
import ProfileSheet from './ProfileSheet';
import { computeSelfSimilarity } from '../../service/nameSimilarity';

/**
 * Display Name Edit Sheet:
 * Features live similarity calculation, policy link, cooldown error display,
 * and input validation before saving.
 */
const DisplayNameSheet = ({
  isOpen,
  onClose,
  username,
  newDisplayName,
  setNewDisplayName,
  onSave,
  saving,
  error,
  onOpenPolicy,
  isDesktop
}) => {
  const clean = (newDisplayName || '').trim();
  const similarityScore = computeSelfSimilarity(username, clean);
  const isSimilarityValid = similarityScore >= 3.0;
  const isLengthValid = clean.length > 5;
  const canSave = clean.length > 0 && isLengthValid && isSimilarityValid && !saving;

  return (
    <ProfileSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Display Name"
      subtitle="Your name visible across chats and direct messages."
      onSave={onSave}
      saveDisabled={!canSave}
      saving={saving}
      isDesktop={isDesktop}
    >
      <div style={styles.content}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Display Name</label>
          <input
            type="text"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="e.g. Alex Johnson"
            maxLength={32}
            style={styles.input}
            disabled={saving}
            autoFocus
          />
        </div>

        {/* Live Similarity Indicator */}
        {clean.length > 0 && (
          <div style={styles.similarityRow}>
            <span
              style={{
                ...styles.similarityText,
                color: isSimilarityValid ? 'var(--success-color, #10b981)' : 'var(--danger-color, #ef4444)'
              }}
            >
              {isSimilarityValid
                ? `Similarity ${similarityScore.toFixed(1)}/10 with @${username}`
                : `Similarity must be at least 3/10 to @${username} (${similarityScore.toFixed(1)}/10)`}
            </span>
          </div>
        )}

        {/* Character length validation hint */}
        {clean.length > 0 && !isLengthValid && (
          <div style={styles.errorText}>
            Display name must be more than 5 characters ({clean.length}/6)
          </div>
        )}

        {/* Server or Local Error Message */}
        {error && (
          <div style={styles.errorText}>
            {error}
          </div>
        )}

        {/* Anti-Impersonation & Policy Note */}
        <div style={styles.policyNote}>
          <span>Names must be somewhat similar to your handle. </span>
          <button
            type="button"
            onClick={onOpenPolicy}
            style={styles.learnMoreBtn}
          >
            Learn more
          </button>
        </div>
      </div>
    </ProfileSheet>
  );
};

const styles = {
  content: {
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
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  similarityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  similarityText: {
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '1.3'
  },
  errorText: {
    fontSize: '12px',
    color: 'var(--danger-color, #ef4444)',
    fontWeight: '500',
    lineHeight: '1.4'
  },
  policyNote: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)',
    marginTop: '4px'
  },
  learnMoreBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-color)',
    fontWeight: '600',
    fontSize: '11px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline'
  }
};

export default DisplayNameSheet;
