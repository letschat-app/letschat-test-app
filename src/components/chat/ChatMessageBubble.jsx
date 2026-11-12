import React from 'react';
import { Star } from 'lucide-react';
import PendingMediaBubble from './PendingMediaBubble';
import StreakBadge from '../pulse/StreakBadge';
import PulseQuoteCard from './PulseQuoteCard';
import AssignmentMessage from '../../pages/AssignmentMessage';
import PollWidget from './PollWidget';
import MediaMessage from './MediaMessage';
import EyeIcon from './EyeIcon';
import {
  MARBLE_URL,
  stripMentionEncoding,
  formatTime12Hour,
  formatDateWithLabel,
  isWithin24Hours,
  formatBannerText,
  isEventBannerPin,
} from '../../utils/chatFormatting';

/**
 * Memoized single row (optional date divider, unread divider, banner, or message bubble).
 * Receives primitive flags (`isSelected`, `isHovered`, `swipeX`, `isHighlightedPin`) so unrelated
 * state changes (typing, hovering another message) do not re-render untouched rows.
 */
function ChatMessageBubble({
  msg,
  isReceived,
  msgStreak,
  msgFireClass,
  dateOnly,
  showDate,
  collapsedView,
  unreadCountBeforeThis,
  event,
  repliedMsg,
  deletedByName,
  isSelected,
  isHovered,
  swipeX,
  isHighlightedPin,
  isMobile,
  isSelectionMode,
  chatType,
  chatRole,
  currentUserId,
  chatMembers,
  messageRefs,
  onToggleDateCollapse,
  onBannerPinClick,
  onRevive,
  onHoverChange,
  onClickMessage,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  onTouchStartMsg,
  onTouchEndMsg,
  onJumpToReplied,
  renderFormattedText,
  onOpenAssignmentPanel,
  onOpenMediaViewer,
  onRetryMediaUpload,
  onShowReactors,
  onToggleStar,
  onOpenQueuedMsg,
  onOpenEvent,
}) {
  const msgKeyId = msg.msgid || msg.tempmsgid;
  const assignBubbleRef = (el) => {
    if (msg.msgid) messageRefs.current[msg.msgid] = el;
    if (msg.tempmsgid) messageRefs.current[msg.tempmsgid] = el;
  };

  const hasReactions =
    msg.reactions &&
    Object.values(msg.reactions).some((r) => Array.isArray(r) && r.length > 0);

  const isPinnedBanner =
    msg.type === 'event-banner-pin' ||
    isEventBannerPin(msg) ||
    (msg.type === 'banner-pin' && isWithin24Hours(msg.timestamp));

  const renderReactionsPill = () => {
    const validEntries = Object.entries(msg.reactions || {}).filter(
      ([, reactors]) => Array.isArray(reactors) && reactors.length > 0
    );
    if (validEntries.length === 0) return null;

    const sortedEntries = [...validEntries].sort((a, b) => b[1].length - a[1].length);
    const totalCount = sortedEntries.reduce((sum, [, reactors]) => sum + reactors.length, 0);
    const topEmojis = sortedEntries.slice(0, 3).map(([emoji]) => emoji);
    const tooltipTitle = sortedEntries
      .map(([emoji, reactors]) => `${emoji} ${reactors.map((r) => r.username || 'User').join(', ')}`)
      .join('\n');
    const ariaText = `${totalCount} reaction${totalCount === 1 ? '' : 's'}. Show who reacted`;

    return (
      <button
        type="button"
        aria-label={ariaText}
        title={tooltipTitle}
        onClick={(e) => {
          e.stopPropagation();
          onShowReactors(msg);
        }}
        style={{
          position: 'absolute',
          bottom: '-10px',
          ...(isReceived ? { left: '8px' } : { right: '8px' }),
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '2px 6px',
          borderRadius: '999px',
          lineHeight: 1.1,
          zIndex: 2,
          cursor: 'pointer',
          fontSize: '12px',
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#ffffff',
          backgroundImage: `${MARBLE_URL}, linear-gradient(180deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 55%), var(--accent-gradient)`,
          backgroundSize: '96px 48px, auto, auto',
          boxShadow:
            '0 0 0 2px var(--bg-primary), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.15), 0 3px 8px rgba(0,0,0,0.3)',
          outlineOffset: '2px',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '12px', lineHeight: 1 }}>
          {topEmojis.map((emoji) => (
            <span key={emoji}>{String(emoji).slice(0, 15)}</span>
          ))}
        </span>
        {totalCount > 1 && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', marginLeft: '2px', lineHeight: 1 }}>
            {totalCount}
          </span>
        )}
      </button>
    );
  };

  const showFooter = !(
    ['image', 'video'].includes(msg.type) &&
    !msg.isQueuedForMedia &&
    msg.status !== 'waiting_for_upload' &&
    !msg.revived &&
    !msg.isStarred &&
    !isHovered
  );

  return (
    <>
      {showDate && (
        <div
          style={{
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            padding: isMobile ? '6px 12px' : '8px 16px',
            borderRadius: '20px',
            fontSize: isMobile ? '11px' : '12px',
            fontWeight: '600',
            margin: '12px auto',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
            userSelect: 'none',
            maxWidth: '200px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
          ref={(el) => { messageRefs.current[`date-${dateOnly}`] = el; }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDateCollapse(dateOnly);
          }}
        >
          {formatDateWithLabel(msg.timestamp)}
        </div>
      )}

      {!collapsedView && (
        <>
          {unreadCountBeforeThis > 0 && (
            <div
              style={{
                margin: '24px auto',
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '12px 0',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  height: '1px',
                  backgroundColor: 'var(--border-color)',
                  zIndex: 0,
                }}
              />
              <span
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--accent-color)',
                  padding: '6px 16px',
                  borderRadius: '24px',
                  fontSize: '11px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  zIndex: 1,
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '14px' }}>🔔</span>
                {unreadCountBeforeThis} New Message{unreadCountBeforeThis > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {msg.isPendingPlaceholder ? (
            <PendingMediaBubble
              msg={msg}
              isMobile={isMobile}
              showSenderName={chatType !== 'private'}
            />
          ) : msg.sendername === 'server' ||
            msg.type === 'banner' ||
            msg.type === 'banner-pin' ||
            msg.type === 'event-banner-pin' ? (
            <div
              ref={(el) => { messageRefs.current[msg.msgid] = el; }}
              className={isHighlightedPin ? 'banner-pin-entrance-pulse' : undefined}
              onClick={() => {
                if (isEventBannerPin(msg)) {
                  onBannerPinClick(msg);
                }
              }}
              style={{
                alignSelf: 'center',
                backgroundColor: isPinnedBanner ? 'rgba(30, 58, 95, 0.4)' : 'var(--bg-card)',
                color: isPinnedBanner ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: isMobile ? '6px 12px' : '8px 16px',
                borderRadius: '16px',
                fontSize: isMobile ? '12px' : '13px',
                border: isPinnedBanner
                  ? '1px solid var(--accent-tint-border)'
                  : '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isPinnedBanner ? '0 4px 12px var(--accent-tint)' : undefined,
                transition: 'all 0.3s ease',
                cursor: isEventBannerPin(msg) ? 'pointer' : 'default',
              }}
              title={isEventBannerPin(msg) ? 'Click to view event in Group Calendar' : undefined}
            >
              {isPinnedBanner && <span style={{ fontSize: '13px' }}>📌</span>}
              <span>{formatBannerText(msg)}</span>
              {isPinnedBanner && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--accent-text)',
                    backgroundColor: 'var(--accent-tint)',
                    border: '1px solid var(--accent-tint-border)',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    letterSpacing: '0.02em',
                  }}
                >
                  Pinned
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.3s ease-in',
                marginBottom: hasReactions ? '24px' : '8px',
              }}
            >
              {msg.isdeleted || msg.isdeletedeone ? (
                <div
                  ref={assignBubbleRef}
                  style={{
                    alignSelf: isReceived ? 'flex-start' : 'flex-end',
                    backgroundColor: isReceived ? 'var(--message-bg-incoming)' : 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    padding: isMobile ? '8px 12px' : '10px 14px',
                    borderRadius: isReceived ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                    maxWidth: isMobile ? '80%' : '70%',
                    wordWrap: 'break-word',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s ease',
                    fontSize: isMobile ? '13px' : '14px',
                  }}
                  onClick={() => onRevive(msg)}
                >
                  {isReceived && (
                    <div
                      style={{
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: '600',
                        color: 'var(--accent-color)',
                        marginBottom: '4px',
                      }}
                    >
                      {msg.sendername}
                    </div>
                  )}

                  <p style={{ margin: '4px 0', fontSize: isMobile ? '13px' : '14px', fontStyle: 'italic' }}>
                    {msg.isdeletedeone && isReceived
                      ? `This message was deleted by ${deletedByName || 'user'}`
                      : 'This message was deleted by you'}
                  </p>
                </div>
              ) : (
                <div
                  ref={assignBubbleRef}
                  className={`msg-bubble ${isReceived ? 'msg-bubble-received' : 'msg-bubble-sent'} ${
                    ['image', 'video'].includes(msg.type) ? 'msg-bubble-media' : 'msg-bubble-text'
                  } ${isSelected ? 'is-selected' : ''} ${msgFireClass || ''}`}
                  style={{
                    alignSelf: isReceived ? 'flex-start' : 'flex-end',
                    cursor: 'pointer',
                    transition: swipeX === 0 ? 'all 0.2s ease' : 'none',
                    position: 'relative',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    touchAction: 'pan-y',
                    transform: `translateX(${swipeX}px)`,
                  }}
                  onMouseEnter={() => !isMobile && onHoverChange(msgKeyId)}
                  onMouseLeave={() => !isMobile && onHoverChange(null)}
                  onClick={() => onClickMessage(msg)}
                  {...(isMobile
                    ? {
                        onTouchStart: (e) => {
                          onSwipeStart(e, msg.msgid);
                          onTouchStartMsg(msg);
                        },
                        onTouchMove: (e) => {
                          onSwipeMove(e, msg.msgid);
                        },
                        onTouchEnd: () => {
                          onTouchEndMsg(msg);
                          onSwipeEnd(msg);
                        },
                      }
                    : {})}
                >
                  {msg.forwardedfrom && (
                    <div
                      style={{
                        fontSize: '10px',
                        marginBottom: '6px',
                        color: isReceived ? 'var(--text-secondary)' : 'rgba(255, 255, 255, 0.75)',
                        fontStyle: 'italic',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>↪</span> Forwarded
                    </div>
                  )}

                  {isMobile && swipeX > 30 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '-35px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: Math.min(swipeX / 70, 1),
                        color: 'var(--accent-text)',
                        fontSize: '20px',
                        transition: 'opacity 0.1s ease',
                      }}
                    >
                      ↩
                    </div>
                  )}

                  {isReceived && (
                    <div
                      style={{
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: '600',
                        marginBottom: '6px',
                        color: 'var(--accent-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{msg.sendername}</span>
                      {msgStreak > 0 && <StreakBadge streak={msgStreak} size="sm" />}
                    </div>
                  )}

                  {msg.repliedto &&
                    (() => {
                      if (
                        typeof msg.repliedto === 'string' &&
                        (msg.repliedto.startsWith('PULSE_REPLY:') || msg.repliedto.startsWith('PULSE_TAG:'))
                      ) {
                        return <PulseQuoteCard repliedtoStr={msg.repliedto} isReceived={isReceived} />;
                      }
                      return repliedMsg ? (
                        <div
                          style={{
                            backgroundColor: isReceived ? 'rgba(0,0,0,0.12)' : 'var(--border-color)',
                            borderLeft: '3px solid var(--accent-color)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            fontSize: isMobile ? '11px' : '12px',
                            cursor: 'pointer',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onJumpToReplied(repliedMsg, msg.repliedto);
                          }}
                        >
                          <div style={{ fontWeight: '600', color: 'var(--accent-color)', marginBottom: '2px' }}>
                            {repliedMsg.status === null ? repliedMsg.sendername : 'You'}
                          </div>
                          <div style={{ opacity: 0.9 }}>
                            {repliedMsg.type === 'text' &&
                              (stripMentionEncoding(repliedMsg.content).length > 50
                                ? stripMentionEncoding(repliedMsg.content).substring(0, 50) + '...'
                                : stripMentionEncoding(repliedMsg.content))}
                            {repliedMsg.type === 'image' && '📷 Photo'}
                            {repliedMsg.type === 'video' && '🎥 Video'}
                            {repliedMsg.type === 'audio' && '🎤 Audio'}
                            {repliedMsg.type === 'file' && '📄 Document'}
                            {repliedMsg.type === 'assignment' && '📚 Assignment'}
                            {(repliedMsg.type === 'poll' ||
                              Boolean(repliedMsg.poll) ||
                              (typeof repliedMsg.content === 'string' &&
                                repliedMsg.content.trim().startsWith('{"poll_id"'))) &&
                              '📊 Poll'}
                          </div>
                        </div>
                      ) : null;
                    })()}

                  <div style={{ fontSize: isMobile ? '13px' : '14px', lineHeight: '1.5' }}>
                    {msg.type === 'text' && renderFormattedText(msg.content)}
                    {msg.type == 'assignment' && (
                      <AssignmentMessage
                        id={msg.content}
                        userRole={chatRole}
                        isMobile={isMobile}
                        onOpenPanel={onOpenAssignmentPanel}
                      />
                    )}
                    {msg.type === 'poll' && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        style={{ width: '100%' }}
                      >
                        <PollWidget message={msg} currentUserId={currentUserId} members={chatMembers} />
                      </div>
                    )}
                    {['image', 'video', 'audio', 'file', 'pdf'].includes(msg.type) && msg.content && (
                      <MediaMessage
                        msg={msg}
                        isReceived={isReceived}
                        isMobile={isMobile}
                        isSelectionMode={isSelectionMode}
                        onOpenViewer={onOpenMediaViewer}
                        onRetry={onRetryMediaUpload}
                      />
                    )}
                  </div>

                  {renderReactionsPill()}

                  {showFooter && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '6px',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                        {(msg.isStarred || isHovered) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={(e) => onToggleStar(e, msg)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: msg.isStarred
                                  ? 'var(--warning-color)'
                                  : isReceived
                                    ? 'var(--text-secondary)'
                                    : 'rgba(255, 255, 255, 0.75)',
                                transition: 'transform 0.2s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              <Star size={14} fill={msg.isStarred ? 'var(--warning-color)' : 'none'} />
                            </button>
                          </div>
                        )}

                        <span
                          style={{
                            color: isReceived ? 'var(--text-secondary)' : 'rgba(255, 255, 255, 0.75)',
                            fontWeight: '500',
                            fontSize: '11px',
                          }}
                        >
                          {msg.isQueuedForMedia || msg.status === 'waiting_for_upload' ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenQueuedMsg(msg);
                              }}
                              style={{ color: 'var(--warning-color)', fontWeight: '600', cursor: 'pointer' }}
                              title="Click to Send Now or Delete"
                            >
                              Waiting for upload ⏳
                            </span>
                          ) : (
                            formatTime12Hour(msg.timestamp, isSelected)
                          )}
                        </span>

                        {msg.revived && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--success-color)',
                              fontWeight: '500',
                              backgroundColor: '#065f46',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            ⟳ Revived
                          </span>
                        )}

                        {!isReceived && chatType !== 'classroom' && (
                          <EyeIcon status={msg.status || 'sending'} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {event && msg.type === 'text' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: isReceived ? 'auto' : '8px',
                    left: isReceived ? '8px' : 'auto',
                    width: isMobile ? '18px' : '20px',
                    height: isMobile ? '18px' : '20px',
                    backgroundColor: event.isAdded ? 'var(--success-color)' : 'var(--danger-color)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: isMobile ? '10px' : '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    zIndex: 10,
                    border: '1.5px solid var(--bg-primary)',
                    animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEvent(event, isReceived);
                  }}
                >
                  {event.isAdded ? 'i' : '+'}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default React.memo(ChatMessageBubble);
