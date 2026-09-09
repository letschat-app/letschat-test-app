import React from 'react';
import { X, MessageSquare, ShieldCheck, Award, UserMinus, ChevronRight } from 'lucide-react';
import { syncChatsMapToDB } from '../../service/db';
import Avatar from '../chat/Avatar';

const MemberActionsPopup = ({ member, chat, currentUserId, myDisplayName, API, onClose, onSuccess, getchat, navigate }) => {
  if (!member) return null;

  const isSelectedMemberAdmin = member.role === 'admin';
  const isSelectedMemberFaculty = member.role === 'faculty';
  const isCurrentUserAdmin = chat.role === 'admin';
  const isCurrentUserFaculty = chat.role === 'faculty';

  const handleChatPrivately = async () => {
    try {
      const response = await fetch(`${API}/user/addtochat/${member.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': currentUserId,
        },
      });
      if (response.ok) {
        const data = await response.text();
        if (getchat) getchat(data);

        // Update chatsMap in localeStorage
        const res = await fetch(`${API}/user/chatbox/${currentUserId}`);
        if (res.ok) {
          const chatData = await res.json();
          let chatsMap = {};
          chatData.forEach(c => chatsMap[c.chatId] = c);
          localStorage.setItem("chatsMap", JSON.stringify(chatsMap));
          syncChatsMapToDB(chatsMap);
        }

        onClose();
        navigate(`/chat/${data}`, { replace: true });
      }
    } catch (error) {
      console.error('Error while starting private chat', error);
    }
  };

  const handleMakeAdmin = async () => {
    try {
      const res = await fetch(`${API}/group/promote/${chat.chatId}/${member.userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Id": currentUserId,
          'User-Name': myDisplayName,
        },
      });
      if (res.ok) {
        onSuccess();
      }
    } catch (ex) {
      console.error("Failed to make admin:", ex);
    }
  };

  const handleMakeFaculty = async () => {
    try {
      const res = await fetch(`${API}/classroom/makefaculty/${chat.chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Id": currentUserId,
        },
        body: JSON.stringify({ memberId: member.userId }),
      });
      if (res.ok) {
        onSuccess();
      }
    } catch (ex) {
      console.error("Failed to make faculty:", ex);
    }
  };

  const handleRemoveMember = async () => {
    if (window.confirm(`Are you sure you want to remove ${member.userName}?`)) {
      try {
        const res = await fetch(`${API}/group/remove/${chat.id}/${member.userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Id": currentUserId,
            'User-Name': myDisplayName,
          },
        });
        if (res.ok) {
          onSuccess();
        }
      } catch (ex) {
        console.error("Failed to remove member:", ex);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, padding: '20px',
    }}>
      <div className="popup-content" onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'rgba(30, 41, 59, 0.98)',
        width: '100%', maxWidth: '360px',
        borderRadius: '20px', padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        animation: 'slideUp 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Avatar 
            chat={{ ...member, profile: member.profile, id: member.userId, type: 'private' }} 
            size={56} 
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f3f4f6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.userName}
            </h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>{member.role || 'Member'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', fontWeight: '700' }}>
            X
          </button>
        </div>

        {/* Actions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <ActionItem 
            icon={<MessageSquare size={18} />} 
            label="Message Privately" 
            onClick={handleChatPrivately} 
            color="#f3f4f6"
          />
          
          {isCurrentUserAdmin && !isSelectedMemberAdmin && chat.type === 'group' && (
            <ActionItem 
              icon={<ShieldCheck size={18} />} 
              label="Make Admin" 
              onClick={handleMakeAdmin} 
              color="#fbbf24"
            />
          )}

          {(isCurrentUserFaculty || isCurrentUserAdmin) && !isSelectedMemberFaculty && chat.type === 'classroom' && (
            <ActionItem 
              icon={<Award size={18} />} 
              label="Make Faculty" 
              onClick={handleMakeFaculty} 
              color="#60a5fa"
            />
          )}

          {isCurrentUserAdmin && member.userId !== currentUserId && !isSelectedMemberAdmin && !isSelectedMemberFaculty && (
            <ActionItem 
              icon={<UserMinus size={18} />} 
              label="Remove from group" 
              onClick={handleRemoveMember} 
              color="#ef4444"
              isDanger
            />
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const ActionItem = ({ icon, label, onClick, color, isDanger }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      width: '100%', padding: '14px 16px', borderRadius: '12px',
      backgroundColor: 'transparent', border: 'none',
      color: color, fontSize: '15px', fontWeight: '600',
      cursor: 'pointer', transition: 'all 0.2s',
      textAlign: 'left'
    }}
    onMouseEnter={e => e.currentTarget.style.backgroundColor = isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)'}
    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    <span style={{ flexShrink: 0 }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
    <ChevronRight size={16} style={{ opacity: 0.3 }} />
  </button>
);

export default MemberActionsPopup;
