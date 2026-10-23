import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getsocket, toggleSleepMode } from '../service/Websocket';
import { API, toggle2FA, send2FAOtp, changePassword, changePasswordSendOtp } from '../service/UserAuth';
import { savePendingOtpSession } from '../service/otpSessionManager';
import { uploadMedia, STAGE_LABELS } from '../service/MediaUploader';
import { getMediaInfo, getMediaBlob } from '../service/MediaCache';
import MediaViewer from '../components/chat/MediaViewer';
import { Camera, Loader2, LogOut, CheckCircle2, Bell, Moon, MessageCircle, ArrowLeft, ShieldCheck, Edit2, Lock, KeyRound, Eye, EyeOff, X, Calendar, Copy, Check, ExternalLink, Clock } from 'lucide-react';
import Avatar from '../components/chat/Avatar';
import StreakBadge from '../components/pulse/StreakBadge';
import { useNotifications } from '../hooks/useNotifications';
import { getGroupMembersFromDB, syncChatsMapToDB } from '../service/db';
import { getchat } from './ChatNames';
import { useUsernameCheck } from '../hooks/useUsernameCheck';
import { UsernameStatusIndicator } from '../components/common/UsernameStatusIndicator';
import { DisplayNamePolicyModal } from '../components/common/DisplayNamePolicyModal';
import { computeSelfSimilarity } from '../service/nameSimilarity';

