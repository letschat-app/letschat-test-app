import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, Edit3 } from 'lucide-react';
import Avatar from '../chat/Avatar';
import { isVerifiedChat, VerifiedBadge } from '../../pages/ChatNames';
import { updateBatch } from '../../service/BatchMessageService';

export default function EditBatchModal({ isOpen, batch, onClose, onBatchUpdated, chats = [], userId }) {
  const [batchName, setBatchName] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (batch) {
      setBatchName(batch.name || '');
      setSelectedChatIds(new Set((batch.chatIds || []).map(id => String(id))));
      setSearchQuery('');
      setError('');
    }
  }, [batch]);

  // Filter out simulation_guide or room chats from candidate list
  const eligibleChats = useMemo(() => {
    return chats.filter(c => c && c.chatId && c.type !== 'room' && c.chatId !== 'simulation_guide');
  }, [chats]);

  const filteredChats = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return eligibleChats;
    return eligibleChats.filter(c =>
      (c.chatName && c.chatName.toLowerCase().includes(q)) ||
      (c.chatId && String(c.chatId).toLowerCase().includes(q))
    );
  }, [eligibleChats, searchQuery]);

  if (!isOpen || !batch) return null;

  const toggleChat = (chatId) => {
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
    if (error) setError('');
  };

  const handleSelectAllFiltered = () => {
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      filteredChats.forEach(c => next.add(String(c.chatId)));
      return next;
    });
    if (error) setError('');
  };

  const handleClearFiltered = () => {
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      filteredChats.forEach(c => next.delete(String(c.chatId)));
      return next;
    });
  };

  const handleSave = () => {
    const trimmed = batchName.trim();
    if (!trimmed) {
      setError('Please enter a batch name.');
      return;
    }
    if (selectedChatIds.size === 0) {
      setError('At least one chat must remain in the batch.');
      return;
    }

    try {
      const updated = updateBatch(userId, batch.id, {
        name: trimmed,
        chatIds: Array.from(selectedChatIds)
      });
      if (onBatchUpdated) {
        onBatchUpdated(updated);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update batch');
    }
  };

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
          maxWidth: '520px',
          height: '85vh',
          maxHeight: '680px',
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
              <Edit3 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Edit Batch
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {selectedChatIds.size} chat{selectedChatIds.size === 1 ? '' : 's'} in batch
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

        {/* Name input & search */}
        <div style={{ padding: '16px 20px 10px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Batch Name *
            </label>
            <input
              type="text"
              value={batchName}
              onChange={e => {
                setBatchName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Batch name..."
              maxLength={60}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Included Chats *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>•</span>
                <button
                  type="button"
                  onClick={handleClearFiltered}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', padding: 0 }}
                >
                  Clear
                </button>
              </div>
            </div>

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
                placeholder="Search chats to add or remove..."
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
          </div>

          {error && (
            <div style={{ color: 'var(--danger-color)', fontSize: '13px', fontWeight: '500' }}>
              {error}
            </div>
          )}
        </div>

        {/* Chat List (scrollable) */}
        <div className="hide-scrollbar" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 12px 10px 12px'
        }}>
          {filteredChats.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              No chats found
            </div>
          ) : (
            filteredChats.map(chat => {
              const isSelected = selectedChatIds.has(String(chat.chatId));
              return (
                <div
                  key={chat.chatId}
                  onClick={() => toggleChat(String(chat.chatId))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--accent-tint)' : 'transparent',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    border: isSelected ? 'none' : '2px solid var(--text-secondary)',
                    backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}>
                    {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                  </div>

                  <Avatar chat={chat} size={40} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '14.5px',
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
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {chat.type === 'group' ? 'Group' : (chat.type === 'classroom' ? 'Classroom' : 'Direct Chat')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!batchName.trim() || selectedChatIds.size === 0}
            style={{
              padding: '9px 22px',
              backgroundColor: (!batchName.trim() || selectedChatIds.size === 0) ? 'var(--accent-tint-border)' : 'var(--accent-color)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (!batchName.trim() || selectedChatIds.size === 0) ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
