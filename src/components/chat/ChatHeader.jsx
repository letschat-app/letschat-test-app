import React from 'react';
import {
  Pencil,
  BarChart3,
  Calendar,
  MoreVertical,
  Pin,
  PinOff,
  Zap,
  Bell,
  BellOff,
  Filter,
  Trash2,
  Star,
  Info,
} from 'lucide-react';
import Avatar from './Avatar';
import StreakBadge from '../pulse/StreakBadge';
import messageStore from '../../pages/MessageStore';
import { SIMULATION_ID } from '../../service/SimulationScript';

/** Fixed top chat header with contact/group info, space badge, invite/calendar actions, and menu. */
export default function ChatHeader({
  chat,
  chatid,
  isMobile,
  isOnline,
  activeSpace,
  spaceName,
  clickInfo,
  onBack,
  handleRenameSpace,
  onOpenClassroomMatrix,
  copiedId,
  copyClassroomId,
  showInviteMenu,
  setShowInviteMenu,
  onOpenInviteModal,
  showGroupCalendar,
  onToggleGroupCalendar,
  hasNewGroupEvent,
  showHeaderMenu,
  setShowHeaderMenu,
  isCurrentChatPinned,
  togglePin,
  isQuickAccessPinned,
  toggleQuickAccessPin,
  isMuted,
  onToggleMute,
  onOpenFilterModal,
  onOpenClearModal,
  onOpenStarred,
  onOpenGroupCalendarFromMenu,
}) {
  const isVerifiedOfficial =
    chatid === SIMULATION_ID ||
    chat?.id === SIMULATION_ID ||
    chat?.isSimulation ||
    chat?.isSystem ||
    chat?.verified ||
    /letschat/i.test(chat?.chatName || '');

  const headerSubtext = chat?.motto || chat?.description;
  const showSubtext =
    headerSubtext &&
    headerSubtext.toLowerCase() !== 'allowed' &&
    headerSubtext.toLowerCase() !== 'blocked';

  const getPrivateStatusText = () => {
    if (isOnline) return 'Online';
    const presenceId = chat.userId || chat.id || chatid;
    const lastSeen = localStorage.getItem(`lastSeen_${presenceId}`);
    if (!lastSeen) return 'Offline';
    const date = new Date(lastSeen);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 120) return 'Last seen just now';
    if (diff < 3600) return `Last seen ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Last seen ${Math.floor(diff / 3600)}h ago`;
    return `Last seen ${date.toLocaleDateString()}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '16px 24px',
        backgroundColor: 'var(--bg-card)',
        backdropFilter: 'var(--glass-effect)',
        borderBottom: '1px solid var(--border-color)',
        flexWrap: 'nowrap',
        gap: isMobile ? '8px' : '12px',
        minHeight: isMobile ? '56px' : '72px',
        zIndex: 10,
      }}
    >
      {/* Left Section */}
      <div
        onClick={clickInfo}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '12px',
          flex: '1 1 auto',
          minWidth: isMobile ? '120px' : '150px',
          cursor: 'pointer',
          padding: '4px 0',
          borderRadius: '8px',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {isMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            style={{
              all: 'unset',
              fontSize: isMobile ? '20px' : '24px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            ←
          </button>
        )}

        <Avatar
          chat={chat}
          size={isMobile ? 32 : 36}
          style={{ cursor: 'pointer' }}
          showStatus={chat.type === 'private'}
          isOnline={isOnline}
          onClick={(e) => { e.stopPropagation(); clickInfo(); }}
        />

        <div
          style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); clickInfo(); }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{ color: 'var(--text-primary)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); clickInfo(); }}
            >
              {chatid === SIMULATION_ID ? 'LetsChat' : (chat?.chatName || 'Chat')}
              {isVerifiedOfficial && (
                <span
                  title="Official Verified Channel"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-solid)',
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </span>

            {chat?.pulseStreak > 0 && <StreakBadge streak={chat.pulseStreak} size="sm" />}

            {messageStore.isVolatile(chatid) && (
              <span
                title="Messages in this room are temporarily cached for 30 minutes and then automatically deleted."
                style={{
                  fontSize: '10px',
                  backgroundColor: 'var(--warning-color)',
                  color: '#000',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  fontWeight: '800',
                  cursor: 'help',
                }}
              >
                30m Room
              </span>
            )}
          </div>

          {chat.type === 'private' && (
            <div style={{ fontSize: '11px', color: isOnline ? 'var(--success-color)' : 'var(--text-secondary)', fontWeight: '500' }}>
              {getPrivateStatusText()}
            </div>
          )}

          {isMobile && (
            <span
              onClick={(e) => {
                if (activeSpace !== 0 && chat?.type !== 'classroom') {
                  e.stopPropagation();
                  handleRenameSpace();
                }
              }}
              style={{
                fontSize: '10px',
                color: 'var(--accent-color)',
                fontWeight: '700',
                opacity: 0.9,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: chat.type === 'private' ? '-1px' : '1px',
                cursor: (activeSpace !== 0 && chat?.type !== 'classroom') ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title={(activeSpace !== 0 && chat?.type !== 'classroom') ? 'Click to rename space' : ''}
            >
              {spaceName}
              {activeSpace !== 0 && chat?.type !== 'classroom' && <Pencil size={10} />}
            </span>
          )}

          {showSubtext && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                opacity: 0.85,
                maxWidth: isMobile ? '130px' : '240px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={headerSubtext}
            >
              {headerSubtext}
            </span>
          )}
        </div>
      </div>

      {/* Center Section - Space Navigation */}
      {chat.type !== 'classroom' && !isMobile && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            backgroundColor: 'var(--nav-bg)',
            padding: '6px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            flexBasis: 'auto',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (activeSpace !== 0 && chat?.type !== 'classroom') handleRenameSpace();
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-tint)',
              color: 'var(--accent-text)',
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: '1px solid var(--accent-tint-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: (activeSpace !== 0 && chat?.type !== 'classroom') ? 'pointer' : 'default',
            }}
            title={(activeSpace !== 0 && chat?.type !== 'classroom') ? 'Click to rename space' : ''}
          >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-solid)' }} />
            {spaceName}
            {activeSpace !== 0 && chat?.type !== 'classroom' && <Pencil size={12} />}
          </div>
        </div>
      )}

      {/* Right Section */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
        {chat.type === 'classroom' && (chat.role === 'faculty' || chat.role === 'admin') && (
          <button
            onClick={onOpenClassroomMatrix}
            title="View Assignment Analytics & Export Matrix Report"
            style={{
              padding: isMobile ? '6px 10px' : '8px 14px',
              backgroundColor: 'var(--accent-tint)',
              color: 'var(--accent-text)',
              borderRadius: '8px',
              fontSize: isMobile ? '12px' : '13px',
              fontWeight: '700',
              border: '1px solid var(--accent-tint)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <BarChart3 size={16} />
            <span>{!isMobile && 'Export Matrix Report'}</span>
          </button>
        )}

        {(chat.type === 'classroom' || chat.type === 'room') && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInviteMenu(!showInviteMenu);
              }}
              style={{
                padding: isMobile ? '6px 10px' : '8px 14px',
                backgroundColor: copiedId ? 'var(--success-color)' : 'var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: '600',
                border: copiedId ? '1px solid var(--success-color)' : '1px solid #4b5563',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!copiedId) {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                  e.currentTarget.style.borderColor = 'var(--text-muted)';
                }
              }}
              onMouseLeave={(e) => {
                if (!copiedId) {
                  e.currentTarget.style.backgroundColor = 'var(--border-color)';
                  e.currentTarget.style.borderColor = '#4b5563';
                }
              }}
            >
              <span>{copiedId ? '✓' : '📋'}</span>
              <span>{copiedId ? 'Copied!' : chat.id}</span>
            </button>

            {showInviteMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  minWidth: '120px',
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInviteMenu(false);
                    copyClassroomId();
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = 'var(--hover-bg)'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                >
                  Copy ID
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInviteMenu(false);
                    onOpenInviteModal();
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = 'var(--hover-bg)'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                >
                  Invite
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onToggleGroupCalendar}
          title="Group Calendar"
          style={{
            background: showGroupCalendar ? 'var(--accent-tint-border)' : 'none',
            border: showGroupCalendar ? '1px solid var(--accent-tint-border)' : 'none',
            color: showGroupCalendar ? 'var(--accent-text)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-tint)'; }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = showGroupCalendar ? 'var(--accent-tint-border)' : 'transparent';
          }}
        >
          <Calendar size={20} />
          {hasNewGroupEvent && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                boxShadow: '0 0 0 2px var(--bg-card), 0 0 8px 2px #3b82f6',
                zIndex: 2,
              }}
            />
          )}
        </button>

        <button
          onClick={() => setShowHeaderMenu(!showHeaderMenu)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <MoreVertical size={20} />
        </button>

        {showHeaderMenu && (
          <>
            <div
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
              onClick={() => setShowHeaderMenu(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '6px',
                minWidth: '180px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                zIndex: 101,
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <button
                onClick={togglePin}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {isCurrentChatPinned ? <PinOff size={16} /> : <Pin size={16} />}
                {isCurrentChatPinned ? 'Unpin Chat' : 'Pin Chat'}
              </button>

              <button
                onClick={toggleQuickAccessPin}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {isQuickAccessPinned ? <Zap size={16} fill="var(--text-primary)" /> : <Zap size={16} />}
                {isQuickAccessPinned ? 'Remove from Quick Access' : 'Pin to Quick Access'}
              </button>

              <button
                onClick={onToggleMute}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: isMuted ? 'var(--danger-color)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {isMuted ? <BellOff size={16} color="var(--danger-color)" /> : <Bell size={16} />}
                {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
              </button>

              <button
                onClick={() => {
                  setShowHeaderMenu(false);
                  onOpenFilterModal();
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Filter size={16} color="var(--accent-color)" /> Filter by Person
              </button>

              <button
                onClick={() => {
                  onOpenClearModal();
                  setShowHeaderMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger-color)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger-tint)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Trash2 size={16} />
                Clear Chat
              </button>

              <button
                onClick={() => {
                  setShowHeaderMenu(false);
                  onOpenStarred();
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Star size={16} /> View Starred
              </button>

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

              <button
                onClick={() => {
                  setShowHeaderMenu(false);
                  onOpenGroupCalendarFromMenu();
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Calendar size={16} /> Group Calendar
              </button>

              <button
                onClick={() => { setShowHeaderMenu(false); clickInfo(); }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Info size={16} /> Contact Info
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
