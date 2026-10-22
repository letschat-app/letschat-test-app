import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus } from 'lucide-react';
import { API } from '../../service/UserAuth';

/**
 * CreatePollModal Component
 * Redesigned native poll creation modal matching specifications:
 * - Real theme variables only: --accent-gradient, --accent-color, --bg-primary, --bg-card,
 *   --border-color, --text-primary, --text-secondary, --danger-color, --warning-color.
 * - Mobile bottom sheet (min(92vh, 720px)) with grab handle; desktop centered dialog (min(86vh, 720px)).
 * - Non-scrolling header & footer, scrolling body with shared .poll-custom-scrollbar.
 * - Live tabular counters with warning threshold (180 for question, 22 for options).
 * - Plain X removal icon (no red button, no trash icon).
 * - "Add option" text button with plus icon (not a dashed boxed button).
 * - Custom accessible switches for settings block.
 * - Deadline radio group chips and custom datetime-local input.
 * - Status line above submit button reporting the first problem in priority order.
 * - Enter never submits; Enter in question moves to first option; Enter in option advances or adds option.
 * - Rendered through ReactDOM.createPortal into document.body with event stopPropagation.
 */

const MAX_OPTIONS = 20;
const MAX_OPTION_CHARS = 25;
const MAX_QUESTION_CHARS = 200;

const DEADLINE_OPTIONS = [
  { value: 'none', label: 'No deadline' },
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
  { value: '1w', label: '1 week' },
  { value: 'custom', label: 'Custom' }
];

/**
 * Returns set of indices that are duplicates of another option (case-insensitive, trimmed)
 */
const getDuplicateOptionIndices = (opts) => {
  const duplicates = new Set();
  const seen = new Map(); // normalizedText -> firstIndex
  opts.forEach((opt, idx) => {
    const trimmed = opt.trim().toLowerCase();
    if (!trimmed) return;
    if (seen.has(trimmed)) {
      duplicates.add(idx);
      duplicates.add(seen.get(trimmed));
    } else {
      seen.set(trimmed, idx);
    }
  });
  return duplicates;
};

/**
 * Calculates ISO expiry string from preset or custom input
 */
const calculateExpiresAt = (preset, customValue) => {
  if (preset === 'none') return null;
  const now = new Date();
  if (preset === '1h') now.setHours(now.getHours() + 1);
  else if (preset === '1d') now.setDate(now.getDate() + 1);
  else if (preset === '1w') now.setDate(now.getDate() + 7);
  else if (preset === 'custom' && customValue) return new Date(customValue).toISOString();
  return now.toISOString();
};

/**
 * Helper to get local datetime string format for input min
 */
const getMinDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const CreatePollModal = ({ isOpen, onClose, chatId, currentUserId, onPollCreated, triggerRef }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowUserOptions, setAllowUserOptions] = useState(true); // Default ON
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiryPreset, setExpiryPreset] = useState('none');
  const [customExpiry, setCustomExpiry] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const dialogRef = useRef(null);
  const questionInputRef = useRef(null);
  const optionInputRefs = useRef([]);
  const bodyRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Form Reset
  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setAllowMultiple(false);
    setAllowUserOptions(true);
    setIsAnonymous(false);
    setExpiryPreset('none');
    setCustomExpiry('');
    setServerError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Focus management on open/close
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      requestAnimationFrame(() => {
        questionInputRef.current?.focus();
      });
    } else if (previousActiveElementRef.current) {
      try {
        if (triggerRef?.current) {
          triggerRef.current.focus();
        } else if (typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus();
        }
      } catch (e) {}
    }
  }, [isOpen, triggerRef]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Validation calculations
  const trimmedQuestion = question.trim();
  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const duplicateIndices = getDuplicateOptionIndices(options);

  // Determine first problem in priority order:
  // 1. "Add a question"
  // 2. "Add at least 2 options"
  // 3. "Options must be unique"
  // 4. "Pick a deadline date and time"
  let formProblem = '';
  if (!trimmedQuestion) {
    formProblem = 'Add a question';
  } else if (validOptions.length < 2) {
    formProblem = 'Add at least 2 options';
  } else if (duplicateIndices.size > 0) {
    formProblem = 'Options must be unique';
  } else if (expiryPreset === 'custom') {
    if (!customExpiry || isNaN(new Date(customExpiry).getTime()) || new Date(customExpiry) <= new Date()) {
      formProblem = 'Pick a deadline date and time';
    }
  }

  const isValid = !formProblem;

  // Handlers for Options
  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    const nextIndex = options.length;
    setOptions((prev) => [...prev, '']);
    setTimeout(() => {
      optionInputRefs.current[nextIndex]?.focus();
      if (bodyRef.current) {
        bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
      }
    }, 0);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value.slice(0, MAX_OPTION_CHARS);
    setOptions(updated);
    if (serverError) setServerError('');
  };

  const handleOptionKeyDown = (idx, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx < options.length - 1) {
        optionInputRefs.current[idx + 1]?.focus();
      } else {
        if (options[idx].trim() && options.length < MAX_OPTIONS) {
          handleAddOption();
        }
      }
    }
  };

  // Keyboard navigation for chips radiogroup
  const handleChipKeyDown = (e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % DEADLINE_OPTIONS.length;
      setExpiryPreset(DEADLINE_OPTIONS[nextIndex].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + DEADLINE_OPTIONS.length) % DEADLINE_OPTIONS.length;
      setExpiryPreset(DEADLINE_OPTIONS[prevIndex].value);
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isValid || loading) return;

    setLoading(true);
    setServerError('');

    try {
      const expiresAt = calculateExpiresAt(expiryPreset, customExpiry);
      const payload = {
        chatid: String(chatId),
        question: trimmedQuestion,
        allow_multiple: allowMultiple,
        allow_user_options: isAnonymous ? false : allowUserOptions,
        anonymous: isAnonymous,
        expires_at: expiresAt,
        options: validOptions
      };

      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': currentUserId,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Failed to create poll');
      }

      const resData = await res.json();

      onPollCreated({
        poll_id: resData.poll_id,
        question: trimmedQuestion,
        allow_multiple: allowMultiple,
        allow_user_options: isAnonymous ? false : allowUserOptions,
        anonymous: isAnonymous,
        expires_at: expiresAt,
        options: resData.options || validOptions.map((text, i) => ({ option_id: i + 100, text }))
      });

      resetForm();
      onClose();
    } catch (err) {
      console.error('[CreatePollModal] Error:', err);
      setServerError(err.message || 'Failed to create poll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="create-poll-sheet-overlay"
      onClick={handleClose}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <style>{`
        .create-poll-sheet-overlay {
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
          .create-poll-sheet-overlay {
            align-items: flex-end;
            justify-content: center;
            padding: 0;
          }
          .create-poll-dialog {
            width: 100%;
            border-radius: 20px 20px 0 0 !important;
            height: min(92vh, 720px) !important;
          }
          .create-poll-grab-handle {
            display: block !important;
          }
        }

        @media (min-width: 640px) {
          .create-poll-sheet-overlay {
            align-items: center;
            justify-content: center;
            padding: 16px;
          }
          .create-poll-dialog {
            width: 100%;
            max-width: 460px;
            border-radius: 20px !important;
            height: min(86vh, 720px) !important;
            margin: auto;
          }
          .create-poll-grab-handle {
            display: none !important;
          }
        }

        .create-poll-dialog {
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

        .poll-custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(128,128,128,.28) transparent;
        }
        .poll-custom-scrollbar:hover {
          scrollbar-color: rgba(128,128,128,.55) transparent;
        }
        .poll-custom-scrollbar::-webkit-scrollbar {
          width: 10px;
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

        .create-poll-input {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .create-poll-input:focus {
          border-color: var(--accent-color) !important;
          outline: none;
          box-shadow: 0 0 0 2px var(--accent-color);
        }
        .create-poll-input-error:focus {
          border-color: var(--danger-color) !important;
          outline: none;
          box-shadow: 0 0 0 2px var(--danger-color);
        }

        .create-poll-close-btn:hover {
          background-color: var(--bg-primary) !important;
        }
        .create-poll-icon-btn:hover {
          background-color: var(--bg-primary) !important;
        }

        button:focus-visible {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }
      `}</style>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="New poll"
        tabIndex={-1}
        className="create-poll-dialog"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* 1. Header (Never scrolls) */}
        <div style={{ flexShrink: 0 }}>
          {/* Grab Handle (Mobile Only) */}
          <div
            className="create-poll-grab-handle"
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: 'var(--border-color)',
              margin: '8px auto 0 auto'
            }}
          />

          {/* Title Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px 8px 16px'
            }}
          >
            <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
              New poll
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              className="create-poll-close-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s ease'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 2. Body (Scrolls) */}
        <div
          ref={bodyRef}
          className="poll-custom-scrollbar"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '4px 16px 16px 16px'
          }}
        >
          {/* Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              style={{
                border: '1px solid var(--danger-color)',
                background: 'var(--bg-primary)',
                color: 'var(--danger-color)',
                fontSize: '13px',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '12px'
              }}
            >
              {serverError}
            </div>
          )}

          {/* Question Field */}
          <div>
            <label
              htmlFor="poll-question-input"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '6px'
              }}
            >
              Question
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="poll-question-input"
                ref={questionInputRef}
                type="text"
                placeholder="Ask a question"
                value={question}
                maxLength={MAX_QUESTION_CHARS}
                onChange={(e) => {
                  setQuestion(e.target.value.slice(0, MAX_QUESTION_CHARS));
                  if (serverError) setServerError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    optionInputRefs.current[0]?.focus();
                  }
                }}
                className="create-poll-input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 12px',
                  paddingRight: '62px',
                  fontSize: '16px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  fontSize: '12px',
                  fontVariantNumeric: 'tabular-nums',
                  color: question.length >= 180 ? 'var(--warning-color)' : 'var(--text-secondary)',
                  transition: 'color 0.15s ease'
                }}
              >
                {question.length}/200
              </span>
            </div>
          </div>

          {/* Options Section */}
          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Options
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {options.length} of 20
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {options.map((opt, idx) => {
                const isDupe = duplicateIndices.has(idx);
                const isWarn = opt.length >= 22;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          ref={(el) => (optionInputRefs.current[idx] = el)}
                          type="text"
                          placeholder={`Option ${idx + 1}`}
                          aria-label={`Option ${idx + 1}`}
                          value={opt}
                          maxLength={MAX_OPTION_CHARS}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOptionKeyDown(idx, e)}
                          className={`create-poll-input ${isDupe ? 'create-poll-input-error' : ''}`}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '11px 12px',
                            paddingRight: '56px',
                            fontSize: '16px',
                            background: 'var(--bg-primary)',
                            border: isDupe ? '1px solid var(--danger-color)' : '1px solid var(--border-color)',
                            borderRadius: '10px',
                            color: 'var(--text-primary)',
                            outline: 'none'
                          }}
                        />
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            fontSize: '12px',
                            fontVariantNumeric: 'tabular-nums',
                            color: isWarn ? 'var(--warning-color)' : 'var(--text-secondary)',
                            transition: 'color 0.15s ease'
                          }}
                        >
                          {opt.length}/25
                        </span>
                      </div>

                      {options.length > 2 && (
                        <button
                          type="button"
                          aria-label={`Remove option ${idx + 1}`}
                          onClick={() => handleRemoveOption(idx)}
                          className="create-poll-icon-btn"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '50%',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {isDupe && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--danger-color)',
                          marginTop: '4px',
                          paddingLeft: '4px'
                        }}
                      >
                        Already added
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Option Button or Max Count Notice */}
            <div style={{ marginTop: '8px' }}>
              {options.length < MAX_OPTIONS ? (
                <button
                  type="button"
                  onClick={handleAddOption}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-color)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'inherit'
                  }}
                >
                  <Plus size={16} color="var(--accent-color)" />
                  Add option
                </button>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '6px 0' }}>
                  Maximum 20 options
                </div>
              )}
            </div>
          </div>

          {/* Settings Section */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Settings
            </div>

            <div
              style={{
                background: 'var(--bg-primary)',
                borderRadius: '14px',
                marginTop: '8px',
                overflow: 'hidden'
              }}
            >
              {/* Row 1: Allow Multiple Answers */}
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Allow multiple answers
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Voters can pick more than one option
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={allowMultiple}
                  aria-label="Allow multiple answers"
                  onClick={() => setAllowMultiple(!allowMultiple)}
                  style={{
                    width: '42px',
                    height: '26px',
                    borderRadius: '999px',
                    padding: '3px',
                    border: 'none',
                    background: allowMultiple ? 'var(--accent-gradient)' : 'rgba(128,128,128,.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    transition: 'background 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                      transform: allowMultiple ? 'translateX(16px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </button>
              </div>

              {/* Row 2: Allow Other Answer */}
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Allow Other answer
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {isAnonymous
                      ? 'Not available for anonymous polls'
                      : 'Members can write their own answer. It does not add an option.'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isAnonymous && allowUserOptions}
                  aria-label="Allow Other answer"
                  disabled={isAnonymous}
                  onClick={() => setAllowUserOptions(!allowUserOptions)}
                  style={{
                    width: '42px',
                    height: '26px',
                    borderRadius: '999px',
                    padding: '3px',
                    border: 'none',
                    background: (!isAnonymous && allowUserOptions)
                      ? 'var(--accent-gradient)'
                      : 'rgba(128,128,128,.4)',
                    opacity: isAnonymous ? 0.45 : 1,
                    cursor: isAnonymous ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    transition: 'background 0.2s ease, opacity 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                      transform: (!isAnonymous && allowUserOptions) ? 'translateX(16px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </button>
              </div>

              {/* Row 3: Anonymous Voting */}
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Anonymous voting
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Nobody can see who voted, not even you
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAnonymous}
                  aria-label="Anonymous voting"
                  onClick={() => {
                    const nextAnon = !isAnonymous;
                    setIsAnonymous(nextAnon);
                    if (nextAnon) setAllowUserOptions(false);
                  }}
                  style={{
                    width: '42px',
                    height: '26px',
                    borderRadius: '999px',
                    padding: '3px',
                    border: 'none',
                    background: isAnonymous ? 'var(--accent-gradient)' : 'rgba(128,128,128,.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    transition: 'background 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                      transform: isAnonymous ? 'translateX(16px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Deadline Section */}
          <div style={{ marginTop: '16px' }}>
            <div
              id="deadline-section-label"
              style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              Deadline
            </div>

            <div
              role="radiogroup"
              aria-labelledby="deadline-section-label"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '8px'
              }}
            >
              {DEADLINE_OPTIONS.map((opt, i) => {
                const isSelected = expiryPreset === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setExpiryPreset(opt.value);
                      if (serverError) setServerError('');
                    }}
                    onKeyDown={(e) => handleChipKeyDown(e, i)}
                    style={{
                      borderRadius: '999px',
                      padding: '6px 14px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-gradient)' : 'transparent',
                      color: isSelected ? '#fff' : 'var(--text-primary)',
                      border: isSelected ? '1px solid transparent' : '1px solid var(--border-color)',
                      transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease'
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Datetime Input */}
            {expiryPreset === 'custom' && (
              <input
                type="datetime-local"
                aria-label="Deadline date and time"
                value={customExpiry}
                min={getMinDateTimeString()}
                onChange={(e) => {
                  setCustomExpiry(e.target.value);
                  if (serverError) setServerError('');
                }}
                className="create-poll-input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: '8px',
                  padding: '11px 12px',
                  fontSize: '16px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            )}
          </div>
        </div>

        {/* 3. Footer (Never scrolls) */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--border-color)',
            padding: '10px 16px 14px 16px'
          }}
        >
          {/* Status Line: First problem in priority order */}
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              minHeight: '20px',
              textAlign: 'center',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {formProblem}
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            style={{
              width: '100%',
              height: '46px',
              borderRadius: '12px',
              background: 'var(--accent-gradient)',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              border: 'none',
              opacity: (!isValid || loading) ? 0.45 : 1,
              cursor: (!isValid || loading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s ease'
            }}
          >
            {loading ? 'Creating poll...' : 'Create poll'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CreatePollModal;
