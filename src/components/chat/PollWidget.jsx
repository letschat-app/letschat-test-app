import React, { useState } from 'react';
import { Check, Plus, Lock, Users, AlertCircle, BarChart2 } from 'lucide-react';
import Avatar from './Avatar';
import { sendSafe } from '../../service/Websocket';
import messageStore from '../../pages/MessageStore';

/**
 * PollWidget Component
 * Renders an interactive native poll inside message bubbles with:
 * - Real-time voter progress (e.g. "2/6 votes registered")
 * - Single / multi-choice voting
 * - Option percentage bars & vote counts
 * - Anonymous voter privacy filter
 * - Deadline lock state ("Poll Closed")
 * - User-added custom option ("Others") input
 */
const PollWidget = ({ message, currentUserId }) => {
  const [addingOption, setAddingOption] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  const [isSubmittingOption, setIsSubmittingOption] = useState(false);

  if (!message) return null;

  // Extract poll object from message
  let poll = message.poll;
  if (!poll && message.content) {
    try {
      const parsed = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
      if (parsed && parsed.poll_id) {
        poll = parsed;
      }
    } catch (e) {}
  }

  if (!poll) {
    return (
      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        [Poll Message]
      </div>
    );
  }

  const {
    poll_id,
    question = 'Poll',
    allow_multiple = false,
    allow_user_options = false,
    anonymous = false,
    is_expired = false,
    expires_at = null,
    total_voters = 0,
    total_members = 0,
    options = [],
    user_votes = []
  } = poll;

  // Check if expired by deadline
  const isPastDeadline = expires_at ? new Date() >= new Date(expires_at) : false;
  const isClosed = is_expired || isPastDeadline;

  const chatId = message.chatid;
  const msgId = message.msgid || message.tempmsgid;

  // Handle voting selection
  const handleToggleOption = (optionId) => {
    if (isClosed) return;

    let newVotes = [];
    const isCurrentlyVoted = user_votes.includes(optionId);

    if (allow_multiple) {
      if (isCurrentlyVoted) {
        newVotes = user_votes.filter(id => id !== optionId);
      } else {
        newVotes = [...user_votes, optionId];
      }
    } else {
      if (isCurrentlyVoted) {
        newVotes = []; // Retract vote
      } else {
        newVotes = [optionId];
      }
    }

    // Optimistic UI update in MessageStore
    messageStore.handlePollUpdate({
      chatid: chatId,
      msgid: msgId,
      poll_id: poll_id,
      user_votes: newVotes
    });

    // Send WebSocket voting frame
    sendSafe({
      purpose: 'vote-poll',
      userchatid: String(chatId),
      msgid: String(msgId),
      poll_id: Number(poll_id),
      option_ids: newVotes
    });
  };

  // Handle adding custom option ("others")
  const handleAddOptionSubmit = (e) => {
    e.preventDefault();
    const trimmed = newOptionText.trim();
    if (!trimmed || isSubmittingOption || isClosed) return;

    setIsSubmittingOption(true);

    sendSafe({
      purpose: 'add-poll-option',
      userchatid: String(chatId),
      msgid: String(msgId),
      poll_id: Number(poll_id),
      option_text: trimmed
    });

    setNewOptionText('');
    setAddingOption(false);
    setIsSubmittingOption(false);
  };

  return (
    <div style={containerStyle}>

      {/* Poll Header & Badges */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <BarChart2 size={16} color="var(--accent-color, #3b82f6)" />
          <span style={badgeStyle}>
            {allow_multiple ? 'Multiple Choice' : 'Select One'}
          </span>
          {anonymous && <span style={{ ...badgeStyle, backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }}>Anonymous</span>}
          {isClosed && <span style={{ ...badgeStyle, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>Poll Closed</span>}
        </div>

        <h4 style={questionStyle}>{question}</h4>

        {/* Voter Participation Progress Indicator */}
        <div style={participationStyle}>
          <Users size={13} />
          <span>
            {total_voters}{total_members > 0 ? `/${total_members}` : ''} votes registered
          </span>
        </div>
      </div>

      {/* Options List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map(opt => {
          const optId = opt.option_id;
          const optText = opt.option_text || opt.text || '';
          const count = opt.count || 0;
          const isVoted = user_votes.includes(optId);
          const pct = total_voters > 0 ? Math.round((count / total_voters) * 100) : 0;
          const voters = opt.voters || [];

          return (
            <div
              key={optId}
              onClick={() => handleToggleOption(optId)}
              style={{
                ...optionCardStyle,
                border: isVoted ? '1.5px solid var(--accent-color, #3b82f6)' : '1px solid rgba(255,255,255,0.08)',
                backgroundColor: isVoted ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.03)',
                cursor: isClosed ? 'default' : 'pointer'
              }}
            >
              {/* Animated Progress Bar Fill */}
              <div
                style={{
                  ...progressFillStyle,
                  width: `${pct}%`,
                  backgroundColor: isVoted ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.06)'
                }}
              />

              {/* Foreground Content */}
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  
                  {/* Choice Input Indicator */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: allow_multiple ? '4px' : '50%',
                    border: isVoted ? '2px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.4)',
                    backgroundColor: isVoted ? '#3b82f6' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isVoted && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </div>

                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary, #ffffff)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {optText}
                  </span>
                </div>

                {/* Vote Count & Percentage */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  
                  {/* Voter Avatars List (Hidden if anonymous) */}
                  {!anonymous && voters.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '-4px' }}>
                      {voters.slice(0, 3).map((v, i) => (
                        <div key={i} style={{ marginLeft: i > 0 ? '-6px' : 0, border: '1.5px solid #111b21', borderRadius: '50%' }}>
                          <Avatar chat={{ userName: typeof v === 'string' ? v : (v.username || v.userId) }} size={18} />
                        </div>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: '12px', fontWeight: '700', color: isVoted ? '#3b82f6' : 'var(--text-secondary, #94a3b8)' }}>
                    {pct}% ({count})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Option Input ("Others") */}
      {allow_user_options && !isClosed && (
        <div style={{ marginTop: '8px' }}>
          {!addingOption ? (
            <button
              onClick={() => setAddingOption(true)}
              style={addOptionButtonStyle}
            >
              <Plus size={14} /> Add Option ("Others")
            </button>
          ) : (
            <form onSubmit={handleAddOptionSubmit} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Type custom option..."
                value={newOptionText}
                onChange={e => setNewOptionText(e.target.value)}
                style={addInputStyle}
                maxLength={100}
                autoFocus
              />
              <button type="submit" disabled={!newOptionText.trim()} style={submitOptionButtonStyle}>
                Add
              </button>
              <button type="button" onClick={() => setAddingOption(false)} style={cancelOptionButtonStyle}>
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

    </div>
  );
};

// ── Styles ──
const containerStyle = {
  width: '100%',
  maxWidth: '360px',
  padding: '14px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const headerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
};

const badgeStyle = {
  fontSize: '10px',
  fontWeight: '800',
  color: '#3b82f6',
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  padding: '2px 8px',
  borderRadius: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.4px'
};

const questionStyle = {
  fontSize: '15px',
  fontWeight: '800',
  color: 'var(--text-primary, #ffffff)',
  margin: '4px 0 2px 0',
  lineHeight: '1.3'
};

const participationStyle = {
  fontSize: '11px',
  fontWeight: '700',
  color: 'var(--text-secondary, #94a3b8)',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
};

const optionCardStyle = {
  position: 'relative',
  padding: '10px 12px',
  borderRadius: '12px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  userSelect: 'none',
  transition: 'all 0.2s ease'
};

const progressFillStyle = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  borderRadius: '12px',
  transition: 'width 0.4s ease',
  zIndex: 1
};

const addOptionButtonStyle = {
  width: '100%',
  padding: '8px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px dashed rgba(255, 255, 255, 0.15)',
  borderRadius: '10px',
  color: 'var(--text-secondary, #94a3b8)',
  fontSize: '12px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px'
};

const addInputStyle = {
  flex: 1,
  padding: '8px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none'
};

const submitOptionButtonStyle = {
  padding: '8px 12px',
  backgroundColor: '#3b82f6',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '700',
  cursor: 'pointer'
};

const cancelOptionButtonStyle = {
  padding: '8px 10px',
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--text-secondary, #94a3b8)',
  fontSize: '12px',
  cursor: 'pointer'
};

export default PollWidget;
