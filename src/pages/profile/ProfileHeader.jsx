import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import Avatar from '../../components/chat/Avatar';
import StreakBadge from '../../components/pulse/StreakBadge';
import { STAGE_LABELS } from '../../service/MediaUploader';

/**
 * Own Profile Header:
 * Avatar with 24px camera badge, upload progress, display name, streak badge,
 * username/userId, and Online/Sleeping status chip.
 */
const ProfileHeader = ({
  username,
  userId,
  displayName,
  profile,
  isSleepMode,
  uploading,
  progress,
  stage,
  onAvatarClick,
  onCameraClick,
  isDesktop = false
}) => {
  const avatarSize = isDesktop ? 64 : 72;

  return (
    <div style={isDesktop ? styles.desktopContainer : styles.mobileContainer}>
      {/* Avatar Container with Camera Badge and Progress Overlay */}
      <div style={styles.avatarWrapper}>
        <div
          onClick={onAvatarClick}
          style={{
            ...styles.avatarInner,
            width: avatarSize,
            height: avatarSize,
            cursor: uploading ? 'default' : 'pointer'
          }}
          title="View profile picture"
        >
          <Avatar
            chat={{
              profile,
              id: userId,
              userName: username,
              type: 'private'
            }}
            size={avatarSize}
            highRes={true}
          />

          {/* Upload Progress Overlay */}
          {uploading && (
            <div style={styles.uploadOverlay}>
              <Loader2 size={18} className="animate-spin" color="#ffffff" />
              <span style={styles.progressText}>{progress}%</span>
              {stage && STAGE_LABELS[stage] && (
                <span style={styles.stageText}>{STAGE_LABELS[stage]}</span>
              )}
            </div>
          )}
        </div>

        {/* 24px Camera Badge Button */}
        <button
          type="button"
          onClick={onCameraClick}
          style={styles.cameraBtn}
          title="Change profile picture"
          aria-label="Change profile picture"
          disabled={uploading}
          className="profile-camera-btn"
        >
          <Camera size={13} color="#ffffff" strokeWidth={2.2} />
        </button>
      </div>

      {/* User Details */}
      <div style={isDesktop ? styles.desktopTextCol : styles.mobileTextCol}>
        {/* Display Name with StreakBadge */}
        <div style={styles.nameRow}>
          <h2 style={styles.displayName}>{displayName || username}</h2>
        </div>

        {/* Handle and User ID */}
        <div style={styles.handleRow}>
          <span>@{username}</span>
          <span style={styles.middleDot}>·</span>
          <span>{userId}</span>
        </div>

        {/* Status Chip: Online or Sleeping */}
        <div style={styles.statusChip}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: isSleepMode ? '#f59e0b' : '#10b981'
            }}
          />
          <span style={styles.statusText}>
            {isSleepMode ? 'Sleeping' : 'Online'}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '16px 0 20px 0',
    width: '100%'
  },
  desktopContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    padding: '4px 0 16px 0',
    width: '100%'
  },
  avatarWrapper: {
    position: 'relative',
    display: 'inline-block',
    marginBottom: '10px'
  },
  avatarInner: {
    borderRadius: '50%',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },
  uploadOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    zIndex: 5
  },
  progressText: {
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '700',
    marginTop: '2px'
  },
  stageText: {
    color: '#ffffff',
    fontSize: '8px',
    opacity: 0.85,
    marginTop: '1px'
  },
  cameraBtn: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-color)',
    boxShadow: '0 0 0 2px var(--bg-primary), 0 2px 6px rgba(0,0,0,0.3)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    outline: 'none',
    zIndex: 6,
    transition: 'transform 0.15s ease'
  },
  mobileTextCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px'
  },
  desktopTextCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '3px',
    width: '100%'
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  displayName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.25'
  },
  handleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)'
  },
  middleDot: {
    opacity: 0.6
  },
  statusChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    marginTop: '4px'
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  statusText: {
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--text-primary)'
  }
};

export default ProfileHeader;
