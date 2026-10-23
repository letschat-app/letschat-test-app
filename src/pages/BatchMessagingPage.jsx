import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Settings2, Info, Layers, ChevronDown, ChevronUp, 
  Search, Check, X, Users, History, XCircle
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Avatar from '../components/chat/Avatar';
import { isVerifiedChat, VerifiedBadge } from './ChatNames';
import messageStore from './MessageStore';
import { sendSafe } from '../service/Websocket';
import { API } from '../service/UserAuth';
import { uploadMedia, getFileCategory } from '../service/MediaUploader';
import { saveBlobToCache } from '../service/MediaCache';
import { getSavedBatches, deleteBatch } from '../service/BatchMessageService';

import CreateBatchModal from '../components/batch/CreateBatchModal';
import ManageBatchesModal from '../components/batch/ManageBatchesModal';
import EditBatchModal from '../components/batch/EditBatchModal';
import DeleteBatchModal from '../components/batch/DeleteBatchModal';
import LearnMoreModal from '../components/batch/LearnMoreModal';
import SelectedRecipientsModal from '../components/batch/SelectedRecipientsModal';
import BatchMessageComposer from '../components/batch/BatchMessageComposer';

function getCurrentLocalDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export default function BatchMessagingPage() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userid');
  const myDisplayName = localStorage.getItem('username') || userId;

  // Chats state
  const [allChats, setAllChats] = useState([]);
  const [chatsMap, setChatsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Saved Batches state
  const [savedBatches, setSavedBatches] = useState([]);
  const [expandedBatchIds, setExpandedBatchIds] = useState(new Set());

  // Shared Recipient Selection State (Set of unique chatIds)
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());

  // Immediate Previous Selection State
  const [lastSelectedChatIds, setLastSelectedChatIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`letschat_last_batch_selection_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Modals state
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showManageBatches, setShowManageBatches] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [deletingBatch, setDeletingBatch] = useState(null);

  // Sending & Pill Notification State
  const [isSending, setIsSending] = useState(false);
  const [pillMessage, setPillMessage] = useState(null);
  const pillTimeoutRef = useRef(null);

  const showPill = useCallback((message, duration = 2500) => {
    if (pillTimeoutRef.current) clearTimeout(pillTimeoutRef.current);
    setPillMessage(message);
    pillTimeoutRef.current = setTimeout(() => {
      setPillMessage(null);
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (pillTimeoutRef.current) clearTimeout(pillTimeoutRef.current);
    };
  }, []);

  // 1. Initial Load of Saved Batches
  const loadBatches = useCallback(() => {
    if (!userId) return;
    const batches = getSavedBatches(userId);
    setSavedBatches(batches);
  }, [userId]);

  useEffect(() => {
    loadBatches();
    const handleBatchesUpdated = () => loadBatches();
    window.addEventListener('letschat_batches_updated', handleBatchesUpdated);
    return () => window.removeEventListener('letschat_batches_updated', handleBatchesUpdated);
  }, [loadBatches]);

  // 2. Load Chats (Cache first, then network)
  useEffect(() => {
    // A. Sync from localStorage cache first
    try {
      const cached = JSON.parse(localStorage.getItem('chatsMap') || '{}');
      setChatsMap(cached);
      const list = Object.values(cached).filter(
        c => c && c.chatId && c.type !== 'room' && c.chatId !== 'simulation_guide' && c.id !== 'simulation_guide'
      );
      if (list.length > 0) {
        setAllChats(list);
      }
    } catch (e) {
      console.warn('Error reading chatsMap cache:', e);
    }

    // B. Fetch fresh chats from backend
    if (!userId) return;
    const controller = new AbortController();

    fetch(`${API}/user/chatbox/${userId}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const unique = Array.from(new Map(data.map(item => [String(item.chatId), item])).values())
          .filter(c => c && c.chatId && c.type !== 'room' && c.chatId !== 'simulation_guide' && c.id !== 'simulation_guide');
        
        setAllChats(unique);

        const newMap = {};
        unique.forEach(c => {
          newMap[String(c.chatId)] = c;
        });
        setChatsMap(prev => ({ ...prev, ...newMap }));
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Failed to fetch chatbox in BatchMessagingPage:', err);
        }
      });

    return () => controller.abort();
  }, [userId]);

  // Resolve chat helper
  const resolveChat = useCallback((chatId) => {
    const strId = String(chatId);
    if (chatsMap[strId]) return chatsMap[strId];
    const found = allChats.find(c => String(c.chatId) === strId);
    if (found) return found;
    return {
      chatId: strId,
      chatName: `Chat ${strId}`,
      type: 'direct'
    };
  }, [chatsMap, allChats]);

  // 3. Selection Handlers
  const toggleChatSelection = useCallback((chatId) => {
    const strId = String(chatId);
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  }, []);

  const toggleBatchSelection = useCallback((batch) => {
    const batchChatIds = (batch.chatIds || []).map(id => String(id));
    if (batchChatIds.length === 0) return;

    setSelectedChatIds(prev => {
      const next = new Set(prev);
      const allSelected = batchChatIds.every(id => next.has(id));

      if (allSelected) {
        // Deselect all chats in this batch
        batchChatIds.forEach(id => next.delete(id));
      } else {
        // Select all chats in this batch
        batchChatIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, []);

  const toggleBatchExpand = useCallback((batchId) => {
    setExpandedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedChatIds(new Set());
  }, []);

  const handleSelectLastSelected = useCallback(() => {
    if (!lastSelectedChatIds || lastSelectedChatIds.length === 0) return;
    setSelectedChatIds(new Set(lastSelectedChatIds.map(String)));
  }, [lastSelectedChatIds]);

  // 4. Batch Lifecycle Handlers
  const handleBatchCreated = (newBatch) => {
    loadBatches();
    // Automatically select the newly created batch
    if (newBatch && Array.isArray(newBatch.chatIds)) {
      setSelectedChatIds(prev => {
        const next = new Set(prev);
        newBatch.chatIds.forEach(id => next.add(String(id)));
        return next;
      });
    }
    showPill(`Batch "${newBatch.name}" created!`, 2500);
  };

  const handleBatchUpdated = (updatedBatch) => {
    loadBatches();
    showPill(`Batch "${updatedBatch.name}" updated!`, 2500);
  };

  const handleConfirmDelete = (batch) => {
    deleteBatch(userId, batch.id);
    loadBatches();
    setDeletingBatch(null);
    showPill(`Batch "${batch.name}" deleted.`, 2500);
  };

  // 5. Filtered chats for All Chats section
  const filteredAllChats = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allChats;
    return allChats.filter(c =>
      (c.chatName && c.chatName.toLowerCase().includes(q)) ||
      (c.chatId && String(c.chatId).toLowerCase().includes(q))
    );
  }, [allChats, searchQuery]);

  // Selected chats array for preview
  const selectedChatIdsArray = useMemo(() => Array.from(selectedChatIds), [selectedChatIds]);

  // 6. Sending Messages Handling (Offline Resilient & Persistent Selection)
  const handleSendMessage = async (text) => {
    if (selectedChatIdsArray.length === 0) return;

    // Immediately persist this selection as the immediate previous selection
    try {
      localStorage.setItem(`letschat_last_batch_selection_${userId}`, JSON.stringify(selectedChatIdsArray));
      setLastSelectedChatIds(selectedChatIdsArray);
    } catch (e) {
      console.warn('Failed to save last selected batch:', e);
    }

    // Lightweight pill: "Sending messages..." for a few seconds
    showPill('Sending messages...', 2500);
    setIsSending(true);

    for (const targetChatId of selectedChatIdsArray) {
      try {
        const msg = {
          tempmsgid: uuidv4().toString(),
          chatid: targetChatId,
          userid: userId,
          sendername: myDisplayName,
          type: 'text',
          content: text,
          timestamp: getCurrentLocalDateTimeString(),
          repliedto: null,
          forwardedfrom: null,
          spaceid: 0
        };

        // Offline capable: stored in IndexedDB (saveMessageToDB) and sent/queued (sendSafe/SyncService)
        messageStore.addMessage(msg);
        await sendSafe(msg);

        // Update lastMessages preview in localStorage for instant chat list reflection
        try {
          const lastMsgs = JSON.parse(localStorage.getItem('lastMessages') || '{}');
          lastMsgs[targetChatId] = {
            ...msg,
            status: 'pending'
          };
          localStorage.setItem('lastMessages', JSON.stringify(lastMsgs));
        } catch (e) {}
      } catch (err) {
        console.error(`Failed to send batch message to ${targetChatId}:`, err);
      }
    }

    setIsSending(false);
    // CRITICAL: Do NOT clear selectedChatIds!
    // CRITICAL: Do NOT navigate away! User can send more messages with current selection.
  };

  const handleSendMedia = async (mediaFile, thumbBlob) => {
    if (selectedChatIdsArray.length === 0) return;

    try {
      localStorage.setItem(`letschat_last_batch_selection_${userId}`, JSON.stringify(selectedChatIdsArray));
      setLastSelectedChatIds(selectedChatIdsArray);
    } catch (e) {
      console.warn('Failed to save last selected batch:', e);
    }

    showPill('Sending messages...', 2500);
    setIsSending(true);
    const category = getFileCategory(mediaFile.type, mediaFile.name);

    let uploadResult = null;
    if (navigator.onLine) {
      try {
        uploadResult = await uploadMedia(mediaFile, () => {});
      } catch (e) {
        console.warn('Upload media network error in batch, queuing locally:', e);
      }
    }

    for (const targetChatId of selectedChatIdsArray) {
      try {
        const tempmsgid = uuidv4().toString();

        // Proactively cache media blob into IndexedDB for offline resilience
        saveBlobToCache(tempmsgid, mediaFile, 'mainCache').catch(console.error);
        if (thumbBlob) {
          saveBlobToCache(`${tempmsgid}_thumb`, thumbBlob, 'thumbCache').catch(console.error);
        }

        const finalMsg = {
          tempmsgid,
          chatid: targetChatId,
          userid: userId,
          sendername: myDisplayName,
          type: category,
          content: uploadResult?.mediaId || uploadResult?.mainKey || tempmsgid,
          thumbKey: uploadResult?.thumbKey || null,
          mediaId: uploadResult?.mediaId || null,
          fileName: mediaFile.name,
          mimeType: mediaFile.type,
          timestamp: getCurrentLocalDateTimeString(),
          repliedto: null,
          forwardedfrom: null,
          spaceid: 0,
          isOptimistic: !uploadResult,
          status: uploadResult ? 'sent' : 'uploading'
        };

        messageStore.addMessage(finalMsg);
        await sendSafe(finalMsg);

        try {
          const lastMsgs = JSON.parse(localStorage.getItem('lastMessages') || '{}');
          lastMsgs[targetChatId] = {
            ...finalMsg,
            status: 'pending'
          };
          localStorage.setItem('lastMessages', JSON.stringify(lastMsgs));
        } catch (e) {}
      } catch (err) {
        console.error(`Failed to send batch media to ${targetChatId}:`, err);
      }
    }

    setIsSending(false);
    // CRITICAL: Do NOT clear selectedChatIds!
    // CRITICAL: Do NOT navigate away!
  };

  const handleSendVoiceNote = async (audioBlob) => {
    const audioFile = new File([audioBlob], `VoiceNote_${Date.now()}.webm`, { type: audioBlob.type || 'audio/webm' });
    await handleSendMedia(audioFile, null);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Small Pill Notification ("Sending messages...") */}
      {pillMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100001,
          padding: '8px 20px',
          borderRadius: '24px',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color))',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'muFadeIn 0.2s ease-out',
          pointerEvents: 'none'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-color)',
            display: 'inline-block'
          }} />
          <span>{pillMessage}</span>
        </div>
      )}

      {/* ── TOP SECTION: Header & Action Buttons ── */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20
      }}>
        {/* Top Header Bar */}
        <div style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => navigate('/chats')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease'
              }}
              title="Back to Chats"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Batch Messaging
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Send to multiple chats at once
              </span>
            </div>
          </div>

          {/* Learn More Action Button */}
          <button
            type="button"
            onClick={() => setShowLearnMore(true)}
            style={{
              background: 'var(--accent-tint)',
              border: '1px solid var(--accent-tint-border)',
              color: 'var(--accent-color)',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: '600',
              transition: 'all 0.15s ease'
            }}
            title="Learn what batches are"
          >
            <Info size={15} />
            <span>Learn More</span>
          </button>
        </div>

        {/* Top Action Buttons (Create Batch & Manage Batches side by side) */}
        <div style={{
          padding: '0 16px 12px 16px',
          display: 'flex',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={() => setShowCreateBatch(true)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: 'var(--accent-color)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '13.5px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--accent-solid) 45%, transparent)',
              transition: 'opacity 0.15s ease'
            }}
          >
            <Plus size={16} />
            <span>Create Batch</span>
          </button>

          <button
            type="button"
            onClick={() => setShowManageBatches(true)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '13.5px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <Settings2 size={16} />
            <span>Manage Batches</span>
          </button>
        </div>
      </div>

      {/* ── MIDDLE SECTION: Saved Batches & All Chats (Scrollable) ── */}
      <div className="hide-scrollbar" style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Top of Chat List Selection Actions: Last Selected & Clear All */}
        <div style={{
          padding: '12px 16px 4px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          {/* Last Selected Button */}
          <button
            type="button"
            onClick={handleSelectLastSelected}
            disabled={!lastSelectedChatIds || lastSelectedChatIds.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              backgroundColor: (lastSelectedChatIds && lastSelectedChatIds.length > 0)
                ? 'var(--bg-secondary)'
                : 'transparent',
              color: (lastSelectedChatIds && lastSelectedChatIds.length > 0)
                ? 'var(--text-primary)'
                : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: (lastSelectedChatIds && lastSelectedChatIds.length > 0) ? 'pointer' : 'not-allowed',
              opacity: (lastSelectedChatIds && lastSelectedChatIds.length > 0) ? 1 : 0.5,
              transition: 'all 0.15s ease'
            }}
            title={
              lastSelectedChatIds && lastSelectedChatIds.length > 0
                ? `Select immediate previous recipients (${lastSelectedChatIds.length})`
                : 'No previous selection stored yet'
            }
          >
            <History size={15} color="var(--accent-color)" />
            <span>Last Selected{lastSelectedChatIds && lastSelectedChatIds.length > 0 ? ` (${lastSelectedChatIds.length})` : ''}</span>
          </button>

          {/* Clear All Button */}
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={selectedChatIds.size === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              backgroundColor: selectedChatIds.size > 0 ? 'var(--danger-tint)' : 'transparent',
              color: selectedChatIds.size > 0 ? 'var(--danger-color)' : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: selectedChatIds.size > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedChatIds.size > 0 ? 1 : 0.5,
              transition: 'all 0.15s ease'
            }}
            title="Unselect all chats"
          >
            <XCircle size={15} />
            <span>Clear All</span>
          </button>
        </div>

        {/* Section 2A: Saved Batches */}
        <div style={{ padding: '12px 16px 8px 16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Layers size={15} color="var(--accent-color)" />
              Saved Batches ({savedBatches.length})
            </h3>
          </div>

          {savedBatches.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px dashed var(--border-color)',
              borderRadius: '12px',
              padding: '14px 16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '13px'
            }}>
              No saved batches yet.{' '}
              <button
                type="button"
                onClick={() => setShowCreateBatch(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-color)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Create a batch
              </button>{' '}
              to group your frequent recipients.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {savedBatches.map(batch => {
                const isExpanded = expandedBatchIds.has(batch.id);
                const batchChatIds = (batch.chatIds || []).map(id => String(id));
                const allSelected = batchChatIds.length > 0 && batchChatIds.every(id => selectedChatIds.has(id));
                const someSelected = !allSelected && batchChatIds.some(id => selectedChatIds.has(id));

                return (
                  <div
                    key={batch.id}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: allSelected
                        ? '1.5px solid var(--accent-color)'
                        : '1px solid var(--border-color)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Batch Card Header */}
                    <div style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      {/* Checkbox & Name */}
                      <div
                        onClick={() => toggleBatchSelection(batch)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          flex: 1,
                          minWidth: 0,
                          cursor: 'pointer'
                        }}
                      >
                        {/* Custom Checkbox */}
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          border: (allSelected || someSelected) ? 'none' : '2px solid var(--text-secondary)',
                          backgroundColor: (allSelected || someSelected) ? 'var(--accent-color)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}>
                          {allSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                          {someSelected && (
                            <div style={{ width: '8px', height: '2px', backgroundColor: '#ffffff', borderRadius: '1px' }} />
                          )}
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

                      {/* Expand / Collapse Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleBatchExpand(batch.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={isExpanded ? 'Collapse list' : 'Expand list'}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                    {/* Expanded individual chat list */}
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        padding: '8px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)', padding: '2px 4px' }}>
                          Select or deselect chats in this batch for the current message:
                        </div>
                        {batchChatIds.map(chatId => {
                          const chat = resolveChat(chatId);
                          const isChatSelected = selectedChatIds.has(String(chatId));

                          return (
                            <div
                              key={chatId}
                              onClick={() => toggleChatSelection(String(chatId))}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '6px 10px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                backgroundColor: isChatSelected ? 'var(--accent-tint)' : 'transparent',
                                transition: 'background-color 0.15s ease'
                              }}
                            >
                              <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '5px',
                                border: isChatSelected ? 'none' : '2px solid var(--text-secondary)',
                                backgroundColor: isChatSelected ? 'var(--accent-color)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {isChatSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                              </div>

                              <Avatar chat={chat} size={30} />

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

        {/* Section 2B: All Chats */}
        <div style={{ padding: '12px 16px 24px 16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Users size={15} color="var(--accent-color)" />
              All Chats ({allChats.length})
            </h3>
          </div>

          {/* Search Bar for All Chats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            marginBottom: '12px'
          }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search all chats..."
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

          {/* All Chats list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredAllChats.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                {searchQuery ? 'No chats match your search.' : 'No conversations available.'}
              </div>
            ) : (
              filteredAllChats.map(chat => {
                const isSelected = selectedChatIds.has(String(chat.chatId));

                return (
                  <div
                    key={chat.chatId}
                    onClick={() => toggleChatSelection(String(chat.chatId))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '14px',
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
                    {/* Checkbox */}
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

                    <Avatar chat={chat} size={42} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '15px',
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
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {chat.type === 'group' ? 'Group' : (chat.type === 'classroom' ? 'Classroom' : 'Contact')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION: Selected Recipients Preview & Message Composer ── */}
      <div style={{
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        zIndex: 50
      }}>
        {/* Selected Recipients Preview Bar */}
        <div style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
            {selectedChatIdsArray.length === 0 ? (
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>
                Select chats or a batch to send a message.
              </span>
            ) : selectedChatIdsArray.length <= 2 ? (
              <span style={{
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: '500',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <strong style={{ color: 'var(--accent-color)' }}>Selected ({selectedChatIdsArray.length}):</strong>{' '}
                {selectedChatIdsArray.map(id => resolveChat(id).chatName || id).join(', ')}
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500' }}>
                  <strong style={{ color: 'var(--accent-color)' }}>Selected ({selectedChatIdsArray.length}):</strong>{' '}
                  {selectedChatIdsArray.slice(0, 2).map(id => resolveChat(id).chatName || id).join(', ')},
                </span>
                <button
                  type="button"
                  onClick={() => setShowRecipientsModal(true)}
                  style={{
                    backgroundColor: 'var(--accent-tint)',
                    color: 'var(--accent-color)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="View all selected recipients"
                >
                  +{selectedChatIdsArray.length - 2} more
                </button>
              </div>
            )}
          </div>

          {selectedChatIdsArray.length > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '2px 6px',
                flexShrink: 0
              }}
              title="Clear all selections"
            >
              Clear
            </button>
          )}
        </div>

        {/* Bottom Message Composer */}
        <BatchMessageComposer
          onSendMessage={handleSendMessage}
          onSendMedia={handleSendMedia}
          onSendVoiceNote={handleSendVoiceNote}
          disabled={isSending}
          placeholder={
            selectedChatIdsArray.length === 0
              ? 'Select recipients above to compose...'
              : `Type a message to send to ${selectedChatIdsArray.length} chat${selectedChatIdsArray.length === 1 ? '' : 's'}...`
          }
        />
      </div>

      {/* ── MODALS ── */}
      <CreateBatchModal
        isOpen={showCreateBatch}
        onClose={() => setShowCreateBatch(false)}
        onBatchCreated={handleBatchCreated}
        chats={allChats}
        userId={userId}
      />

      <ManageBatchesModal
        isOpen={showManageBatches}
        onClose={() => setShowManageBatches(false)}
        batches={savedBatches}
        chats={allChats}
        chatsMap={chatsMap}
        onEditBatch={batch => {
          setShowManageBatches(false);
          setEditingBatch(batch);
        }}
        onDeleteBatch={batch => {
          setShowManageBatches(false);
          setDeletingBatch(batch);
        }}
        onCreateBatch={() => {
          setShowManageBatches(false);
          setShowCreateBatch(true);
        }}
      />

      <EditBatchModal
        isOpen={Boolean(editingBatch)}
        batch={editingBatch}
        onClose={() => setEditingBatch(null)}
        onBatchUpdated={handleBatchUpdated}
        chats={allChats}
        userId={userId}
      />

      <DeleteBatchModal
        isOpen={Boolean(deletingBatch)}
        batch={deletingBatch}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingBatch(null)}
      />

      <LearnMoreModal
        isOpen={showLearnMore}
        onClose={() => setShowLearnMore(false)}
      />

      <SelectedRecipientsModal
        isOpen={showRecipientsModal}
        onClose={() => setShowRecipientsModal(false)}
        selectedChatIds={selectedChatIdsArray}
        chatsMap={chatsMap}
        chats={allChats}
        onDeselect={toggleChatSelection}
        onClearAll={handleClearSelection}
      />
    </div>
  );
}
