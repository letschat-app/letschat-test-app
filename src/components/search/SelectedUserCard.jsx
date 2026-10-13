import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageCircle, Users, User as UserIcon, Loader2 } from 'lucide-react';
import Avatar from '../chat/Avatar';
import StreakBadge from '../pulse/StreakBadge';
import { API } from '../../service/UserAuth';
import { getchat } from '../../pages/ChatNames';
import { syncChatsMapToDB } from '../../service/db';
import { maskEmail } from '../../utils/searchUtils';

/**
 * SelectedUserCard Component
 * Displays rich user card when a user selects a search result.
 * Includes "View profile" and step-for-step "Start chat" flow.
 */
const SelectedUserCard = ({ user, onClose, commonGroupsText, commonGroupsList, showToast }) => {
  const navigate = useNavigate();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const currentUserId = localStorage.getItem('userid');

  const handleStartChat = async () => {
    if (isStartingChat || !user || !user.userId) return;
    setIsStartingChat(true);

    try {
      const response = await fetch(`${API}/user/addtochat/${user.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': currentUserId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create or add to chat');
      }

      const chatId = await response.text();
      getchat(chatId);

      // Re-fetch chatbox list to update local chatsMap
      try {
        const res = await fetch(`${API}/user/chatbox/${currentUserId}`);
        if (res.ok) {
          const chatData = await res.json();
          let chatsMap = {};
          if (Array.isArray(chatData)) {
            chatData.forEach(c => {
              if (c && (c.id || c.chatId)) {
                chatsMap[c.id || c.chatId] = c;
              }
            });
          }
          localStorage.setItem('chatsMap', JSON.stringify(chatsMap));
          await syncChatsMapToDB(chatsMap);
        }
      } catch (err) {
        console.warn('[SelectedUserCard] Failed to sync chatsMap:', err);
      }

      navigate(`/chat/${chatId}`);
    } catch (err) {
      console.error('[SelectedUserCard] Start chat error:', err);
      if (showToast) showToast('Failed to start chat. Please try again.');
      setIsStartingChat(false);
    }
  };

  const streak = user.pulseStreak || user.streak || 0;
  const maskedUserEmail = maskEmail(user.email);

  return (
    <div className="search-selected-card">
      <div className="search-selected-card-header">
        <span className="search-selected-badge">Selected User</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close selected user card"
          className="search-selected-close-btn"
        >
          <X size={16} />
        </button>
      </div>

      <div className="search-selected-card-body">
        <div className="search-selected-user-info">
          <Avatar chat={user} size={48} />
          <div className="search-selected-details">
            <div className="search-selected-name-row">
              <span className="search-selected-name">{user.userName || user.publicName || user.name || user.userId}</span>
              {streak > 0 && <StreakBadge streak={streak} size="sm" />}
            </div>
            <div className="search-selected-meta">User ID: {user.userId}</div>
            {maskedUserEmail && <div className="search-selected-meta">Email: {maskedUserEmail}</div>}
          </div>
        </div>

        {/* Groups in common line & box */}
        {commonGroupsText && (
          <div className="search-selected-common-box">
            <div className="search-selected-common-header">
              <Users size={13} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
              <span>{commonGroupsText}</span>
            </div>
            {commonGroupsList && commonGroupsList.length > 0 && (
              <div className="search-selected-tags-flex">
                {commonGroupsList.map((gName, idx) => (
                  <span key={idx} className="search-group-tag">
                    {gName}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="search-selected-actions">
          <button
            type="button"
            onClick={() => navigate(`/profile/${user.userId}`)}
            className="search-btn-secondary"
          >
            <UserIcon size={16} aria-hidden="true" />
            View profile
          </button>
          <button
            type="button"
            onClick={handleStartChat}
            disabled={isStartingChat}
            className="search-btn-primary"
          >
            {isStartingChat ? (
              <>
                <Loader2 size={16} className="search-spinner" aria-hidden="true" />
                Starting...
              </>
            ) : (
              <>
                <MessageCircle size={16} aria-hidden="true" />
                Start chat
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectedUserCard;