const ProfilePage = () => {
    const navigate = useNavigate();
    const { targetUserId } = useParams();
    const userId = localStorage.getItem('userid');
    
    const isTargetUser = Boolean(targetUserId && String(targetUserId) !== String(userId));
    const [targetUserData, setTargetUserData] = useState(null);
    const [targetBookingInfo, setTargetBookingInfo] = useState(null);
    const [targetUserCommonGroups, setTargetUserCommonGroups] = useState([]);
    const [existingChatId, setExistingChatId] = useState(null);
    const [isStartingChat, setIsStartingChat] = useState(false);

    // Meeting booking settings state
    const [bookingSettings, setBookingSettings] = useState({
        isBookingEnabled: true,
        showBusySlots: false,
        bookingSlug: ''
    });
    const [copiedBookingLink, setCopiedBookingLink] = useState(false);

    const { fcmToken, permissionStatus, requestPermissionAndGetToken, disableNotifications } = useNotifications();
    const [username, setUsername] = useState(() => (localStorage.getItem('username') || userId || '').toLowerCase());
    const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName') || localStorage.getItem('username') || userId || '');
    const [lastDisplayNameChangeAt, setLastDisplayNameChangeAt] = useState(() => localStorage.getItem('lastDisplayNameChangeAt') || null);
    const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState(displayName);
    const [savingDisplayName, setSavingDisplayName] = useState(false);
    const [displayNameError, setDisplayNameError] = useState('');

    const [profile, setProfile] = useState(localStorage.getItem('profile'));
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('');
    const [viewingMedia, setViewingMedia] = useState(null);
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const [isSleepMode, setIsSleepMode] = useState(localStorage.getItem('sleepMode') === 'true');
    const [is2FAEnabled, setIs2FAEnabled] = useState(localStorage.getItem('is2FAEnabled') === 'true');
    const [toggling2FA, setToggling2FA] = useState(false);

    // Change Password States
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // Keep 2FA state updated if verified/toggled from OTP modal
    useEffect(() => {
        const handle2FAChange = (e) => {
            if (e?.detail?.is2FAEnabled !== undefined) {
                setIs2FAEnabled(Boolean(e.detail.is2FAEnabled));
            }
        };
        window.addEventListener('2fa_status_changed', handle2FAChange);
        return () => window.removeEventListener('2fa_status_changed', handle2FAChange);
    }, []);

    // Room Nickname Edit States (for Public Rooms)
    const [roomNickname, setRoomNickname] = useState(() => localStorage.getItem('roomNickname') || '');
    const [isEditingRoomNickname, setIsEditingRoomNickname] = useState(false);
    const [newRoomNickname, setNewRoomNickname] = useState(roomNickname);
    const [savingRoomNickname, setSavingRoomNickname] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    const roomNicknameCheck = useUsernameCheck({
        username: newRoomNickname,
        originalName: roomNickname,
        excludeUserId: userId,
        debounceMs: 400
    });

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
                    const groupChats = Object.values(chatsMap).filter(c => c.type === 'group' || c.type === 'classroom' || c.type === 'room' || c.isGroupChat || c.isSpace || c.isClassroom);
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
            const fetchTargetBooking = async () => {
                try {
                    const bRes = await fetch(`${API}/public/book/info/${targetUserId}`);
                    if (bRes.ok) {
                        const bData = await bRes.json();
                        setTargetBookingInfo(bData);
                    }
                } catch (e) {
                    console.error("Failed to load target booking info:", e);
                }
            };
            fetchTargetBooking();
        } else if (userId) {
            const fetchBookingSettings = async () => {
                try {
                    const bRes = await fetch(`${API}/user/event/booking-settings`, {
                        headers: { 'User-Id': userId }
                    });
                    if (bRes.ok) {
                        const bData = await bRes.json();
                        setBookingSettings({
                            isBookingEnabled: bData.isBookingEnabled !== undefined ? Boolean(bData.isBookingEnabled) : true,
                            showBusySlots: Boolean(bData.showBusySlots),
                            bookingSlug: bData.bookingSlug || bData.userId || ''
                        });
                    }
                } catch (e) {
                    console.error("Failed to load booking settings", e);
                }
            };
            fetchBookingSettings();

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
                        const rawUser = data.username || data.userName || '';
                        if (rawUser) {
                            const lowerUser = rawUser.toLowerCase();
                            localStorage.setItem('username', lowerUser);
                            setUsername(lowerUser);
                        }
                        const disp = data.displayName || data.userName || '';
                        if (disp) {
                            localStorage.setItem('displayName', disp);
                            setDisplayName(disp);
                        }
                        if (data.lastDisplayNameChangeAt) {
                            localStorage.setItem('lastDisplayNameChangeAt', data.lastDisplayNameChangeAt);
                            setLastDisplayNameChangeAt(data.lastDisplayNameChangeAt);
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

    useEffect(() => {
        if (!isTargetUser && userId) {
            fetch(`${API}/room/get/name`, { headers: { 'User-Id': userId } })
                .then(res => res.ok ? res.text() : '')
                .then(name => {
                    const cleanName = (name || '').trim();
                    if (cleanName) {
                        setRoomNickname(cleanName);
                        localStorage.setItem('roomNickname', cleanName);
                    }
                })
                .catch(err => console.error('[ProfilePage] Failed to fetch room nickname:', err));
        }
    }, [userId, isTargetUser]);

    const getCooldownRemaining = () => {
        if (!lastDisplayNameChangeAt) return null;
        const changeTime = new Date(lastDisplayNameChangeAt).getTime();
        if (isNaN(changeTime)) return null;
        const now = Date.now();
        const elapsedMs = now - changeTime;
        const cooldownMs = 24 * 60 * 60 * 1000;
        const remainingMs = cooldownMs - elapsedMs;
        if (remainingMs <= 0) return null;

        const remainingSec = Math.floor(remainingMs / 1000);
        const hours = Math.floor(remainingSec / 3600);
        const minutes = Math.floor((remainingSec % 3600) / 60);
        return { hours, minutes, totalMinutes: Math.floor(remainingMs / 60000) };
    };
    const cooldown = getCooldownRemaining();

    const handleSaveDisplayName = async () => {
        const clean = newDisplayName.trim();
        if (!clean) {
            setDisplayNameError('Display name cannot be empty');
            return;
        }
        const score = computeSelfSimilarity(username, clean);
        if (score < 3.0) {
            setDisplayNameError(`Display name must be somewhat similar to your username (@${username}).`);
            return;
        }

        setSavingDisplayName(true);
        setDisplayNameError('');

        try {
            const res = await fetch(`${API}/user/update-display-name`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Id': userId
                },
                body: JSON.stringify({ displayName: clean })
            });

            const data = await res.json();
            if (res.ok && (data.status === 'SUCCESS' || res.status === 200)) {
                const updatedName = data.displayName || clean;
                localStorage.setItem('displayName', updatedName);
                setDisplayName(updatedName);
                if (data.lastDisplayNameChangeAt) {
                    localStorage.setItem('lastDisplayNameChangeAt', data.lastDisplayNameChangeAt);
                    setLastDisplayNameChangeAt(data.lastDisplayNameChangeAt);
                } else {
                    const nowIso = new Date().toISOString();
                    localStorage.setItem('lastDisplayNameChangeAt', nowIso);
                    setLastDisplayNameChangeAt(nowIso);
                }
                setIsEditingDisplayName(false);
                setDisplayNameError('');
            } else if (res.status === 429 || data.status === 'COOLDOWN_ACTIVE') {
                setDisplayNameError(data.message || 'Display name can only be changed once every 24 hours.');
            } else {
                setDisplayNameError(data.message || 'Failed to update display name.');
            }
        } catch (err) {
            console.error('Failed to update display name:', err);
            setDisplayNameError('Network error updating display name.');
        } finally {
            setSavingDisplayName(false);
        }
    };

    const handleSaveRoomNickname = async () => {
        if (roomNicknameCheck.isBlocked) {
            alert(roomNicknameCheck.message || 'Please choose an available room nickname');
            return;
        }
        if (roomNicknameCheck.isChecking) {
            alert('Validating nickname availability, please wait...');
            return;
        }
        setSavingRoomNickname(true);
        try {
            const clean = newRoomNickname.trim();
            const res = await fetch(`${API}/room/set/name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Id': userId },
                body: JSON.stringify({ name: clean })
            });
            if (res.ok) {
                localStorage.setItem('roomNickname', clean);
                setRoomNickname(clean);
                setIsEditingRoomNickname(false);
            } else {
                const err = await res.text();
                alert(err || 'Failed to update room nickname');
            }
        } catch (err) {
            alert('Failed to update room nickname');
        } finally {
            setSavingRoomNickname(false);
        }
    };

    const handle2FAToggle = async () => {
        if (!userId) return;
        setToggling2FA(true);
        try {
            const nextEnable = !is2FAEnabled;
            const res = await send2FAOtp(nextEnable, userId);
            const data = res.data;
            if (data?.status === 'SUCCESS' || res.status === 200) {
                savePendingOtpSession({
                    flow: '2FA_TOGGLE',
                    payload: { enable: nextEnable },
                    promptMessage: nextEnable
                        ? 'Enter the 6-digit code sent to your email to turn ON Two-Factor Authentication.'
                        : 'Enter the 6-digit code sent to your email to turn OFF Two-Factor Authentication.'
                });
            } else {
                alert(data?.message || 'Failed to send verification code for 2FA');
            }
        } catch (err) {
            console.error('Failed to toggle 2FA:', err);
            const errMsg = err.response?.data?.message || err.message || 'Error requesting 2FA verification code';
            alert(errMsg);
        } finally {
            setToggling2FA(false);
        }
    };

    const handleToggleBookingEnabled = async () => {
        const nextVal = !bookingSettings.isBookingEnabled;
        setBookingSettings(prev => ({ ...prev, isBookingEnabled: nextVal }));
        try {
            await fetch(`${API}/user/event/booking-settings`, {
                method: 'POST',
                headers: { 'User-Id': userId, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isBookingEnabled: nextVal,
                    showBusySlots: bookingSettings.showBusySlots
                })
            });
        } catch (e) {
            console.error('Failed to update booking enabled', e);
            setBookingSettings(prev => ({ ...prev, isBookingEnabled: !nextVal }));
        }
    };

    const handleToggleShowBusySlots = async () => {
        const nextVal = !bookingSettings.showBusySlots;
        setBookingSettings(prev => ({ ...prev, showBusySlots: nextVal }));
        try {
            await fetch(`${API}/user/event/booking-settings`, {
                method: 'POST',
                headers: { 'User-Id': userId, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isBookingEnabled: bookingSettings.isBookingEnabled,
                    showBusySlots: nextVal
                })
            });
        } catch (e) {
            console.error('Failed to update show busy slots', e);
            setBookingSettings(prev => ({ ...prev, showBusySlots: !nextVal }));
        }
    };

    const handleCopyBookingLink = () => {
        const slug = bookingSettings.bookingSlug || username || userId;
        const link = `${window.location.origin}/book/${slug}`;
        navigator.clipboard.writeText(link);
        setCopiedBookingLink(true);
        setTimeout(() => setCopiedBookingLink(false), 2000);
    };

    const handleChangePassword = async (e) => {
        if (e) e.preventDefault();
        setPasswordError('');
        setPasswordSuccessMsg('');

        if (!currentPassword) {
            setPasswordError('Please enter your current password.');
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }

        setIsSubmittingPassword(true);
        try {
            const res = await changePassword({
                currentPassword,
                newPassword
            }, userId);

            const data = res.data;
            if (data?.status === '2FA_REQUIRED') {
                savePendingOtpSession({
                    flow: 'CHANGE_PASSWORD',
                    payload: { currentPassword, newPassword },
                    promptMessage: data.message || '2FA is enabled. Enter the verification code sent to your email to confirm password change.'
                });
                setIsChangePasswordOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else if (data?.status === 'SUCCESS' || res.status === 200) {
                setPasswordSuccessMsg('Password updated successfully!');
                setTimeout(() => {
                    setIsChangePasswordOpen(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordSuccessMsg('');
                }, 1500);
            } else {
                setPasswordError(data?.message || 'Failed to update password.');
            }
        } catch (err) {
            console.error('Change password failed:', err);
            const errMsg = err.response?.data?.message || err.message || 'Error changing password';
            setPasswordError(errMsg);
        } finally {
            setIsSubmittingPassword(false);
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
                            chat={{
                                profile: displayUser.profile,
                                id: displayUser.userId,
                                userName: displayUser.userName,
                                type: 'private',
                                pulseStreak: displayUser.pulseStreak || displayUser.streak,
                                hasActivePulse: displayUser.hasActivePulse,
                                allSeen: displayUser.allSeen
                            }}
                            hasActivePulse={displayUser.hasActivePulse}
                            allSeen={displayUser.allSeen}
                            size={120}
                            highRes={true}
                            onClick={() => handleAvatarView(displayUser.profile)}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h1 style={nameStyle}>{displayUser.displayName || displayUser.userName || targetUserId}</h1>
                                {(displayUser.pulseStreak || displayUser.streak) > 0 && (
                                    <StreakBadge streak={displayUser.pulseStreak || displayUser.streak} size="md" />
                                )}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                @{displayUser.username || displayUser.userName || targetUserId} · {displayUser.userId || targetUserId}
                            </div>
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
                                <span style={labelStyle}>Permanent Username</span>
                                <span style={{ ...valueStyle, fontFamily: 'monospace' }}>@{displayUser.username || displayUser.userName || targetUserId}</span>
                            </div>
                            <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                <span style={labelStyle}>Display Name</span>
                                <span style={valueStyle}>{displayUser.displayName || displayUser.userName || targetUserId}</span>
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
                                    : 'linear-gradient(135deg, var(--success-color) 0%, var(--success-color) 100%)',
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

                    {/* Book Meeting Button (if booking enabled) */}
                    {(targetBookingInfo ? targetBookingInfo.isBookingEnabled : displayUser.isBookingEnabled !== false) && (
                        <div>
                            <button
                                onClick={() => navigate(`/book/${(targetBookingInfo && targetBookingInfo.bookingSlug) || displayUser.bookingSlug || displayUser.userName || targetUserId}`)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '14px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Calendar size={19} color="var(--accent-text)" />
                                Book Meeting
                            </button>
                        </div>
                    )}

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
                    <h1 style={nameStyle}>{displayName || username}</h1>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        @{username} · {userId}
                    </div>
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

                        {/* Permanent Username */}
                        <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={labelStyle}>Permanent Username</span>
                                <span style={{
                                    fontSize: '10px',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'var(--bg-hover)',
                                    color: 'var(--text-secondary)',
                                    fontWeight: '600',
                                    border: '1px solid var(--border-color)',
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase'
                                }}>
                                    Permanent
                                </span>
                            </div>
                            <span style={{ ...valueStyle, fontFamily: 'monospace' }}>@{username}</span>
                        </div>

                        {/* Changeable Display Name */}
                        <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '12px', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={labelStyle}>Display Name</span>
                                {!isEditingDisplayName ? (
                                    cooldown ? (
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '11px',
                                            color: 'var(--warning-color)',
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            padding: '3px 8px',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            border: '1px solid rgba(245, 158, 11, 0.2)'
                                        }}>
                                            <Clock size={12} /> Can change in {cooldown.hours}h {cooldown.minutes}m
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setNewDisplayName(displayName);
                                                setDisplayNameError('');
                                                setIsEditingDisplayName(true);
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}
                                        >
                                            <Edit2 size={13} /> Edit
                                        </button>
                                    )
                                ) : null}
                            </div>

                            {!isEditingDisplayName ? (
                                <div>
                                    <span style={valueStyle}>{displayName || username}</span>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Appears on your profile and uncustomized chats. Can be changed once every 24 hours.
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={newDisplayName}
                                            onChange={e => {
                                                setNewDisplayName(e.target.value);
                                                setDisplayNameError('');
                                            }}
                                            placeholder="Enter display name..."
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                border: `1px solid ${
                                                    displayNameError
                                                        ? 'var(--danger-color)'
                                                        : (newDisplayName.trim() && computeSelfSimilarity(username, newDisplayName) >= 3.0)
                                                            ? 'var(--success-color)'
                                                            : 'var(--border-color)'
                                                }`,
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '13px'
                                            }}
                                        />
                                    </div>

                                    {/* Similarity Score feedback */}
                                    {newDisplayName.trim() && (
                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: computeSelfSimilarity(username, newDisplayName) >= 3.0 ? 'var(--success-color)' : 'var(--danger-color)'
                                        }}>
                                            {computeSelfSimilarity(username, newDisplayName) >= 3.0 ? (
                                                <span>✓ Name is somewhat similar to @{username} (Valid)</span>
                                            ) : (
                                                <span>✕ Name must be somewhat similar to @{username}</span>
                                            )}
                                        </div>
                                    )}

                                    {displayNameError && (
                                        <div style={{ fontSize: '12px', color: 'var(--danger-color)', fontWeight: '500' }}>
                                            {displayNameError}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            Display names must be somewhat similar to your username.{' '}
                                            <button
                                                type="button"
                                                onClick={() => setShowPolicyModal(true)}
                                                style={{
                                                    color: 'var(--accent-text)',
                                                    textDecoration: 'underline',
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Learn more
                                            </button>
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button
                                            onClick={handleSaveDisplayName}
                                            disabled={savingDisplayName || !newDisplayName.trim() || computeSelfSimilarity(username, newDisplayName) < 3.0}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                background: 'var(--accent-color)',
                                                color: 'white',
                                                border: 'none',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: (savingDisplayName || !newDisplayName.trim() || computeSelfSimilarity(username, newDisplayName) < 3.0) ? 'not-allowed' : 'pointer',
                                                opacity: (savingDisplayName || !newDisplayName.trim() || computeSelfSimilarity(username, newDisplayName) < 3.0) ? 0.6 : 1
                                            }}
                                        >
                                            {savingDisplayName ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setNewDisplayName(displayName);
                                                setDisplayNameError('');
                                                setIsEditingDisplayName(false);
                                            }}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-card-hover)',
                                                color: 'var(--text-secondary)',
                                                border: '1px solid var(--border-color)',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Room Nickname */}
                        <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '12px', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={labelStyle}>Room Nickname (Public Rooms)</span>
                                {!isEditingRoomNickname && (
                                    <button
                                        onClick={() => {
                                            setNewRoomNickname(roomNickname);
                                            setIsEditingRoomNickname(true);
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}
                                    >
                                        <Edit2 size={13} /> Edit
                                    </button>
                                )}
                            </div>
                            {!isEditingRoomNickname ? (
                                <span style={valueStyle}>{roomNickname || 'None (Set anonymous handle)'}</span>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            value={newRoomNickname}
                                            onChange={e => setNewRoomNickname(e.target.value)}
                                            placeholder="Enter room nickname..."
                                            style={{
                                                width: '100%',
                                                padding: '8px 36px 8px 12px',
                                                borderRadius: '10px',
                                                border: `1px solid ${roomNicknameCheck.status === 'block' ? 'var(--danger-color)' : roomNicknameCheck.status === 'warn' ? 'var(--warning-color)' : roomNicknameCheck.status === 'allow' ? 'var(--success-color)' : 'var(--border-color)'}`,
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '13px'
                                            }}
                                        />
                                        <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center' }}>
                                            <UsernameStatusIndicator checkResult={roomNicknameCheck} showInlineIcon={true} />
                                        </div>
                                    </div>
                                    <UsernameStatusIndicator checkResult={roomNicknameCheck} />
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            Nicknames are checked to prevent impersonation.{' '}
                                            <button
                                                type="button"
                                                onClick={() => setShowPolicyModal(true)}
                                                style={{
                                                    color: 'var(--accent-text)',
                                                    textDecoration: 'underline',
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Learn more
                                            </button>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button
                                            onClick={handleSaveRoomNickname}
                                            disabled={savingRoomNickname || roomNicknameCheck.isBlocked || roomNicknameCheck.isChecking}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                background: 'var(--accent-color)',
                                                color: 'white',
                                                border: 'none',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: (savingRoomNickname || roomNicknameCheck.isBlocked || roomNicknameCheck.isChecking) ? 'not-allowed' : 'pointer',
                                                opacity: (savingRoomNickname || roomNicknameCheck.isBlocked || roomNicknameCheck.isChecking) ? 0.6 : 1
                                            }}
                                        >
                                            {savingRoomNickname ? 'Saving...' : roomNicknameCheck.isChecking ? 'Checking...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setNewRoomNickname(roomNickname);
                                                setIsEditingRoomNickname(false);
                                            }}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-card-hover)',
                                                color: 'var(--text-secondary)',
                                                border: '1px solid var(--border-color)',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <span style={labelStyle}>Status</span>
                            {isSleepMode ? (
                                <span style={{ ...valueStyle, color: 'var(--warning-color)' }}>Sleeping 😴</span>
                            ) : (
                                <span style={{ ...valueStyle, color: 'var(--success-color)' }}>● Online</span>
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
                                <span style={{ color: 'var(--success-color)', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={13} /> On
                                </span>
                            ) : (
                                <span style={{ color: 'var(--danger-color)', fontSize: '12px', fontWeight: '700' }}>Off</span>
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
                                    style={{ ...notificationEnableButtonStyle, background: 'var(--danger-tint)', color: 'var(--danger-color)', border: '1px solid var(--danger-tint-border)' }}
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
                                <Moon size={16} color={isSleepMode ? 'var(--warning-color)' : 'var(--accent-color)'} />
                                <span style={{ ...labelStyle, color: 'var(--text-primary)', fontWeight: '600' }}>Sleep Mode</span>
                            </div>
                            {isSleepMode ? (
                                <span style={{ color: 'var(--warning-color)', fontSize: '12px', fontWeight: '700' }}>Active</span>
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
                                color: isSleepMode ? 'var(--warning-color)' : 'var(--text-primary)',
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
                                <ShieldCheck size={16} color={is2FAEnabled ? 'var(--success-color)' : 'var(--accent-color)'} />
                                <span style={{ ...labelStyle, color: 'var(--text-primary)', fontWeight: '600' }}>2-Factor Authentication</span>
                            </div>
                            {is2FAEnabled ? (
                                <span style={{ color: 'var(--success-color)', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={13} /> Enabled
                                </span>
                            ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700' }}>Disabled</span>
                            )}
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: '1.5' }}>
                            {is2FAEnabled
                                ? "An OTP email code will be required whenever you sign in or modify sensitive settings."
                                : "Add an extra layer of security to your account with email OTP verification."}
                        </p>

                        <button
                            onClick={handle2FAToggle}
                            disabled={toggling2FA}
                            style={{
                                ...notificationEnableButtonStyle,
                                background: is2FAEnabled ? 'var(--danger-tint)' : 'var(--accent-color)',
                                color: is2FAEnabled ? 'var(--danger-color)' : 'white',
                                border: is2FAEnabled ? '1px solid var(--danger-tint-border)' : 'none',
                                opacity: toggling2FA ? 0.7 : 1,
                                cursor: toggling2FA ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {toggling2FA ? 'Sending Verification Code...' : is2FAEnabled ? 'Disable 2FA' : 'Enable 2-Factor Authentication'}
                        </button>

                        {/* Password Management */}
                        <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Lock size={16} color="var(--accent-color)" />
                                <span style={{ ...labelStyle, color: 'var(--text-primary)', fontWeight: '600' }}>Account Password</span>
                            </div>
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0', lineHeight: '1.5' }}>
                            Update your login password regularly to protect your account.
                        </p>

                        <button
                            onClick={() => {
                                setPasswordError('');
                                setPasswordSuccessMsg('');
                                setIsChangePasswordOpen(true);
                            }}
                            style={{
                                ...notificationEnableButtonStyle,
                                background: 'var(--bg-card-hover)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            Change Password
                        </button>
                    </div>
                </div>

                {/* Meeting Booking & Scheduling Link */}
                <div>
                    <p style={sectionHeaderStyle}>Meeting Booking & Scheduling</p>
                    <div style={infoSectionStyle}>
                        {/* Toggle Booking Enabled */}
                        <div style={{ ...infoItemStyle, marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} color="var(--accent-color)" />
                                <span style={{ ...labelStyle, color: 'var(--text-primary)', fontWeight: '600' }}>
                                    Meeting Booking Link
                                </span>
                            </div>
                            <button
                                onClick={handleToggleBookingEnabled}
                                style={{
                                    border: 'none',
                                    borderRadius: '20px',
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    backgroundColor: bookingSettings.isBookingEnabled ? 'rgba(16, 185, 129, 0.15)' : 'var(--danger-tint)',
                                    color: bookingSettings.isBookingEnabled ? 'var(--success-color)' : 'var(--danger-color)'
                                }}
                            >
                                {bookingSettings.isBookingEnabled ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>

                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                            {bookingSettings.isBookingEnabled
                                ? "Your public booking URL is active. Anyone with the link or other LetsChat users can schedule meetings with you."
                                : "Your booking link is currently deactivated. Visitors cannot schedule new meetings."}
                        </p>

                        {bookingSettings.isBookingEnabled && (
                            <>
                                {/* Booking URL copy box */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    padding: '8px 12px',
                                    marginBottom: '14px'
                                }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {window.location.origin}/book/{bookingSettings.bookingSlug || username || userId}
                                    </span>
                                    <button
                                        onClick={handleCopyBookingLink}
                                        style={{
                                            border: 'none',
                                            backgroundColor: copiedBookingLink ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-card-hover)',
                                            color: copiedBookingLink ? 'var(--success-color)' : 'var(--text-primary)',
                                            borderRadius: '8px',
                                            padding: '6px 10px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {copiedBookingLink ? <Check size={14} /> : <Copy size={14} />}
                                        {copiedBookingLink ? 'Copied' : 'Copy'}
                                    </button>
                                </div>

                                {/* Privacy: Show busy slots toggle */}
                                <div style={{ ...infoItemStyle, borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginBottom: '4px' }}>
                                    <span style={{ ...labelStyle, color: 'var(--text-primary)', fontSize: '13px' }}>
                                        Show Busy Slots on Booking Page
                                    </span>
                                    <button
                                        onClick={handleToggleShowBusySlots}
                                        style={{
                                            border: 'none',
                                            borderRadius: '20px',
                                            padding: '4px 12px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            backgroundColor: bookingSettings.showBusySlots ? 'var(--accent-tint)' : 'var(--bg-secondary)',
                                            color: bookingSettings.showBusySlots ? 'var(--accent-text)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        {bookingSettings.showBusySlots ? 'Public' : 'Hidden'}
                                    </button>
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                                    {bookingSettings.showBusySlots
                                        ? "Visitors can see your busy times to avoid booking overlapping slots."
                                        : "Privacy mode: busy blocks are hidden, preventing visitors from seeing when you are occupied."}
                                </p>
                            </>
                        )}
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

            {/* Name Protection & Anti-Impersonation Explanation Modal */}
            <DisplayNamePolicyModal
                isOpen={showPolicyModal}
                onClose={() => setShowPolicyModal(false)}
            />

            {/* Change Password Modal */}
            {isChangePasswordOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    zIndex: 1000
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '440px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)',
                        padding: '24px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    backgroundColor: 'var(--accent-tint)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Lock size={20} color="var(--accent-text)" />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    Change Password
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setIsChangePasswordOpen(false);
                                    setPasswordError('');
                                    setPasswordSuccessMsg('');
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            Enter your current password and choose a secure new password. If 2FA is enabled, you will be prompted for an email verification code.
                        </p>

                        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Current Password
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        style={{
                                            width: '100%',
                                            padding: '11px 40px 11px 14px',
                                            borderRadius: '10px',
                                            backgroundColor: 'var(--bg-primary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    New Password (min. 6 characters)
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        style={{
                                            width: '100%',
                                            padding: '11px 40px 11px 14px',
                                            borderRadius: '10px',
                                            backgroundColor: 'var(--bg-primary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPw(!showNewPw)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Confirm New Password
                                </label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type={showConfirmPw ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-type new password"
                                        style={{
                                            width: '100%',
                                            padding: '11px 40px 11px 14px',
                                            borderRadius: '10px',
                                            backgroundColor: 'var(--bg-primary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {passwordError && (
                                <div style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--danger-tint)',
                                    border: '1px solid var(--danger-tint-border)',
                                    color: 'var(--danger-color)',
                                    fontSize: '13px'
                                }}>
                                    {passwordError}
                                </div>
                            )}

                            {passwordSuccessMsg && (
                                <div style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    color: 'var(--success-color)',
                                    fontSize: '13px'
                                }}>
                                    {passwordSuccessMsg}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsChangePasswordOpen(false);
                                        setPasswordError('');
                                        setPasswordSuccessMsg('');
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '11px',
                                        borderRadius: '10px',
                                        backgroundColor: 'var(--bg-card-hover)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingPassword}
                                    style={{
                                        flex: 2,
                                        padding: '11px',
                                        borderRadius: '10px',
                                        backgroundColor: 'var(--accent-color)',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        cursor: isSubmittingPassword ? 'not-allowed' : 'pointer',
                                        opacity: isSubmittingPassword ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {isSubmittingPassword && <Loader2 size={16} className="animate-spin" />}
                                    {isSubmittingPassword ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
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
    background: 'var(--bg-hover)',
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
