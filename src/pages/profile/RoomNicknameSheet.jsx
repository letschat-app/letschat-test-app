import React from 'react';
import ProfileSheet from './ProfileSheet';
import { UsernameStatusIndicator } from '../../components/common/UsernameStatusIndicator';

/**
 * Room Nickname Edit Sheet:
 * Used for setting user handle in public rooms.
 * Real-time availability indicator via UsernameStatusIndicator.
 */
const RoomNicknameSheet = ({
  isOpen,
  onClose,
  newRoomNickname,
  setNewRoomNickname,
  onSave,
  saving,
  error,
  roomNicknameCheck,
  isDesktop
}) => {
  const isBlocked = roomNicknameCheck?.isBlocked;
  const isChecking = roomNicknameCheck?.isChecking;
  const canSave = (newRoomNickname || '').trim().length > 0 && !isBlocked && !isChecking && !saving;

  return (
    <ProfileSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Room Nickname"
      subtitle="Your custom handle visible in public chat rooms."
      onSave={onSave}
      saveDisabled={!canSave}
      saving={saving}
      isDesktop={isDesktop}
    >
      <div style={styles.content}>
        <div style={styles.inputGroup}>
          <div style={styles.labelRow}>
            <label style={styles.label}>Nickname</label>
            {roomNicknameCheck && <UsernameStatusIndicator checkResult={roomNicknameCheck} />}
          </div>
          <input
            type="text"
            value={newRoomNickname}
            onChange={(e) => setNewRoomNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="e.g. room_ninja"
            maxLength={30}
            style={styles.input}
            disabled={saving}
            autoFocus
          />
        </div>

        {/* Status / Availability feedback */}
        {roomNicknameCheck?.message && (
          <div
            style={{
              ...styles.statusMessage,
              color: isBlocked ? 'var(--danger-color, #ef4444)' : 'var(--text-secondary)'
            }}
          >
            {roomNicknameCheck.message}
          </div>
        )}

        {/* Server error if any */}
        {error && (
          <div style={styles.errorText}>
            {error}
          </div>
        )}

        <div style={styles.note}>
          Only lowercase letters, numbers, and underscores are allowed.
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
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
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
  statusMessage: {
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
  note: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)'
  }
};

export default RoomNicknameSheet;
