import React, { useState, useEffect, useRef } from 'react';
import { X, Edit2, Users, UserPlus, LogOut, Shield, Award, MessageCircle, UserMinus, Info, Camera, Loader2, Bell, BellOff, Zap } from 'lucide-react';
import MemberActionsPopup from './MemberActionsPopup';
import AddMemberModal from './AddMemberModal';
import messageStore from '../../pages/MessageStore';
import { uploadMedia } from '../../service/MediaUploader';
import { getMediaInfo, getMediaBlob } from '../../service/MediaCache';
import Avatar from '../chat/Avatar';
import MediaViewer from '../chat/MediaViewer';
import { toggleMuteChat, isChatMuted, saveChatInfoToDB, getChatInfoFromDB, saveGroupMembersToDB, saveUsersBatchToDB, getGroupMembersFromDB } from '../../service/db';

const InfoModal = ({ chat, onClose, API, navigate, getchat, isPanel = false }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [infoLoading, setInfoLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [myDisplayName, setMyDisplayName] = useState('');
  const [myProfile, setMyProfile] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [groupEditMode, setGroupEditMode] = useState(false);
  const [tempGroupName, setTempGroupName] = useState(chat.chatName || '');
  const [tempGroupProfile, setTempGroupProfile] = useState(chat.profile || '');
  const [viewingMedia, setViewingMedia] = useState(null);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [memberCount, setMemberCount] = useState(0);
  const fileInputRef = useRef(null);
  const groupFileInputRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [pinned, setPinned] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem('quick_access_chats') || '[]');
      return list.includes(chat.chatId);
    } catch { return false; }
  });

  const handlePinToggle = () => {
    try {
      let list = JSON.parse(localStorage.getItem('quick_access_chats') || '[]');
      const nextState = !pinned;
      if (nextState) {
        if (!list.includes(chat.chatId)) list.push(chat.chatId);
      } else {
        list = list.filter(id => id !== chat.chatId);
      }
      localStorage.setItem('quick_access_chats', JSON.stringify(list));
      setPinned(nextState);
      window.dispatchEvent(new CustomEvent('quick-access-updated'));
    } catch (err) {
      console.error('Error updating quick access:', err);
    }
  };

  const currentUserId = localStorage.getItem('userid');
  const isSleepMode = localStorage.getItem('sleepMode') === 'true';

  useEffect(() => {
    fetchInfo();
    if (chat.type === 'group' || chat.type === 'classroom') {
      fetchMembers();
    } else {
      setLoading(false);
    }
    checkMuteStatus();
  }, [chat]);

  const checkMuteStatus = async () => {
    const isMuted = await isChatMuted(chat.chatId);
    setMuted(isMuted);
  };

  const handleMuteToggle = async () => {
    const nextState = !muted;
    setMuted(nextState);
    await toggleMuteChat(chat.chatId, nextState);
  };

  const fetchInfo = async () => {
    try {
      const res = await fetch(`${API}/user/getchatinfo/${chat.chatId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Id": currentUserId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMyDisplayName(data.userName || '');
        setMyProfile(data.profile || '');
        if (data.memberCount !== undefined) {
           setMemberCount(data.memberCount);
        }
        saveChatInfoToDB({ chatId: chat.chatId, ...data });
      } else {
        throw new Error("Network fetch failed");
      }
    } catch (ex) {
      console.error("Failed to fetch userinfo, checking offline cache:", ex);
      getChatInfoFromDB(chat.chatId).then(cached => {
         if (cached) {
            console.log("Loaded cached userinfo from offline cache");
            setMyDisplayName(cached.userName || '');
            setMyProfile(cached.profile || '');
         }
      });
    } finally {
      setInfoLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API}/group/getmembers/${chat.chatId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Id": currentUserId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
        saveGroupMembersToDB(chat.chatId, data);
        saveUsersBatchToDB(data);
      } else {
        throw new Error("Network fetch failed");
      }
    } catch (ex) {
      console.error("Failed to fetch members, checking offline cache:", ex);
      getGroupMembersFromDB(chat.chatId).then(cached => {
         if (cached && cached.length) {
            console.log("Loaded members array from offline cache");
            setMembers(cached);
         }
      });
    } finally {
      setLoading(false);
    }
  };

  // Online Status Polling for Members
  useEffect(() => {
    if (!members || members.length === 0) return;

    let timerId = null;
    let isActive = true;

    const scheduleNext = (delay) => {
      if (!isActive) return;
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(runPoll, delay);
    };

    const runPoll = async () => {
      if (!isActive) return;

      if (!navigator.onLine) {
        if (import.meta.env.DEV) console.log("[StatusPoll] InfoModal Offline, retrying in 10s");
        scheduleNext(10000);
        return;
      }

      const idList = members.map(m => m.userId);
      if (import.meta.env.DEV) console.log("[StatusPoll] InfoModal polling for", idList.length, "members");
      
      try {
        const res = await fetch(`${API}/user/check-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
            "User-Id": currentUserId
          },
          body: JSON.stringify(idList)
        });

        if (res.ok) {
          const statusMap = await res.json();
          setOnlineStatuses(prev => ({ ...prev, ...statusMap }));
          messageStore.updateOnlineStatuses(statusMap);
          scheduleNext(60000); // 1 min sync on success
        } else {
          scheduleNext(10000); // 10s retry on server error
        }
      } catch (err) {
        console.error("Failed to fetch member statuses:", err);
        scheduleNext(10000); // 10s retry on network error
      }
    };

    // Initial sync from global store
    setOnlineStatuses(prev => ({ ...prev, ...messageStore.onlineStatuses }));

    runPoll();

    const handleGlobalStatusUpdate = (update) => {
      if (update.type === 'onlineStatusUpdate') {
        setOnlineStatuses(prev => ({ ...prev, ...update.statusMap }));
      }
    };
    messageStore.addListener(handleGlobalStatusUpdate);

    return () => {
      isActive = false;
      if (timerId) clearTimeout(timerId);
      messageStore.removeListener(handleGlobalStatusUpdate);
    };
  }, [members]);

  const handleSaveMyInfo = async () => {
    if (!myDisplayName.trim()) {
      alert("Name cannot be empty.");
      return;
    }

    if (chat.type === 'group' || chat.type === 'classroom') {
      const normalizedNewName = myDisplayName.trim().toLowerCase().replace(/\s+/g, '');
      const isTaken = members.some(m => {
        if (m.userId === currentUserId) return false; // Ignore our own current name
        const existingName = (m.userName || '').trim().toLowerCase().replace(/\s+/g, '');
        return existingName === normalizedNewName;
      });

      if (isTaken) {
        alert("this name already exist cannot be used");
        return;
      }
    }

    try {
      const res = await fetch(`${API}/user/updatemyinfo/${chat.chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Id": currentUserId,
        },
        body: JSON.stringify({
          userName: myDisplayName.trim(),
          userId: currentUserId,
          profile: myProfile,
        }),
      });
      if (res.ok) {
        setEditMode(false);
      }
    } catch (ex) {
      console.error("Failed to update info:", ex);
    }
  };

  const handleSaveGroupInfo = async () => {
    const endpoint = chat.type === 'classroom' ? 'classroom' : 'group';
    try {
      setUploading(true);
      const res = await fetch(`${API}/${endpoint}/update/${chat.chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Id": currentUserId,
        },
        body: JSON.stringify({
          chatName: tempGroupName,
          profile: tempGroupProfile,
        }),
      });
      if (res.ok) {
        setGroupEditMode(false);
        // Trigger a global refresh of this chat
        if (typeof getchat === 'function') {
          getchat(chat.chatId);
        }
      }
    } catch (ex) {
      console.error(`Failed to update ${endpoint}:`, ex);
      alert(`Failed to update ${endpoint}: ` + ex.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGroupProfileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadMedia(file, ({ progress: p }) => {
        setProgress(p);
      });
      setTempGroupProfile(result.mediaId);
    } catch (err) {
      console.error('[InfoModal] Group profile upload fail:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarClick = async (profileId, title = 'Profile Picture') => {
    if (!profileId || groupEditMode || editMode) return;

    try {
      const info = await getMediaInfo(profileId);
      // Main resolution key is fileKey (mainKey)
      const fullUrl = await getMediaBlob(profileId + '_full', info.fileKey || info.thumbnailKey, 'mainCache');
      
      setViewingMedia({
        fileUrl: fullUrl || `${API}/files/get-url/${profileId}`,
        fileName: title,
        fileType: 'image'
      });
    } catch (err) {
      console.error('[InfoModal] Full view failed:', err);
      // Fallback to direct URL if blob fails
      setViewingMedia({
        fileUrl: `${API}/files/get-url/${profileId}`,
        fileName: title,
        fileType: 'image'
      });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadMedia(file, ({ progress: p }) => {
        setProgress(p);
      });
      setMyProfile(result.mediaId);
    } catch (err) {
      console.error('[InfoModal] Upload fail:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLeaveGroup = async () => {
    const isClassroom = chat.type === 'classroom';
    const roleType = isClassroom ? 'faculty' : 'admin';
    
    // Check if user is the only admin/faculty
    const admins = members.filter(m => m.role === roleType);
    const isCurrentUserAdmin = members.find(m => m.userId === currentUserId)?.role === roleType;

    if (isCurrentUserAdmin && admins.length === 1 && members.length > 1) {
      alert(`You are the only ${roleType}. Please promote someone else before leaving.`);
      return;
    }

    if (window.confirm(`Are you sure you want to leave this ${isClassroom ? 'classroom' : 'group'}?`)) {
      try {
        const res = await fetch(`${API}/group/leave/${chat.chatId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Id": currentUserId,
          },
        });
        if (res.ok) {
          onClose();
          navigate('/chats', { replace: true });
        }
      } catch (ex) {
        console.error("Failed to leave group:", ex);
      }
    }
  };

  const openMemberActions = (member) => {
    setSelectedMember(member);
    setShowMemberActions(true);
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '4px 10px', borderRadius: '20px',
          fontSize: '11px', fontWeight: '700',
          background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          letterSpacing: '0.5px'
        }}>
          <Shield size={10} /> ADMIN
        </span>
      );
    }
    if (role === 'faculty') {
      return (
        <span style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '4px 10px', borderRadius: '20px',
          fontSize: '11px', fontWeight: '700',
          background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          letterSpacing: '0.5px'
        }}>
          <Award size={10} /> FACULTY
        </span>
      );
    }
    return null;
  };

  const currentMember = members.find(m => m.userId === currentUserId);
  const isGroupAdmin = (chat.type === 'group' && currentMember?.role === 'admin') || 
                       (chat.type === 'classroom' && currentMember?.role === 'faculty');
  const canAddMembers = isGroupAdmin || (chat.type === 'classroom' && currentMember?.role === 'admin');

  const content = (
    <div className="info-panel-content" onClick={e => e.stopPropagation()} style={{
      backgroundColor: isPanel ? 'transparent' : 'rgba(15, 23, 42, 0.95)',
      width: '100%', 
      maxWidth: isPanel ? 'none' : '480px',
      maxHeight: isPanel ? 'none' : '85vh', 
      overflowY: 'auto',
      borderRadius: isPanel ? '0' : '24px', 
      position: 'relative',
      border: isPanel ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: isPanel ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      scrollbarWidth: 'none',
      height: isPanel ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header Sticky Area */}
      <div style={{
        position: 'sticky', top: 0, 
        display: 'flex', justifyContent: isPanel ? 'space-between' : 'flex-end',
        alignItems: 'center',
        padding: '16px 24px', zIndex: 10,
        background: isPanel ? 'rgba(15, 23, 42, 0.8)' : 'transparent',
        backdropFilter: isPanel ? 'blur(10px)' : 'none',
        borderBottom: isPanel ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        marginBottom: isPanel ? '20px' : '0'
      }}>
        {isPanel && <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' }}>Contact Info</h3>}
        <div style={{ display: 'flex', gap: '8px' }}>
          {isGroupAdmin && !groupEditMode && (
            <button 
              onClick={() => {
                if (isSleepMode) {
                  alert("cannot edit in sleep mode or offline");
                  return;
                }
                setGroupEditMode(true);
              }}
              style={{
                background: 'rgba(59, 130, 246, 0.1)', border: 'none',
                borderRadius: '50%', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#3b82f6', transition: 'all 0.2s'
              }}
              title={isSleepMode ? "Cannot edit in Sleep Mode" : `Edit ${chat.type} info`}
            >
              <Edit2 size={18} />
            </button>
          )}
          <button onClick={onClose} style={{
            background: 'rgba(255, 255, 255, 0.05)', border: 'none',
            borderRadius: '50%', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#9ca3af', transition: 'all 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}>
            <span style={{ fontSize: '20px', fontWeight: '700' }}>X</span>
          </button>
        </div>
      </div>

      <div style={{ padding: isPanel ? '0 24px 32px' : '0 24px 32px', flex: 1 }}>
        {/* Header Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Avatar 
              chat={groupEditMode ? { ...chat, profile: tempGroupProfile } : chat} 
              size={isPanel ? 160 : 120} 
              highRes={true}
              style={{ 
                border: '4px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                cursor: 'pointer'
              }} 
              onClick={groupEditMode ? () => groupFileInputRef.current?.click() : () => handleAvatarClick((groupEditMode ? tempGroupProfile : chat.profile) || chat.profilePic, chat.chatName)}
            >
              {groupEditMode && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', cursor: 'pointer'
                }}>
                  {uploading ? <Loader2 size={32} color="white" className="animate-spin" /> : <Camera size={32} color="white" />}
                </div>
              )}
            </Avatar>
            <input 
              type="file" 
              ref={groupFileInputRef} 
              onChange={handleGroupProfileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>

          {groupEditMode ? (
            <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <input 
                type="text" 
                value={tempGroupName} 
                onChange={e => setTempGroupName(e.target.value)} 
                style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', fontWeight: '700' }}
                placeholder={`${chat.type === 'classroom' ? 'Classroom' : 'Group'} Name`}
              />
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button 
                  onClick={handleSaveGroupInfo} 
                  disabled={uploading}
                  style={{ ...primaryBtnStyle, flex: 1, padding: '8px 12px', fontSize: '13px' }}
                >
                  Save
                </button>
                <button 
                  onClick={() => {
                    setGroupEditMode(false);
                    setTempGroupName(chat.chatName);
                    setTempGroupProfile(chat.profile);
                  }} 
                  style={{ ...secondaryBtnStyle, flex: 1, padding: '8px 12px', fontSize: '13px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#f3f4f6', margin: '0 0 8px 0', textAlign: 'center' }}>
                {chat.chatName}
              </h2>
              <div style={{ 
                padding: '6px 14px', borderRadius: '20px',
                backgroundColor: chat.type === 'classroom' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                color: chat.type === 'classroom' ? '#10b981' : '#3b82f6',
                fontSize: '13px', fontWeight: '600', textTransform: 'capitalize',
                border: `1px solid ${chat.type === 'classroom' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
              }}>
                {chat.type} Chat
              </div>
            </>
          )}
        </div>

        {/* User Profile Section */}
        <section style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '20px', padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={16} color="#9ca3af" />
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                How you appear
              </h3>
            </div>
            {!editMode && (
              <button onClick={() => {
                if (isSleepMode) {
                  alert("cannot edit in sleep mode or offline");
                  return;
                }
                setEditMode(true);
              }} style={{
                fontSize: '13px', fontWeight: '600', color: '#3b82f6',
                background: 'none', border: 'none', cursor: 'pointer'
              }}>Edit Profile</button>
            )}
          </div>

          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar 
                    chat={{ profile: myProfile, id: currentUserId, type: 'private' }} 
                    size={64} 
                    showStatus={true}
                    isOnline={true} // Current user is always online
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer'
                    }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <Camera size={20} color="white" />
                    </div>
                  </Avatar>
                  {uploading && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: '4px', backgroundColor: 'rgba(255,255,255,0.1)'
                    }}>
                      <div style={{
                        width: `${progress}%`, height: '100%',
                        backgroundColor: '#3b82f6', transition: 'width 0.2s'
                      }} />
                    </div>
                  )}
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={myDisplayName}
                    onChange={(e) => setMyDisplayName(e.target.value)}
                    placeholder="Your Name"
                    style={inputStyle}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleSaveMyInfo} 
                  disabled={uploading}
                  style={{...primaryBtnStyle, flex: 1, opacity: uploading ? 0.7 : 1}}
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => setEditMode(false)} 
                  disabled={uploading}
                  style={{...secondaryBtnStyle, flex: 1}}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Avatar 
                chat={{ profile: myProfile, id: currentUserId, type: 'private' }} 
                size={50} 
                style={{ cursor: 'pointer' }}
                showStatus={true}
                isOnline={true}
                onClick={() => handleAvatarClick(myProfile, 'My Profile Photo')}
              />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#f3f4f6' }}>{myDisplayName || 'Set your name'}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Your visible name in this chat</div>
              </div>
            </div>
          )}
        </section>

        {/* Notifications Section */}
        <section style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '20px', padding: '16px 20px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }} onClick={handleMuteToggle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: muted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: muted ? '#ef4444' : '#10b981'
            }}>
              {muted ? <BellOff size={18} /> : <Bell size={18} />}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#f3f4f6' }}>Mute Notifications</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{muted ? 'Alerts are disabled for this chat' : 'Receive alerts for new messages'}</div>
            </div>
          </div>
          <div style={{
            width: '44px', height: '24px', borderRadius: '12px',
            backgroundColor: muted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
            position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              position: 'absolute', top: '2px', left: muted ? '22px' : '2px',
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: '#fff', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
        </section>

        {/* Quick Access Section (Mobile Navigation Wheel) */}
        <section style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '20px', padding: '16px 20px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }} onClick={handlePinToggle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: pinned ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: pinned ? '#a855f7' : '#9ca3af'
            }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#f3f4f6' }}>Pin to Quick Access</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{pinned ? 'Available on mobile radial menu' : 'Add to quick floating navigation'}</div>
            </div>
          </div>
          <div style={{
            width: '44px', height: '24px', borderRadius: '12px',
            backgroundColor: pinned ? '#a855f7' : 'rgba(255, 255, 255, 0.1)',
            position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              position: 'absolute', top: '2px', left: pinned ? '22px' : '2px',
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: '#fff', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
        </section>

        {/* Members Section */}
        {(chat.type === 'group' || chat.type === 'classroom' || chat.type === 'room') && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="#9ca3af" />
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                  Members ({chat.type === 'room' ? memberCount : members.length})
                </h3>
              </div>
              {canAddMembers && chat.type !== 'room' && (
                <button onClick={() => setShowAddMember(true)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  transition: 'all 0.2s'
                }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}>
                  <UserPlus size={16} /> Add
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
              {chat.type !== 'room' && (
                loading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>Loading members...</div>
                ) : (
                  members.map((member) => (
                    <div 
                      key={member.userId} 
                      onClick={() => openMemberActions(member)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px', borderRadius: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <Avatar 
                        chat={{ ...member, profile: member.profile, id: member.userId, type: 'private' }} 
                        size={44} 
                        showStatus={true}
                        isOnline={!!onlineStatuses[member.userId]}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.userId === currentUserId ? 'You' : member.userName}
                          </span>
                          {getRoleBadge(member.role)}
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            {/* Danger Actions */}
            {chat.type !== 'room' && (
              <button onClick={handleLeaveGroup} style={{
                width: '100%', padding: '16px', borderRadius: '16px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.2s',
                marginBottom: isPanel ? '40px' : '0'
              }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}>
                <LogOut size={20} /> Leave {chat.type === 'classroom' ? 'Classroom' : 'Group'}
              </button>
            )}
          </section>
        )}
      </div>

      {showMemberActions && (
        <MemberActionsPopup 
          member={selectedMember} 
          chat={chat}
          currentUserId={currentUserId}
          myDisplayName={myDisplayName}
          API={API}
          onClose={() => setShowMemberActions(false)}
          onSuccess={() => {
            fetchMembers();
            setShowMemberActions(false);
          }}
          getchat={getchat}
          navigate={navigate}
        />
      )}

      {showAddMember && (
        <AddMemberModal 
          chat={chat}
          API={API}
          myDisplayName={myDisplayName}
          onClose={() => setShowAddMember(false)}
          onSuccess={() => {
            fetchMembers();
            setShowAddMember(false);
          }}
        />
      )}

      {viewingMedia && (
        <MediaViewer 
          media={viewingMedia} 
          onClose={() => setViewingMedia(null)} 
        />
      )}
    </div>
  );

  if (isPanel) return content;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(12px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {content}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#f3f4f6', fontSize: '14px', outline: 'none', transition: 'all 0.2s'
};

const primaryBtnStyle = {
  padding: '12px', borderRadius: '12px', backgroundColor: '#3b82f6', color: '#fff',
  border: 'none', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
};

const secondaryBtnStyle = {
  padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#9ca3af',
  border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
};

export default InfoModal;
