import React, { useState } from 'react';
import { X, Layers, Plus, Edit2, Trash2, ChevronDown, ChevronUp, Users } from 'lucide-react';
import Avatar from '../chat/Avatar';
import { isVerifiedChat, VerifiedBadge } from '../../pages/ChatNames';

export default function ManageBatchesModal({
  isOpen,
  onClose,
  batches = [],
  chats = [],
  chatsMap = {},
  onEditBatch,
  onDeleteBatch,
  onCreateBatch
}) {
  const [expandedBatchId, setExpandedBatchId] = useState(null);

  if (!isOpen) return null;

  const toggleExpand = (batchId) => {
    setExpandedBatchId(prev => prev === batchId ? null : batchId);
  };

  const resolveChat = (chatId) => {
    if (chatsMap[chatId]) return chatsMap[chatId];
    return chats.find(c => String(c.chatId) === String(chatId)) || {
      chatId,
      chatName: `Chat ${chatId}`,
      type: 'direct'
    };
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
              <Layers size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Manage Batches
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {batches.length} saved batch{batches.length === 1 ? '' : 'es'}
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

        {/* Action bar */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-primary)'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Your saved recipient groups
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onCreateBatch) onCreateBatch();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--accent-color)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            New Batch
          </button>
        </div>

        {/* Batches List (scrollable) */}
        <div className="hide-scrollbar" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px'
        }}>
          {batches.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '40px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-tint)',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Users size={32} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                No saved batches yet
              </h4>
              <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: '1.5' }}>
                Batches let you group contacts and chats together to send messages in bulk with a single tap.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onCreateBatch) onCreateBatch();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--accent-color)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} />
                Create Batch
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {batches.map(batch => {
                const isExpanded = expandedBatchId === batch.id;
                const batchChatIds = batch.chatIds || [];

                return (
                  <div
                    key={batch.id}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    {/* Batch Item Header */}
                    <div style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div
                        onClick={() => toggleExpand(batch.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flex: 1,
                          minWidth: 0,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--accent-tint)',
                          color: 'var(--accent-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Layers size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {batch.name}
                          </h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {batchChatIds.length} chat{batchChatIds.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => onEditBatch(batch)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Edit Batch"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteBatch(batch)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--danger-tint-border)',
                            borderRadius: '8px',
                            color: 'var(--danger-color)',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Delete Batch"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleExpand(batch.id)}
                          style={{
                            padding: '6px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={isExpanded ? 'Collapse' : 'Expand chats'}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded list of chats inside this batch */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        padding: '10px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Chats in this batch:
                        </div>
                        {batchChatIds.map(chatId => {
                          const chat = resolveChat(chatId);
                          return (
                            <div
                              key={chatId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)'
                              }}
                            >
                              <Avatar chat={chat} size={28} />
                              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  fontSize: '13.5px',
                                  fontWeight: '500',
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {chat.chatName || chatId}
                                </span>
                                {isVerifiedChat(chat) && <VerifiedBadge size={13} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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
