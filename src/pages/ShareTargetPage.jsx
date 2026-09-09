import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSharedData, clearSharedData } from '../service/db';
import { uploadMedia, getFileCategory } from '../service/MediaUploader';
import { sendSafe } from '../service/Websocket';
import messageStore from './MessageStore';
import { API } from '../service/UserAuth';
import { v4 as uuidv4 } from 'uuid';
import { Check, Send, X, FileText, Loader2, User } from 'lucide-react';

const ShareTargetPage = () => {
    const navigate = useNavigate();
    const [sharedItems, setSharedItems] = useState([]);
    const [selectedChats, setSelectedChats] = useState(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
    const [error, setError] = useState(null);

    // Load shared data and chat list
    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getSharedData();
                if (!data || data.length === 0) {
                    // navigate('/chats');
                    return;
                }
                setSharedItems(data);
            } catch (err) {
                console.error('Failed to load shared data:', err);
                setError('Could not load shared items.');
            }
        };
        loadData();
    }, []);

    const chatsMap = useMemo(() => JSON.parse(localStorage.getItem('chatsMap') || '{}'), []);
    const lastMessages = useMemo(() => JSON.parse(localStorage.getItem('lastMessages') || '{}'), []);

    const availableChats = useMemo(() => {
        return Object.values(chatsMap)
            .filter(chat => chat.type !== 'room' && chat.type !== 'group' && chat.type !== 'classroom')
            .sort((a, b) => {
                const timeA = new Date(lastMessages[a.chatId]?.timestamp || 0).getTime();
                const timeB = new Date(lastMessages[b.chatId]?.timestamp || 0).getTime();
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
            alert('Please select at least one chat.');
            return;
        }

        setIsProcessing(true);
        const selectedChatList = Array.from(selectedChats);
        const totalOps = selectedChatList.length * sharedItems.length;
        let completedOps = 0;

        try {
            for (const chatId of selectedChatList) {
                const currentChat = chatsMap[chatId];
                
                for (const item of sharedItems) {
                    setProgress({
                        current: completedOps,
                        total: totalOps,
                        label: `Sending to ${currentChat.chatName}...`
                    });

                    if (item.type === 'file') {
                        // 1. Upload Media
                        const uploadResult = await uploadMedia(item.file, ({ stage, progress: p }) => {
                            // Local progress
                        });

                        // 2. Format Message
                        const msgType = getFileCategory(item.mimeType, item.name);

                        const msg = {
                            tempmsgid: uuidv4().toString(),
                            chatid: chatId,
                            type: msgType,
                            content: uploadResult.mediaId || uploadResult.mainKey,
                            thumbKey: uploadResult.thumbKey || null,
                            fileName: item.name,
                            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
                            status: 'sending',
                            spaceid: 0,
                            repliedto: null,
                            forwardedfrom: null
                        };

                        // 3. Send
                        await sendSafe(msg);
                        messageStore.addMessage(msg);

                    } else if (item.type === 'text') {
                        const content = [item.title, item.text, item.url].filter(Boolean).join('\n');
                        const msg = {
                            tempmsgid: uuidv4().toString(),
                            chatid: chatId,
                            type: 'text',
                            content: content,
                            timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
                            status: 'sending',
                            spaceid: 0,
                            repliedto: null,
                            forwardedfrom: null
                        };
                        await sendSafe(msg);
                        messageStore.addMessage(msg);
                    }
                    
                    completedOps++;
                }
            }

            await clearSharedData();
            navigate('/chats', { state: { showSpacesForChat: selectedChatList[0] }, replace: true });
        } catch (err) {
            console.error('Sharing failed:', err);
            setError('Failed to send some items. Please try again.');
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
                background: '#1f2937',
                borderRadius: '12px',
                marginBottom: '24px',
                border: '1px solid #374151'
            }} className="hide-scrollbar">
                {sharedItems.map((item, i) => (
                    <div key={i} style={{
                        flexShrink: 0,
                        width: '80px',
                        height: '80px',
                        background: '#111827',
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
                                <FileText size={32} color="#60a5fa" />
                            )
                        ) : (
                            <div style={{ fontSize: '10px', padding: '4px', textAlign: 'center', color: '#9ca3af' }}>
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
            background: '#111827',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#111827',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => navigate('/chats', { replace: true })} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '24px', fontWeight: '700', cursor: 'pointer' }}>
                        X
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Share to...</h2>
                </div>
                <button 
                    onClick={handleSend}
                    disabled={selectedChats.size === 0 || isProcessing}
                    style={{
                        background: selectedChats.size > 0 ? '#3b82f6' : '#374151',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '24px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        cursor: selectedChats.size > 0 ? 'pointer' : 'default'
                    }}
                >
                    <Send size={18} /> Send
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="hide-scrollbar">
                {error && (
                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                {sharedItems.length > 0 ? (
                    <>
                        {renderPreview()}
                        <div style={{ marginBottom: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>RECENT CHATS</div>
                    </>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: '#9ca3af'
                    }}>
                        <div style={{ 
                            width: '80px', height: '80px', borderRadius: '50%', 
                            background: '#1f2937', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', marginBottom: '20px' 
                        }}>
                            <Send size={40} color="#3b82f6" opacity={0.5} />
                        </div>
                        <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '8px' }}>No items to share</h3>
                        <p style={{ fontSize: '14px', maxWidth: '300px', lineHeight: '1.5' }}>
                            You can share photos, videos, or text from other apps directly to LetsChat.
                        </p>
                        <button 
                            onClick={() => navigate('/chats', { replace: true })}
                            style={{
                                marginTop: '24px',
                                padding: '10px 24px',
                                background: '#3b82f6',
                                color: 'white',
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
                        {availableChats.map(chat => (
                            <div 
                                key={chat.chatId} 
                                onClick={() => toggleChat(chat.chatId)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: selectedChats.has(chat.chatId) ? 'rgba(59, 130, 246, 0.1)' : '#1f2937',
                                    border: `1px solid ${selectedChats.has(chat.chatId) ? '#3b82f6' : '#374151'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: '#374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden'
                                }}>
                                    {chat.profile ? (
                                        <img src={`${API}/files/media/serve/${chat.profile}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    ) : (
                                        <User size={24} color="#9ca3af" />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '600', fontSize: '15px', color: 'white' }}>{chat.chatName}</div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>Last active {new Date(lastMessages[chat.chatId]?.timestamp || 0).toLocaleDateString()}</div>
                                </div>
                                <div style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '6px',
                                    border: '2px solid #3b82f6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: selectedChats.has(chat.chatId) ? '#3b82f6' : 'transparent',
                                    transition: 'all 0.1s ease'
                                }}>
                                    {selectedChats.has(chat.chatId) && <Check size={14} color="white" strokeWidth={3} />}
                                </div>
                            </div>
                        ))}
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
                    <Loader2 size={48} className="animate-spin" color="#3b82f6" style={{ marginBottom: '20px' }} />
                    <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Sharing content...</div>
                    <div style={{ color: '#9ca3af' }}>{progress.label}</div>
                    
                    <div style={{ width: '240px', height: '4px', background: '#374151', borderRadius: '2px', marginTop: '24px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`, 
                            height: '100%', 
                            background: '#3b82f6',
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
