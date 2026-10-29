import React, { useState, useRef, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import PollVotesModal from './PollVotesModal';
import { sendSafe } from '../../service/Websocket';
import messageStore from '../../pages/MessageStore';
import { normalizePoll, isOptionDuplicate, formatClosingTime } from './pollUtils';
import { API } from '../../service/UserAuth';

/**
 * PollWidget Component
 * Restyled poll bubble complying with:
 * - Real theme variables only: --accent-gradient, --accent-color, --bg-primary, --bg-card, --border-color, --text-primary, --text-secondary, --danger-color
 * - "Other" is a write-in answer, NOT an option. Typing in Other never adds to poll.options.
 * - Single choice: submitting Other clears option vote; voting an option clears Other answer.
 * - Multiple choice: option votes and Other answer coexist.
 * - Max 25 chars, trimmed. Duplicate check displays "That's already an option above".
 * - Real <button type="button"> rows with progress fill, indicators, and no voter avatars.
 * - Footer with "<total_voters> of <total_members> voted" and "View votes" in var(--accent-color).
 */
const PollWidget = ({ message, currentUserId, members = [] }) => {
  const [isTypingOther, setIsTypingOther] = useState(false);
  const [otherInput, setOtherInput] = useState('');
  const [otherError, setOtherError] = useState('');
  const [showVotesModal, setShowVotesModal] = useState(false);
  const [fetchedPoll, setFetchedPoll] = useState(null);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const viewVotesRef = useRef(null);

  const targetMsgId = message?.msgid || message?.tempmsgid;

  // Fallback API fetch when poll data is missing
  useEffect(() => {
    if (!message?.poll && !fetchedPoll && !loadingPoll && targetMsgId) {
      setLoadingPoll(true);
      fetch(`${API}/api/polls/by-msg/${encodeURIComponent(targetMsgId)}`, {
        headers: {
          'User-Id': currentUserId || localStorage.getItem('userid'),
          'ngrok-skip-browser-warning': 'true'
        }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setFetchedPoll(data);
            if (messageStore.handlePollUpdate) {
              messageStore.handlePollUpdate(data);
            }
          }
        })
        .catch((err) => console.error('Failed to fetch fallback poll data:', err))
        .finally(() => setLoadingPoll(false));
    }
  }, [message?.poll, fetchedPoll, loadingPoll, targetMsgId, currentUserId]);

  if (!message) return null;

  // Extract poll object from message or fallback fetched poll
  let rawPoll = message.poll || fetchedPoll;
  if (!rawPoll && message.content) {
    try {
      const parsed = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
      if (parsed && (parsed.poll_id || parsed.id)) {
        rawPoll = parsed;
      }
    } catch (e) {}
  }

  if (!rawPoll) {
    return (
      <div
        style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {loadingPoll ? 'Loading poll data...' : '[Poll Message]'}
      </div>
    );
  }

  const poll = normalizePoll(rawPoll, currentUserId);
  const {
    poll_id,
    question,
    allow_multiple,
    allow_user_options,
    anonymous,
    is_hidden_voting,
    isClosed,
    options,
    user_votes,
    other_votes,
    myOtherText,
    hasMyOther,
    total_voters,
    total_members
  } = poll;

  const chatId = message.chatid;
  const msgId = message.msgid || message.tempmsgid;

  // Auto-refresh remaining time or close status every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!poll?.expires_at || isClosed) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [poll?.expires_at, isClosed]);

  // Meta line: When closed, "Closed" replaces choice mode entirely. When open, show "closing in {time}" if deadline exists.
  let metaText = '';
  if (isClosed) {
    const parts = ['Closed'];
    if (anonymous) parts.push('anonymous');
    if (is_hidden_voting) parts.push('hidden voting');
    metaText = parts.join(', ');
  } else {
    const parts = [allow_multiple ? 'Select one or more' : 'Select one'];
    if (anonymous) parts.push('anonymous');
    if (is_hidden_voting) parts.push('hidden voting');
    const closingTime = formatClosingTime(poll?.expires_at);
    if (closingTime) {
      parts.push(`closing in ${closingTime}`);
    }
    metaText = parts.join(', ');
  }

  // Handle option voting
  const handleToggleOption = (optionId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isClosed) return;

    const isCurrentlyVoted = user_votes.includes(optionId);
    let nextVotes = [];

    if (allow_multiple) {
      nextVotes = isCurrentlyVoted
        ? user_votes.filter((id) => id !== optionId)
        : [...user_votes, optionId];
    } else {
      nextVotes = isCurrentlyVoted ? [] : [optionId];
      // Single choice rule: voting an option clears Other answer
      setIsTypingOther(false);
      setOtherInput('');
      setOtherError('');
    }

    // Update option counts & voters list optimistically
    const updatedOptions = options.map((opt) => {
      const optId = opt.option_id;
      const wasVoted = user_votes.includes(optId);
      const willBeVoted = nextVotes.includes(optId);
      let newCount = opt.count || 0;
      let newVoters = [...(opt.voters || [])];

      if (willBeVoted && !wasVoted) {
        newCount += 1;
        if (!newVoters.some((v) => String(typeof v === 'string' ? v : (v?.userId || v?.id)) === String(currentUserId))) {
          newVoters.push(currentUserId);
        }
      } else if (!willBeVoted && wasVoted) {
        newCount = Math.max(0, newCount - 1);
        newVoters = newVoters.filter(
          (v) => String(typeof v === 'string' ? v : (v?.userId || v?.id)) !== String(currentUserId)
        );
      }

      return {
        ...opt,
        count: newCount,
        voters: newVoters
      };
    });

    let nextOtherVotes = other_votes;
    let nextOtherText = hasMyOther ? myOtherText : '';

    if (!allow_multiple) {
      // Single choice clears Other write-in
      nextOtherVotes = other_votes.filter(
        (v) => String(v.userId || v.id) !== String(currentUserId)
      );
      nextOtherText = '';
    }

    // Recalculate total_voters
    const hadAnyVote = user_votes.length > 0 || hasMyOther;
    const willHaveAnyVote = nextVotes.length > 0 || (allow_multiple && hasMyOther);
    const newTotalVoters = (!hadAnyVote && willHaveAnyVote)
      ? total_voters + 1
      : ((hadAnyVote && !willHaveAnyVote) ? Math.max(0, total_voters - 1) : total_voters);

    // Optimistic update in MessageStore
    messageStore.handlePollUpdate({
      chatid: chatId,
      msgid: msgId,
      poll_id: poll_id,
      user_votes: nextVotes,
      options: updatedOptions,
      other_votes: nextOtherVotes,
      total_voters: newTotalVoters
    });

    // Send vote-poll frame
    const payload = {
      purpose: 'vote-poll',
      userchatid: String(chatId),
      msgid: String(msgId),
      poll_id: Number(poll_id),
      option_ids: nextVotes
    };
    if (!anonymous) {
      payload.other_text = nextOtherText;
    }
    sendSafe(payload);
  };

  // Switch Other row to input mode
  const handleStartTypingOther = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isClosed) return;
    setOtherError('');
    setOtherInput('');
    setIsTypingOther(true);
  };

  // Submit Other write-in answer
  const handleOtherSubmit = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isClosed) return;

    const trimmed = otherInput.trim().slice(0, 25);
    if (!trimmed) return;

    if (isOptionDuplicate(trimmed, options)) {
      setOtherError("That's already an option above");
      return;
    }

    const myUsername = localStorage.getItem('username') || localStorage.getItem('userid') || 'You';
    const newEntry = { userId: currentUserId, username: myUsername, text: trimmed };

    const nextOtherVotes = [
      ...other_votes.filter((v) => String(v.userId || v.id) !== String(currentUserId)),
      newEntry
    ];

    let nextVotes = user_votes;
    let updatedOptions = options;

    if (!allow_multiple) {
      // Single choice: submitting Other clears option votes
      nextVotes = [];
      updatedOptions = options.map((opt) => {
        if (user_votes.includes(opt.option_id)) {
          return {
            ...opt,
            count: Math.max(0, (opt.count || 0) - 1),
            voters: (opt.voters || []).filter(
              (v) => String(typeof v === 'string' ? v : (v?.userId || v?.id)) !== String(currentUserId)
            )
          };
        }
        return opt;
      });
    }

    const hadAnyVote = user_votes.length > 0 || hasMyOther;
    const willHaveAnyVote = true;
    const newTotalVoters = (!hadAnyVote && willHaveAnyVote) ? total_voters + 1 : total_voters;

    messageStore.handlePollUpdate({
      chatid: chatId,
      msgid: msgId,
      poll_id: poll_id,
      user_votes: nextVotes,
      options: updatedOptions,
      other_votes: nextOtherVotes,
      total_voters: newTotalVoters
    });

    sendSafe({
      purpose: 'add-poll-option',
      userchatid: String(chatId),
      msgid: String(msgId),
      poll_id: Number(poll_id),
      option_text: trimmed
    });

    setIsTypingOther(false);
    setOtherInput('');
    setOtherError('');
  };

  // Remove existing Other answer
  const handleRemoveMyOther = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isClosed) return;

    const nextOtherVotes = other_votes.filter(
      (v) => String(v.userId || v.id) !== String(currentUserId)
    );

    const hadAnyVote = user_votes.length > 0 || hasMyOther;
    const willHaveAnyVote = user_votes.length > 0;
    const newTotalVoters = (hadAnyVote && !willHaveAnyVote) ? Math.max(0, total_voters - 1) : total_voters;

    messageStore.handlePollUpdate({
      chatid: chatId,
      msgid: msgId,
      poll_id: poll_id,
      user_votes: user_votes,
      options: options,
      other_votes: nextOtherVotes,
      total_voters: newTotalVoters
    });

    sendSafe({
      purpose: 'vote-poll',
      userchatid: String(chatId),
      msgid: String(msgId),
      poll_id: Number(poll_id),
      option_ids: user_votes,
      other_text: ''
    });

    setIsTypingOther(false);
    setOtherInput('');
    setOtherError('');
  };

  const handleCancelOther = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsTypingOther(false);
    setOtherInput('');
    setOtherError('');
  };

  const hideResults = is_hidden_voting && !isClosed;
  const displayTotalMembers = Math.max(2, total_members || 0, (members && members.length) || 0);

  const showOtherRow = allow_user_options && !anonymous && !isClosed;
  const isInputDuplicate = isOptionDuplicate(otherInput, options);
  const isSubmitDisabled = !otherInput.trim() || isInputDuplicate;

  const otherCount = other_votes.length;
  const otherPct = total_voters > 0 ? Math.round((otherCount / total_voters) * 100) : 0;

  return (
    <div
      style={containerStyle}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Top Meta Line: "Select one" / "Select one or more", ", anonymous", ", closed" */}
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        {metaText}
      </div>

      {/* Question */}
      <h4 style={questionStyle}>
        {question}
      </h4>

      {/* Options List */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {options.map((opt) => {
          const optId = opt.option_id;
          const optText = opt.option_text || opt.text || '';
          const count = opt.count || 0;
          const isVoted = user_votes.includes(optId);
          const pct = total_voters > 0 ? Math.round((count / total_voters) * 100) : 0;

          return (
            <button
              key={optId}
              type="button"
              onClick={(e) => handleToggleOption(optId, e)}
              style={{
                ...optionButtonStyle,
                border: isVoted ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                cursor: isClosed ? 'default' : 'pointer'
              }}
            >
              {/* Progress Fill: width = pct%, background = var(--accent-gradient), opacity = 0.22 */}
              <div
                style={{
                  ...progressFillStyle,
                  width: hideResults ? '0%' : `${pct}%`
                }}
              />

              {/* Foreground Content */}
              <div style={optionForegroundStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  {/* Indicator: 18px, circle / 5px square, var(--text-secondary) or var(--accent-gradient) check */}
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      flexShrink: 0,
                      borderRadius: allow_multiple ? '5px' : '50%',
                      border: isVoted ? 'none' : '2px solid var(--text-secondary)',
                      background: isVoted ? 'var(--accent-gradient)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isVoted && <Check size={11} color="#ffffff" strokeWidth={3} />}
                  </div>

                  {/* Option Label: 14px on one line with ellipsis */}
                  <span
                    style={{
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'left'
                    }}
                  >
                    {optText}
                  </span>
                </div>

                {/* Right side: "<count> · <pct>%" in 12px var(--text-secondary) */}
                {!hideResults && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '8px' }}>
                    {count} · {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Other Row: only when allow_user_options is true, not anonymous, and not closed */}
        {showOtherRow && (
          isTypingOther ? (
            /* Input Mode */
            <div style={otherInputContainerStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Other, write your own"
                  value={otherInput}
                  maxLength={25}
                  autoFocus
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 25);
                    setOtherInput(val);
                    if (isOptionDuplicate(val, options)) {
                      setOtherError("That's already an option above");
                    } else {
                      setOtherError('');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!isSubmitDisabled) handleOtherSubmit(e);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      handleCancelOther(e);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={otherInputStyle}
                />

                <button
                  type="button"
                  disabled={isSubmitDisabled}
                  onClick={handleOtherSubmit}
                  style={{
                    ...otherVoteButtonStyle,
                    background: isSubmitDisabled ? 'var(--bg-card)' : 'var(--accent-gradient)',
                    color: isSubmitDisabled ? 'var(--text-secondary)' : '#ffffff',
                    border: isSubmitDisabled ? '1px solid var(--border-color)' : 'none',
                    cursor: isSubmitDisabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  Vote
                </button>

                <button
                  type="button"
                  onClick={handleCancelOther}
                  style={otherCancelButtonStyle}
                >
                  Cancel
                </button>
              </div>

              {/* Below Input: Error on the left (var(--danger-color)), Counter "n/25" on the right */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--danger-color)', fontWeight: 600 }}>
                  {isInputDuplicate ? "That's already an option above" : otherError}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                  {otherInput.length}/25
                </span>
              </div>
            </div>
          ) : (
            /* Button Mode */
            <button
              type="button"
              onClick={hasMyOther ? handleRemoveMyOther : handleStartTypingOther}
              style={{
                ...optionButtonStyle,
                border: hasMyOther ? '1px solid var(--accent-color)' : '1px dashed var(--border-color)',
                cursor: 'pointer'
              }}
            >
              {/* Progress Fill if write-ins exist */}
              {otherCount > 0 && (
                <div
                  style={{
                    ...progressFillStyle,
                    width: `${otherPct}%`
                  }}
                />
              )}

              {/* Foreground Content */}
              <div style={optionForegroundStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  {/* Indicator */}
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      flexShrink: 0,
                      borderRadius: allow_multiple ? '5px' : '50%',
                      border: hasMyOther ? 'none' : '2px dashed var(--text-secondary)',
                      background: hasMyOther ? 'var(--accent-gradient)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {hasMyOther ? (
                      <Check size={11} color="#ffffff" strokeWidth={3} />
                    ) : (
                      <Plus size={11} color="var(--text-secondary)" />
                    )}
                  </div>

                  {/* Label: "Other: <my text>" or "Other, write your own" */}
                  <span
                    style={{
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'left'
                    }}
                  >
                    {hasMyOther ? `Other: ${myOtherText}` : 'Other, write your own'}
                  </span>
                </div>

                {/* Right side: "<count> · <pct>%" when there are write-ins */}
                {!hideResults && otherCount > 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '8px' }}>
                    {otherCount} · {otherPct}%
                  </span>
                )}
              </div>
            </button>
          )
        )}
      </div>

      {/* Footer: no top divider, margin-top 10px, 13px, var(--text-secondary) */}
      <div style={footerStyle}>
        <span>
          {displayTotalMembers > 0 ? `${total_voters} of ${displayTotalMembers} voted` : `${total_voters} voted`}
        </span>
        <button
          ref={viewVotesRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowVotesModal(true);
          }}
          style={viewVotesButtonStyle}
        >
          View votes
        </button>
      </div>

      {/* Votes Sheet / Dialog */}
      <PollVotesModal
        isOpen={showVotesModal}
        onClose={() => setShowVotesModal(false)}
        poll={poll}
        currentUserId={currentUserId}
        members={members}
        triggerRef={viewVotesRef}
      />
    </div>
  );
};

