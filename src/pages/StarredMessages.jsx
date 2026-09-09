import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getStarredMessages } from '../service/db';
import messageStore from './MessageStore';
import Avatar from '../components/chat/Avatar';
import { ArrowLeft, Star, Trash2, ExternalLink } from 'lucide-react';

const StarredMessages = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const chatid = searchParams.get('chatid');
    const [starredMessages, setStarredMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const userId = localStorage.getItem('userid');

    useEffect(() => {
        const fetchStarred = async () => {
            setLoading(true);
            try {
                const msgs = await getStarredMessages(chatid);
                setStarredMessages(msgs);
            } catch (err) {
                console.error("Failed to fetch starred messages:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStarred();
    }, [chatid]);

    const handleUnstar = async (e, msg) => {
        e.stopPropagation();
        const msgId = msg.msgid || msg.tempmsgid;
        try {
            messageStore.updateMessage(msg.chatid, msgId, { isStarred: false });
            setStarredMessages(prev => prev.filter(m => (m.msgid || m.tempmsgid) !== msgId));
        } catch (err) {
            console.error("Failed to unstar message:", err);
        }
    };

    const handleJumpToChat = (msg) => {
        navigate(`/chat/${msg.chatid}`, { state: { scrollToMsgId: msg.msgid || msg.tempmsgid } });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
                <div style={{ color: 'var(--text-secondary)' }}>Loading starred messages...</div>
            </div>
        );
    }

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Header */}
            <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid var(--border-color)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                background: 'var(--bg-secondary)',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}>
                    <ArrowLeft size={24} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star size={20} fill="var(--accent-color)" color="var(--accent-color)" />
                    <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                        {chatid ? 'Starred in this chat' : 'Starred Messages'}
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="hide-scrollbar">
                {starredMessages.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', opacity: 0.5 }}>
                        <Star size={64} strokeWidth={1} style={{ marginBottom: '16px' }} />
                        <p style={{ fontSize: '16px' }}>No starred messages yet</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                        {starredMessages.map((msg) => (
                            <div 
                                key={msg.msgid || msg.tempmsgid || msg.timestamp}
                                onClick={() => handleJumpToChat(msg)}
                                style={{ 
                                    background: 'var(--bg-card)', 
                                    borderRadius: '16px', 
                                    padding: '16px',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, background 0.2s',
                                    position: 'relative'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                            >
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                    <Avatar 
                                        chat={{ id: msg.userid, chatName: msg.sendername, profile: null, type: 'private' }} 
                                        size={40} 
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--accent-color)' }}>
                                                {msg.userid === userId ? 'You' : msg.sendername}
                                            </span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {new Date(msg.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '15px', lineHeight: '1.5', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                            {msg.type === 'text' ? msg.content : `[${msg.type.toUpperCase()}]`}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                    <button 
                                        onClick={(e) => handleUnstar(e, msg)}
                                        style={{ 
                                            background: 'none', border: 'none', color: 'var(--danger-color)', 
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                            fontSize: '13px', fontWeight: '500'
                                        }}
                                    >
                                        <Trash2 size={16} /> Unstar
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleJumpToChat(msg); }}
                                        style={{ 
                                            background: 'none', border: 'none', color: 'var(--accent-color)', 
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                            fontSize: '13px', fontWeight: '500'
                                        }}
                                    >
                                        <ExternalLink size={16} /> Go to chat
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StarredMessages;
