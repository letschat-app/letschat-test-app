import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import ChatNames from '../pages/ChatNames';
import Rooms from '../pages/Rooms';
import DesktopSidebar from '../components/DesktopSidebar';
import Navbar from '../Navbar';

export default function ChatLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const navigate = useNavigate();
  const isChatOpen = location.pathname.includes('/chat/');
  const isMainChatList = location.pathname === '/chats' || location.pathname === '/';

  const userId = localStorage.getItem('userid');
  const username = localStorage.getItem('username') || userId;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    // On mobile, always render the routed content via Outlet
    // SwipeWrapper in App.jsx handles the page transitions
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </div>
    );
  }

  // Desktop 3-Layer Layout
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100%', flex: 1, overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
      {/* Layer 1: Desktop Sidebar */}
      <DesktopSidebar />

      {/* Layer 2: Chat/Room List */}
      <div style={{
        width: '380px',
        minWidth: '380px',
        borderRight: '1px solid var(--border-color)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {(() => {
            const chatid = location.pathname.split('/chat/')[1];
            // Only show Rooms list if specifically on the /rooms page discovery view
            const isRoomDiscovery = location.pathname === '/rooms';

            if (isRoomDiscovery) {
              return <Rooms isSidebar={true} activeChatRoute={location.pathname} />;
            }
            return <ChatNames isDesktop={true} activeChatRoute={location.pathname} hideTitle={true} />;
          })()}
        </div>
      </div>

      {/* Layer 3: Main Content */}
      <div style={{ flex: 1, height: '100%', position: 'relative', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
        {isMainChatList ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px',
            background: 'var(--bg-secondary)',
            position: 'relative'
          }}>
            {/* WhatsApp-style Empty State Card */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              padding: '60px 40px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '600px',
              textAlign: 'center',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '90px',
                background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-card) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '40px',
                fontSize: '84px',
                border: '4px solid var(--bg-secondary)'
              }}>
                💬
              </div>
              <h1 style={{ fontSize: '36px', color: 'var(--text-primary)', marginBottom: '20px', fontWeight: '800' }}>LetsChat Desktop</h1>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
                Control your identity, not just your messages.<br />
                With LetsChat, customize your profile per chat, organize conversations into chatspaces, track key moments with event recognition, and explore public rooms.
              </p>

              <div style={{ display: 'flex', gap: '24px', color: 'var(--text-secondary)' }}>
                {[
                  { icon: '📅', label: 'Visit Calendar', path: '/calendar' },
                  { icon: '🚪', label: 'Explore Rooms', path: '/rooms' },
                ].map((action, i) => (
                  <div
                    key={i}
                    onClick={() => navigate(action.path)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <div
                      style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1px solid var(--border-color)', transition: 'transform 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      {action.icon}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '500' }}>{action.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <span style={{ opacity: 0.6 }}>🔒 End-to-end encrypted</span>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}

const iconButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s',
  outline: 'none'
};