// ── Styles (Using only approved theme variables) ──
const containerStyle = {
  width: '100%',
  maxWidth: '380px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '12px',
  boxSizing: 'border-box'
};

const questionStyle = {
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '4px 0 0 0',
  lineHeight: '1.3',
  wordBreak: 'break-word'
};

const optionButtonStyle = {
  width: '100%',
  borderRadius: '10px',
  padding: '9px 10px',
  marginTop: '7px',
  overflow: 'hidden',
  position: 'relative',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  textAlign: 'left',
  font: 'inherit',
  color: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease'
};

const optionForegroundStyle = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%'
};

const progressFillStyle = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  background: 'var(--accent-gradient)',
  opacity: 0.22,
  pointerEvents: 'none',
  zIndex: 0,
  transition: 'width 0.3s ease'
};

const otherInputContainerStyle = {
  marginTop: '7px',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  padding: '9px 10px',
  background: 'var(--bg-primary)',
  boxSizing: 'border-box'
};

const otherInputStyle = {
  flex: 1,
  minWidth: 0,
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  padding: '2px 0',
  font: 'inherit'
};

const otherVoteButtonStyle = {
  padding: '5px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  flexShrink: 0,
  font: 'inherit'
};

const otherCancelButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  cursor: 'pointer',
  padding: '4px 6px',
  flexShrink: 0,
  font: 'inherit'
};

const footerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: '10px',
  fontSize: '13px',
  color: 'var(--text-secondary)',
  borderTop: 'none'
};

const viewVotesButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--accent-color)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '2px 0',
  font: 'inherit'
};

export default PollWidget;
