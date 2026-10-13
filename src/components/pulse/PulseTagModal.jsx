import React, { useState, useEffect, useMemo } from 'react';
import { X, Tag, Send, Check, Users, Lock, Sparkles, MessageCircle } from 'lucide-react';
import { sendSafe } from '../../service/Websocket';
import messageStore from '../../pages/MessageStore';
import Avatar from '../chat/Avatar';
import { API } from '../../service/UserAuth';

/**
 * PulseTagModal Component
 * Privacy-Aware Chat Selector Modal for Tagging / Sharing Pulses.
 * Protocol: Sets repliedto: "PULSE_TAG:<PULSE_ID>"
 */
const PulseTagModal = ({ isOpen, onClose, pulse, pulseOwnerUserId }) => {
  if (!isOpen || !pulse) return null;

  const currentUserId = localStorage.getItem('userid');
  const [selectedChatIds, setSelectedChatIds] = useState([]);
  const [tagMessage, setTagMessage] = useState('Check out this pulse!');
  const [isSending, setIsSending] = useState(false);
  const [toastText, setToastText] = useState('');

  const pulseId = pulse.pulseId || pulse.pulse_id || pulse.id;
  const ownerId = pulseOwnerUserId || pulse.user_id || pulse.userId;
  const visibility = pulse.visibility || 'everyone';

  // Load chats and apply Privacy-Aware Filtering
  const availableChats = useMemo(() => {
    try {
      const cachedMap = JSON.parse(localStorage.getItem('chatsMap') || '{}');
      let chatsList = Object.values(cachedMap).filter(c => c && c.chatId && c.chatId !== 'BROADCAST_SYSTEM');

      // Privacy Filtering Rule:
      // If visibility == "chats_only" or "contacts":
      // Show ONLY chats/groups where the pulse owner is a member.
      if (visibility === 'chats_only' || visibility === 'contacts') {
        chatsList = chatsList.filter(c => {
          if (c.type === 'private' || !c.isGroupChat) {
            return String(c.userId || c.chatId) === String(ownerId);
          }
          // For group chats, check if owner is a member
          const members = c.members || c.userIds || [];
          return members.some(m => String(m.userId || m) === String(ownerId));
        });
      }

      return chatsList;
    } catch (e) {
      return [];
    }
  }, [ownerId, visibility]);

  const toggleSelectChat = (chatId) => {
    setSelectedChatIds(prev =>
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const handleSendTag = async () => {
    if (selectedChatIds.length === 0 || isSending) return;
    setIsSending(true);

    const nowIso = new Date().toISOString();

    for (const targetChatId of selectedChatIds) {
      const chatObj = availableChats.find(c => c.chatId === targetChatId);
      const senderName = localStorage.getItem('username') || currentUserId;

      const frame = {
        msgid: `MSG_PT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        chatid: targetChatId,
        senderid: currentUserId,
        sendername: senderName,
        type: "text",
        content: tagMessage.trim() || "Check out this pulse!",
        repliedto: `PULSE_TAG:${pulseId}`,
        timestamp: nowIso,
        status: "sent",
        spaceid: 0
      };

      // Send over WebSocket & Save to Local MessageStore
      sendSafe(frame);
      messageStore.addMessage(frame);
    }

    setIsSending(false);
    setToastText('Pulse tagged successfully!');
    setTimeout(() => {
      setToastText('');
      onClose();
    }, 1200);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(2, 6, 23, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '460px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'modalScaleUp 0.25s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Tag size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Tag Pulse to Chat
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {visibility === 'everyone' ? 'Public story — share with any chat' : 'Restricted story — share with mutual contacts'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Input */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <input
            type="text"
            value={tagMessage}
            onChange={(e) => setTagMessage(e.target.value)}
            placeholder="Add a message..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Chat List Selector */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {availableChats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No eligible chats available for sharing under current pulse visibility.
            </div>
          ) : (
            availableChats.map(chat => {
              const isSelected = selectedChatIds.includes(chat.chatId);
              return (
                <div
                  key={chat.chatId}
                  onClick={() => toggleSelectChat(chat.chatId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    marginBottom: '4px',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar chat={chat} size={42} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {chat.chatName || chat.chatId}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                        {chat.type === 'group' ? 'Group Chat' : 'Direct Message'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: isSelected ? 'none' : '2px solid var(--border-color)',
                    backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    {isSelected && <Check size={14} strokeWidth={3} />}
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
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {selectedChatIds.length} selected
          </span>

          <button
            onClick={handleSendTag}
            disabled={selectedChatIds.length === 0 || isSending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '20px',
              backgroundColor: selectedChatIds.length > 0 ? '#3b82f6' : 'var(--border-color)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              border: 'none',
              cursor: selectedChatIds.length > 0 ? 'pointer' : 'not-allowed',
              opacity: isSending ? 0.7 : 1
            }}
          >
            <Send size={16} />
            <span>{isSending ? 'Tagging...' : 'Tag Pulse'}</span>
          </button>
        </div>

        {/* Toast Notification */}
        {toastText && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '700',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
            zIndex: 10001
          }}>
            {toastText}
          </div>
        )}
      </div>
    </div>
  );
};

export default PulseTagModal;
