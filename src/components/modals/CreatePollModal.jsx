import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2, Clock, Check, Lock, Users } from 'lucide-react';
import { API } from '../../service/UserAuth';

/**
 * CreatePollModal Component
 * Interactive modal allowing users to construct native polls with:
 * - Question string
 * - Multiple choice options (minimum 2)
 * - Single/Multi-choice toggle (allow_multiple)
 * - Custom options toggle (allow_user_options)
 * - Anonymous voting toggle (anonymous)
 * - Expiry deadline selector (expires_at)
 */
const CreatePollModal = ({ isOpen, onClose, chatId, currentUserId, onPollCreated }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowUserOptions, setAllowUserOptions] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiryPreset, setExpiryPreset] = useState('none'); // 'none', '1h', '1d', '1w', 'custom'
  const [customExpiry, setCustomExpiry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const calculateExpiresAt = () => {
    if (expiryPreset === 'none') return null;
    const now = new Date();
    if (expiryPreset === '1h') now.setHours(now.getHours() + 1);
    else if (expiryPreset === '1d') now.setDate(now.getDate() + 1);
    else if (expiryPreset === '1w') now.setDate(now.getDate() + 7);
    else if (expiryPreset === 'custom' && customExpiry) return new Date(customExpiry).toISOString();
    return now.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError('Please enter a question for your poll.');
      return;
    }

    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      setError('Please provide at least 2 non-empty options.');
      return;
    }

    setLoading(true);

    try {
      const expiresAt = calculateExpiresAt();
      const payload = {
        chatid: String(chatId),
        question: trimmedQuestion,
        allow_multiple: allowMultiple,
        allow_user_options: allowUserOptions,
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
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
        allow_user_options: allowUserOptions,
        anonymous: isAnonymous,
        expires_at: expiresAt,
        options: resData.options || validOptions.map((text, i) => ({ option_id: i + 100, text }))
      });

      // Reset state
      setQuestion('');
      setOptions(['', '']);
      setAllowMultiple(false);
      setAllowUserOptions(true);
      setIsAnonymous(false);
      setExpiryPreset('none');
      onClose();
    } catch (err) {
      console.error('[CreatePollModal] Error:', err);
      setError(err.message || 'Failed to create poll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={20} color="var(--accent-color, #3b82f6)" />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary, #ffffff)', margin: 0 }}>
              Create Poll
            </h3>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(85vh - 70px)' }} className="hide-scrollbar">
          
          {error && (
            <div style={errorBannerStyle}>
              {error}
            </div>
          )}

          {/* Question Input */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Question</label>
            <input
              type="text"
              placeholder="Ask a question..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              style={inputStyle}
              maxLength={200}
              required
            />
          </div>

          {/* Options List */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Options (minimum 2)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    maxLength={100}
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      style={deleteButtonStyle}
                      title="Remove Option"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                style={addOptionButtonStyle}
              >
                <Plus size={16} /> Add Option
              </button>
            )}
          </div>

          {/* Settings Toggles */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Poll Settings</label>
            
            <div style={toggleRowStyle}>
              <div>
                <div style={toggleTitleStyle}>Allow Multiple Answers</div>
                <div style={toggleDescStyle}>Voters can select more than one option</div>
              </div>
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={e => setAllowMultiple(e.target.checked)}
                style={checkboxStyle}
              />
            </div>

            <div style={toggleRowStyle}>
              <div>
                <div style={toggleTitleStyle}>Allow User-Added Options</div>
                <div style={toggleDescStyle}>Participants can add custom choices ("others")</div>
              </div>
              <input
                type="checkbox"
                checked={allowUserOptions}
                onChange={e => setAllowUserOptions(e.target.checked)}
                style={checkboxStyle}
              />
            </div>

            <div style={toggleRowStyle}>
              <div>
                <div style={toggleTitleStyle}>Anonymous Voting</div>
                <div style={toggleDescStyle}>Hide voter names/avatars from results</div>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                style={checkboxStyle}
              />
            </div>
          </div>

          {/* Expiry Selector */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Poll Deadline</label>
            <select
              value={expiryPreset}
              onChange={e => setExpiryPreset(e.target.value)}
              style={selectStyle}
            >
              <option value="none">No deadline (Always open)</option>
              <option value="1h">1 Hour</option>
              <option value="1d">1 Day (24 Hours)</option>
              <option value="1w">1 Week</option>
              <option value="custom">Custom Date & Time</option>
            </select>

            {expiryPreset === 'custom' && (
              <input
                type="datetime-local"
                value={customExpiry}
                onChange={e => setCustomExpiry(e.target.value)}
                style={{ ...inputStyle, marginTop: '8px' }}
                required
              />
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...submitButtonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating Poll...' : 'Create Poll'}
          </button>

        </form>

      </div>
    </div>
  );
};

// ── Styles ──
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px'
};

const modalStyle = {
  width: '100%',
  maxWidth: '460px',
  maxHeight: '85vh',
  backgroundColor: 'var(--bg-secondary, #111b21)',
  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  borderRadius: '20px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  animation: 'fadeIn 0.2s ease-out'
};

const headerStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: 'var(--bg-card, #1e293b)'
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary, #94a3b8)',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: '700',
  color: 'var(--text-secondary, #94a3b8)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  borderRadius: '10px',
  color: 'var(--text-primary, #ffffff)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box'
};

const selectStyle = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  borderRadius: '10px',
  color: 'var(--text-primary, #ffffff)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box'
};

const deleteButtonStyle = {
  background: 'rgba(239, 68, 68, 0.15)',
  border: 'none',
  color: '#ef4444',
  borderRadius: '10px',
  padding: '10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const addOptionButtonStyle = {
  marginTop: '4px',
  padding: '8px 12px',
  background: 'rgba(59, 130, 246, 0.1)',
  border: '1px dashed rgba(59, 130, 246, 0.3)',
  borderRadius: '10px',
  color: '#3b82f6',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px'
};

const toggleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '12px',
  marginBottom: '6px'
};

const toggleTitleStyle = {
  fontSize: '13px',
  fontWeight: '700',
  color: 'var(--text-primary, #ffffff)'
};

const toggleDescStyle = {
  fontSize: '11px',
  color: 'var(--text-secondary, #94a3b8)',
  marginTop: '2px'
};

const checkboxStyle = {
  width: '18px',
  height: '18px',
  accentColor: '#3b82f6',
  cursor: 'pointer'
};

const submitButtonStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: 'var(--accent-color, #3b82f6)',
  border: 'none',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '800',
  marginTop: '10px'
};

const errorBannerStyle = {
  padding: '10px 14px',
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: '10px',
  color: '#f87171',
  fontSize: '13px',
  fontWeight: '600'
};

export default CreatePollModal;
