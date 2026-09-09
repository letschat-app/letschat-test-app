import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getsocket } from '../service/Websocket';
import { MessageSquare, Users, Search, Calendar, LogOut, Settings, User, Star } from 'lucide-react';
import { removeFCMToken } from '../service/UserAuth';

const topMenuItems = [
    { id: 'chats', path: '/chats', icon: MessageSquare, label: 'Chats' },
    { id: 'search', path: '/search', icon: Search, label: 'Search' },
    { id: 'starred', path: '/starred', icon: Star, label: 'Starred' },
    { id: 'rooms', path: '/rooms', icon: Users, label: 'Rooms' },
    { id: 'calendar', path: '/calendar', icon: Calendar, label: 'Calendar' },
];

const bottomMenuItems = [
    { id: 'profile', path: '/profile', icon: User, label: 'Profile' },
    { id: 'settings', path: '/settings', icon: Settings, label: 'Settings' },
];

const DesktopSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            const socket = getsocket();
            if (socket) socket.close();
        } catch (e) { }

        const deviceId = localStorage.getItem('deviceId');
        if (deviceId) {
            try {
                await removeFCMToken(deviceId);
            } catch (err) {
                console.error('Failed to remove FCM token on logout:', err);
            }
        }

        localStorage.clear();
        navigate('/login');
    };

    const isActive = (path) => {
        const chatid = location.pathname.split('/chat/')[1];
        const chatsMap = JSON.parse(localStorage.getItem('chatsMap') || '{}');
        const isRoom = chatid && chatsMap[chatid]?.type === 'room';

        if (path === '/chats' && location.pathname.includes('/chat/') && !isRoom) return true;
        if (path === '/rooms' && (location.pathname.includes('/rooms') || isRoom)) return true;
        
        return location.pathname === path;
    };

    const navItemStyle = (active) => ({
        position: 'relative',
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: active ? 'var(--nav-active-bg)' : 'transparent',
        transition: 'background 0.2s ease',
        flexShrink: 0,
    });

    return (
        <div style={{
            width: '64px',
            minWidth: '64px',
            flexShrink: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            paddingBottom: '16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            boxSizing: 'border-box',
            zIndex: 100,
        }}>
            {/* Top icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                {topMenuItems.map(({ id, path, icon: Icon, label }) => {
                    const active = isActive(path);
                    return (
                        <div
                            key={id}
                            onClick={() => navigate(path)}
                            style={navItemStyle(active)}
                            title={label}
                        >
                            <Icon
                                size={22}
                                strokeWidth={active ? 2.5 : 2}
                                color={active ? 'var(--accent-color)' : 'var(--text-secondary)'}
                            />
                            {active && (
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '25%',
                                    height: '50%',
                                    width: '3px',
                                    background: 'var(--accent-color)',
                                    borderRadius: '0 4px 4px 0',
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                {bottomMenuItems.map(({ id, path, icon: Icon, label }) => {
                    const active = isActive(path);
                    return (
                        <div
                            key={id}
                            onClick={() => navigate(path)}
                            style={navItemStyle(active)}
                            title={label}
                        >
                            <Icon
                                size={22}
                                strokeWidth={active ? 2.5 : 2}
                                color={active ? 'var(--accent-color)' : 'var(--text-secondary)'}
                            />
                        </div>
                    );
                })}
                <div
                    onClick={handleLogout}
                    style={navItemStyle(false)}
                    title="Logout"
                >
                    <LogOut size={22} strokeWidth={2} color="var(--text-secondary)" />
                </div>
            </div>
        </div>
    );
};

export default DesktopSidebar;
