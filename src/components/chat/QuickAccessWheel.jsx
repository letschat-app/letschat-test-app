import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Zap, Sparkles } from 'lucide-react';
import Avatar from './Avatar';
import messageStore from '../../pages/MessageStore';

const QuickAccessWheel = ({ currentChatId }) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isOpen, setIsOpen] = useState(false);
  const [wheelItems, setWheelItems] = useState([]);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  // Draggable state
  const [posY, setPosY] = useState(() => {
    const saved = localStorage.getItem('quick_access_button_y');
    if (saved) return parseInt(saved, 10);
    return Math.floor(window.innerHeight * 0.5);
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ y: 0, initialY: 0, hasMoved: false });

  // Handle window resize to enforce strict mobile visibility
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      // Clamp posY on resize
      setPosY(prev => Math.min(Math.max(80, prev), window.innerHeight - 100));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync data from messageStore and localStorage
  useEffect(() => {
    const refreshWheelData = () => {
      try {
        const chatsMap = JSON.parse(localStorage.getItem('chatsMap') || '{}');
        const pinnedIds = JSON.parse(localStorage.getItem('quick_access_chats') || '[]');
        const unreadCountsMap = messageStore.getCount();
        
        const unreadSet = new Set();
        let unreadChatCounter = 0;

        // Check for any unread chats other than the currently active one
        Object.keys(unreadCountsMap).forEach(chatId => {
          if (chatId !== currentChatId && messageStore.getChatCount(chatId) > 0) {
            unreadSet.add(chatId);
            unreadChatCounter++;
          }
        });

        setUnreadChatsCount(unreadChatCounter);

        // Combine unread chats with user-pinned quick access chats
        const combinedIds = new Set([...unreadSet, ...pinnedIds]);
        
        // Remove currently active chat from the wheel display to avoid redundancy
        combinedIds.delete(currentChatId);

        const items = Array.from(combinedIds).map(id => {
          const info = chatsMap[id] || { chatName: 'Chat', type: 'private', profile: '' };
          const unread = messageStore.getChatCount(id) || 0;
          return {
            id,
            chatName: info.chatName || info.userName || 'Unknown Chat',
            type: info.type || 'private',
            profile: info.profile || info.profilePic || '',
            unreadCount: unread,
            isPinned: pinnedIds.includes(id)
          };
        });

        // Sort items: unread first, then pinned
        items.sort((a, b) => (b.unreadCount > 0 ? 1 : 0) - (a.unreadCount > 0 ? 1 : 0));

        setWheelItems(items);
      } catch (err) {
        console.error('[QuickAccessWheel] Error refreshing data:', err);
      }
    };

    refreshWheelData();

    // Subscribe to message store notifications and quick access updates
    messageStore.addListener(refreshWheelData);
    window.addEventListener('quick-access-updated', refreshWheelData);
    window.addEventListener('storage', refreshWheelData);

    return () => {
      messageStore.removeListener(refreshWheelData);
      window.removeEventListener('quick-access-updated', refreshWheelData);
      window.removeEventListener('storage', refreshWheelData);
    };
  }, [currentChatId]);

  // Pointer Draggable Handlers for Trigger Button
  const handlePointerDown = (e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      y: e.clientY,
      initialY: posY,
      hasMoved: false
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.abs(deltaY) > 4) {
      dragStartRef.current.hasMoved = true;
    }

    let newY = dragStartRef.current.initialY + deltaY;
    newY = Math.min(Math.max(80, newY), window.innerHeight - 100);
    setPosY(newY);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (!dragStartRef.current.hasMoved) {
      // Treat as clean click
      setIsOpen(prev => !prev);
    } else {
      // Save new vertical coordinate after dragging
      localStorage.setItem('quick_access_button_y', posY.toString());
    }
  };

  // Hide component completely if there are no items in the wheel
  if (wheelItems.length === 0) {
    return null;
  }

  // Calculate circular radial positions for active overlay
  const calculateBubbleStyles = (index, total) => {
    const radius = Math.min(120, window.innerWidth * 0.32);
    // Start angle from straight top (-90 deg / -PI/2) and distribute evenly
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    return {
      transform: `translate(${x}px, ${y}px)`,
      opacity: 1,
      transition: `transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.05}s, opacity 0.3s ease ${index * 0.04}s`
    };
  };

  return (
    <>
      {/* ── Draggable Half-Circle Trigger Button on Right Edge ── */}
      {!isOpen && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'fixed',
            right: 0,
            top: `${posY}px`,
            transform: 'translateY(-50%)',
            width: '42px',
            height: '64px',
            borderRadius: '32px 0 0 32px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.88), rgba(168, 85, 247, 0.88))',
            backdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(255, 255, 255, 0.35)',
            borderRight: 'none',
            boxShadow: '0 4px 18px rgba(99, 102, 241, 0.5), 0 2px 8px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: '6px',
            zIndex: 900,
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
            transition: isDragging ? 'none' : 'background 0.2s, box-shadow 0.2s'
          }}
        >
          <Zap size={20} color="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />

          {/* ── Half-Inside, Half-Outside Unread Chats Badge ── */}
          {unreadChatsCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '25%',
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                color: 'white',
                fontSize: '11px',
                fontWeight: '800',
                height: '22px',
                minWidth: '22px',
                padding: '0 5px',
                borderRadius: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.7), 0 0 0 2px rgba(15, 23, 42, 0.9)',
                lineHeight: 1,
                pointerEvents: 'none',
                zIndex: 901
              }}
              title={`${unreadChatsCount} unread chat${unreadChatsCount > 1 ? 's' : ''}`}
            >
              {unreadChatsCount}
            </div>
          )}
        </div>
      )}

      {/* ── Center-Screen Radial Chat Wheel Overlay ── */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          {/* Central Action Hub Button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 10
            }}
          >
            <X size={28} color="#ef4444" style={{ strokeWidth: 2.5 }} />
          </div>

          {/* Surrounding Floating Chat Bubbles */}
          <div style={{ position: 'absolute', width: 0, height: 0, zIndex: 9 }}>
            {wheelItems.map((item, index) => {
              const bubbleStyle = calculateBubbleStyles(index, wheelItems.length);
              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    navigate(`/chat/${item.id}`, { replace: true });
                  }}
                  style={{
                    position: 'absolute',
                    top: '-32px',
                    left: '-32px',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    ...bubbleStyle
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar
                      chat={{ ...item, id: item.id, profile: item.profile }}
                      size={54}
                      style={{
                        border: item.unreadCount > 0 
                          ? '3px solid #ef4444' 
                          : '2px solid rgba(255, 255, 255, 0.35)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                        transition: 'transform 0.2s'
                      }}
                    />

                    {/* Unread Badge on Bubble */}
                    {item.unreadCount > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: -2,
                        right: -4,
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '800',
                        height: '20px',
                        minWidth: '20px',
                        padding: '0 4px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #0f172a',
                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.6)'
                      }}>
                        {item.unreadCount}
                      </div>
                    )}

                    {/* Pinned Sparkle Indicator */}
                    {item.isPinned && item.unreadCount === 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        right: -2,
                        background: '#8b5cf6',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1.5px solid #0f172a'
                      }}>
                        <Sparkles size={11} color="white" />
                      </div>
                    )}
                  </div>
                  {/* Chat Name Tooltip Label */}
                  <span style={{
                    marginTop: '5px',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: 'white',
                    background: 'rgba(15, 23, 42, 0.85)',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    border: 'none',
                    outline: 'none',
                    whiteSpace: 'nowrap',
                    maxWidth: '54px',
                    minWidth: '30px',
                    minHeight: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                    textAlign: 'center',
                    display: 'inline-block',
                    lineHeight: '14px'
                  }}>
                    {item.chatName?.trim() || 'Chat'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default QuickAccessWheel;
