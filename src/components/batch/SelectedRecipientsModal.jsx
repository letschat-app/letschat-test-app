import React, { useState, useMemo } from 'react';
import { X, Search, Trash2, Users } from 'lucide-react';
import Avatar from '../chat/Avatar';
import { isVerifiedChat, VerifiedBadge } from '../../pages/ChatNames';

export default function SelectedRecipientsModal({
  isOpen,
  onClose,
  selectedChatIds = [],
  chatsMap = {},
  chats = [],
  onDeselect,
  onClearAll
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const resolveChat = (chatId) => {
    if (chatsMap[chatId]) return chatsMap[chatId];
    return chats.find(c => String(c.chatId) === String(chatId)) || {
      chatId,
      chatName: `Chat ${chatId}`,
      type: 'direct'
    };
  };

  const recipientList = useMemo(() => {
    return selectedChatIds.map(id => resolveChat(id));
  }, [selectedChatIds, chatsMap, chats]);

  const filteredRecipients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return recipientList;
    return recipientList.filter(c =>
      (c.chatName && c.chatName.toLowerCase().includes(q)) ||
      (c.chatId && String(c.chatId).toLowerCase().includes(q))
    );
  }, [recipientList, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '480px',
          height: '80vh',
          maxHeight: '620px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          animation: 'muFadeIn 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent-tint)',
              color: 'var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Selected Recipients
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {selectedChatIds.length} destination chat{selectedChatIds.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Actions bar */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search selected recipients..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Showing {filteredRecipients.length} of {selectedChatIds.length}
            </span>
            {selectedChatIds.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger-color)',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <Trash2 size={13} />
                Deselect All
              </button>
            )}
          </div>
        </div>

        {/* Recipient list (scrollable) */}
        <div className="hide-scrollbar" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px'
        }}>
          {filteredRecipients.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              {selectedChatIds.length === 0 ? 'No chats currently selected' : 'No matching recipients found'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredRecipients.map(chat => (
                <div
                  key={chat.chatId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <Avatar chat={chat} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {chat.chatName || 'Chat'}
                        </span>
                        {isVerifiedChat(chat) && <VerifiedBadge size={14} />}
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {chat.type === 'group' ? 'Group' : (chat.type === 'classroom' ? 'Classroom' : 'Contact')}
                      </span>
                    </div>
                  </div>

                  {/* Remove recipient button */}
                  <button
                    type="button"
                    onClick={() => onDeselect(String(chat.chatId))}
                    style={{
                      background: 'var(--danger-tint)',
                      border: 'none',
                      color: 'var(--danger-color)',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s ease'
                    }}
                    title={`Remove ${chat.chatName || 'chat'}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 24px',
              backgroundColor: 'var(--accent-color)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
