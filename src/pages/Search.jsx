import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import userDiscoveryStore from '../service/UserDiscoveryStore';

import { useCommonGroups } from '../components/search/useCommonGroups';
import { useUserSearch } from '../components/search/useUserSearch';
import Toast from '../components/search/Toast';
import SearchBox from '../components/search/SearchBox';
import ResultList from '../components/search/ResultList';
import InviteRow from '../components/search/InviteRow';
import CommunityGrid from '../components/search/CommunityGrid';
import '../components/search/search.css';

/**
 * SearchComponent (Find & Connect Page)
 * Main container orchestration component.
 * Maintains all existing business flows, userDiscoveryStore subscription,
 * start chat flow, and theme responsiveness.
 */
const SearchComponent = () => {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState('');
  const [discoveryUsers, setDiscoveryUsers] = useState(userDiscoveryStore.users || []);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(
    !userDiscoveryStore.isLoaded && userDiscoveryStore.users.length === 0
  );

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
  }, []);

  const hideToast = useCallback(() => {
    setToastMessage('');
  }, []);

  // Check auth on mount
  useEffect(() => {
    const id = localStorage.getItem('userid');
    if (!id) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // userDiscoveryStore Subscription
  useEffect(() => {
    const updateFromStore = () => {
      setDiscoveryUsers([...userDiscoveryStore.users]);
      setIsDiscoveryLoading(!userDiscoveryStore.isLoaded && userDiscoveryStore.users.length === 0);
    };

    updateFromStore();

    if (!userDiscoveryStore.isLoaded && !userDiscoveryStore.isLoading) {
      userDiscoveryStore.fetchUsers();
    }

    const unsubscribe = userDiscoveryStore.subscribe(() => {
      updateFromStore();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Hooks
  const { getCommonGroupsText, getCommonGroupsList } = useCommonGroups();
  const {
    query,
    setQuery,
    status,
    results,
    selectedUser,
    setSelectedUser,
    activeIndex,
    setActiveIndex,
    isCapped,
    recentSearches,
    clearRecentSearches,
    executeSearch,
    selectUser,
    clearSearch,
  } = useUserSearch(showToast);

  const handleInviteClick = () => {
    const inviteUrl = window.location.origin + "/LetsChat/";
    const shareText = `Join me on LetsChat! ${inviteUrl}`;

    if (navigator.share) {
      navigator.share({
        title: 'LetsChat',
        text: shareText,
        url: inviteUrl,
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      });
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('Invite message copied');
      }).catch(() => {
        showToast('Invite link opened');
      });
    }
  };

  return (
    <div className="search-page-container">
      {/* Search Section Container (Max-Width 640px) */}
      <div className="search-section-wrapper">
        {/* 1. Hero */}
        <div className="search-hero">
          <h1 className="search-hero-title">Find & Connect</h1>
          <p className="search-hero-subtitle">Search by name, UserId or email</p>
        </div>

        {/* 2. Search Box & Recent Searches */}
        <SearchBox
          query={query}
          setQuery={setQuery}
          status={status}
          results={results}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          onSelectUser={selectUser}
          onExecuteSearch={executeSearch}
          onClearSearch={clearSearch}
          recentSearches={recentSearches}
          onClearRecentSearches={clearRecentSearches}
        />

        {/* 3. Results Panel / Selected Card / Empty / Own Account / Loading */}
        <ResultList
          status={status}
          query={query}
          results={results}
          selectedUser={selectedUser}
          activeIndex={activeIndex}
          isCapped={isCapped}
          onSelectUser={selectUser}
          onCloseSelected={clearSearch}
          onExecuteSearch={executeSearch}
          onInviteClick={handleInviteClick}
          getCommonGroupsText={getCommonGroupsText}
          getCommonGroupsList={getCommonGroupsList}
          showToast={showToast}
        />

        {/* 4. Slim Invite Row */}
        <InviteRow showToast={showToast} />
      </div>

      {/* Community Section Container (Max-Width 1000px) */}
      <div className="community-section-wrapper">
        {/* 5. Explore Community Section */}
        <CommunityGrid
          users={discoveryUsers}
          isDiscoveryLoading={isDiscoveryLoading}
          getCommonGroupsText={getCommonGroupsText}
          showToast={showToast}
        />
      </div>

      {/* Accessible Toast Notification */}
      <Toast message={toastMessage} onClose={hideToast} />
    </div>
  );
};

export default SearchComponent;