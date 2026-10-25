import React, { useState, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCcw } from 'lucide-react';
import Avatar from '../chat/Avatar';
import StreakBadge from '../pulse/StreakBadge';
import userDiscoveryStore from '../../service/UserDiscoveryStore';

/**
 * Individual Community User Card Component
 * Wrapped in React.memo for high performance rendering of large lists.
 * Must be ONE <button> element with no nested buttons.
 */
const UserCard = memo(({ user, commonGroupsText, onCardClick }) => {
  const streak = user.pulseStreak || user.streak || 0;
  const displayName = user.userName || user.publicName || user.name || user.userId;

  const handleClick = () => {
    onCardClick(user.userId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Open profile of ${displayName}`}
      className="community-user-card"
    >
      <Avatar chat={user} size={48} />
      <div className="community-card-name-row">
        <span className="community-card-name">{displayName}</span>
        {streak > 0 && <StreakBadge streak={streak} size="sm" />}
      </div>
      <div className="community-card-id">ID: @{user.userId} {user.username || user.publicName ? `| @${user.username || user.publicName}` : ''}</div>
      {commonGroupsText && (
        <div className="community-card-common">
          <Users size={12} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
          <span>{commonGroupsText}</span>
        </div>
      )}
    </button>
  );
});

UserCard.displayName = 'UserCard';

/**
 * CommunityGrid Component
 * Renders ALL users returned by server in a responsive 140px grid using content-visibility.
 */
const CommunityGrid = ({
  users,
  isDiscoveryLoading,
  getCommonGroupsText,
  showToast,
}) => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentUserId = localStorage.getItem('userid');

  const filteredUsers = (users || []).filter(u => u && String(u.userId) !== String(currentUserId));

  const handleCardClick = useCallback((targetUserId) => {
    if (targetUserId) {
      navigate(`/profile/${targetUserId}`);
    }
  }, [navigate]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await userDiscoveryStore.fetchUsers(true);
      if (showToast) showToast('Community list updated');
    } catch (err) {
      console.error('[CommunityGrid] Refresh error:', err);
      if (showToast) showToast('Failed to update list');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="community-grid-section">
      <div className="community-grid-header">
        <div className="community-title-group">
          <h2 className="community-grid-title">Explore community</h2>
          <span className="community-count-badge">{filteredUsers.length}</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh community list"
          className="community-refresh-btn"
        >
          <RefreshCcw size={15} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {isDiscoveryLoading ? (
        <div className="community-grid-container">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
            <div key={idx} className="community-skeleton-card">
              <div className="community-skeleton-avatar" />
              <div className="community-skeleton-line name" />
              <div className="community-skeleton-line id" />
            </div>
          ))}
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="community-grid-container">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.userId}
              user={user}
              commonGroupsText={getCommonGroupsText(user.userId)}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      ) : (
        <div className="community-empty-box">
          <Users size={32} className="community-empty-icon" aria-hidden="true" />
          <p className="community-empty-text">No users found in discovery</p>
        </div>
      )}
    </div>
  );
};

export default memo(CommunityGrid);
