import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { isEmojiReaction } from '../../utils/chatFormatting';

/** Modal listing all message reactions (tabs for All / each emoji / custom text reactions). */
export default function ReactorsModal({ reactionInfo, onClose, onSendReaction, isMobile }) {
  const [activeTab, setActiveTab] = useState('all');
  const currentUserId = localStorage.getItem('userid');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!reactionInfo) return null;

  const reactionsObj = reactionInfo.reactions || {};
  const msgObj = reactionInfo.msg || {};

  const validEntries = Object.entries(reactionsObj)
    .filter(([, reactors]) => Array.isArray(reactors) && reactors.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  const emojiEntries = validEntries.filter(([key]) => isEmojiReaction(key));
  const textEntries = validEntries.filter(([key]) => !isEmojiReaction(key));
  const textReactionsCount = textEntries.reduce((sum, [, reactors]) => sum + reactors.length, 0);
  const totalCount = validEntries.reduce((sum, [, reactors]) => sum + reactors.length, 0);

  const allItems = [];
  validEntries.forEach(([emoji, reactors]) => {
    const isEmoji = isEmojiReaction(emoji);
    reactors.forEach((reactor) => {
      allItems.push({
        emoji,
        isEmoji,
        userId: reactor.userId,
        username: reactor.username,
        profile: reactor.profile,
        pulseStreak: reactor.pulseStreak,
      });
    });
  });

  allItems.sort((a, b) => {
    const isAMine = String(a.userId) === String(currentUserId);
    const isBMine = String(b.userId) === String(currentUserId);
    if (isAMine && !isBMine) return -1;
    if (!isAMine && isBMine) return 1;
    return 0;
  });

  const displayedItems = activeTab === 'all'
    ? allItems
    : activeTab === '__text_abc__'
      ? allItems.filter((item) => !item.isEmoji)
      : allItems.filter((item) => item.emoji === activeTab);

  const handleRowClick = (item) => {
    if (String(item.userId) === String(currentUserId) && msgObj) {
      onSendReaction(msgObj, item.emoji);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reactions"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          borderBottomLeftRadius: isMobile ? '0' : '20px',
          borderBottomRightRadius: isMobile ? '0' : '20px',
          padding: '16px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '420px',
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '36px', height: '4px', borderRadius: '2px',
            backgroundColor: 'var(--text-secondary)', opacity: 0.4,
            margin: '0 auto 4px',
          }}
        />

        <div
          role="tablist"
          style={{
            display: 'flex', gap: '8px', overflowX: 'auto',
            paddingBottom: '4px', scrollbarWidth: 'none',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            style={{
              padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: '700',
              cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
              background: activeTab === 'all' ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
              color: activeTab === 'all' ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            All {totalCount}
          </button>

          {emojiEntries.map(([emoji, reactors]) => (
            <button
              key={emoji}
              type="button"
              role="tab"
              aria-selected={activeTab === emoji}
              onClick={() => setActiveTab(emoji)}
              style={{
                padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                background: activeTab === emoji ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                color: activeTab === emoji ? '#ffffff' : 'var(--text-primary)',
              }}
            >
              {emoji} {reactors.length}
            </button>
          ))}

          {textReactionsCount > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === '__text_abc__'}
              onClick={() => setActiveTab('__text_abc__')}
              style={{
                padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                background: activeTab === '__text_abc__' ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                color: activeTab === '__text_abc__' ? '#ffffff' : 'var(--text-primary)',
              }}
            >
              abc {textReactionsCount}
            </button>
          )}
        </div>

        <div
          style={{
            flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
            maxHeight: '340px', paddingRight: '2px',
          }}
        >
          {displayedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No reactions found.
            </div>
          ) : (
            displayedItems.map((item, idx) => {
              const isMine = String(item.userId) === String(currentUserId);
              return (
                <div
                  key={`${item.userId}_${item.emoji}_${idx}`}
                  onClick={() => handleRowClick(item)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: '14px',
                    backgroundColor: isMine ? 'var(--accent-tint)' : 'transparent',
                    border: isMine ? '1px solid var(--accent-tint)' : '1px solid transparent',
                    cursor: isMine ? 'pointer' : 'default',
                    transition: 'background 0.15s ease',
                  }}
                  title={isMine ? 'Tap to remove your reaction' : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <Avatar
                      chat={{
                        userId: item.userId,
                        userName: item.username,
                        profile: item.profile,
                        pulseStreak: item.pulseStreak,
                      }}
                      size={36}
                      showStreak={true}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {isMine ? 'You' : (item.username || item.userId)}
                      </div>
                      {isMine && (
                        <div style={{ fontSize: '10px', color: 'var(--danger-color)', fontWeight: '600', marginTop: '1px' }}>
                          Tap to remove your reaction
                        </div>
                      )}
                    </div>
                  </div>

                  {item.isEmoji ? (
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>
                      {item.emoji}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        flexShrink: 0,
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {String(item.emoji).slice(0, 15)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
