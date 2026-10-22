import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock } from 'lucide-react';
import Avatar from './Avatar';
import { normalizePoll } from './pollUtils';

/**
 * PollVotesModal Component
 * Fixed-size bottom sheet on mobile (<640px) and centered dialog on wider screens.
 * Height is strictly min(72vh, 640px). Only the list area scrolls.
 * Non-anonymous: horizontal tab list ("All <total>", option tabs, "Other <count>"),
 *                36px Avatar, name (15px, "You" for current user), right-aligned label or 2nd line text.
 * Anonymous: lock notice box, options progress bars without tabs or names.
 */
export default function PollVotesModal({
  isOpen,
  onClose,
  poll: rawPoll,
  currentUserId,
  members = [],
  triggerRef
}) {
  const [activeTab, setActiveTab] = useState('all');
  const dialogRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Normalize poll data
  const poll = normalizePoll(rawPoll, currentUserId);

  // Reset tab to 'all' whenever modal opens or poll changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('all');
      previousActiveElementRef.current = document.activeElement;
      // Focus dialog on open
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else if (previousActiveElementRef.current) {
      // Restore focus to trigger on close
      try {
        if (triggerRef?.current) {
          triggerRef.current.focus();
        } else if (typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus();
        }
      } catch (e) {}
    }
  }, [isOpen, triggerRef]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !poll) return null;

  const {
    question = 'Poll',
    options = [],
    total_voters = 0,
    allow_user_options = false,
    anonymous = false,
    other_votes = []
  } = poll;

  // Voter identity resolver
  const resolveVoterInfo = (voter) => {
    const vId = typeof voter === 'string' ? voter : (voter?.userId || voter?.id || voter?.username);
    const isMe = String(vId) === String(currentUserId);

    if (isMe) {
      return {
        userId: vId,
        displayName: 'You',
        userName: localStorage.getItem('username') || localStorage.getItem('userid') || 'You',
        profile: localStorage.getItem('profile') || null,
        isMe: true
      };
    }

    if (members && members.length > 0) {
      const member = members.find(
        (m) => String(m.userId) === String(vId) || String(m.id) === String(vId)
      );
      if (member) {
        return {
          userId: vId,
          displayName: member.userName || member.username || member.name || member.chatName || vId,
          userName: member.userName || member.username || vId,
          profile: member.profile || null,
          isMe: false
        };
      }
    }

    try {
      const chatsMap = JSON.parse(localStorage.getItem('chatsMap') || '{}');
      if (chatsMap[vId]) {
        const c = chatsMap[vId];
        return {
          userId: vId,
          displayName: c.chatName || c.userName || vId,
          userName: c.chatName || c.userName || vId,
          profile: c.profile || null,
          isMe: false
        };
      }
    } catch (e) {}

    const fallbackName = typeof voter === 'object' ? (voter.userName || voter.username || voter.name || vId) : vId;
    return {
      userId: vId,
      displayName: fallbackName,
      userName: fallbackName,
      profile: typeof voter === 'object' ? voter.profile : null,
      isMe: false
    };
  };

  // Build Tabs for Non-Anonymous Polls
  const tabs = [
    { id: 'all', label: `All ${total_voters}` },
    ...options.map((opt) => ({
      id: `opt_${opt.option_id}`,
      optionId: opt.option_id,
      label: `${opt.option_text || opt.text || ''} ${opt.count || (opt.voters?.length || 0)}`
    }))
  ];

  if (allow_user_options || other_votes.length > 0) {
    tabs.push({
      id: 'other',
      label: `Other ${other_votes.length}`
    });
  }

  // Build items for Non-Anonymous Polls
  let displayItems = [];
  if (activeTab === 'all') {
    // 1. Regular option votes
    options.forEach((opt) => {
      const optText = opt.option_text || opt.text || '';
      (opt.voters || []).forEach((voter, idx) => {
        displayItems.push({
          key: `opt_${opt.option_id}_${idx}_${typeof voter === 'string' ? voter : (voter.userId || voter.id || idx)}`,
          voter,
          rightLabel: optText,
          secondLine: null
        });
      });
    });

    // 2. Write-in answers
    other_votes.forEach((ov, idx) => {
      displayItems.push({
        key: `other_${ov.userId || idx}`,
        voter: ov,
        rightLabel: 'Other',
        secondLine: ov.text
      });
    });
  } else if (activeTab === 'other') {
    other_votes.forEach((ov, idx) => {
      displayItems.push({
        key: `other_${ov.userId || idx}`,
        voter: ov,
        rightLabel: null,
        secondLine: ov.text
      });
    });
  } else if (activeTab.startsWith('opt_')) {
    const selectedOptId = activeTab.replace('opt_', '');
    const currentOpt = options.find((opt) => String(opt.option_id) === String(selectedOptId));
    if (currentOpt) {
      (currentOpt.voters || []).forEach((voter, idx) => {
        displayItems.push({
          key: `opt_${currentOpt.option_id}_${idx}`,
          voter,
          rightLabel: null,
          secondLine: null
        });
      });
    }
  }

  const modalContent = (
    <div
      className="poll-sheet-overlay"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <style>{`
        .poll-custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(128,128,128,.28) transparent;
        }
        .poll-custom-scrollbar:hover {
          scrollbar-color: rgba(128,128,128,.55) transparent;
        }
        .poll-custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .poll-custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .poll-custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(128,128,128,.28);
          border: 3px solid transparent;
          background-clip: padding-box;
          border-radius: 999px;
          min-height: 36px;
        }
        .poll-custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(128,128,128,.55);
        }
        .poll-custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--accent-color) !important;
        }

        .poll-sheet-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 999999;
          display: flex;
        }

        @media (max-width: 639px) {
          .poll-sheet-overlay {
            align-items: flex-end;
            justify-content: center;
            padding: 0;
          }
          .poll-sheet-dialog {
            width: 100%;
            border-radius: 20px 20px 0 0 !important;
            height: min(72vh, 640px) !important;
          }
          .poll-sheet-grab-handle {
            display: block !important;
          }
        }

        @media (min-width: 640px) {
          .poll-sheet-overlay {
            align-items: center;
            justify-content: center;
            padding: 16px;
          }
          .poll-sheet-dialog {
            width: 100%;
            max-width: 420px;
            border-radius: 20px !important;
            height: min(72vh, 640px) !important;
            margin: auto;
          }
          .poll-sheet-grab-handle {
            display: none !important;
          }
        }

        .poll-sheet-dialog {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overflow: hidden;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
          outline: none;
        }
      `}</style>

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={anonymous ? 'Results' : 'Votes'}
        className="poll-sheet-dialog"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Grab Handle for Mobile */}
        <div
          className="poll-sheet-grab-handle"
          style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'var(--border-color)',
            margin: '8px auto 2px auto',
            flexShrink: 0
          }}
        />

        {/* Header Row: Title + Close Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px 10px 18px',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {anonymous ? 'Results' : 'Votes'}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* NON-ANONYMOUS VIEW */}
        {!anonymous ? (
          <>
            {/* Tabs Row (Scrolls Horizontally) */}
            <div
              role="tablist"
              className="poll-custom-scrollbar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 16px 10px 16px',
                overflowX: 'auto',
                flexShrink: 0
              }}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      borderRadius: '999px',
                      padding: '5px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      cursor: 'pointer',
                      border: 'none',
                      font: 'inherit',
                      background: isActive ? 'var(--accent-gradient)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      transition: 'background 0.15s, color 0.15s'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* List Area: Only this area scrolls */}
            <div
              className="poll-custom-scrollbar"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '4px 18px 16px 18px'
              }}
            >
              {displayItems.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}
                >
                  No votes yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {displayItems.map((item) => {
                    const voterInfo = resolveVoterInfo(item.voter);
                    return (
                      <div
                        key={item.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '4px 0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <Avatar
                            chat={{
                              userName: voterInfo.userName,
                              profile: voterInfo.profile,
                              userId: voterInfo.userId
                            }}
                            size={36}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {voterInfo.displayName}
                            </div>
                            {item.secondLine && (
                              <div
                                style={{
                                  fontSize: '13px',
                                  color: 'var(--text-secondary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  marginTop: '1px'
                                }}
                              >
                                {item.secondLine}
                              </div>
                            )}
                          </div>
                        </div>

                        {item.rightLabel && (
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              maxWidth: '38%',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textAlign: 'right',
                              flexShrink: 0
                            }}
                            title={item.rightLabel}
                          >
                            {item.rightLabel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ANONYMOUS VIEW */
          <div
            className="poll-custom-scrollbar"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '0 18px 16px 18px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Notice Box */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px 12px',
                background: 'var(--bg-primary)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '16px',
                flexShrink: 0
              }}
            >
              <Lock size={18} color="var(--accent-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ lineHeight: '1.4', color: 'var(--text-primary)' }}>
                <strong>This poll is anonymous.</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  Voters and their votes are private. Not even the poll creator can see them.
                </span>
              </div>
            </div>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {options.map((opt) => {
                const optText = opt.option_text || opt.text || '';
                const count = opt.count || 0;
                const pct = total_voters > 0 ? Math.round((count / total_voters) * 100) : 0;

                return (
                  <div key={opt.option_id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {optText}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {count} {count === 1 ? 'vote' : 'votes'} · {pct}%
                      </span>
                    </div>

                    {/* 6px track (var(--border-color)) with fill of var(--accent-gradient) */}
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        background: 'var(--border-color)',
                        borderRadius: '999px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--accent-gradient)',
                          borderRadius: '999px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
