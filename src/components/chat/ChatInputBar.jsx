import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../common/ToastProvider';
import { lazyModal } from '../../utils/lazyModal';
import {
  ArrowUp,
  ChevronDown,
  Clock,
  Copy,
  Filter,
  Forward,
  Info,
  Loader2,
  Mic,
  Reply,
  Send,
  Share2,
  Smile,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import MediaUploadButton from '../MediaUploadButton';
import CachedMediaImage from './CachedMediaImage';

const EmojiPicker = lazyModal(() => import('emoji-picker-react'));

const formatRecordingTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ChatInputBar = forwardRef(function ChatInputBar({
  isMobile,
  theme,
  chat,
  chatid,
  isSimulation,
  SIMULATION_ID,
  activeSpace,
  spaceStore,
  inputRef,
  onDraftChange,
  notifyActivity,
  // Selection bar
  isSelectionMode,
  selectedMessages,
  clearSelection,
  handleCancelUploads,
  reply,
  delet,
  forward,
  toggleStar,
  handleCopySelected,
  onOpenStatusInfo,
  handleShareSelected,
  isSharingMedia,
  showInputBox,
  toggleInputBox,
  sendReaction,
  // Filter banner
  filterMember,
  onClearFilter,
  // Reply & pulse banners
  showreplytomsg,
  repliedto,
  cancelreply,
  attachedPulse,
  onDetachPulse,
  // Reply notify banner
  showReplyNotifyBanner,
  handleEnableReplyNotify,
  handleDismissReplyNotifyBanner,
  // Audio recording
  isRecording,
  recordingTime,
  startRecording,
  stopRecording,
  // Mentions & composer actions
  chatMembers,
  onSendText,
  sendMediaMessage,
  setPendingMediaFile,
  handleCameraClick,
  onOpenPollModal,
  onOpenAttachPulseModal,
  onOpenScheduleModal,
  // Queue pill & modals
  queuedCount,
  flushQueuedTextMessages,
  showMediaWaitModal,
  pendingTextMessage,
  onCloseMediaWaitModal,
  onWaitForMedia,
  onSendAnywayMedia,
  selectedQueuedMsg,
  onCloseQueuedMsg,
  onSendQueuedNow,
  onDeleteQueued,
  // Classroom faculty assignment
  postAssignment,
}, ref) {
  const toast = useToast();
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const [emojiPickerPos, setEmojiPickerPos] = useState({ bottom: 0, left: 0 });

  // Mentions state isolated here so typing/mention autocomplete never re-renders ChatMessageList
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [mentionStartIndex, setMentionStartIndex] = useState(null);
  const [mentionsPos, setMentionsPos] = useState({ bottom: 0, left: 0 });
  const [activeMentions, setActiveMentions] = useState([]);

  // Custom reaction text inside selection action bar
  const [customReactionText, setCustomReactionText] = useState('');

  useEffect(() => {
    if (!isSelectionMode || selectedMessages.size !== 1) {
      setCustomReactionText('');
    }
  }, [isSelectionMode, selectedMessages]);

  useImperativeHandle(ref, () => ({
    setDraft: (nextVal) => {
      setInput(nextVal);
      onDraftChange?.(nextVal);
    },
    clearDraft: () => {
      setInput('');
      setActiveMentions([]);
      setShowEmojiPicker(false);
      setShowMentions(false);
      onDraftChange?.('');
    },
    getDraft: () => input,
  }), [input, onDraftChange]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const close = (e) => {
      if (
        !emojiButtonRef.current?.contains(e.target) &&
        !emojiPickerRef.current?.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [showEmojiPicker]);

  const toggleEmojiPicker = (e) => {
    e?.stopPropagation();
    if (!showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPickerPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(8, rect.left - 20),
      });
      setShowEmojiPicker(true);
    } else {
      setShowEmojiPicker(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    onDraftChange?.(val);
    notifyActivity('typing');

    if (chat?.type === 'group' || chat?.type === 'classroom' || chat?.type === 'room') {
      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = val.substring(0, cursorPosition);
      const match = textBeforeCursor.match(/(?:^|\s)@([A-Za-z0-9_ \-.]{0,30})$/);
      if (match) {
        setMentionStartIndex(cursorPosition - match[1].length - 1);
        const query = match[1].toLowerCase();
        setMentionQuery(query);
        const filtered = (chatMembers || []).filter(m =>
          (m.chatName || m.userName || m.username || '').toLowerCase().includes(query)
        );
        setFilteredMembers(filtered);

        if (inputRef?.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setMentionsPos({
            bottom: window.innerHeight - rect.top + 16,
            left: Math.max(8, rect.left - 4),
          });
        }
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    }
  };

  const handleSelectMention = (member) => {
    if (mentionStartIndex !== null) {
      const beforeMention = input.substring(0, mentionStartIndex);
      const afterMention = input.substring(mentionStartIndex + mentionQuery.length + 1);
      const name = member.chatName || member.userName || member.username;
      const mentionText = `@${name}`;
      const newVal = beforeMention + mentionText + ' ' + afterMention;
      setInput(newVal);
      onDraftChange?.(newVal);

      const userId = member.userId || member.userid || member.id;
      setActiveMentions(prev => [...prev, { id: userId, name }]);

      setTimeout(() => {
        if (inputRef?.current) {
          const newPos = mentionStartIndex + mentionText.length + 1;
          inputRef.current.setSelectionRange(newPos, newPos);
          inputRef.current.focus();
        }
      }, 0);
    }
    setShowMentions(false);
  };

  const triggerSend = () => {
    if (!input.trim() && !attachedPulse) return;
    onSendText(input, [...activeMentions]);
  };

  const renderInnerInputBar = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      position: 'sticky', bottom: 0,
      width: '100%', boxSizing: 'border-box',
      zIndex: 100,
      overflow: 'visible',
    }}>
      {/* Reply Notify Banner (compact banner above input box) */}
      {showReplyNotifyBanner && (
        <div style={{
          padding: isMobile ? '6px 8px 2px 8px' : '8px 20px 2px 20px',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: isMobile ? '4px 10px 4px 14px' : '5px 14px 5px 18px',
            minHeight: '34px',
            boxSizing: 'border-box',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            animation: 'muFadeIn 0.2s ease-out',
          }}>
            <span style={{
              fontSize: isMobile ? '12px' : '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              Want to be notified when you get a reply?
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleEnableReplyNotify}
                style={{
                  background: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '4px 12px',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                  lineHeight: '1.2',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--border-color)'}
              >
                Notify
              </button>
              <button
                type="button"
                onClick={handleDismissReplyNotifyBanner}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger-color)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  lineHeight: 1,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--danger-tint)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Dismiss"
                aria-label="Close"
              >
                <X size={16} color="var(--danger-color)" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Input Controls Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '6px' : '10px',
        padding: isMobile ? '6px 10px 8px 8px' : '8px 20px 12px 20px',
        paddingTop: showReplyNotifyBanner ? '2px' : (isMobile ? '8px' : '12px'),
        paddingBottom: isMobile ? 'max(8px, env(safe-area-inset-bottom))' : '12px',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Emoji picker — PORTAL position to escape stacking contexts and backdrop filters */}
        {showEmojiPicker && createPortal(
          <div
            ref={emojiPickerRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: `${emojiPickerPos.bottom}px`,
              left: `${emojiPickerPos.left}px`,
              zIndex: 999999,
            }}
          >
            <EmojiPicker
              __onLoadError={() => setShowEmojiPicker(false)}
              theme={theme === 'light' ? 'light' : 'dark'}
              onEmojiClick={(d) => {
                setInput(p => {
                  const next = p + d.emoji;
                  onDraftChange?.(next);
                  return next;
                });
                inputRef?.current?.focus();
                notifyActivity('typing');
              }}
              height={360}
              width={310}
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
            />
          </div>,
          document.body
        )}

        {/* Dynamic Input Bar (Recording UI or Text UI) */}
        {isRecording ? (
          <div style={{
            flex: 1,
            minWidth: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--danger-tint)',
            border: '1px solid var(--danger-tint-border)',
            borderRadius: '24px',
            padding: '2px 14px',
            minHeight: '44px',
            animation: 'muFadeIn 0.2s ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '10px', height: '10px', backgroundColor: 'var(--danger-color)',
                borderRadius: '50%', animation: 'recordBlink 1s infinite',
              }} />
              <span style={{ color: 'var(--danger-color)', fontSize: '14.5px', fontWeight: '600', fontFamily: 'monospace' }}>
                {formatRecordingTime(recordingTime)}
              </span>
            </div>

            <button
              onClick={() => stopRecording(true)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--danger-color)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                padding: '6px',
              }}
              title="Cancel Recording"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : (
          <div style={{
            flex: 1,
            minWidth: 0,
            display: 'flex', alignItems: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: isMobile ? '2px 6px 2px 4px' : '2px 8px 2px 6px',
            minHeight: '44px',
            transition: 'all 0.2s ease',
          }}>
            {/* Emoji button */}
            <div
              ref={emojiButtonRef}
              onClick={toggleEmojiPicker}
              title="Emoji"
              style={{
                cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: '44px', minHeight: '44px', width: isMobile ? '36px' : '40px', height: isMobile ? '36px' : '40px', borderRadius: '50%',
                color: showEmojiPicker ? 'var(--accent-color)' : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Smile size={isMobile ? 18 : 20} strokeWidth={2.5} />
            </div>

            {/* Attach button */}
            <MediaUploadButton
              onUploadComplete={sendMediaMessage}
              onFileSelect={setPendingMediaFile}
              onError={err => toast.error('Upload failed: ' + err.message)}
              onCameraClick={handleCameraClick}
              onPollClick={onOpenPollModal}
              onPulseClick={onOpenAttachPulseModal}
              onScheduleClick={onOpenScheduleModal}
              style={{
                flexShrink: 0,
                color: 'var(--text-secondary)',
                width: isMobile ? '32px' : '36px', height: isMobile ? '32px' : '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
              }}
            />

            {/* Mentions Dropdown */}
            {showMentions && filteredMembers.length > 0 && createPortal(
              <div style={{
                position: 'fixed',
                bottom: `${mentionsPos.bottom}px`,
                left: `${mentionsPos.left}px`,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '8px',
                width: '240px',
                maxHeight: '260px',
                overflowY: 'auto',
                boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
                zIndex: 999999,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 0.2s ease-out',
              }}>
                {filteredMembers.map((member, i) => (
                  <button
                    key={member.id || member.userId || member.userid}
                    onClick={() => handleSelectMention(member)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      width: '100%', padding: '10px 14px',
                      background: 'transparent', border: 'none',
                      borderRadius: '10px', cursor: 'pointer',
                      color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500',
                      textAlign: 'left',
                      marginBottom: i < filteredMembers.length - 1 ? '2px' : 0,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      background: 'var(--accent-tint)',
                      border: '1.5px solid var(--accent-tint)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent-text)', flexShrink: 0, fontSize: '14px', fontWeight: 'bold',
                    }}>
                      {(member.chatName || member.userName || member.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.chatName || member.userName || member.username}
                    </div>
                  </button>
                ))}
              </div>,
              document.body
            )}

            {/* Text input */}
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) triggerSend();
                if (e.key === 'Escape') setShowEmojiPicker(false);
              }}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: '16px', color: 'var(--text-primary)',
                padding: isMobile ? '8px 8px 8px 4px' : '10px 10px 10px 6px', minWidth: 0,
              }}
            />
          </div>
        )}

        {/* Send or Mic button */}
        <button
          onClick={isRecording ? () => stopRecording(false) : (input.trim() ? triggerSend : startRecording)}
          style={{
            background: isRecording ? 'var(--success-color)' : (input.trim() ? 'var(--accent-text)' : 'var(--success-color)'),
            color: 'white',
            border: 'none',
            padding: 0,
            borderRadius: '50%',
            width: isMobile ? '40px' : '44px',
            height: isMobile ? '40px' : '44px',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isRecording ? 'scale(1.08)' : 'scale(1)',
            transformOrigin: 'center center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            marginRight: isMobile ? '2px' : '0',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = isRecording ? 'scale(1.12)' : 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = isRecording ? 'scale(1.08)' : 'scale(1)'}
          title={isRecording ? 'Send Voice Note' : (input.trim() ? 'Send Message' : 'Record Voice Note')}
        >
          {isRecording ? <ArrowUp size={isMobile ? 22 : 24} /> : (input.trim() ? <ArrowUp size={isMobile ? 22 : 24} /> : <Mic size={isMobile ? 18 : 20} />)}
        </button>
      </div>

      {/* Queued Messages Status Pill */}
      {queuedCount > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '16px', right: '16px', marginBottom: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px',
          backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '14px', fontSize: '13px', color: 'var(--warning-color)', backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)', zIndex: 101,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
            <Clock size={15} /> {queuedCount} message{queuedCount > 1 ? 's' : ''} waiting for media upload...
          </span>
          <button
            type="button"
            onClick={flushQueuedTextMessages}
            style={{
              background: 'var(--warning-color)', border: 'none', borderRadius: '8px', color: '#000',
              padding: '4px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
            }}
          >
            Send Now
          </button>
        </div>
      )}

      {/* Media Upload Options Modal (Wait for Media vs Send Anyway) */}
      {showMediaWaitModal && pendingTextMessage && createPortal(
        <div
          onClick={onCloseMediaWaitModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: isMobile ? '18px 16px' : '24px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'muFadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--warning-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Clock size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Media Uploading in Progress
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  A media file is currently uploading. How would you like to send this message?
                </p>
              </div>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '14px',
              color: 'var(--text-primary)',
              wordBreak: 'break-word',
              maxHeight: '100px',
              overflowY: 'auto',
            }}>
              &ldquo;{pendingTextMessage.text}&rdquo;
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onWaitForMedia}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '14px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1.5px solid var(--border-color)',
                  color: 'var(--text-primary)', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: 'var(--accent-tint)', color: 'var(--accent-text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Clock size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14.5px' }}>⏳ Wait for Media</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Hold message until media upload completes to preserve exact order.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onSendAnywayMedia}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '14px',
                  backgroundColor: 'var(--accent-color)',
                  border: 'none',
                  color: '#ffffff', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s ease',
                  boxShadow: '0 4px 14px color-mix(in srgb, var(--accent-solid) 45%, transparent)',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Send size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14.5px' }}>🚀 Send Anyway</div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Bypass media upload and send text message right now.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Selected Queued Message Action Modal (Send Now vs Delete) */}
      {selectedQueuedMsg && createPortal(
        <div
          onClick={onCloseQueuedMsg}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: isMobile ? '18px 16px' : '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'muFadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--warning-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Clock size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Queued Message Options
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  This message is currently waiting for media upload to finish.
                </p>
              </div>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              fontSize: '14px',
              color: 'var(--text-primary)',
              wordBreak: 'break-word',
              maxHeight: '100px',
              overflowY: 'auto',
            }}>
              &ldquo;{selectedQueuedMsg.content || selectedQueuedMsg.text}&rdquo;
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => onSendQueuedNow(selectedQueuedMsg)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '14px',
                  backgroundColor: 'var(--accent-color)',
                  border: 'none',
                  color: '#ffffff', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s ease',
                  boxShadow: '0 4px 14px color-mix(in srgb, var(--accent-solid) 45%, transparent)',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Send size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14.5px' }}>🚀 Send Now (Send Anyway)</div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Release from queue and send over WebSocket immediately.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onDeleteQueued(selectedQueuedMsg)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '14px',
                  backgroundColor: 'var(--danger-tint)',
                  border: '1px solid var(--danger-tint)',
                  color: 'var(--danger-color)', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: 'var(--danger-tint)', color: 'var(--danger-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Trash2 size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14.5px' }}>🗑️ Delete Message</div>
                  <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
                    Cancel this message and remove it from chat.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* Selection Menu - Shows when messages are selected */}
      {isSelectionMode && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-card)',
            border: isMobile ? 'none' : '1px solid var(--border-color)',
            borderTop: '2px solid var(--accent-color)',
            width: isMobile ? '100%' : 'calc(100% - 32px)',
            maxWidth: isMobile ? '100%' : '600px',
            margin: isMobile ? '0' : '0 auto 12px auto',
            borderRadius: isMobile ? '0' : '16px',
            boxShadow: isMobile ? 'none' : '0 12px 32px rgba(0, 0, 0, 0.35)',
            boxSizing: 'border-box',
            backdropFilter: 'var(--glass-effect)',
            zIndex: 20,
          }}
        >
          {/* Row 1: Count + Cancel */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '8px 16px' : '10px 16px',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                color: 'var(--accent-color)',
                fontSize: '14px',
                fontWeight: '700',
                background: 'var(--nav-active-bg)',
                padding: '4px 12px',
                borderRadius: '12px',
                minWidth: '28px',
                textAlign: 'center',
                border: '1px solid var(--border-color)',
              }}>
                {selectedMessages.size}
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }}>
                selected
              </span>
            </div>
            <button
              onClick={clearSelection}
              style={{
                background: 'var(--danger-tint)',
                color: 'var(--danger-color)',
                border: '1px solid var(--danger-tint-border)',
                borderRadius: '20px',
                padding: '5px 14px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '700' }}>✕</span> Cancel
            </button>
          </div>

          {/* Row 2: Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'space-around' : 'center',
            flexWrap: 'wrap',
            padding: isMobile ? '6px 4px' : '10px 16px',
            gap: isMobile ? '4px' : '8px',
          }}>
            {(() => {
              const items = Array.from(selectedMessages);
              const anyPending = items.some(m => !m.msgid || m.status === 'uploading' || m.status === 'failed' || m.isOptimistic);

              if (anyPending) {
                return (
                  <button
                    onClick={handleCancelUploads}
                    style={{
                      background: 'var(--danger-tint)',
                      color: 'var(--danger-color)',
                      border: '1px solid var(--danger-tint-border)',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '18px', fontWeight: '700', marginRight: '8px' }}>✕</span>
                    Cancel Upload
                  </button>
                );
              }

              const actionBtnStyle = (color = 'var(--accent-color)') => ({
                background: 'var(--bg-hover)',
                color: color || 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: isMobile ? '8px 10px' : '8px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? '3px' : '6px',
                borderRadius: '10px',
                flex: isMobile ? 1 : 'none',
                minWidth: isMobile ? 0 : 'auto',
                transition: 'all 0.15s ease',
              });

              const labelStyle = {
                fontSize: isMobile ? '10px' : '12px',
                fontWeight: '500',
                color: 'inherit',
                whiteSpace: 'nowrap',
              };

              return (
                <>
                  {selectedMessages.size === 1 && (
                    <button onClick={reply} style={actionBtnStyle()}>
                      <Reply size={isMobile ? 19 : 16} />
                      <span style={labelStyle}>Reply</span>
                    </button>
                  )}

                  <button onClick={delet} style={actionBtnStyle('var(--danger-color)')}>
                    <Trash2 size={isMobile ? 19 : 16} />
                    <span style={labelStyle}>Delete</span>
                  </button>

                  <button onClick={forward} style={actionBtnStyle()}>
                    <Forward size={isMobile ? 19 : 16} />
                    <span style={labelStyle}>Forward</span>
                  </button>

                  {selectedMessages.size === 1 && (
                    <button
                      onClick={(e) => {
                        const msg = Array.from(selectedMessages)[0];
                        toggleStar(e, msg);
                        clearSelection();
                      }}
                      style={actionBtnStyle(items[0]?.isStarred ? 'var(--warning-color)' : 'var(--accent-color)')}
                    >
                      <Star size={isMobile ? 19 : 16} fill={items[0]?.isStarred ? 'var(--warning-color)' : 'none'} />
                      <span style={labelStyle}>{items[0]?.isStarred ? 'Unstar' : 'Star'}</span>
                    </button>
                  )}

                  {selectedMessages.size === 1 && items[0]?.type === 'text' && (
                    <button onClick={handleCopySelected} style={actionBtnStyle()} title="Copy Text">
                      <Copy size={isMobile ? 19 : 16} />
                      <span style={labelStyle}>Copy</span>
                    </button>
                  )}

                  {selectedMessages.size === 1 && (
                    <button
                      onClick={() => {
                        const msg = items[0] || Array.from(selectedMessages)[0];
                        onOpenStatusInfo(msg);
                      }}
                      style={actionBtnStyle()}
                      title="Message Info"
                    >
                      <Info size={isMobile ? 19 : 16} />
                      <span style={labelStyle}>Info</span>
                    </button>
                  )}

                  <button
                    onClick={handleShareSelected}
                    disabled={isSharingMedia}
                    style={actionBtnStyle(isSharingMedia ? 'var(--text-muted)' : 'var(--accent-color)')}
                    title="Share Media"
                  >
                    {isSharingMedia ? <Loader2 size={isMobile ? 19 : 16} className="animate-spin" /> : <Share2 size={isMobile ? 19 : 16} />}
                    <span style={labelStyle}>Share</span>
                  </button>

                  <button
                    onClick={toggleInputBox}
                    style={{
                      ...actionBtnStyle(),
                      background: showInputBox ? 'var(--nav-active-bg)' : 'var(--bg-hover)',
                    }}
                  >
                    <ChevronDown
                      size={isMobile ? 19 : 16}
                      style={{ transform: showInputBox ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }}
                    />
                    <span style={labelStyle}>{showInputBox ? 'Hide' : 'Show'}</span>
                  </button>
                </>
              );
            })()}
          </div>

          {/* Row 3: Reaction Panel */}
          {selectedMessages.size === 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              padding: '10px 14px',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
              borderBottomLeftRadius: isMobile ? '0' : '16px',
              borderBottomRightRadius: isMobile ? '0' : '16px',
              gap: isMobile ? '8px' : '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      const msg = Array.from(selectedMessages)[0];
                      sendReaction(msg, emoji);
                      clearSelection();
                    }}
                    style={{
                      background: 'none', border: 'none', fontSize: isMobile ? '22px' : '24px',
                      cursor: 'pointer', transition: 'transform 0.15s ease', padding: '4px',
                      flexShrink: 0, lineHeight: 1,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--accent-color)',
                borderRadius: '999px',
                padding: '4px 6px 4px 12px',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}>
                <input
                  type="text"
                  maxLength={15}
                  value={customReactionText}
                  onChange={e => setCustomReactionText(e.target.value.slice(0, 15))}
                  placeholder="Text reaction..."
                  style={{
                    width: isMobile ? '115px' : '135px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    lineHeight: 1.2,
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customReactionText.trim()) {
                      const msg = Array.from(selectedMessages)[0];
                      sendReaction(msg, customReactionText.trim().slice(0, 15));
                      clearSelection();
                    }
                  }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', userSelect: 'none' }}>
                  {customReactionText.length}/15
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (customReactionText.trim()) {
                      const msg = Array.from(selectedMessages)[0];
                      sendReaction(msg, customReactionText.trim().slice(0, 15));
                      clearSelection();
                    }
                  }}
                  style={{
                    background: customReactionText.trim() ? 'var(--accent-gradient)' : 'var(--bg-card)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: customReactionText.trim() ? 'pointer' : 'default',
                    opacity: customReactionText.trim() ? 1 : 0.5,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {filterMember && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: '500',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--accent-color)" />
            <span>Filtering messages by <strong style={{ color: 'var(--accent-color)' }}>{filterMember.userName || filterMember.name}</strong></span>
          </div>
          <button
            onClick={onClearFilter}
            style={{
              background: 'var(--danger-tint)',
              color: 'var(--danger-color)',
              border: '1px solid var(--danger-tint-border)',
              borderRadius: '16px',
              padding: '3px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>✕</span> Exit Filter
          </button>
        </div>
      )}

      {/* Input Box Section - Animated wrapper */}
      <div
        style={{
          maxHeight: showInputBox ? '500px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' }}>
          {showreplytomsg && (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderLeft: '4px solid var(--accent-color)',
                border: '1px solid var(--border-color)',
                padding: '6px 10px',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--accent-color)' }}>
                  {repliedto.status === null ? repliedto.sendername : 'You'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', wordWrap: 'break-word' }}>
                  {repliedto.type == 'text' && repliedto.content}
                  {repliedto.type == 'image' && '📷 Photo'}
                  {repliedto.type == 'video' && '🎥 Video'}
                  {repliedto.type == 'audio' && '🎤 Audio'}
                  {repliedto.type == 'file' && '📄 Document'}
                  {repliedto.type == 'assignment' && '📚 Assignment'}
                  {(repliedto.type == 'poll' || Boolean(repliedto.poll) || (typeof repliedto.content === 'string' && repliedto.content.trim().startsWith('{"poll_id"'))) && '📊 Poll'}
                </div>
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ width: '20px', height: '40px', overflow: 'hidden', position: 'relative' }}>
                  {repliedto.type == 'image' && (
                    <CachedMediaImage
                      mediaId={repliedto.content}
                      optimisticUrl={repliedto.optimisticThumbUrl || repliedto.optimisticUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <button
                  onClick={cancelreply}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger-color)',
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {attachedPulse && (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderLeft: '4px solid #ec4899',
                border: '1px solid var(--border-color)',
                padding: '8px 12px',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={18} color="#ec4899" />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#ec4899' }}>
                    Tagging Pulse by {attachedPulse.pulse?.userName || attachedPulse.pulse?.user_name || 'User'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {attachedPulse.pulse?.type === 'text'
                      ? attachedPulse.pulse?.content
                      : (attachedPulse.pulse?.content || `${attachedPulse.pulse?.type?.toUpperCase() || 'PULSE'} Story`)}
                    {attachedPulse.targetSpaceId !== undefined && (
                      <span style={{ marginLeft: '8px', opacity: 0.85, fontWeight: '600' }}>
                        • 📍 Space: {spaceStore.getSpaceName(chatid, attachedPulse.targetSpaceId)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onDetachPulse}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger-color)',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
                title="Detach pulse"
              >
                ✕
              </button>
            </div>
          )}

          {!isSimulation && chatid !== SIMULATION_ID && (chatid === 'BROADCAST_SYSTEM' || chat?.type === 'broadcast') ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 20px',
              backgroundColor: 'var(--bg-card)',
              borderTop: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: '500',
              gap: '8px',
            }}>
              <span style={{ fontSize: '16px' }}>📢</span>
              <span>This is an official read-only broadcast channel.</span>
            </div>
          ) : ((chat.status === 'allowed' || chat.type === 'room' || chat.type === 'direct' || !chat.type) && chat.status !== 'removed' && chat.status !== 'left') ? (
            chat.type === 'classroom' ? (
              activeSpace !== 0 && activeSpace !== 1 ? (
                renderInnerInputBar()
              ) : chat.role === 'faculty' ? (
                activeSpace === 1 ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '10px',
                      background: 'var(--bg-card)',
                      borderTop: '1px solid #333',
                      position: 'sticky',
                      bottom: 0,
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <button
                      style={{
                        background: 'var(--success-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '10px 24px',
                        cursor: 'pointer',
                        fontSize: '15px',
                      }}
                      onClick={postAssignment}
                    >
                      Post an Assignment
                    </button>
                  </div>
                ) : (
                  renderInnerInputBar()
                )
              ) : (
                <div
                  style={{
                    padding: '10px',
                    background: 'var(--bg-card)',
                    color: '#aaa',
                    textAlign: 'center',
                    borderTop: '1px solid #333',
                    position: 'sticky',
                    bottom: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    fontStyle: 'italic',
                  }}
                >
                  You are a student
                </div>
              )
            ) : (
              renderInnerInputBar()
            )
          ) : (
            <div
              style={{
                padding: '10px',
                background: 'var(--bg-card)',
                color: '#aaa',
                textAlign: 'center',
                borderTop: '1px solid #333',
                position: 'sticky',
                bottom: 0,
                width: '100%',
                boxSizing: 'border-box',
                fontStyle: 'italic',
              }}
            >
              You can&apos;t Chat in this conversation
              {chat.status === 'removed' && ' - You were removed'}
              {chat.status === 'left' && ' - You left'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ChatInputBar;
