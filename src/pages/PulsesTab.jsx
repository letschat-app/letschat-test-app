import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp, Eye, Sparkles, Clock, Flame, X, Loader2 } from 'lucide-react';
import { getPulseFeed, getMyPulses, getPulseFeedOffline, getMinePulsesOffline, parsePulseDate, formatPulseTime } from '../service/PulseService';
import Avatar from '../components/chat/Avatar';
import StreakBadge from '../components/pulse/StreakBadge';
import CreatePulseModal from '../components/pulse/CreatePulseModal';
import PulseStoryViewer from '../components/pulse/PulseStoryViewer';
import StreakTierExplainerModal from '../components/pulse/StreakTierExplainerModal';
import PulseViewersModal from '../components/pulse/PulseViewersModal';
import { getTierIndexFromStreak } from '../components/pulse/SquircleFireAvatar';

const PulsesTab = () => {
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState([]);
  const [myPulsesData, setMyPulsesData] = useState({ totalViews: 0, activePulses: [], expiredPulses: [] });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExplainerModal, setShowExplainerModal] = useState(false);
  const [selectedPulseViewers, setSelectedPulseViewers] = useState(null);
  
  // Dismissible Streak Banner State (Persisted in localStorage)
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem('hideStreakMotivationBanner') === 'true';
  });

  // Section Collapse States (Up/Down toggles)
  const [isOwnerOpen, setIsOwnerOpen] = useState(true);
  const [isUnviewedOpen, setIsUnviewedOpen] = useState(true);
  const [isViewedOpen, setIsViewedOpen] = useState(true);

  // Selected pulse for Right Pane viewing (Desktop) or Fullscreen viewing (Mobile)
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedUserIdx, setSelectedUserIdx] = useState(0);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const userId = localStorage.getItem('userid');
  const userName = localStorage.getItem('username') || userId;
  const userProfile = localStorage.getItem('profile');
  const userStreak = parseInt(localStorage.getItem('streak') || '0', 10);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    // 1. Instant rendering from IndexedDB cache
    try {
      const [cachedFeed, cachedMine] = await Promise.all([
        getPulseFeedOffline().catch(() => null),
        getMinePulsesOffline().catch(() => null)
      ]);

      if (cachedFeed && Array.isArray(cachedFeed) && cachedFeed.length > 0) {
        setFeed(cachedFeed);
        setLoading(false);
      }
      if (cachedMine) {
        const active = cachedMine.activePulses || cachedMine.pulses || [];
        const totalV = cachedMine.totalViews || active.reduce((sum, p) => sum + (p.viewCount || p.viewsCount || 0), 0);
        setMyPulsesData({
          totalViews: totalV,
          activePulses: active,
          expiredPulses: cachedMine.expiredPulses || []
        });
        setLoading(false);
      }
    } catch (e) {
      console.warn('[PulsesTab] IDB cache error:', e);
    }

    // 2. Fetch fresh network data in background and update UI + IDB
    try {
      const [feedData, ownerData] = await Promise.all([
        getPulseFeed().catch(() => []),
        getMyPulses().catch(() => null)
      ]);

      if (Array.isArray(feedData) && feedData.length > 0) {
        setFeed(feedData);
      }

      if (ownerData) {
        const active = ownerData.activePulses || ownerData.pulses || [];
        const totalV = ownerData.totalViews || active.reduce((sum, p) => sum + (p.viewCount || p.viewsCount || 0), 0);
        setMyPulsesData({
          totalViews: totalV,
          activePulses: active,
          expiredPulses: ownerData.expiredPulses || []
        });
      }
    } catch (err) {
      console.error('[PulsesTab] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const now = Date.now();
  const activeFeed = feed.map(item => {
    const userIdVal = item.contactUserId || item.userId;
    const userNameVal = item.contactName || item.userName || userIdVal;
    const profileVal = item.contactProfile || item.profile;
    const activePulses = (item.pulses || []).filter(p => p.status !== 'expired' && (!p.expiresAt || (parsePulseDate(p.expiresAt)?.getTime() || (now + 1)) > now));
    const allSeenNow = activePulses.length > 0 && activePulses.every(p => p.hasSeen || p.seen);
    return {
      ...item,
      userId: userIdVal,
      userName: userNameVal,
      profile: profileVal,
      pulses: activePulses,
      hasActivePulse: activePulses.length > 0,
      allSeen: item.allSeen !== undefined ? item.allSeen : allSeenNow
    };
  }).filter(item => item.hasActivePulse);

  const unviewedList = activeFeed.filter(item => !item.allSeen);
  const viewedList = activeFeed.filter(item => item.allSeen);

  const handleOpenViewer = (item) => {
    const idx = activeFeed.findIndex(f => f.userId === item.userId);
    setSelectedItem(item);
    setSelectedUserIdx(idx >= 0 ? idx : 0);
  };

  const handleOpenMyStatus = () => {
    if (myPulsesData.activePulses.length > 0) {
      const myItem = {
        userId,
        userName: `${userName} (You)`,
        profile: userProfile,
        pulses: myPulsesData.activePulses,
        hasActivePulse: true,
        allSeen: false
      };
      setSelectedItem(myItem);
      setSelectedUserIdx(-1);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem('hideStreakMotivationBanner', 'true');
  };

  const handlePulseViewed = (viewedUserId, pulseId) => {
    setFeed(prev => prev.map(item => {
      if (item.userId === viewedUserId) {
        const updatedPulses = (item.pulses || []).map(p => p.pulseId === pulseId ? { ...p, hasSeen: true } : p);
        const allSeenNow = updatedPulses.every(p => p.hasSeen);
        return { ...item, pulses: updatedPulses, allSeen: allSeenNow };
      }
      return item;
    }));
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    }}>
      
      {/* ── LEFT SIDEBAR LIST (Master Pane) ── */}
      <div style={{
        width: isMobile ? '100%' : '380px',
        minWidth: isMobile ? '100%' : '380px',
        height: '100%',
        borderRight: isMobile ? 'none' : '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-card)',
        boxSizing: 'border-box'
      }}>
        
        {/* Top Header - Renamed to Pulses, icons removed as requested */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
            Pulses
          </h1>
        </div>

        {/* Flat List (No Box Containers) */}
        <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          
          {/* SECTION 1: SEPARATE UPLOAD PULSE ROW */}
          <div
            onClick={() => setShowCreateModal(true)}
            style={statusRowStyle}
          >
            <div style={{ position: 'relative' }}>
              <Avatar
                chat={{ profile: userProfile, userName }}
                size={52}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-card)'
              }}>
                <Plus size={12} strokeWidth={3} />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Upload Pulse
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Click to add a 24-hour status update
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '13px' }}>Loading pulses...</div>
            </div>
          ) : (
            <>
              {/* SECTION 2: MY PULSES (Collapsible Open/Close Bar) */}
              <div style={{ marginTop: '8px' }}>
                <div
                  onClick={() => setIsOwnerOpen(!isOwnerOpen)}
                  style={collapsibleHeaderStyle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={17} color="var(--accent-color)" />
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      My Pulses ({myPulsesData.activePulses.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--accent-color)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Eye size={12} /> {myPulsesData.totalViews} Views
                    </span>

                    {userStreak >= 3 && (
                      <StreakBadge streak={userStreak} size="sm" />
                    )}

                    {isOwnerOpen ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                  </div>
                </div>

                {isOwnerOpen && (
                  <div style={{ padding: '4px 0' }}>
                    {myPulsesData.activePulses.length === 0 ? (
                      <div style={emptyTextStyle} onClick={() => setShowCreateModal(true)}>
                        No active pulses posted yet. Click <strong>Upload Pulse</strong> to post!
                      </div>
                    ) : (
                      myPulsesData.activePulses.map((pulse, idx) => (
                        <div key={pulse.pulseId || idx} onClick={handleOpenMyStatus} style={statusRowStyle}>
                          <div style={{ fontSize: '20px' }}>
                            {pulse.type === 'image' ? '📷' : pulse.type === 'video' ? '🎥' : '📝'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {pulse.caption || pulse.content || `${pulse.type} Status`}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {pulse.createdAt ? formatPulseTime(pulse.createdAt, 'Active') : 'Active'}
                            </div>
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPulseViewers(pulse);
                            }}
                            style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-color)', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.12)' }}
                          >
                            👁️ {pulse.totalViews ?? pulse.viewCount ?? pulse.viewsCount ?? pulse.viewers?.length ?? 0}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 3: RECENT UPDATES (Collapsible Open/Close Bar) */}
              <div style={{ marginTop: '8px' }}>
                <div
                  onClick={() => setIsUnviewedOpen(!isUnviewedOpen)}
                  style={collapsibleHeaderStyle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={17} color="#10b981" />
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      Recent Updates ({unviewedList.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      backgroundColor: unviewedList.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                      color: unviewedList.length > 0 ? '#10b981' : 'var(--text-secondary)',
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '800'
                    }}>
                      {unviewedList.length} New
                    </span>
                    {isUnviewedOpen ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                  </div>
                </div>

                {isUnviewedOpen && (
                  <div style={{ padding: '4px 0' }}>
                    {unviewedList.length === 0 ? (
                      <div style={emptyTextStyle}>No unviewed updates right now.</div>
                    ) : (
                      unviewedList.map(item => (
                        <div
                          key={item.userId}
                          onClick={() => handleOpenViewer(item)}
                          style={statusRowStyle}
                        >
                          <Avatar
                            chat={item}
                            hasActivePulse={true}
                            allSeen={false}
                            size={52}
                          />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.userName || item.userId}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.pulses?.[0]?.content || item.pulses?.[0]?.caption || (item.pulses?.[0]?.createdAt ? `Today at ${formatPulseTime(item.pulses[0].createdAt)}` : 'Recent update')}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 4: VIEWED UPDATES (Collapsible Open/Close Bar) */}
              <div style={{ marginTop: '8px' }}>
                <div
                  onClick={() => setIsViewedOpen(!isViewedOpen)}
                  style={collapsibleHeaderStyle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={17} color="var(--text-secondary)" />
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      Viewed Updates ({viewedList.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '800'
                    }}>
                      {viewedList.length}
                    </span>
                    {isViewedOpen ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                  </div>
                </div>

                {isViewedOpen && (
                  <div style={{ padding: '4px 0' }}>
                    {viewedList.length === 0 ? (
                      <div style={emptyTextStyle}>No viewed updates yet.</div>
                    ) : (
                      viewedList.map(item => (
                        <div
                          key={item.userId}
                          onClick={() => handleOpenViewer(item)}
                          style={statusRowStyle}
                        >
                          <Avatar
                            chat={item}
                            hasActivePulse={true}
                            allSeen={true}
                            size={52}
                          />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.userName || item.userId}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.pulses?.[0]?.content || item.pulses?.[0]?.caption || (item.pulses?.[0]?.createdAt ? `Yesterday at ${formatPulseTime(item.pulses[0].createdAt)}` : 'Viewed update')}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* ── STREAK MOTIVATION BANNER AT BOTTOM (Dismissible with ✕) ── */}
        {!bannerDismissed && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: 'var(--text-primary)' }}>
              <Flame size={16} color="#f97316" />
              <span>Increase your streak to stand out!</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setShowExplainerModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '13px',
                  fontWeight: '700',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Learn More
              </button>

              <button
                onClick={handleDismissBanner}
                title="Close banner"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── RIGHT MAIN PANE (Detail View on Desktop / Main View when selected) ── */}
      {!isMobile && (
        <div style={{
          flex: 1,
          height: '100%',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {selectedItem ? (
            <PulseStoryViewer
              contactsFeed={selectedUserIdx >= 0 ? activeFeed : [selectedItem]}
              initialUserIndex={selectedUserIdx >= 0 ? selectedUserIdx : 0}
              onClose={() => setSelectedItem(null)}
              onPulseViewed={handlePulseViewed}
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px',
              maxWidth: '440px'
            }}>
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                border: '3px dashed var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                opacity: 0.4
              }}>
                <Sparkles size={40} color="var(--text-primary)" />
              </div>

              <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                Share pulses
              </h2>
              
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                Share photos, videos and text that disappear after 24 hours.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mobile Fullscreen Viewer Modal */}
      {isMobile && selectedItem && (
        <PulseStoryViewer
          contactsFeed={selectedUserIdx >= 0 ? activeFeed : [selectedItem]}
          initialUserIndex={selectedUserIdx >= 0 ? selectedUserIdx : 0}
          onClose={() => setSelectedItem(null)}
          onPulseViewed={handlePulseViewed}
        />
      )}

      {/* Upload Pulse Modal */}
      <CreatePulseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchData}
      />

      {/* Explainer Modal */}
      <StreakTierExplainerModal
        isOpen={showExplainerModal}
        onClose={() => setShowExplainerModal(false)}
      />

      {/* Pulse Viewers Modal */}
      <PulseViewersModal
        isOpen={!!selectedPulseViewers}
        onClose={() => setSelectedPulseViewers(null)}
        pulse={selectedPulseViewers}
      />

    </div>
  );
};

// Styles
const collapsibleCardStyle = {
  backgroundColor: 'var(--bg-secondary)',
  borderRadius: '16px',
  border: '1px solid var(--border-color)',
  overflow: 'hidden',
};

const collapsibleHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px 6px 20px',
  cursor: 'pointer',
  userSelect: 'none',
};

const pulseRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '12px',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  cursor: 'pointer',
};

const contactRowStyle = (isNew) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '12px',
  backgroundColor: 'var(--bg-card)',
  border: isNew ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
  cursor: 'pointer',
});

const emptyBoxStyle = {
  padding: '14px',
  borderRadius: '12px',
  backgroundColor: 'var(--bg-card)',
  border: '1px dashed var(--border-color)',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  textAlign: 'center',
  cursor: 'pointer'
};

const statusRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '12px 20px',
  cursor: 'pointer',
  transition: 'background 0.15s ease',
  userSelect: 'none',
};

const emptyTextStyle = {
  padding: '12px 20px',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  fontStyle: 'italic',
};

export default PulsesTab;
