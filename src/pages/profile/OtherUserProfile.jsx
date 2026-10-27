import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Calendar, Copy, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import Avatar from '../../components/chat/Avatar';
import StreakBadge from '../../components/pulse/StreakBadge';
import SettingsGroup from './SettingsGroup';
import SettingsRow from './SettingsRow';

/**
 * Other User Profile view:
 * Centered header, side-by-side action buttons, Details card,
 * and collapsible common groups card.
 */
const OtherUserProfile = ({
  displayUser,
  targetUserId,
  existingChatId,
  isStartingChat,
  onStartOrGoToChat,
  targetBookingInfo,
  commonGroups = [],
  onAvatarClick,
  onCopyUserId,
  isDesktop = false
}) => {
  const navigate = useNavigate();
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const streak = displayUser.pulseStreak || displayUser.streak;
  const username = displayUser.username || displayUser.userName || targetUserId;
  const name = displayUser.displayName || displayUser.userName || targetUserId;
  const uid = displayUser.userId || targetUserId;

  // Booking enabled check
  const isBookingEnabled = targetBookingInfo
    ? Boolean(targetBookingInfo.isBookingEnabled)
    : displayUser.isBookingEnabled !== false;

  const bookingSlug = (targetBookingInfo && targetBookingInfo.bookingSlug) ||
    displayUser.bookingSlug ||
    displayUser.userName ||
    targetUserId;

  const handleCopy = () => {
    onCopyUserId(uid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const visibleGroups = showAllGroups ? commonGroups : commonGroups.slice(0, 2);
  const commonCount = commonGroups.length;
  const commonLabel = commonCount === 1 ? '1 group in common' : `${commonCount} groups in common`;

  return (
    <div style={isDesktop ? styles.desktopWrapper : styles.mobileWrapper}>
      {/* Header Block */}
      <div style={styles.header}>
        <div
          onClick={() => onAvatarClick(displayUser.profile)}
          style={styles.avatarWrapper}
          title="View profile picture"
        >
          <Avatar
            chat={{
              profile: displayUser.profile,
              id: uid,
              userName: username,
              type: 'private',
              pulseStreak: streak,
              hasActivePulse: displayUser.hasActivePulse,
              allSeen: displayUser.allSeen
            }}
            hasActivePulse={displayUser.hasActivePulse}
            allSeen={displayUser.allSeen}
            size={88}
            highRes={true}
          />
        </div>

        <div style={styles.nameRow}>
          <h2 style={styles.name}>{name}</h2>
          {streak > 0 && <StreakBadge streak={streak} size="md" />}
        </div>

        <div style={styles.handleRow}>
          <span>@{username}</span>
          <span style={styles.middleDot}>·</span>
          <span>{uid}</span>
        </div>
      </div>

      {/* Action Buttons: Chat & Booking */}
      <div style={styles.actionRow}>
        <button
          type="button"
          onClick={onStartOrGoToChat}
          disabled={isStartingChat}
          style={{
            ...styles.primaryChatBtn,
            width: isBookingEnabled ? '50%' : '100%'
          }}
          className="profile-primary-btn"
        >
          {isStartingChat ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Opening Chat...
            </>
          ) : (
            <>
              <MessageCircle size={18} />
              {existingChatId ? 'Go to chat' : 'Start chat'}
            </>
          )}
        </button>

        {isBookingEnabled && (
          <button
            type="button"
            onClick={() => navigate(`/book/${bookingSlug}`)}
            style={styles.secondaryBookBtn}
            className="profile-interactive-btn"
          >
            <Calendar size={18} color="var(--accent-color)" />
            Book meeting
          </button>
        )}
      </div>

      {/* Details Section */}
      <SettingsGroup label="Details">
        <SettingsRow
          label="Username"
          value={`@${username}`}
        />
        <SettingsRow
          label="User ID"
          value={uid}
          action={
            <button
              type="button"
              onClick={handleCopy}
              style={styles.copyBtn}
              title="Copy User ID"
              aria-label="Copy User ID"
              className="profile-interactive-btn"
            >
              {copiedId ? (
                <Check size={14} color="var(--success-color, #10b981)" />
              ) : (
                <Copy size={14} color="var(--text-secondary)" />
              )}
            </button>
          }
          isLast={true}
        />
      </SettingsGroup>

      {/* Groups in Common (Only if count > 0) */}
      {commonCount > 0 && (
        <SettingsGroup label={commonLabel}>
          {visibleGroups.map((grp, idx) => {
            const isLast = idx === visibleGroups.length - 1 && commonCount <= 2;
            const typeLabel = grp.isClassroom ? 'Classroom' : grp.isSpace ? 'Space' : 'Group';
            return (
              <SettingsRow
                key={grp.chatId}
                icon={() => (
                  <div style={styles.groupAvatarWrapper}>
                    <Avatar chat={grp} size={34} />
                  </div>
                )}
                label={grp.chatName || grp.chatId}
                subtitle={typeLabel}
                chevron={true}
                onClick={() => navigate(`/chat/${grp.chatId}`)}
                isLast={isLast}
              />
            );
          })}

          {/* Expand / Collapse Row if more than 2 groups */}
          {commonCount > 2 && (
            <button
              type="button"
              onClick={() => setShowAllGroups(!showAllGroups)}
              style={styles.expandRowBtn}
              className="profile-row-btn"
            >
              <span>{showAllGroups ? 'Show less' : `Show all ${commonCount}`}</span>
              {showAllGroups ? (
                <ChevronUp size={16} color="var(--text-secondary)" />
              ) : (
                <ChevronDown size={16} color="var(--text-secondary)" />
              )}
            </button>
          )}
        </SettingsGroup>
      )}
    </div>
  );
};

const styles = {
  mobileWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    padding: '0',
    boxSizing: 'border-box'
  },
  desktopWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
    padding: '12px 0',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '16px 0 20px 0',
    width: '100%'
  },
  avatarWrapper: {
    cursor: 'pointer',
    marginBottom: '12px'
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  name: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.3'
  },
  handleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '4px'
  },
  middleDot: {
    opacity: 0.6
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    marginBottom: '20px'
  },
  primaryChatBtn: {
    height: '44px',
    padding: '0 16px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'var(--accent-color)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxSizing: 'border-box'
  },
  secondaryBookBtn: {
    height: '44px',
    width: '50%',
    padding: '0 16px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxSizing: 'border-box'
  },
  copyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px'
  },
  groupAvatarWrapper: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  expandRowBtn: {
    width: '100%',
    minHeight: '44px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    borderTop: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    outline: 'none'
  }
};

export default OtherUserProfile;
