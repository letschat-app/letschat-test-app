import React, { useMemo } from 'react';
import { Loader2, Lock, Zap, ChevronDown } from 'lucide-react';
import ChatMessageBubble from './ChatMessageBubble';
import { getDateOnly } from '../../utils/chatFormatting';

/** Scrollable message feed with encryption notice, empty suggestions, memoized rows, typing indicator, and FABs. */
export default function ChatMessageList({
  isSyncingMessages,
  messagesContainerRef,
  onScroll,
  isMobile,
  filteredMessages,
  messages,
  myDisplayName,
  currentUserId,
  userStreakMap,
  chat,
  eventByMsgId,
  collapsedView,
  unreadMarker,
  chatlist,
  selectedMessages,
  hoveredMsgId,
  swipeOffset,
  highlightedPinId,
  isSelectionMode,
  chatMembers,
  messageRefs,
  transientIndicators,
  bottomRef,
  firstUnreadMentionId,
  showScrollDownBtn,
  unreadSinceScrolled,
  onSuggestHello,
  onSuggestNote,
  onSuggestSchedule,
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
  onScrollToMention,
  onScrollToBottom,
}) {
  const messagesById = useMemo(() => {
    const map = new Map();
    if (!messages) return map;
    for (const m of messages) {
      if (m?.msgid) map.set(m.msgid, m);
    }
    return map;
  }, [messages]);

  const chatNameById = useMemo(() => {
    const map = new Map();
    if (!chatlist) return map;
    for (const u of chatlist) {
      if (u?.id) map.set(u.id, u.chatName);
    }
    return map;
  }, [chatlist]);

  let lastdate = '';

  return (
    <>
      {isSyncingMessages && (
        <div
          style={{
            position: 'absolute',
            top: '74px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            backgroundColor: 'rgba(17, 24, 39, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: '500',
            pointerEvents: 'none',
            userSelect: 'none',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <Loader2 size={13} className="animate-spin" color="var(--accent-color)" />
          <span>Loading messages...</span>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className="hide-scrollbar"
        onScroll={onScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isMobile ? '12px' : '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '10px' : '12px',
          touchAction: 'pan-y',
        }}
      >
        {/* End-to-End Encryption Security Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '8px auto 14px',
            maxWidth: '92%',
            padding: '8px 14px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            lineHeight: '1.4',
            textAlign: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            userSelect: 'none',
          }}
        >
          <Lock size={14} color="var(--accent-color)" style={{ flexShrink: 0 }} />
          <span>Messages are encrypted. Not even LetsChat can read or listen to them.</span>
        </div>

        {/* Empty Space / Chat Suggestion Chips View */}
        {filteredMessages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              margin: 'auto 0',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                backgroundColor: 'var(--accent-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-color)',
                marginBottom: '16px',
              }}
            >
              <Zap size={32} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              No messages here yet
            </h4>
            <p style={{ fontSize: '13px', margin: '0 0 20px 0', maxWidth: '300px', opacity: 0.85 }}>
              Start the conversation or try one of the quick suggestions below
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '380px' }}>
              {[
                { text: 'Say Hello 👋', action: onSuggestHello },
                { text: 'Share a note 📝', action: onSuggestNote },
                { text: 'Schedule a meeting 📅', action: onSuggestSchedule },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={chip.action}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--accent-color)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-tint)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                >
                  {chip.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredMessages.map((msg) => {
          const isReceived = msg.userid
            ? String(msg.userid) !== String(currentUserId)
            : Boolean(msg.sendername && msg.sendername !== myDisplayName);
          const msgSenderId = msg.userid || msg.senderid || msg.senderId;
          const msgStreak =
            msg.pulseStreak ||
            msg.senderStreak ||
            (msgSenderId ? userStreakMap[msgSenderId] : 0) ||
            (chat?.type === 'private' && isReceived ? chat?.pulseStreak || 0 : 0) ||
            0;

          let msgFireClass = '';
          if (msgStreak >= 7) {
            msgFireClass = 'moving-blue-fire-msg-bubble';
          } else if (msgStreak >= 3) {
            msgFireClass = 'moving-red-fire-msg-bubble';
          }

          const dateOnly = getDateOnly(msg.timestamp);
          const showDate = dateOnly !== lastdate;
          if (showDate) {
            lastdate = dateOnly;
          }

          const event =
            (msg.msgid && eventByMsgId.get(String(msg.msgid))) ||
            (msg.tempmsgid ? eventByMsgId.get(String(msg.tempmsgid)) : null);
          const msgKeyId = msg.msgid || msg.tempmsgid;
          const unreadCountBeforeThis = unreadMarker.firstId === msgKeyId ? unreadMarker.count : 0;
          const repliedMsg = msg.repliedto ? messagesById.get(msg.repliedto) : null;
          const deletedByName =
            msg.isdeletedeone && isReceived ? chatNameById.get(msg.isdeletedeone) : null;

          return (
            <ChatMessageBubble
              key={msg.pendingid || msg.tempmsgid || msg.msgid}
              msg={msg}
              isReceived={isReceived}
              msgStreak={msgStreak}
              msgFireClass={msgFireClass}
              dateOnly={dateOnly}
              showDate={showDate}
              collapsedView={collapsedView}
              unreadCountBeforeThis={unreadCountBeforeThis}
              event={event}
              repliedMsg={repliedMsg}
              deletedByName={deletedByName}
              isSelected={selectedMessages.has(msg)}
              isHovered={!isMobile && hoveredMsgId === msgKeyId}
              swipeX={swipeOffset[msg.msgid] || 0}
              isHighlightedPin={highlightedPinId === msg.msgid}
              isMobile={isMobile}
              isSelectionMode={isSelectionMode}
              chatType={chat?.type}
              chatRole={chat?.role}
              currentUserId={currentUserId}
              chatMembers={chatMembers}
              messageRefs={messageRefs}
              onToggleDateCollapse={onToggleDateCollapse}
              onBannerPinClick={onBannerPinClick}
              onRevive={onRevive}
              onHoverChange={onHoverChange}
              onClickMessage={onClickMessage}
              onSwipeStart={onSwipeStart}
              onSwipeMove={onSwipeMove}
              onSwipeEnd={onSwipeEnd}
              onTouchStartMsg={onTouchStartMsg}
              onTouchEndMsg={onTouchEndMsg}
              onJumpToReplied={onJumpToReplied}
              renderFormattedText={renderFormattedText}
              onOpenAssignmentPanel={onOpenAssignmentPanel}
              onOpenMediaViewer={onOpenMediaViewer}
              onRetryMediaUpload={onRetryMediaUpload}
              onShowReactors={onShowReactors}
              onToggleStar={onToggleStar}
              onOpenQueuedMsg={onOpenQueuedMsg}
              onOpenEvent={onOpenEvent}
            />
          );
        })}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0' }}>
          {transientIndicators.map((ind) => (
            <div
              key={ind.userid}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(31, 41, 55, 0.4)',
                color: 'var(--text-secondary)',
                padding: isMobile ? '6px 12px' : '8px 16px',
                borderRadius: '16px 16px 16px 4px',
                fontSize: isMobile ? '12px' : '13px',
                border: '1px solid rgba(55, 65, 81, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: '8px',
                fontStyle: 'italic',
                animation: 'fadeIn 0.3s ease-out',
              }}
            >
              <div style={{ fontWeight: '600', color: 'var(--accent-text)' }}>
                {chat.type === 'private' ? (chat.chatName || 'Other') : ind.sendername}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {ind.content === 'typing' && (
                  <span style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    is typing
                    <span className="dot-blink-1">.</span>
                    <span className="dot-blink-2">.</span>
                    <span className="dot-blink-3">.</span>
                  </span>
                )}
                {ind.content === 'recording' && (
                  <span style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--danger-color)' }}>
                    recording audio
                    <div
                      className="rec-pulse"
                      style={{ width: '8px', height: '8px', background: 'var(--danger-color)', borderRadius: '50%' }}
                    />
                  </span>
                )}
                {ind.content === 'in-chat' && <span>is in chat</span>}
              </div>
            </div>
          ))}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Mentions: Jump to Mention FAB */}
      {firstUnreadMentionId && !isSelectionMode && (
        <button
          onClick={() => onScrollToMention(firstUnreadMentionId)}
          title="Jump to Mention"
          style={{
            position: 'absolute',
            bottom: showScrollDownBtn ? '145px' : '90px',
            right: '20px',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--warning-color)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontWeight: 'bold',
            fontSize: '18px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          @
        </button>
      )}

      {/* Scroll to Bottom FAB */}
      {showScrollDownBtn && !isSelectionMode && (
        <button
          onClick={onScrollToBottom}
          style={{
            position: 'absolute',
            bottom: '90px',
            right: '20px',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(30, 41, 59, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-color)',
            color: 'var(--accent-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            zIndex: 100,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ChevronDown style={{ width: '24px', height: '24px' }} strokeWidth={3} />
          {unreadSinceScrolled > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: 'var(--danger-color)',
                color: 'white',
                fontSize: '10px',
                fontWeight: '800',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid var(--bg-secondary)',
              }}
            >
              {unreadSinceScrolled > 99 ? '99+' : unreadSinceScrolled}
            </div>
          )}
        </button>
      )}
    </>
  );
}
