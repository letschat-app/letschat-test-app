import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, CheckCircle2 } from 'lucide-react';
import Avatar from '../chat/Avatar';

const AddMemberModal = ({ chat, API, myDisplayName, onClose, onSuccess, isPanel = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const currentUserId = localStorage.getItem('userid');

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      // First get existing members to filter them out
      const membersRes = await fetch(`${API}/group/getmembers/${chat.chatId}`, {
        method: "GET",
        headers: { "User-Id": currentUserId }
      });
      const existingMembers = await membersRes.json();
      const existingMemberIds = new Set(existingMembers.map(m => m.userId));

      // Then get all users the current user can chat with/add
      const usersRes = await fetch(`${API}/user/chatbox/${currentUserId}`);
      const chatData = await usersRes.json();
      
      // Filter for private chats (users) who aren't already in the group
      const available = chatData
        .filter(item => item.type === "private" && !existingMemberIds.has(item.id))
        .map(user => ({
          id: user.id,
          name: user.chatName,
          profile: user.profile
        }));
        
      setUsers(available);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsAdding(true);
    let successCount = 0;

    for (const user of selectedUsers) {
      try {
        const response = await fetch(`${API}/group/add/${chat.id}/${user.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Id': currentUserId,
            'User-Name': myDisplayName,
          }
        });
        if (response.ok) successCount++;
      } catch (error) {
        console.error(`Failed to add ${user.name}:`, error);
      }
    }

    setIsAdding(false);
    if (successCount > 0) {
      onSuccess();
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const content = (
    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
      backgroundColor: isPanel ? 'transparent' : 'rgba(15, 23, 42, 0.98)',
      width: '100%', 
      maxWidth: isPanel ? 'none' : '440px',
      height: isPanel ? '100%' : 'auto',
      maxHeight: isPanel ? 'none' : '80vh', 
      borderRadius: isPanel ? '0' : '24px',
      display: 'flex', flexDirection: 'column',
      border: isPanel ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: isPanel ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      animation: isPanel ? 'none' : 'slideUp 0.3s ease-out',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#f3f4f6', margin: 0 }}>Add Members</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '24px', fontWeight: '700' }}>
             X
          </button>
        </div>
        
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px 12px 44px', borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f3f4f6', fontSize: '15px', outline: 'none', transition: 'all 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          />
        </div>
      </div>

      {/* User List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px', scrollbarWidth: 'none' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Finding users...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            {searchTerm ? 'No users match your search' : 'No available users to add'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredUsers.map(user => {
              const isSelected = selectedUsers.some(u => u.id === user.id);
              return (
                <div 
                  key={user.id} 
                  onClick={() => toggleUserSelection(user)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '12px', borderRadius: '16px',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <Avatar 
                    chat={{ ...user, profile: user.profile, id: user.id, type: 'private' }} 
                    size={40} 
                  />
                  <span style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: isSelected ? '#3b82f6' : '#f3f4f6' }}>
                    {user.name}
                  </span>
                  {isSelected ? <CheckCircle2 size={20} color="#3b82f6" /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.1)' }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <button 
          onClick={handleAddMembers}
          disabled={selectedUsers.length === 0 || isAdding}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px',
            backgroundColor: selectedUsers.length > 0 ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
            color: selectedUsers.length > 0 ? '#fff' : '#64748b',
            border: 'none', fontWeight: '700', fontSize: '16px',
            cursor: selectedUsers.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
          }}
        >
          {isAdding ? 'Adding...' : selectedUsers.length > 0 ? `Add Member${selectedUsers.length > 1 ? 's' : ''} (${selectedUsers.length})` : 'Select users to add'}
        </button>
      </div>
    </div>
  );

  if (isPanel) return content;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, padding: '20px',
    }}>
      {content}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AddMemberModal;
