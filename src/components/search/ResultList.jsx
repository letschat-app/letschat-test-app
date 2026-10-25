import React from 'react';
import { Users, User, Share2, AlertCircle, RefreshCcw } from 'lucide-react';
import Avatar from '../chat/Avatar';
import StreakBadge from '../pulse/StreakBadge';
import SelectedUserCard from './SelectedUserCard';
import { maskEmail, highlightMatch } from '../../utils/searchUtils';

/**
 * ResultList Component
 * Renders search results based strictly on status.type ('loading', 'results', 'selected', 'empty', 'own', 'error').
 */
const ResultList = ({
  status,
  query,
  results,
  selectedUser,
  activeIndex,
  isCapped,
  onSelectUser,
  onCloseSelected,
  onExecuteSearch,
  onInviteClick,
  getCommonGroupsText,
  getCommonGroupsList,
  showToast,
}) => {
  if (status.type === 'idle') return null;

  if (status.type === 'selected' && selectedUser) {
    return (
      <SelectedUserCard
        user={selectedUser}
        onClose={onCloseSelected}
        commonGroupsText={getCommonGroupsText(selectedUser.userId)}
        commonGroupsList={getCommonGroupsList(selectedUser.userId)}
        showToast={showToast}
      />
    );
  }

  if (status.type === 'loading') {
    return (
      <div className="search-results-panel">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="search-skeleton-row">
            <div className="search-skeleton-avatar" />
            <div className="search-skeleton-text-group">
              <div className="search-skeleton-line short" />
              <div className="search-skeleton-line long" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (status.type === 'results') {
    return (
      <div className="search-results-panel">
        <div
          id="search-results-list"
          role="listbox"
          aria-label="Search results"
          onMouseDown={(e) => e.preventDefault()}
          className="search-results-list"
        >
          {results.map((user, idx) => {
            const streak = user.pulseStreak || user.streak || 0;
            const commonText = getCommonGroupsText(user.userId);
            const masked = maskEmail(user.email);
            const isHighlighted = activeIndex === idx;

            return (
              <div
                key={user.userId || idx}
                id={`result-option-${idx}`}
                role="option"
                aria-selected={isHighlighted}
                onClick={() => onSelectUser(user)}
                className={`search-result-item ${isHighlighted ? 'active' : ''}`}
              >
                <Avatar chat={user} size={38} />
                <div className="search-result-info">
                  <div className="search-result-name-row">
                    <span className="search-result-name">
                      {highlightMatch(user.userName || user.publicName || user.name || user.userId, query)}
                    </span>
                    {streak > 0 && <StreakBadge streak={streak} size="sm" />}
                  </div>
                  <div className="search-result-subline">
                    User ID: @{user.userId} {user.username || user.publicName ? `| @${user.username || user.publicName}` : ''} {masked ? `· ${masked}` : ''}
                  </div>
                  {commonText && (
                    <div className="search-result-common-line">
                      <Users size={13} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
                      <span>{commonText}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isCapped && (
          <div className="search-capped-notice">
            Showing the first 20 matches. Type more to narrow.
          </div>
        )}
      </div>
    );
  }

  if (status.type === 'empty') {
    return (
      <div className="search-status-card">
        <User size={32} className="search-status-icon muted" aria-hidden="true" />
        <h3 className="search-status-title">No user found for "{query}"</h3>
        <p className="search-status-subtitle">
          Check the spelling, UserId format, or invite them directly to join LetsChat.
        </p>
        <button
          type="button"
          onClick={onInviteClick}
          className="search-btn-primary fit"
        >
          <Share2 size={16} aria-hidden="true" />
          Invite them to LetsChat
        </button>
      </div>
    );
  }

  if (status.type === 'own') {
    return (
      <div className="search-status-card">
        <User size={32} className="search-status-icon accent" aria-hidden="true" />
        <h3 className="search-status-title">That is your own account.</h3>
        <p className="search-status-subtitle">
          You are currently logged in as this user. Search for a friend or classmate to connect!
        </p>
      </div>
    );
  }

  if (status.type === 'error') {
    return (
      <div className="search-status-card">
        <AlertCircle size={32} className="search-status-icon danger" aria-hidden="true" />
        <h3 className="search-status-title">Search failed.</h3>
        <p className="search-status-subtitle">
          Could not complete your search request. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => onExecuteSearch(query, true)}
          className="search-btn-secondary fit"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  return null;
};

export default ResultList;
