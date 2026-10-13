import React, { useState, useEffect, useMemo } from 'react';
import { X, Zap, Check, Lock, Globe, Users, ArrowRight } from 'lucide-react';
import { getFeedDataFromDB, getMineDataFromDB } from '../../service/PulseMediaCache';
import Avatar from '../chat/Avatar';
import spaceStore from '../../service/SpaceStore';

/**
 * AttachPulseModal.jsx
 * Modal for selecting eligible pulses to attach/tag directly from the Chatbox "+" menu.
 * Displays public pulses, pulses by chat members, and user's own active pulses.
 * Allows selecting the target Space ID for display.
 */
const AttachPulseModal = ({
  isOpen,
  onClose,
  onSelectPulse,
  chatId,
  chatMembers = [],
  chatType,
  currentActiveSpace = 0
}) => {
  if (!isOpen) return null;

  const currentUserId = localStorage.getItem('userid');
  const [pulses, setPulses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpaceId, setSelectedSpaceId] = useState(currentActiveSpace || 0);

  // Available spaces for current chat
  const availableSpaces = useMemo(() => {
    if (!chatId) return [{ id: 0, name: 'Main Space' }];
    const chatSpacesMap = spaceStore.spaces[chatId] || {};
    const spacesList = [{ id: 0, name: 'Main Space' }];
    Object.entries(chatSpacesMap).forEach(([sId, sName]) => {
      const parsedId = parseInt(sId, 10);
      if (parsedId !== 0) {
        spacesList.push({ id: parsedId, name: sName || `Space ${parsedId}` });
      }
    });
    return spacesList;
  }, [chatId]);

  // Load and filter eligible pulses
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadEligiblePulses = async () => {
      const allPulses = [];
      const seenIds = new Set();

      const addPulse = (p, ownerInfo = {}) => {
        if (!p) return;
        const pId = String(p.pulseId || p.pulse_id || p.id);
        if (!pId || seenIds.has(pId)) return;

        seenIds.add(pId);
        allPulses.push({
          pulseId: pId,
          id: pId,
          userId: p.userId || p.user_id || ownerInfo.userId || ownerInfo.user_id,
          userName: p.userName || p.user_name || ownerInfo.userName || ownerInfo.user_name || 'User',
          profile: p.profile || p.user_profile || ownerInfo.profile,
          type: p.type || 'text',
          content: p.content,
          imageUrl: p.imageUrl || p.mediaUrl,
          mediaUrl: p.mediaUrl || p.imageUrl,
          bgColor: p.bgColor || '#090d16',
          visibility: p.visibility || 'everyone',
          createdAt: p.createdAt || p.created_at,
          isMine: p.isMine || String(p.userId || p.user_id) === String(currentUserId)
        });
      };

      try {
        // 1. Fetch Feed Data (IndexedDB + API fallback)
        const feedData = await getFeedDataFromDB();
        if (Array.isArray(feedData)) {
          feedData.forEach(userFeed => {
            const userPulses = userFeed.pulses || (userFeed.pulseId ? [userFeed] : []);
            userPulses.forEach(p => addPulse(p, userFeed));
          });
        }

        // 2. Fetch Mine Data
        const mineData = await getMineDataFromDB();
        if (mineData) {
          const minePulses = mineData.activePulses || mineData.pulses || [];
          const myProfile = localStorage.getItem('userprofile');
          const myName = localStorage.getItem('username') || currentUserId;
          minePulses.forEach(p => addPulse({ ...p, isMine: true }, { userId: currentUserId, userName: myName, profile: myProfile }));
        }
      } catch (e) {
        console.warn('[AttachPulseModal] Error reading local store:', e);
      }

      // Check localStorage backup feeds if list is empty
      if (allPulses.length === 0) {
        try {
          const rawFeed = JSON.parse(localStorage.getItem('contacts_feed_cache') || '[]');
          rawFeed.forEach(userFeed => {
            (userFeed.pulses || []).forEach(p => addPulse(p, userFeed));
          });
        } catch (e) {}
      }

      // Filter Pulses based on Eligibility Rules
      const memberUserIds = new Set(
        chatMembers.map(m => String(m.userId || m.user_id || m))
      );
      if (currentUserId) memberUserIds.add(String(currentUserId));
      if (chatId) memberUserIds.add(String(chatId));

      const filtered = allPulses.filter(p => {
        // Rule 1: Public Pulses (visibility == "everyone")
        if (p.visibility === 'everyone') return true;
        // Rule 2: User's Own Pulses
        if (p.isMine || String(p.userId) === String(currentUserId)) return true;
        // Rule 3: Pulses by members of the current chat
        if (memberUserIds.has(String(p.userId))) return true;

        return false;
      });

      if (isMounted) {
        setPulses(filtered);
        setIsLoading(false);
      }
    };

    loadEligiblePulses();
    return () => { isMounted = false; };
  }, [chatId, chatMembers, currentUserId]);

  const handleSelect = (pulse) => {
    onSelectPulse(pulse, selectedSpaceId);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(2, 6, 23, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 999999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        width: '100%', maxWidth: '480px',
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        animation: 'modalScaleUp 0.25s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px',
              backgroundColor: 'rgba(236, 72, 153, 0.15)',
              color: '#ec4899',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Attach / Tag Pulse
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Select a pulse to tag in this chat
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Space Selector Bar (If multiple spaces exist) */}
        {availableSpaces.length > 1 && (
          <div style={{
            padding: '10px 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Target Space:</span>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, paddingBottom: '2px' }}>
              {availableSpaces.map(sp => (
                <button
                  key={sp.id}
                  onClick={() => setSelectedSpaceId(sp.id)}
                  style={{
                    padding: '4px 12px', borderRadius: '16px',
                    border: selectedSpaceId === sp.id ? '1px solid #ec4899' : '1px solid var(--border-color)',
                    backgroundColor: selectedSpaceId === sp.id ? 'rgba(236, 72, 153, 0.18)' : 'var(--bg-card)',
                    color: selectedSpaceId === sp.id ? '#ec4899' : 'var(--text-primary)',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {sp.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pulse Selection List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Loading active pulses...
            </div>
          ) : pulses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No active eligible pulses found for this chat.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
              {pulses.map(pulse => {
                const mediaUrl = pulse.imageUrl || pulse.mediaUrl;
                const isMedia = pulse.type === 'image' || pulse.type === 'video' || pulse.type === 'image_audio';

                return (
                  <div
                    key={pulse.pulseId}
                    onClick={() => handleSelect(pulse)}
                    style={{
                      position: 'relative',
                      height: '160px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      backgroundColor: pulse.bgColor || '#1e293b',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      padding: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      transition: 'transform 0.15s ease, border-color 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.borderColor = '#ec4899';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    {/* Background Media image */}
                    {isMedia && mediaUrl && (
                      <img
                        src={mediaUrl}
                        alt="Pulse Background"
                        style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: 'cover', opacity: 0.85
                        }}
                      />
                    )}

                    {/* Gradient overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)'
                    }} />

                    {/* Top Owner Row */}
                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Avatar chat={{ profile: pulse.profile, userName: pulse.userName }} size={24} />
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pulse.isMine ? 'My Pulse' : pulse.userName}
                      </span>
                    </div>

                    {/* Content / Badge Bottom */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                      <div style={{
                        fontSize: '11px', color: '#ffffff', fontWeight: '600',
                        lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden', textShadow: '0 1px 3px rgba(0,0,0,0.9)'
                      }}>
                        {pulse.type === 'text' ? pulse.content : (pulse.content || `${pulse.type?.toUpperCase()} Pulse`)}
                      </div>

                      <div style={{
                        marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px',
                        padding: '2px 6px', borderRadius: '8px',
                        backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        fontSize: '9px', color: 'rgba(255,255,255,0.8)'
                      }}>
                        {pulse.visibility === 'everyone' ? <Globe size={9} /> : <Users size={9} />}
                        <span>{pulse.visibility === 'everyone' ? 'Public' : 'Contacts'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachPulseModal;
