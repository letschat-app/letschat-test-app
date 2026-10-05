import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getsocket, toggleSleepMode } from '../service/Websocket';
import { API, toggle2FA } from '../service/UserAuth';
import { uploadMedia, STAGE_LABELS } from '../service/MediaUploader';
import { getMediaInfo, getMediaBlob } from '../service/MediaCache';
import MediaViewer from '../components/chat/MediaViewer';
import { Camera, Loader2, LogOut, CheckCircle2, Bell, Moon, MessageCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import Avatar from '../components/chat/Avatar';
import StreakBadge from '../components/pulse/StreakBadge';
import { useNotifications } from '../hooks/useNotifications';
import { getGroupMembersFromDB, syncChatsMapToDB } from '../service/db';
import { getchat } from './ChatNames';

const ProfilePage = () => {
    const navigate = useNavigate();
    const { targetUserId } = useParams();
    const userId = localStorage.getItem('userid');
    
    const isTargetUser = Boolean(targetUserId && String(targetUserId) !== String(userId));
    const [targetUserData, setTargetUserData] = useState(null);
    const [targetUserCommonGroups, setTargetUserCommonGroups] = useState([]);
    const [existingChatId, setExistingChatId] = useState(null);
    const [isStartingChat, setIsStartingChat] = useState(false);

    const { fcmToken, permissionStatus, requestPermissionAndGetToken, disableNotifications } = useNotifications();
    const [username, setUsername] = useState(localStorage.getItem('username') || userId);
    const [profile, setProfile] = useState(localStorage.getItem('profile'));
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('');
    const [viewingMedia, setViewingMedia] = useState(null);
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const [isSleepMode, setIsSleepMode] = useState(localStorage.getItem('sleepMode') === 'true');
    const [is2FAEnabled, setIs2FAEnabled] = useState(localStorage.getItem('is2FAEnabled') === 'true');
    const [toggling2FA, setToggling2FA] = useState(false);

    useEffect(() => {
        if (isTargetUser) {
            const fetchTargetInfo = async () => {
                try {
                    const res = await fetch(`${API}/user/search/${targetUserId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setTargetUserData(data);
                    } else {
                        setTargetUserData({ userId: targetUserId, userName: targetUserId });
                    }
                } catch (e) {
                    setTargetUserData({ userId: targetUserId, userName: targetUserId });
                }
            };
            fetchTargetInfo();

            // Check existing chat in chatsMap
            try {
                const rawMap = localStorage.getItem("chatsMap");
                if (rawMap) {
                    const chatsMap = JSON.parse(rawMap);
                    const found = Object.values(chatsMap).find(c => {
                        return c.type === 'private' && (String(c.otherUserId) === String(targetUserId) || String(c.id) === String(targetUserId) || String(c.chatId).includes(targetUserId));
                    });
                    if (found) {
                        setExistingChatId(found.chatId);
                    }
                }
            } catch (err) {
                console.error("Error parsing chatsMap:", err);
            }

            // Compute shared groups
            const computeCommon = async () => {
                try {
                    const rawMap = localStorage.getItem("chatsMap");
                    if (!rawMap) return;
                    const chatsMap = JSON.parse(rawMap);
                    const groupChats = Object.values(chatsMap).filter(c => c.isGroupChat || c.isSpace || c.isClassroom);
                    const shared = [];
                    for (const grp of groupChats) {
                        const members = await getGroupMembersFromDB(grp.chatId);
                        if (members && members.length > 0) {
                            if (members.some(m => String(m.userId) === String(targetUserId))) {
                                shared.push(grp);
                            }
                        }
                    }
                    setTargetUserCommonGroups(shared);
                } catch (err) {
                    console.error("Failed to compute common groups in ProfilePage:", err);
                }
            };
            computeCommon();
        } else if (userId) {
            const fetchUserData = async () => {
                try {
                    const response = await fetch(`${API}/user/me`, {
                        method: 'GET',
                        headers: {
                            'User-id': userId,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.userName) {
                            localStorage.setItem('username', data.userName);
                            setUsername(data.userName);
                        }
                        if (data.profile) {
                            localStorage.setItem('profile', data.profile);
                            setProfile(data.profile);
                        }
                        if (data.is2FAEnabled !== undefined) {
                            setIs2FAEnabled(Boolean(data.is2FAEnabled));
                        } else if (data.twoFactorEnabled !== undefined) {
                            setIs2FAEnabled(Boolean(data.twoFactorEnabled));
                        }
                    }
                } catch (err) {
                    console.error('[ProfilePage] Fetch user data fail:', err);
                }
            };
            fetchUserData();
        }
    }, [targetUserId, userId, isTargetUser]);

    const handle2FAToggle = async () => {
        if (!userId) return;
        setToggling2FA(true);
        try {
            const nextState = !is2FAEnabled;
            const res = await toggle2FA(nextState, userId);
            const data = res.data;
            if (data && (data.status === 'SUCCESS' || data.success || res.status === 200)) {
                setIs2FAEnabled(nextState);
                alert(data.message || `2FA ${nextState ? 'enabled' : 'disabled'} successfully!`);
            } else {
                alert(data?.message || 'Failed to update 2FA setting.');
            }
        } catch (err) {
            console.error('Failed to toggle 2FA:', err);
            const errMsg = err.response?.data?.message || err.message || 'Error toggling 2FA';
            alert(errMsg);
        } finally {
            setToggling2FA(false);
        }
    };

    const handleStartOrGoToChat = async () => {
        if (existingChatId) {
            navigate(`/chat/${existingChatId}`);
            return;
        }
        setIsStartingChat(true);
        try {
            const response = await fetch(`${API}/user/addtochat/${targetUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Id': userId,
                },
            });
            if (response.ok) {
                const data = await response.text();
                getchat(data);
                const res = await fetch(`${API}/user/chatbox/${userId}`);
                if (res.ok) {
                    const chatData = await res.json();
                    let chatsMap = {};
                    chatData.forEach(c => chatsMap[c.chatId] = c);
                    localStorage.setItem("chatsMap", JSON.stringify(chatsMap));
                    syncChatsMapToDB(chatsMap);
                }
                navigate(`/chat/${data}`);
            } else {
                alert("Failed to start chat");
            }
        } catch (e) {
            console.error("Error starting chat:", e);
            alert("Error starting chat");
        } finally {
            setIsStartingChat(false);
        }
    };

    const handleLogout = () => {
        try {
            const socket = getsocket();
            if (socket) socket.close();
        } catch (e) { }
        localStorage.clear();
        navigate('/login');
    };

    const fileInputRef = useRef(null);

    const handleSleepModeToggle = () => {
        const newValue = !isSleepMode;
        setIsSleepMode(newValue);
        toggleSleepMode(newValue);
    };

    const handleAvatarView = async (targetMediaId) => {
        const pId = targetMediaId || profile;
        if (uploading || !pId) return;

        try {
            const info = await getMediaInfo(pId);
            const fullUrl = await getMediaBlob(pId + '_full', info.fileKey, 'mainCache');
            setViewingMedia({
                fileUrl: fullUrl || `${API}/files/get-url/${pId}`,
                fileName: 'Profile Picture',
                fileType: 'image'
            });
        } catch (err) {
            setViewingMedia({
                fileUrl: `${API}/files/get-url/${pId}`,
                fileName: 'Profile Picture',
                fileType: 'image'
            });
        }
    };

    const handleEditClick = (e) => {
        e.stopPropagation();
        if (isSleepMode) {
            alert("cannot edit in sleep mode or offline");
            return;
        }
        if (!uploading) fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            alert("This file exceeds the 50MB size limit.");
            return;
        }

        setUploading(true);
        setProgress(0);
        setStage('preparing_metadata');

        try {
            const result = await uploadMedia(file, ({ stage: s, progress: p }) => {
                setStage(s);
                setProgress(p);
            });

            const res = await fetch(`${API}/user/profile/${result.mediaId}`, {
                method: 'POST',
                headers: {
                    'User-Id': userId,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                localStorage.setItem('profile', result.mediaId);
                setProfile(result.mediaId);
                setStage('done');
                setProgress(100);
                setTimeout(() => {
                    setUploading(false);
                    setStage('');
                }, 1000);
            } else {
                throw new Error('Failed to update profile picture on server');
            }
        } catch (err) {
            console.error('[ProfileUpload]', err);
            alert('Upload failed: ' + err.message);
            setUploading(false);
        }
    };

    if (isTargetUser) {
        const displayUser = targetUserData || { userId: targetUserId, userName: targetUserId };
        return (
            <div style={containerStyle}>
                <div style={{ width: '100%', maxWidth: '480px', marginBottom: '12px' }}>
                    <button 
                        onClick={() => navigate(-1)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'none', border: 'none', color: 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: '14px', fontWeight: '600', padding: '4px 0'
                        }}
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>
                </div>
                <div style={cardStyle}>
                    <div style={headerStyle}>
                        <Avatar
                            chat={{ profile: displayUser.profile, id: displayUser.userId, userName: displayUser.userName, type: 'private', pulseStreak: displayUser.pulseStreak || displayUser.streak }}
                            size={120}
                            highRes={true}
                            onClick={() => handleAvatarView(displayUser.profile)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                            <h1 style={nameStyle}>{displayUser.userName || targetUserId}</h1>
                            {(displayUser.pulseStreak || displayUser.streak) > 0 && (
                                <StreakBadge streak={displayUser.pulseStreak || displayUser.streak} size="md" />
                            )}
                        </div>
                        <p style={badgeStyle}>User Profile</p>
                    </div>

                    {/* Account Info */}
                    <div>
                        <p style={sectionHeaderStyle}>User Info</p>
                        <div style={infoSectionStyle}>
                            <div style={infoItemStyle}>
                                <span style={labelStyle}>User ID</span>
                                <span style={valueStyle}>{displayUser.userId}</span>
                            </div>
                            <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                <span style={labelStyle}>Username</span>
                                <span style={valueStyle}>{displayUser.userName || targetUserId}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button: Go to Chat or Start Chat */}
                    <div>
                        <button
                            onClick={handleStartOrGoToChat}
                            disabled={isStartingChat}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '14px',
                                border: 'none',
                                background: existingChatId 
                                    ? 'var(--accent-gradient)'
                                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: isStartingChat ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <MessageCircle size={20} />
                            {isStartingChat ? 'Opening Chat...' : existingChatId ? 'Go to Chat' : 'Start Chat'}
                        </button>
                    </div>

                    {/* Groups & Classrooms in Common */}
                    <div>
                        <p style={sectionHeaderStyle}>Groups & Classrooms in Common ({targetUserCommonGroups.length})</p>
                        <div style={infoSectionStyle}>
                            {targetUserCommonGroups.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
                                    No common groups or classrooms found.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {targetUserCommonGroups.map((grp) => (
                                        <div
                                            key={grp.chatId}
                                            onClick={() => navigate(`/chat/${grp.chatId}`)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '10px 12px', borderRadius: '12px',
                                                backgroundColor: 'var(--bg-secondary)', cursor: 'pointer',
                                                border: '1px solid var(--border-color)', transition: 'background-color 0.2s'
                                            }}
                                        >
                                            <Avatar chat={grp} size={36} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {grp.chatName || grp.chatId}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    {grp.isClassroom ? 'Classroom' : grp.isSpace ? 'Space' : 'Group'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {viewingMedia && (
                    <MediaViewer
                        media={viewingMedia}
                        onClose={() => setViewingMedia(null)}
                    />
                )}
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <div style={headerStyle}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    <Avatar
                        chat={{ profile, id: userId, type: 'private' }}
                        size={120}
                        highRes={true}
                        isHovered={isHoveringAvatar}
                        onClick={() => handleAvatarView(profile)}
                        style={{ overflow: 'visible' }}
                    >
                        <div
                            style={{
                                ...editButtonOverlayStyle,
                                opacity: isHoveringAvatar || uploading ? 1 : 0.8,
                                transform: isHoveringAvatar ? 'scale(1.1)' : 'scale(1)'
                            }}
                            onClick={handleEditClick}
                            title={isSleepMode ? "Cannot update in Sleep Mode" : "Update Profile Picture"}
                        >
                            {uploading ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                <Camera size={16} />
                            )}
                        </div>

                        {uploading && (
                            <div style={uploadProgressOverlayStyle}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    background: `conic-gradient(var(--accent-color) ${progress}%, transparent 0)`,
                                    opacity: 0.3
                                }} />
                                <div style={stageLabelStyle}>
                                    {STAGE_LABELS[stage] || 'Uploading...'}
                                </div>
                            </div>
                        )}
                    </Avatar>
                    <h1 style={nameStyle}>{username}</h1>
                    <p style={badgeStyle}>Active User</p>
                </div>

                {/* Account Info */}
                <div>
                    <p style={sectionHeaderStyle}>Account Info</p>
                    <div style={infoSectionStyle}>
                        <div style={infoItemStyle}>
                            <span style={labelStyle}>User ID</span>
                            <span style={valueStyle}>{userId}</span>
                        </div>
                        <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <span style={labelStyle}>Username</span>
                            <span style={valueStyle}>{username}</span>
                        </div>
                        <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <span style={labelStyle}>Status</span>
                            {isSleepMode ? (
                                <span style={{ ...valueStyle, color: '#f59e0b' }}>Sleeping 😴</span>
                            ) : (
                                <span style={{ ...valueStyle, color: '#10b981' }}>● Online</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div>
                    <p style={sectionHeaderStyle}>Notifications</p>
                    <div style={infoSectionStyle}>
                        <div style={{ ...infoItemStyle, marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Bell size={16} color="var(--accent-color)" />
                                <span style={{ ...labelStyle, color: 'var(--text-primary)', fontWeight: '600' }}>Push Notifications</span>
                            </div>
                            {(permissionStatus === 'granted' && fcmToken) ? (
                                <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={13} /> On
                                </span>
                            ) : (
                                <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: '700' }}>Off</span>
                            )}
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: '1.5' }}>
                            {permissionStatus === 'granted'
                                ? "You'll receive alerts for new messages even when the app is closed."
                                : "Enable notifications to stay updated on new messages instantly."}
                        </p>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            {(!fcmToken || permissionStatus !== 'granted') ? (
                                <button
                                    onClick={requestPermissionAndGetToken}
                                    style={notificationEnableButtonStyle}
                                >
                                    Enable Push Notifications
                                </button>
                            ) : (
                                <button
                                    onClick={disableNotifications}
                                    style={{ ...notificationEnableButtonStyle, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                >
                                    Disable Notifications
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sleep Mode Settings */}
                <div>
                    <p style={sectionHeaderStyle}>Network Mode</p>
                    <div style={infoSectionStyle}>
                        <div style={{ ...infoItemStyle, marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Moon size={16} color={isSleepMode ? '#f59e0b' : 'var(--accent-color)'} />
                                <span style={{ ...labelStyle, color: 'var(--text-primary)', fontWeight: '600' }}>Sleep Mode</span>
                            </div>
                            {isSleepMode ? (
                                <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '700' }}>Active</span>
                            ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700' }}>Inactive</span>
                            )}
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: '1.5' }}>
                            {isSleepMode
                                ? "Messages won't arrive and you'll appear offline. Use the internet freely."
                                : "Pause incoming messages and hide your active presence without signing out."}
                        </p>

                        <button
                            onClick={handleSleepModeToggle}
                            style={{
                                ...notificationEnableButtonStyle,
                                background: isSleepMode ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-card-hover)',
                                color: isSleepMode ? '#f59e0b' : 'var(--text-primary)',
                                border: isSleepMode ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid var(--border-color)'
                            }}
                        >
                            {isSleepMode ? 'Wake Up (Go Online)' : 'Enter Sleep Mode'}
                        </button>
                    </div>
                </div>

                {/* Security & 2FA Settings */}
                <div>
                    <p style={sectionHeaderStyle}>Security & Authentication</p>
                    <div style={infoSectionStyle}>
                        <div style={{ ...infoItemStyle, marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={16} color={is2FAEnabled ? '#10b981' : 'var(--accent-color)'} />
                                <span style={{ ...labelStyle, color: 'var(--text-primary)', fontWeight: '600' }}>2-Factor Authentication</span>
                            </div>
                            {is2FAEnabled ? (
                                <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={13} /> Enabled
                                </span>
                            ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700' }}>Disabled</span>
                            )}
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: '1.5' }}>
                            {is2FAEnabled
                                ? "An OTP email code will be required whenever you sign in."
                                : "Add an extra layer of security to your account with email OTP verification."}
                        </p>

                        <button
                            onClick={handle2FAToggle}
                            disabled={toggling2FA}
                            style={{
                                ...notificationEnableButtonStyle,
                                background: is2FAEnabled ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-color)',
                                color: is2FAEnabled ? '#ef4444' : 'white',
                                border: is2FAEnabled ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                                opacity: toggling2FA ? 0.7 : 1,
                                cursor: toggling2FA ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {toggling2FA ? 'Updating...' : is2FAEnabled ? 'Disable 2FA' : 'Enable 2-Factor Authentication'}
                        </button>
                    </div>
                </div>

                <div style={actionSectionStyle}>
                    <button
                        onClick={handleLogout}
                        style={logoutButtonStyle}
                    >
                        <LogOut size={18} style={{ marginRight: '8px' }} />
                        Logout from Account
                    </button>
                </div>
            </div>

            {/* Full Screen Viewer */}
            {viewingMedia && (
                <MediaViewer
                    media={viewingMedia}
                    onClose={() => setViewingMedia(null)}
                />
            )}
        </div>
    );
};

const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: '100%',
    height: '100%',
    width: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    background: 'var(--bg-primary)',
    padding: '24px 16px',
    boxSizing: 'border-box',
};

const cardStyle = {
    width: '100%',
    maxWidth: '480px',
    background: 'var(--bg-secondary)',
    borderRadius: '24px',
    padding: '32px 28px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    marginBottom: '24px',
};

const headerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--border-color)',
};

const nameStyle = {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    textAlign: 'center',
};

const badgeStyle = {
    background: 'var(--bg-card)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--accent-color)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
};

const sectionHeaderStyle = {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    marginBottom: '2px',
};

const infoSectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
};

const infoItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '28px',
};

const labelStyle = {
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '500',
    flexShrink: 0,
};

const valueStyle = {
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '700',
    textAlign: 'right',
    wordBreak: 'break-all',
    marginLeft: '12px',
};

const actionSectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
};

const logoutButtonStyle = {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--danger-color)',
    color: 'white',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s, opacity 0.2s',
};

const editButtonOverlayStyle = {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '32px',
    height: '32px',
    backgroundColor: 'var(--accent-color)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    border: '2px solid var(--bg-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    zIndex: 10
};

const uploadProgressOverlayStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: '50%',
    zIndex: 20
};

const stageLabelStyle = {
    position: 'absolute',
    bottom: '-25px',
    whiteSpace: 'nowrap',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--accent-color)',
    animation: 'fadeIn 0.2s ease'
};

const notificationEnableButtonStyle = {
    width: '100%',
    padding: '10px',
    background: 'var(--accent-color)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'opacity 0.2s ease'
};

export default ProfilePage;
