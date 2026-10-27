import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getsocket, toggleSleepMode } from '../service/Websocket';
import {
  API,
  toggle2FA,
  send2FAOtp,
  changePassword,
  changePasswordSendOtp,
  removeFCMToken
} from '../service/UserAuth';
import { savePendingOtpSession } from '../service/otpSessionManager';
import { uploadMedia, STAGE_LABELS } from '../service/MediaUploader';
import { getMediaInfo, getMediaBlob } from '../service/MediaCache';
import MediaViewer from '../components/chat/MediaViewer';
import {
  User,
  Bell,
  ShieldCheck,
  Calendar,
  LogOut,
  Copy,
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';
import Avatar from '../components/chat/Avatar';
import StreakBadge from '../components/pulse/StreakBadge';
import { useNotifications } from '../hooks/useNotifications';
import { getGroupMembersFromDB, syncChatsMapToDB } from '../service/db';
import { getchat } from './ChatNames';
import { useUsernameCheck } from '../hooks/useUsernameCheck';
import { UsernameStatusIndicator } from '../components/common/UsernameStatusIndicator';
import { DisplayNamePolicyModal } from '../components/common/DisplayNamePolicyModal';
import { computeSelfSimilarity } from '../service/nameSimilarity';
import LogoutConfirmModal from '../components/modals/LogoutConfirmModal';

// Redesigned modular profile components
import ProfileBackRow from './profile/ProfileBackRow';
import ProfileHeader from './profile/ProfileHeader';
import SettingsGroup from './profile/SettingsGroup';
import SettingsRow from './profile/SettingsRow';
import ProfileSwitch from './profile/ProfileSwitch';
import DisplayNameSheet from './profile/DisplayNameSheet';
import RoomNicknameSheet from './profile/RoomNicknameSheet';
import PasswordSheet from './profile/PasswordSheet';
import OtherUserProfile from './profile/OtherUserProfile';
import ProfileToast from './profile/ProfileToast';

/**
 * Responsive media query hook for 768px desktop breakpoint.
 */
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const listener = (e) => setMatches(e.matches);
    setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { targetUserId } = useParams();
  const userId = localStorage.getItem('userid');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const isTargetUser = Boolean(targetUserId && String(targetUserId) !== String(userId));
  const [targetUserData, setTargetUserData] = useState(null);
  const [targetBookingInfo, setTargetBookingInfo] = useState(null);
  const [targetUserCommonGroups, setTargetUserCommonGroups] = useState([]);
  const [existingChatId, setExistingChatId] = useState(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Desktop active tab: 'account' | 'notifications' | 'security' | 'meetings'
  const [selectedSection, setSelectedSection] = useState('account');

  // Short toast message
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => setToastMessage(msg);

  // Meeting booking settings state
  const [bookingSettings, setBookingSettings] = useState({
    isBookingEnabled: true,
    showBusySlots: false,
    bookingSlug: ''
  });
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);

  // Push notifications hook
  const {
    fcmToken,
    permissionStatus,
    requestPermissionAndGetToken,
    disableNotifications
  } = useNotifications();

  // User Profile state
  const [username, setUsername] = useState(() =>
    (localStorage.getItem('username') || userId || '').toLowerCase()
  );
  const [displayName, setDisplayName] = useState(() =>
    localStorage.getItem('displayName') || localStorage.getItem('username') || userId || ''
  );
  const [lastDisplayNameChangeAt, setLastDisplayNameChangeAt] = useState(() =>
    localStorage.getItem('lastDisplayNameChangeAt') || null
  );

  // Sheets state
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(displayName);
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');

  const [profile, setProfile] = useState(localStorage.getItem('profile'));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [viewingMedia, setViewingMedia] = useState(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [isSleepMode, setIsSleepMode] = useState(
    localStorage.getItem('sleepMode') === 'true'
  );
  const [is2FAEnabled, setIs2FAEnabled] = useState(
    localStorage.getItem('is2FAEnabled') === 'true'
  );
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

  // Room Nickname Edit States (for Public Rooms)
  const [roomNickname, setRoomNickname] = useState(() =>
    localStorage.getItem('roomNickname') || ''
  );
  const [isEditingRoomNickname, setIsEditingRoomNickname] = useState(false);
  const [newRoomNickname, setNewRoomNickname] = useState(roomNickname);
  const [savingRoomNickname, setSavingRoomNickname] = useState(false);
  const [roomNicknameError, setRoomNicknameError] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const fileInputRef = useRef(null);

  // Room nickname availability checker
  const roomNicknameCheck = useUsernameCheck({
    username: newRoomNickname,
    originalName: roomNickname,
    excludeUserId: userId,
    debounceMs: 400
  });

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

  // Fetch Other User or Own Profile Data
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
        const rawMap = localStorage.getItem('chatsMap');
        if (rawMap) {
          const chatsMap = JSON.parse(rawMap);
          const found = Object.values(chatsMap).find((c) => {
            return (
              c.type === 'private' &&
              (String(c.otherUserId) === String(targetUserId) ||
                String(c.id) === String(targetUserId) ||
                String(c.chatId).includes(targetUserId))
            );
          });
          if (found) {
            setExistingChatId(found.chatId);
          }
        }
      } catch (err) {
        console.error('Error parsing chatsMap:', err);
      }

      // Compute shared groups
      const computeCommon = async () => {
        try {
          const rawMap = localStorage.getItem('chatsMap');
          if (!rawMap) return;
          const chatsMap = JSON.parse(rawMap);
          const groupChats = Object.values(chatsMap).filter(
            (c) =>
              c.type === 'group' ||
              c.type === 'classroom' ||
              c.type === 'room' ||
              c.isGroupChat ||
              c.isSpace ||
              c.isClassroom
          );
          const shared = [];
          for (const grp of groupChats) {
            const members = await getGroupMembersFromDB(grp.chatId);
            if (members && members.length > 0) {
              if (members.some((m) => String(m.userId) === String(targetUserId))) {
                shared.push(grp);
              }
            }
          }
          setTargetUserCommonGroups(shared);
        } catch (err) {
          console.error('Failed to compute common groups in ProfilePage:', err);
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
          console.error('Failed to load target booking info:', e);
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
              isBookingEnabled:
                bData.isBookingEnabled !== undefined
                  ? Boolean(bData.isBookingEnabled)
                  : true,
              showBusySlots: Boolean(bData.showBusySlots),
              bookingSlug: bData.bookingSlug || bData.userId || ''
            });
          }
        } catch (e) {
          console.error('Failed to load booking settings', e);
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

  // Fetch Room Nickname
  useEffect(() => {
    if (!isTargetUser && userId) {
      fetch(`${API}/room/get/name`, { headers: { 'User-Id': userId } })
        .then((res) => (res.ok ? res.text() : ''))
        .then((name) => {
          const cleanName = (name || '').trim();
          if (cleanName) {
            setRoomNickname(cleanName);
            localStorage.setItem('roomNickname', cleanName);
          }
        })
        .catch((err) => console.error('[ProfilePage] Failed to fetch room nickname:', err));
    }
  }, [userId, isTargetUser]);

  // Cooldown calculation: 24h between display name changes
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

  // Save Display Name
  const handleSaveDisplayName = async () => {
    const clean = newDisplayName.trim();
    if (!clean) {
      setDisplayNameError('Display name cannot be empty');
      return;
    }
    if (clean.length <= 5) {
      setDisplayNameError('Display name must be more than 5 characters');
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
        showToast('Display name updated successfully');
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

  // Save Room Nickname
  const handleSaveRoomNickname = async () => {
    if (roomNicknameCheck.isBlocked) {
      setRoomNicknameError(roomNicknameCheck.message || 'Please choose an available room nickname');
      return;
    }
    if (roomNicknameCheck.isChecking) {
      setRoomNicknameError('Validating nickname availability, please wait...');
      return;
    }
    setSavingRoomNickname(true);
    setRoomNicknameError('');

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
        showToast('Room nickname updated successfully');
      } else {
        const err = await res.text();
        setRoomNicknameError(err || 'Failed to update room nickname');
      }
    } catch (err) {
      setRoomNicknameError('Failed to update room nickname');
    } finally {
      setSavingRoomNickname(false);
    }
  };

  // Toggle Two-Factor Authentication
  const handle2FAToggle = async () => {
    if (!userId || toggling2FA) return;
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
        showToast(data?.message || 'Failed to send verification code for 2FA');
      }
    } catch (err) {
      console.error('Failed to toggle 2FA:', err);
      const errMsg =
        err.response?.data?.message || err.message || 'Error requesting 2FA verification code';
      showToast(errMsg);
    } finally {
      setToggling2FA(false);
    }
  };

  // Toggle Meeting Booking Enabled with Optimistic Rollback
  const handleToggleBookingEnabled = async () => {
    const nextVal = !bookingSettings.isBookingEnabled;
    setBookingSettings((prev) => ({ ...prev, isBookingEnabled: nextVal }));
    try {
      await fetch(`${API}/user/event/booking-settings`, {
        method: 'POST',
        headers: { 'User-Id': userId, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isBookingEnabled: nextVal,
          showBusySlots: bookingSettings.showBusySlots
        })
      });
      showToast(nextVal ? 'Meeting bookings enabled' : 'Meeting bookings disabled');
    } catch (e) {
      console.error('Failed to update booking enabled', e);
      setBookingSettings((prev) => ({ ...prev, isBookingEnabled: !nextVal }));
      showToast('Failed to update booking settings');
    }
  };

  // Toggle Show Busy Slots with Optimistic Rollback
  const handleToggleShowBusySlots = async () => {
    const nextVal = !bookingSettings.showBusySlots;
    setBookingSettings((prev) => ({ ...prev, showBusySlots: nextVal }));
    try {
      await fetch(`${API}/user/event/booking-settings`, {
        method: 'POST',
        headers: { 'User-Id': userId, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isBookingEnabled: bookingSettings.isBookingEnabled,
          showBusySlots: nextVal
        })
      });
      showToast(nextVal ? 'Busy slots visible to visitors' : 'Busy slots hidden');
    } catch (e) {
      console.error('Failed to update show busy slots', e);
      setBookingSettings((prev) => ({ ...prev, showBusySlots: !nextVal }));
      showToast('Failed to update busy slots setting');
    }
  };

  // Construct Public Booking Link
  const constructBookingUrl = (slug) => {
    const cleanSlug = (slug || '').trim().replace(/^@/, '');
    const envUrl = import.meta.env.VITE_FRONTEND_URL;
    if (envUrl) {
      const base = envUrl.replace(/\/$/, '');
      return base.includes('#') ? `${base}/book/${cleanSlug}` : `${base}/#/book/${cleanSlug}`;
    }
    const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(/\/$/, '');
    return `${base}/#/book/${cleanSlug}`;
  };

  const handleCopyBookingLink = () => {
    const slug = bookingSettings.bookingSlug || username || userId;
    const link = constructBookingUrl(slug);
    navigator.clipboard.writeText(link);
    setCopiedBookingLink(true);
    showToast('Booking link copied to clipboard');
    setTimeout(() => setCopiedBookingLink(false), 2000);
  };

  // Change Password Handler
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
      const res = await changePassword(
        {
          currentPassword,
          newPassword
        },
        userId
      );

      const data = res.data;
      if (data?.status === '2FA_REQUIRED') {
        savePendingOtpSession({
          flow: 'CHANGE_PASSWORD',
          payload: { currentPassword, newPassword },
          promptMessage:
            data.message ||
            '2FA is enabled. Enter the verification code sent to your email to confirm password change.'
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
          showToast('Password changed successfully');
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

  // Start or Go to Chat with Target User
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
          'User-Id': userId
        }
      });
      if (response.ok) {
        const data = await response.text();
        getchat(data);
        const res = await fetch(`${API}/user/chatbox/${userId}`);
        if (res.ok) {
          const chatData = await res.json();
          let chatsMap = {};
          chatData.forEach((c) => (chatsMap[c.chatId] = c));
          localStorage.setItem('chatsMap', JSON.stringify(chatsMap));
          syncChatsMapToDB(chatsMap);
        }
        navigate(`/chat/${data}`);
      } else {
        showToast('Failed to start chat');
      }
    } catch (e) {
      console.error('Error starting chat:', e);
      showToast('Error starting chat');
    } finally {
      setIsStartingChat(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const socket = getsocket();
      if (socket) socket.close();
    } catch (e) {}

    const deviceId = localStorage.getItem('deviceId');
    if (deviceId) {
      try {
        await removeFCMToken(deviceId);
      } catch (err) {
        console.error('Failed to remove FCM token on logout:', err);
      }
    }

    localStorage.clear();
    navigate('/login');
  };

  // Avatar View Handler
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

  // Camera badge click handler: shows toast if in sleep mode
  const handleCameraBadgeClick = (e) => {
    e.stopPropagation();
    if (isSleepMode) {
      showToast('Cannot edit profile in sleep mode');
      return;
    }
    if (!uploading) fileInputRef.current?.click();
  };

  // File picker handler for Avatar upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast('This file exceeds the 50MB size limit.');
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
        showToast('Profile picture updated');
        setTimeout(() => {
          setUploading(false);
          setStage('');
        }, 1000);
      } else {
        throw new Error('Failed to update profile picture on server');
      }
    } catch (err) {
      console.error('[ProfileUpload]', err);
      showToast('Upload failed: ' + err.message);
      setUploading(false);
    }
  };

  const handleSleepModeToggle = () => {
    const newValue = !isSleepMode;
    setIsSleepMode(newValue);
    toggleSleepMode(newValue);
    showToast(newValue ? 'Sleep mode enabled' : 'Sleep mode disabled');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Target User Profile View (when targetUserId !== userId)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isTargetUser) {
    const displayUser = targetUserData || {
      userId: targetUserId,
      userName: targetUserId
    };

    return (
      <div className="profile-scroll-page">
        <ProfileBackRow title="Profile" />
        <div style={styles.mobileContentPadding}>
          <OtherUserProfile
            displayUser={displayUser}
            targetUserId={targetUserId}
            existingChatId={existingChatId}
            isStartingChat={isStartingChat}
            onStartOrGoToChat={handleStartOrGoToChat}
            targetBookingInfo={targetBookingInfo}
            commonGroups={targetUserCommonGroups}
            onAvatarClick={handleAvatarView}
            onCopyUserId={(uid) => {
              navigator.clipboard.writeText(uid);
              showToast('User ID copied to clipboard');
            }}
            isDesktop={isDesktop}
          />
        </div>

        {viewingMedia && (
          <MediaViewer media={viewingMedia} onClose={() => setViewingMedia(null)} />
        )}

        <ProfileToast message={toastMessage} onClose={() => setToastMessage('')} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Own Profile Settings Groups Definitions
  // ─────────────────────────────────────────────────────────────────────────────
  const renderAccountGroup = () => (
    <SettingsGroup label="Account">
      {/* Display Name Row */}
      <SettingsRow
        label="Display name"
        value={
          cooldown
            ? `Can change in ${cooldown.hours}h ${cooldown.minutes}m`
            : displayName || 'Not set'
        }
        chevron={!cooldown}
        disabled={Boolean(cooldown)}
        onClick={
          cooldown
            ? undefined
            : () => {
                setNewDisplayName(displayName);
                setDisplayNameError('');
                setIsEditingDisplayName(true);
              }
        }
      />

      {/* Room Nickname Row */}
      <SettingsRow
        label="Room nickname"
        subtitle="Your handle in public rooms"
        value={roomNickname || 'Not set'}
        chevron={true}
        onClick={() => {
          setNewRoomNickname(roomNickname);
          setRoomNicknameError('');
          setIsEditingRoomNickname(true);
        }}
      />

      {/* Username (Permanent / Read-Only) */}
      <SettingsRow
        label="Username"
        value={`@${username}`}
        action={<span style={styles.permanentBadge}>Permanent</span>}
      />

      {/* User ID Row with Copy button */}
      <SettingsRow
        label="User ID"
        value={userId}
        action={
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(userId);
              showToast('User ID copied to clipboard');
            }}
            style={styles.inlineCopyBtn}
            title="Copy User ID"
            aria-label="Copy User ID"
            className="profile-interactive-btn"
          >
            <Copy size={14} color="var(--text-secondary)" />
          </button>
        }
        isLast={true}
      />
    </SettingsGroup>
  );

  const renderNotificationsGroup = () => {
    const isPushDenied = permissionStatus === 'denied';
    const isPushActive = permissionStatus === 'granted' && Boolean(fcmToken);

    return (
      <SettingsGroup label="Notifications & status">
        {/* Push Notifications Row */}
        <SettingsRow
          id="push-notif-label"
          label="Push notifications"
          subtitle={isPushDenied ? 'Blocked in browser settings' : undefined}
          action={
            <ProfileSwitch
              checked={isPushActive}
              disabled={isPushDenied}
              ariaLabelledBy="push-notif-label"
              onChange={(checked) => {
                if (checked) {
                  requestPermissionAndGetToken(true);
                } else {
                  disableNotifications();
                }
              }}
            />
          }
        />

        {/* Sleep Mode Row */}
        <SettingsRow
          id="sleep-mode-label"
          label="Sleep mode"
          subtitle="Appear offline and pause messages"
          action={
            <ProfileSwitch
              checked={isSleepMode}
              ariaLabelledBy="sleep-mode-label"
              onChange={handleSleepModeToggle}
            />
          }
          isLast={true}
        />
      </SettingsGroup>
    );
  };

  const renderSecurityGroup = () => (
    <SettingsGroup label="Security">
      {/* Two-Factor Authentication Row */}
      <SettingsRow
        id="2fa-label"
        label="Two-factor authentication"
        subtitle="Email code when you sign in"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toggling2FA && <Loader2 size={15} className="animate-spin" color="var(--accent-color)" />}
            <ProfileSwitch
              checked={is2FAEnabled}
              disabled={toggling2FA}
              ariaLabelledBy="2fa-label"
              onChange={handle2FAToggle}
            />
          </div>
        }
      />

      {/* Change Password Row */}
      <SettingsRow
        label="Change password"
        chevron={true}
        onClick={() => {
          setPasswordError('');
          setPasswordSuccessMsg('');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setIsChangePasswordOpen(true);
        }}
        isLast={true}
      />
    </SettingsGroup>
  );

  const renderMeetingsGroup = () => (
    <SettingsGroup label="Meetings">
      {/* Booking Link Enable Toggle */}
      <SettingsRow
        id="booking-link-label"
        label="Booking link"
        subtitle="Let others book time with you"
        action={
          <ProfileSwitch
            checked={bookingSettings.isBookingEnabled}
            ariaLabelledBy="booking-link-label"
            onChange={handleToggleBookingEnabled}
          />
        }
        isLast={!bookingSettings.isBookingEnabled}
      />

      {/* Additional Meeting rows only when booking is enabled */}
      {bookingSettings.isBookingEnabled && (
        <>
          {/* Public Link display with Copy button */}
          <SettingsRow
            label="Public link"
            subtitle={constructBookingUrl(bookingSettings.bookingSlug || username || userId)}
            action={
              <button
                type="button"
                onClick={handleCopyBookingLink}
                style={styles.copyPillBtn}
                className="profile-interactive-btn"
              >
                {copiedBookingLink ? (
                  <>
                    <Check size={13} color="var(--success-color, #10b981)" />
                    <span style={{ color: 'var(--success-color, #10b981)' }}>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            }
          />

          {/* Show Busy Slots Row */}
          <SettingsRow
            id="busy-slots-label"
            label="Show busy slots"
            subtitle="Visitors see when you are busy"
            action={
              <ProfileSwitch
                checked={bookingSettings.showBusySlots}
                ariaLabelledBy="busy-slots-label"
                onChange={handleToggleShowBusySlots}
              />
            }
            isLast={true}
          />
        </>
      )}
    </SettingsGroup>
  );

  const renderLogoutButton = () => (
    <button
      type="button"
      onClick={() => setShowLogoutModal(true)}
      style={styles.logoutBtn}
      className="profile-logout-btn"
    >
      <LogOut size={16} />
      <span>Log out</span>
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Own Profile Layout (Desktop vs Mobile)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="profile-scroll-page">
      {/* Embedded CSS rules for focus-visible, hover, and responsive reset */}
      <style>{`
        .profile-scroll-page {
          width: 100%;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: var(--bg-primary);
          box-sizing: border-box;
          -webkit-overflow-scrolling: touch;
        }

        .profile-row-btn {
          cursor: pointer;
        }
        .profile-row-btn:hover {
          background-color: var(--bg-card-hover, rgba(255, 255, 255, 0.04)) !important;
        }
        .profile-row-btn:focus-visible {
          outline: 2px solid var(--accent-color);
          outline-offset: -2px;
        }

        .profile-interactive-btn:focus-visible {
          outline: 2px solid var(--accent-color);
          outline-offset: 1px;
        }

        .profile-primary-btn:hover {
          filter: brightness(1.05);
        }
        .profile-primary-btn:focus-visible {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }

        .profile-switch-btn:focus-visible {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }

        .profile-camera-btn:hover {
          transform: scale(1.08);
        }
        .profile-camera-btn:focus-visible {
          outline: 2px solid var(--accent-color);
          outline-offset: 2px;
        }

        .profile-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          background-color: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          text-align: left;
          box-sizing: border-box;
          transition: background-color 0.15s ease, color 0.15s ease;
          outline: none;
        }
        .profile-nav-item:hover {
          background-color: var(--bg-card-hover, rgba(255, 255, 255, 0.04));
          color: var(--text-primary);
        }
        .profile-nav-item.active {
          background-color: var(--nav-active-bg, rgba(255, 255, 255, 0.08));
          color: var(--text-primary);
          font-weight: 600;
        }
        .profile-nav-item:focus-visible {
          outline: 2px solid var(--accent-color);
        }

        .profile-logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-height: 44px;
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background-color: transparent;
          color: var(--danger-color, #ef4444);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease;
          outline: none;
          box-sizing: border-box;
        }
        .profile-logout-btn:hover {
          background-color: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.25);
        }
        .profile-logout-btn:focus-visible {
          outline: 2px solid var(--danger-color, #ef4444);
        }

        @keyframes profileToastFadeIn {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        @keyframes profileSheetSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @keyframes profileModalScaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Hidden File Picker Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*"
      />

      {/* Sticky Back Row with title */}
      <ProfileBackRow title="Profile" />

      {isDesktop ? (
        /* ── DESKTOP 2-COLUMN LAYOUT (>= 768px) ── */
        <div style={styles.desktopContainer}>
          {/* Left Rail: Header + Nav List + Pinned Logout */}
          <div style={styles.desktopLeftRail}>
            <ProfileHeader
              username={username}
              userId={userId}
              displayName={displayName}
              profile={profile}
              isSleepMode={isSleepMode}
              uploading={uploading}
              progress={progress}
              stage={stage}
              onAvatarClick={() => handleAvatarView(profile)}
              onCameraClick={handleCameraBadgeClick}
              isDesktop={true}
            />

            <div style={styles.desktopNavList}>
              <button
                type="button"
                onClick={() => setSelectedSection('account')}
                className={`profile-nav-item ${selectedSection === 'account' ? 'active' : ''}`}
              >
                <User
                  size={16}
                  color={selectedSection === 'account' ? 'var(--accent-color)' : 'currentColor'}
                />
                <span>Account</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSection('notifications')}
                className={`profile-nav-item ${selectedSection === 'notifications' ? 'active' : ''}`}
              >
                <Bell
                  size={16}
                  color={
                    selectedSection === 'notifications'
                      ? 'var(--accent-color)'
                      : 'currentColor'
                  }
                />
                <span>Notifications & status</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSection('security')}
                className={`profile-nav-item ${selectedSection === 'security' ? 'active' : ''}`}
              >
                <ShieldCheck
                  size={16}
                  color={selectedSection === 'security' ? 'var(--accent-color)' : 'currentColor'}
                />
                <span>Security</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSection('meetings')}
                className={`profile-nav-item ${selectedSection === 'meetings' ? 'active' : ''}`}
              >
                <Calendar
                  size={16}
                  color={selectedSection === 'meetings' ? 'var(--accent-color)' : 'currentColor'}
                />
                <span>Meetings</span>
              </button>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              {renderLogoutButton()}
            </div>
          </div>

          {/* Right Pane: Selected Section Title & Card Only */}
          <div style={styles.desktopRightPane}>
            <h2 style={styles.desktopSectionTitle}>
              {selectedSection === 'account' && 'Account Settings'}
              {selectedSection === 'notifications' && 'Notifications & Status'}
              {selectedSection === 'security' && 'Security & Login'}
              {selectedSection === 'meetings' && 'Meeting Booking Settings'}
            </h2>

            {selectedSection === 'account' && renderAccountGroup()}
            {selectedSection === 'notifications' && renderNotificationsGroup()}
            {selectedSection === 'security' && renderSecurityGroup()}
            {selectedSection === 'meetings' && renderMeetingsGroup()}
          </div>
        </div>
      ) : (
        /* ── MOBILE SINGLE-COLUMN LAYOUT (< 768px) ── */
        /* Single 12px gutter on left/right, no outer card, bottom spacing for safe-area */
        <div style={styles.mobileContainer}>
          <ProfileHeader
            username={username}
            userId={userId}
            displayName={displayName}
            profile={profile}
            isSleepMode={isSleepMode}
            uploading={uploading}
            progress={progress}
            stage={stage}
            onAvatarClick={() => handleAvatarView(profile)}
            onCameraClick={handleCameraBadgeClick}
            isDesktop={false}
          />

          {renderAccountGroup()}
          {renderNotificationsGroup()}
          {renderSecurityGroup()}
          {renderMeetingsGroup()}

          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            {renderLogoutButton()}
          </div>
        </div>
      )}

      {/* ── EDIT SHEETS ── */}
      <DisplayNameSheet
        isOpen={isEditingDisplayName}
        onClose={() => {
          setIsEditingDisplayName(false);
          setDisplayNameError('');
        }}
        username={username}
        newDisplayName={newDisplayName}
        setNewDisplayName={setNewDisplayName}
        onSave={handleSaveDisplayName}
        saving={savingDisplayName}
        error={displayNameError}
        onOpenPolicy={() => setShowPolicyModal(true)}
        isDesktop={isDesktop}
      />

      <RoomNicknameSheet
        isOpen={isEditingRoomNickname}
        onClose={() => {
          setIsEditingRoomNickname(false);
          setRoomNicknameError('');
        }}
        newRoomNickname={newRoomNickname}
        setNewRoomNickname={setNewRoomNickname}
        onSave={handleSaveRoomNickname}
        saving={savingRoomNickname}
        error={roomNicknameError}
        roomNicknameCheck={roomNicknameCheck}
        isDesktop={isDesktop}
      />

      <PasswordSheet
        isOpen={isChangePasswordOpen}
        onClose={() => {
          setIsChangePasswordOpen(false);
          setPasswordError('');
          setPasswordSuccessMsg('');
        }}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        showCurrentPw={showCurrentPw}
        setShowCurrentPw={setShowCurrentPw}
        showNewPw={showNewPw}
        setShowNewPw={setShowNewPw}
        showConfirmPw={showConfirmPw}
        setShowConfirmPw={setShowConfirmPw}
        onSubmit={handleChangePassword}
        submitting={isSubmittingPassword}
        error={passwordError}
        successMsg={passwordSuccessMsg}
        isDesktop={isDesktop}
      />

      {/* Name Policy Explanation Modal */}
      <DisplayNamePolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        loading={isLoggingOut}
      />

      {/* Full Screen Image Viewer for Avatar */}
      {viewingMedia && (
        <MediaViewer media={viewingMedia} onClose={() => setViewingMedia(null)} />
      )}

      {/* Clean Floating Toast Replacement for alerts */}
      <ProfileToast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  // Mobile content wrapper: exactly one 12px gutter left and right, bottom padding
  // equal to the tab bar height (60px) + env(safe-area-inset-bottom) + 16px (calc(76px + env(safe-area-inset-bottom, 0px)))
  mobileContainer: {
    width: '100%',
    padding: '0 12px calc(76px + env(safe-area-inset-bottom, 0px)) 12px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column'
  },
  mobileContentPadding: {
    width: '100%',
    padding: '0 12px calc(76px + env(safe-area-inset-bottom, 0px)) 12px',
    boxSizing: 'border-box'
  },
  desktopContainer: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '20px 18px 40px 18px',
    display: 'flex',
    gap: '18px',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 'calc(100% - 48px)'
  },
  desktopLeftRail: {
    width: '220px',
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    borderRight: '1px solid var(--border-color)',
    paddingRight: '18px'
  },
  desktopNavList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '12px'
  },
  desktopRightPane: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  desktopSectionTitle: {
    margin: '0 0 14px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    letterSpacing: '-0.2px'
  },
  permanentBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-secondary)',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.3px',
    border: '1px solid var(--border-color)'
  },
  inlineCopyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px'
  },
  copyPillBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  logoutBtn: {
    // Style applied via .profile-logout-btn class
  }
};

export default ProfilePage;
