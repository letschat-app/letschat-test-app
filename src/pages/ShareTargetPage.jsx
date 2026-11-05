import { useToast } from '../components/common/ToastProvider';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSharedData, clearSharedData } from '../service/db';
import { uploadMedia, getFileCategory } from '../service/MediaUploader';
import { sendSafe, initWebsocket, isSocketOpen } from '../service/Websocket';
import { saveBlobToCache } from '../service/MediaCache';
import messageStore from './MessageStore';
import { API } from '../service/UserAuth';
import Avatar from '../components/chat/Avatar';
import { v4 as uuidv4 } from 'uuid';
import { Check, Send, X, FileText, Loader2, ArrowLeft } from 'lucide-react';

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

const ShareTargetPage = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [sharedItems, setSharedItems] = useState([]);
    const [selectedChats, setSelectedChats] = useState(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
    const [error, setError] = useState(null);
    const [chatsMap, setChatsMap] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('chatsMap') || '{}');
        } catch {
            return {};
        }
    });

    const lastMessages = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('lastMessages') || '{}');
        } catch {
            return {};
        }
    }, []);

    // Load shared data, verify auth, ensure websocket
    useEffect(() => {
        const userId = localStorage.getItem('userid');
        if (!userId) {
            navigate('/login', { replace: true });
            return;
        }

        // Ensure socket is active
        if (!isSocketOpen()) {
            initWebsocket();
        }

        const loadData = async () => {
            try {
                const data = await getSharedData();
                if (!data || data.length === 0) {
                    return;
                }
                setSharedItems(data);
            } catch (err) {
                console.error('Failed to load shared data:', err);
                setError('Could not load shared items.');
            }
        };
        loadData();

        // If local chatsMap is empty, fetch from API
        const cached = JSON.parse(localStorage.getItem('chatsMap') || '{}');
        if (!cached || Object.keys(cached).length === 0) {
            fetch(`${API}/user/chatbox/${userId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const newMap = {};
                    data.forEach(c => {
                        const id = c.chatId || c.id;
                        if (id) newMap[id] = c;
                    });
                    localStorage.setItem('chatsMap', JSON.stringify(newMap));
                    setChatsMap(newMap);
                }
            })
            .catch(err => console.warn('Failed to fetch chats in ShareTarget:', err));
        } else {
            setChatsMap(cached);
        }
    }, [navigate]);

    const availableChats = useMemo(() => {
        return Object.values(chatsMap)
            .filter(chat => chat && (chat.chatId || chat.id) && chat.type !== 'room' && chat.chatId !== 'simulation_guide' && chat.id !== 'simulation_guide')
            .sort((a, b) => {
                const idA = a.chatId || a.id;
                const idB = b.chatId || b.id;
                const timeA = new Date(lastMessages[idA]?.timestamp || 0).getTime();
                const timeB = new Date(lastMessages[idB]?.timestamp || 0).getTime();
                return timeB - timeA;
            });
    }, [chatsMap, lastMessages]);

    const toggleChat = (chatId) => {
        const newSelected = new Set(selectedChats);
        if (newSelected.has(chatId)) newSelected.delete(chatId);
        else newSelected.add(chatId);
        setSelectedChats(newSelected);
    };

    const handleSend = async () => {
        if (selectedChats.size === 0) {
            toast?.error?.('Please select at least one chat.') || setError('Please select at least one chat.');
            return;
        }

        const userId = localStorage.getItem('userid');
        if (!userId) {
            navigate('/login', { replace: true });
            return;
        }
        const myDisplayName = localStorage.getItem('username') || userId;

        // Ensure WebSocket is active
        if (!isSocketOpen()) {
            initWebsocket();
        }

        setIsProcessing(true);
        setError(null);
        const selectedChatList = Array.from(selectedChats);
        const totalOps = selectedChatList.length * sharedItems.length;
        let completedOps = 0;

        try {
            for (const chatId of selectedChatList) {
                const currentChat = chatsMap[chatId] || {};
                const chatName = currentChat.chatName || currentChat.name || 'Chat';
                
                for (const item of sharedItems) {
                    setProgress({
                        current: completedOps,
                        total: totalOps,
                        label: `Sending to ${chatName}...`
                    });

                    const tempmsgid = uuidv4().toString();
                    const localTimestamp = getCurrentLocalDateTimeString();

                    if (item.type === 'file') {
                        // 1. Proactively cache local blob into IndexedDB for instant UI hydration
                        saveBlobToCache(tempmsgid, item.file, 'mainCache').catch(console.error);

                        // 2. Upload Media
                        let uploadResult = null;
                        try {
                            uploadResult = await uploadMedia(item.file, ({ stage, progress: p }) => {
                                setProgress({
                                    current: completedOps,
                                    total: totalOps,
                                    label: `Uploading ${item.name || 'file'} (${p || 0}%) to ${chatName}...`
                                });
                            });
                        } catch (uploadErr) {
                            console.error('[ShareTarget] Upload failed:', uploadErr);
                            throw uploadErr;
                        }

                        // 3. Format Media Message
                        const msgType = getFileCategory(item.mimeType || item.file?.type, item.name || item.file?.name);

                        const msg = {
                            tempmsgid,
                            chatid: String(chatId),
                            userid: userId,
                            sendername: myDisplayName,
                            type: msgType,
                            content: uploadResult?.mediaId || uploadResult?.mainKey || tempmsgid,
                            thumbKey: uploadResult?.thumbKey || null,
                            mediaId: uploadResult?.mediaId || null,
                            fileName: item.name || item.file?.name || 'file',
                            mimeType: item.mimeType || item.file?.type || '',
                            fileSize: item.file?.size || null,
                            timestamp: localTimestamp,
                            status: uploadResult ? 'sent' : 'uploading',
                            spaceid: 0,
                            repliedto: null,
                            forwardedfrom: null
                        };

                        // 4. Save to message store and send via WebSocket / Sync queue
                        messageStore.addMessage(msg);
                        await sendSafe(msg);

                        // 5. Update lastMessages preview in localStorage
                        try {
                            const lastMsgs = JSON.parse(localStorage.getItem('lastMessages') || '{}');
                            lastMsgs[chatId] = {
                                ...msg,
                                status: 'pending'
                            };
                            localStorage.setItem('lastMessages', JSON.stringify(lastMsgs));
                        } catch (e) {}

                    } else if (item.type === 'text') {
                        const content = [item.title, item.text, item.url].filter(Boolean).join('\n');
                        const msg = {
                            tempmsgid,
                            chatid: String(chatId),
                            userid: userId,
                            sendername: myDisplayName,
                            type: 'text',
                            content: content,
                            timestamp: localTimestamp,
                            status: 'sending',
                            spaceid: 0,
                            repliedto: null,
                            forwardedfrom: null
                        };

                        messageStore.addMessage(msg);
                        await sendSafe(msg);

                        try {
                            const lastMsgs = JSON.parse(localStorage.getItem('lastMessages') || '{}');
                            lastMsgs[chatId] = {
                                ...msg,
                                status: 'pending'
                            };
                            localStorage.setItem('lastMessages', JSON.stringify(lastMsgs));
                        } catch (e) {}
                    }
                    
                    completedOps++;
                }
            }

            await clearSharedData();

            // Seamless navigation: if single chat, open ChatBox directly; else open chats list
            if (selectedChatList.length === 1) {
                navigate(`/chat/${selectedChatList[0]}`, { replace: true });
            } else {
                navigate('/chats', { state: { showSpacesForChat: selectedChatList[0] }, replace: true });
            }
        } catch (err) {
            console.error('[ShareTarget] Sharing failed:', err);
            setError('Failed to send some items. Please check your network and try again.');
            setIsProcessing(false);
        }
    };

    const renderPreview = () => {
        if (sharedItems.length === 0) return null;

        return (
            <div style={{
                display: 'flex',
                gap: '12px',
                padding: '16px',
                overflowX: 'auto',
                background: 'var(--bg-card)',
                borderRadius: '12px',
                marginBottom: '24px',
                border: '1px solid var(--border-color)'
            }} className="hide-scrollbar">
                {sharedItems.map((item, i) => (
                    <div key={i} style={{
                        flexShrink: 0,
                        width: '80px',
                        height: '80px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {item.type === 'file' ? (
                            item.mimeType?.startsWith('image/') ? (
                                <img 
                                    src={URL.createObjectURL(item.file)} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    alt="preview"
                                />
                            ) : (
                                <FileText size={32} color="var(--accent-text)" />
                            )
                        ) : (
                            <div style={{ fontSize: '10px', padding: '4px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                {item.text?.substring(0, 20)}...
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{
            height: '100vh',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        onClick={() => navigate('/chats', { replace: true })} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--text-secondary)', 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '50%'
                        }}
                        aria-label="Cancel share"
                    >
                        <X size={22} />
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Share to...</h2>
                </div>
                <button 
                    onClick={handleSend}
                    disabled={selectedChats.size === 0 || isProcessing}
                    style={{
                        background: selectedChats.size > 0 ? 'var(--accent-solid)' : 'var(--bg-card)',
                        color: selectedChats.size > 0 ? '#ffffff' : 'var(--text-secondary)',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '24px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        cursor: selectedChats.size > 0 && !isProcessing ? 'pointer' : 'default',
                        opacity: isProcessing ? 0.6 : 1
                    }}
                >
                    <Send size={18} /> Send
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="hide-scrollbar">
                {error && (
                    <div style={{ padding: '12px 16px', background: 'var(--danger-tint, rgba(239, 68, 68, 0.15))', border: '1px solid var(--danger-color)', borderRadius: '10px', color: 'var(--danger-color)', marginBottom: '16px', fontSize: '14px' }}>
                        {error}
                    </div>
                )}

                {sharedItems.length > 0 ? (
                    <>
                        {renderPreview()}
                        <div style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em' }}>RECENT CHATS</div>
                    </>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)'
                    }}>
                        <div style={{ 
                            width: '80px', height: '80px', borderRadius: '50%', 
                            background: 'var(--bg-card)', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', marginBottom: '20px' 
                        }}>
                            <Send size={40} color="var(--accent-text)" opacity={0.5} />
                        </div>
                        <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginBottom: '8px' }}>No items to share</h3>
                        <p style={{ fontSize: '14px', maxWidth: '300px', lineHeight: '1.5' }}>
                            You can share photos, videos, or text from other apps directly to LetsChat.
                        </p>
                        <button 
                            onClick={() => navigate('/chats', { replace: true })}
                            style={{
                                marginTop: '24px',
                                padding: '10px 24px',
                                background: 'var(--accent-solid)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Back to Chats
                        </button>
                    </div>
                )}
                
                {sharedItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {availableChats.map(chat => {
                            const chatId = chat.chatId || chat.id;
                            const isSelected = selectedChats.has(chatId);
                            const lastActive = lastMessages[chatId]?.timestamp;

                            return (
                                <div 
                                    key={chatId} 
                                    onClick={() => toggleChat(chatId)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: isSelected ? 'var(--accent-tint, rgba(99, 102, 241, 0.15))' : 'var(--bg-card)',
                                        border: `1px solid ${isSelected ? 'var(--accent-solid)' : 'var(--border-color)'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Avatar chat={chat} size={48} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {chat.chatName || chat.name || chat.userId || 'Chat'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {lastActive ? `Last active ${new Date(lastActive).toLocaleDateString()}` : (chat.type === 'group' ? 'Group chat' : 'Direct message')}
                                        </div>
                                    </div>
                                    <div style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '6px',
                                        border: `2px solid ${isSelected ? 'var(--accent-solid)' : 'var(--border-color)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: isSelected ? 'var(--accent-solid)' : 'transparent',
                                        transition: 'all 0.1s ease'
                                    }}>
                                        {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {isProcessing && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '40px'
                }}>
                    <Loader2 size={48} className="animate-spin" color="var(--accent-text)" style={{ marginBottom: '20px' }} />
                    <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#ffffff' }}>Sharing content...</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>{progress.label}</div>
                    
                    <div style={{ width: '240px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '24px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`, 
                            height: '100%', 
                            background: 'var(--accent-solid)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            )}

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default ShareTargetPage;
