import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getsocket } from './service/Websocket';
import { getchat } from './pages/ChatNames';
import { API, removeFCMToken } from './service/UserAuth';
import { useTheme } from './context/ThemeContext';
import Avatar from './components/chat/Avatar';
import { syncChatsMapToDB, saveUserIdToDB } from './service/db';
import messageStore from './pages/MessageStore';

function Navbar() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [roomname, setRoomname] = useState('');
  const [roomid, setRoomid] = useState('');
  const [message, setMessage] = useState('');
  const [chatnames, setChatnames] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState(null);
  const [createdChatId, setCreatedChatId] = useState(null);

  const { theme, setTheme, availableThemes } = useTheme();
  const userId = localStorage.getItem('userid');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const myDisplayName = localStorage.getItem('username') || localStorage.getItem('userid');
  const navigate = useNavigate();
  const location = useLocation();
  const [bottomNavVisible, setBottomNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const [headerText1, setHeaderText1] = useState("LetsChat");
  const [headerText2, setHeaderText2] = useState("");
  const [activeCursor, setActiveCursor] = useState(1);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const int = setInterval(() => setCursorVisible(v => !v), 500);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const runTyping = async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      
      const now = new Date();
      const hour = now.getHours();
      let greetingType = "evening";
      if (hour < 12) greetingType = "morning";
      else if (hour < 18) greetingType = "afternoon";

      const dateStr = now.toLocaleDateString();
      const storageKey = `greeting_${greetingType}`;
      
      const lastPlayedDate = localStorage.getItem(storageKey);
      if (lastPlayedDate === dateStr) {
        // setActiveCursor(0);
        // return; // Temporarily bypassed for testing
      }

      console.log("[LetsChat] Animation starting...");
      await wait(1500);

      let current1 = "LetsChat";
      while (current1.length > 0) {
        current1 = current1.slice(0, -1);
        setHeaderText1(current1);
        await wait(75);
      }
      
      await wait(300);

      let greeting = `Good ${greetingType},`;

      current1 = "";
      for (let char of greeting) {
        current1 += char;
        setHeaderText1(current1);
        await wait(60);
      }

      setActiveCursor(2);
      await wait(200);

      const name = localStorage.getItem('username') || localStorage.getItem('userid') || "User";
      let current2 = "";
      for (let char of name) {
        current2 += char;
        setHeaderText2(current2);
        await wait(60);
      }

      localStorage.setItem(storageKey, dateStr);
      console.log("[LetsChat] Animation finished, saved to local storage:", storageKey);

      await wait(2000);
      setActiveCursor(0);
    };

    runTyping();

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (userId) saveUserIdToDB(userId);
    console.log("[LetsChat] App Version 2.0.6 Initialized");
  }, [userId]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to hide/show bottom nav
  useEffect(() => {
    const handleScroll = (e) => {
      const target = e.target;
      // Only react to scroll events from content divs (not from inputs, etc.)
      if (!target || target === document) return;
      const currentY = target.scrollTop ?? 0;
      if (currentY > lastScrollY.current + 10) {
        setBottomNavVisible(false);
      } else if (currentY < lastScrollY.current - 10) {
        setBottomNavVisible(true);
      }
      lastScrollY.current = currentY;
    };
    // capture:true intercepts scroll events from ANY scrollable element on the page
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);
  const sidebarRef = useRef(null);
  const groupInputRef = useRef(null);
  const roomInputRef = useRef(null);
  const roomIdInputRef = useRef(null);
  const logoutRef = useRef(null);

  const mainPages = [
    { name: 'Chats', path: '/chats' },
    { name: 'Rooms', path: '/rooms' },
    { name: 'Search', path: '/search' },
    { name: 'Calendar', path: '/calendar' }
  ];

  const isActive = (path) => location.pathname === path;

  const fetchuser = () => {
    fetch(`${API}/user/chatbox/${userId}`)
      .then(res => res.json())
      .then(data => {
        const chat = data.filter(item => item.type === "private");
        const idset = new Set(selectedMembers.map(o => o.userId));
        const chat2 = chat.map(user => ({ ...user, isAdded: idset.has(user.id) }));
        setChatnames(chat2);
      })
      .catch(err => {
        console.error(err);
        setMessage("Failed to load users");
      });
  };

  const toggleMemberSelection = (user) => {
    if (user.isAdded) return;
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === user.id);
      if (isSelected) {
        return prev.filter(m => m.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const isSelected = (user) => {
    return selectedMembers.some(m => m.id === user.id);
  };

  const addtogroup = async (member, groupId) => {
    if (!member || !groupId) return;
    const response = await fetch(`${API}/group/add/${groupId}/${member.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Id': userId,
        'User-Name': myDisplayName,
      }
    });
    const res = await response.text();
    console.log(res);
  };

  const handleLogout = async () => {
    let socket = getsocket();
    socket.close();

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

  const toggleLogoutConfirm = () => {
    setShowLogoutConfirm(prev => !prev);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
    setActiveSection(null);
    setMessage('');
  };

  useEffect(() => {
    const handleOpenMenu = () => {
      setIsSidebarOpen(true);
    };
    window.addEventListener('open-navbar-menu', handleOpenMenu);
    return () => window.removeEventListener('open-navbar-menu', handleOpenMenu);
  }, []);

  const openFullscreenForm = (section) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
    setMessage('');
    if (section === 'createGroup') {
      fetchuser();
    }
  };

  const closeFullscreenForm = () => {
    setActiveSection(null);
    setGroupName('');
    setRoomname('');
    setRoomid('');
    setMessage('');
    setSelectedMembers([]);
    setChatnames([]);
    setCreatedGroupId(null);
    setCreatedChatId(null);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setMessage('Group name cannot be empty');
      return;
    }

    setIsAdding(true);
    setMessage('Creating group...');

    try {
      const response = await fetch(`${API}/group/create/${encodeURIComponent(groupName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "ngrok-skip-browser-warning": "true",
          'User-Id': userId,
          'Group-Name': groupName
        }
      });

      if (!response.ok) {
        const data = await response.text();
        setMessage(`Failed: ${data}`);
        setIsAdding(false);
        return;
      }

      const data = await response.text();
      const parts = data.split(',');
      const chatId = parts[0];
      const groupId = parts[1] || parts[0];

      setCreatedChatId(chatId);
      setCreatedGroupId(groupId);
      getchat(chatId);

      if (selectedMembers.length > 0) {
        for (const member of selectedMembers) {
          try {
            await addtogroup(member, groupId);
          } catch (error) {
            console.error(`Failed to add ${member.chatName}:`, error);
          }
        }
      }

      setMessage('Finalizing...');
      try {
        const res = await fetch(`${API}/user/chatbox/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch chats");
        const chatData = await res.json();

        let chatsMap = {};
        chatData.forEach(chat => {
          chatsMap[chat.chatId] = chat;
        });

        localStorage.setItem("chatsMap", JSON.stringify(chatsMap));
        syncChatsMapToDB(chatsMap);
        closeFullscreenForm();
        navigate('/chats', { state: { showSpacesForChat: chatId } });
      } catch (err) {
        setMessage('Group created but failed to load chat list');
        setIsAdding(false);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
      setIsAdding(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomname.trim()) {
      setMessage('Room name cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${API}/classroom/create/${encodeURIComponent(roomname)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "ngrok-skip-browser-warning": "true",
          'User-Id': userId
        }
      });

      if (response.ok) {
        const text = await response.text();
        let data = text;
        try {
          const roomInfo = JSON.parse(text);
          data = roomInfo.chatId || roomInfo.ChatId || roomInfo.id || text;
        } catch (e) {
          // If it's not JSON, assume the text itself is the chatId (UUID)
        }

        // Classrooms are permanent, do NOT mark as volatile
        setMessage(`Classroom created: ${roomname}`);
        getchat(data);

        const res = await fetch(`${API}/classroom/load/${userId}`);
        if (res.ok) {
          const chatData = await res.json();
          let chatsMap = JSON.parse(localStorage.getItem("chatsMap") || "{}");
          chatData.forEach(chat => {
            const cid = chat.ChatId || chat.chatId;
            chatsMap[cid] = { ...chat, type: 'classroom' };
          });
          localStorage.setItem("chatsMap", JSON.stringify(chatsMap));
          syncChatsMapToDB(chatsMap);
        }

        // Full Initialization Sync
        const chatsMap = JSON.parse(localStorage.getItem("chatsMap") || "{}");
        const visited = JSON.parse(localStorage.getItem("visited") || "{}");
        visited[data] = Date.now();
        localStorage.setItem("visited", JSON.stringify(visited));
        localStorage.setItem(data, JSON.stringify(chatsMap[data]));

        messageStore.setActivechatbox(data);
        getchat(data);
        messageStore.setCount(data);

        closeFullscreenForm();
        navigate('/chats', { state: { showSpacesForChat: data } });
      } else {
        const data = await response.text();
        setMessage(`Failed: ${data}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const joinclass = async () => {
    try {
      // New spec: Join via query param roomId and header User-Id
      const response = await fetch(`${API}/classroom/join/${encodeURIComponent(roomid)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "ngrok-skip-browser-warning": "true",
          'User-Id': userId
        }
      });

      if (response.ok) {
        const chatId = await response.text();
        if (!chatId) {
          setMessage("Invalid Classroom ID");
          return;
        }

        // Classrooms are permanent, do NOT mark as volatile
        setMessage("Joined Classroom successfully");
        getchat(chatId);

        const res = await fetch(`${API}/classroom/load/${userId}`);
        if (res.ok) {
          const chatData = await res.json();
          let chatsMap = JSON.parse(localStorage.getItem("chatsMap") || "{}");
          chatData.forEach(chat => {
            const cid = chat.ChatId || chat.chatId;
            chatsMap[cid] = { ...chat, type: 'classroom' };
          });
          localStorage.setItem("chatsMap", JSON.stringify(chatsMap));
          syncChatsMapToDB(chatsMap);

          messageStore.setActivechatbox(chatId);
          getchat(chatId);
          messageStore.setCount(chatId);

          closeFullscreenForm();
          navigate('/chats', { state: { showSpacesForChat: chatId } });
        }
      } else {
        const data = await response.text();
        setMessage(`Failed: ${data}`);
      }
    } catch (error) {
      console.log("error", error);
    }
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
      if (logoutRef.current && !logoutRef.current.contains(event.target)) {
        setShowLogoutConfirm(false);
      }
    };

    if (isSidebarOpen || showLogoutConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen, showLogoutConfirm]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinClassroom = params.get('joinClassroom');
    if (joinClassroom) {
      setRoomid(joinClassroom);
      openFullscreenForm('joinRoom');
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'createGroup' && groupInputRef.current) {
      groupInputRef.current.focus();
    } else if (activeSection === 'createRoom' && roomInputRef.current) {
      roomInputRef.current.focus();
    } else if (activeSection === 'joinRoom' && roomIdInputRef.current) {
      roomIdInputRef.current.focus();
    }
  }, [activeSection]);

  if (!isMobile && !isSidebarOpen && !activeSection) {
    return null;
  }

  if (location.pathname.startsWith("/chat/") && !isSidebarOpen && !activeSection) {
    return null;
  }

  return (
    <>
      {/* ── Mobile Top Nav (App Title + 3-Dots) ── */}
      <nav style={mobileTopNavStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ ...appNameStyle, fontSize: '18px', display: 'flex', alignItems: 'center' }}>
            {headerText1}
            <span style={{ 
              width: '2px', height: '18px', marginLeft: '4px', display: 'inline-block',
              backgroundColor: (activeCursor === 1 && cursorVisible) ? 'var(--accent-color)' : 'transparent',
              transition: 'background-color 0.1s'
            }}></span>
          </h3>
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500', display: 'flex', alignItems: 'center', minHeight: '16px', marginTop: '-2px' }}>
            {headerText2}
            {activeCursor >= 2 && (
              <span style={{ 
                width: '2px', height: '13px', marginLeft: '4px', display: 'inline-block',
                backgroundColor: (activeCursor === 2 && cursorVisible) ? '#9ca3af' : 'transparent',
                transition: 'background-color 0.1s'
              }}></span>
            )}
          </span>
        </div>
        <button onClick={toggleSidebar} style={menuButtonStyle}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="5" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="19" r="1" fill="currentColor" />
          </svg>
        </button>
      </nav>

      {/* ── Mobile Bottom Nav (Main Links) ── */}
      {bottomNavVisible && (
        <nav style={mobileBottomNavStyle(bottomNavVisible)}>
          {mainPages.map((page) => (
            <button
              key={page.path}
              onClick={() => {
                if (page.path === '/chats') {
                  navigate(page.path, { replace: true });
                } else {
                  navigate(page.path, { replace: location.pathname !== '/chats' });
                }
              }}
              style={{
                ...navLinkStyle,
                ...(isActive(page.path) ? activeLinkStyle : {})
              }}
            >
              <div style={{ marginBottom: '4px' }}>
                {/* Simple Dynamic Icons */}
                {page.name === 'Chats' && <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.23 8.38 8.38 0 0 1 3.8.9L21 3.5Z" /></svg>}
                {page.name === 'Rooms' && <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                {page.name === 'Search' && <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>}
                {page.name === 'Calendar' && <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>}
              </div>
              <span style={navTextStyle}>{page.name}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ── Sidebar overlay ── */}
      {isSidebarOpen && <div style={overlayStyle} onClick={toggleSidebar} />}

      {/* ── Sidebar ── */}
      <div ref={sidebarRef} style={{ ...sidebarStyle, transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)' }}>
        <div style={sidebarHeaderStyle}>
          <h3 style={sidebarTitleStyle}>Menu</h3>
          <button onClick={toggleSidebar} style={closeButtonStyle}>×</button>
        </div>

        <div style={sidebarContentStyle}>
          <div style={menuItemsContainerStyle}>

            <button onClick={() => openFullscreenForm('createGroup')} style={menuItemStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Create Group</span>
            </button>

            <button onClick={() => openFullscreenForm('createRoom')} style={menuItemStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              <span>Create Classroom</span>
            </button>

            <button onClick={() => openFullscreenForm('joinRoom')} style={menuItemStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              <span>Join Classroom</span>
            </button>

            <button onClick={() => { navigate('/starred'); setIsSidebarOpen(false); }} style={menuItemStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span>Starred Messages</span>
            </button>

            <button onClick={() => { navigate('/profile'); setIsSidebarOpen(false); }} style={menuItemStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Profile</span>
            </button>

            <div style={dividerStyle} />

            <button onClick={toggleLogoutConfirm} style={{ ...menuItemStyle, color: 'var(--danger-color)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout ({userId})</span>
            </button>

            {showLogoutConfirm && (
              <div style={confirmBoxStyle} ref={logoutRef}>
                <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'var(--text-primary)' }}>
                  Are you sure you want to logout?
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleLogout} style={confirmButtonStyle}>Yes</button>
                  <button onClick={toggleLogoutConfirm} style={cancelButtonStyle}>No</button>
                </div>
              </div>
            )}

            <div style={dividerStyle} />

            {/* ── Theme picker ── */}
            <div style={{ padding: '10px 0' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '600' }}>Theme</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {availableThemes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: theme === t.id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                      background: theme === t.id ? 'var(--nav-active-bg)' : 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Fullscreen: Create Group ── */}
      {activeSection === 'createGroup' && (
        <div style={fullscreenOverlayStyle}>
          <div style={fullscreenFormContainerStyle}>
            <div style={fullscreenHeaderStyle}>
              <h2 style={fullscreenTitleStyle}>Create Group</h2>
              <button onClick={closeFullscreenForm} style={fullscreenCloseButtonStyle}>×</button>
            </div>

            <div style={fullscreenBodyStyle}>
              <input
                ref={groupInputRef}
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
                placeholder="Enter group name"
                style={fullscreenInputStyle}
                autoFocus
              />

              {selectedMembers.length > 0 && (
                <div style={selectedCountStyle}>
                  <strong>Selected ({selectedMembers.length}):</strong>{' '}
                  {selectedMembers.map(m => m.chatName || m.id).join(', ')}
                </div>
              )}

              {chatnames.length > 0 && (
                <div style={membersContainerStyle}>
                  <p style={membersHeaderStyle}>Add Members (optional)</p>
                  <div style={membersListStyle}>
                    {chatnames.map(user => (
                      <div
                        key={user.id}
                        onClick={() => toggleMemberSelection(user)}
                        style={{
                          ...memberItemStyle,
                          ...(isSelected(user) ? selectedMemberStyle : {}),
                          ...(user.isAdded ? disabledMemberStyle : {}),
                          cursor: user.isAdded ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Avatar
                          chat={user}
                          size={36}
                        />
                        <div style={memberInfoStyle}>
                          <div style={memberNameStyle}>{user.chatName || user.id}</div>
                          {user.isAdded && <div style={alreadyAddedStyle}>Already in group</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {message && <p style={fullscreenMessageStyle}>{message}</p>}
            </div>

            <div style={fullscreenFooterStyle}>
              <button onClick={handleCreateGroup} style={fullscreenButtonStyle} disabled={isAdding}>
                {isAdding ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen: Create Classroom ── */}
      {activeSection === 'createRoom' && (
        <div style={fullscreenOverlayStyle}>
          <div style={fullscreenFormContainerStyle}>
            <div style={fullscreenHeaderStyle}>
              <h2 style={fullscreenTitleStyle}>Create Classroom</h2>
              <button onClick={closeFullscreenForm} style={fullscreenCloseButtonStyle}>×</button>
            </div>

            <div style={fullscreenBodyStyle}>
              <input
                ref={roomInputRef}
                type="text"
                value={roomname}
                onChange={(e) => setRoomname(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                placeholder="Enter classroom name"
                style={fullscreenInputStyle}
                autoFocus
              />
              {message && <p style={fullscreenMessageStyle}>{message}</p>}
            </div>

            <div style={fullscreenFooterStyle}>
              <button onClick={handleCreateRoom} style={fullscreenButtonStyle}>
                Create Classroom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen: Join Classroom ── */}
      {activeSection === 'joinRoom' && (
        <div style={fullscreenOverlayStyle}>
          <div style={fullscreenFormContainerStyle}>
            <div style={fullscreenHeaderStyle}>
              <h2 style={fullscreenTitleStyle}>Join Classroom</h2>
              <button onClick={closeFullscreenForm} style={fullscreenCloseButtonStyle}>×</button>
            </div>

            <div style={fullscreenBodyStyle}>
              <input
                ref={roomIdInputRef}
                type="text"
                maxLength={6}
                value={roomid}
                onChange={(e) => setRoomid(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && joinclass()}
                placeholder="Enter 6-character room ID"
                style={fullscreenInputStyle}
                autoFocus
              />
              {message && <p style={fullscreenMessageStyle}>{message}</p>}
            </div>

            <div style={fullscreenFooterStyle}>
              <button onClick={joinclass} style={fullscreenButtonStyle}>
                Join Classroom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframes for slideDown ── */}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const mobileTopNavStyle = {
  padding: '6px 16px',
  background: 'var(--bg-gradient)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 1px 6px rgba(0,0,0,0.3)',
  borderBottom: '1px solid var(--border-color)',
  position: 'fixed',
  width: '100%',
  top: 0,
  zIndex: 99,
  boxSizing: 'border-box',
  height: '60px'
};

const mobileBottomNavStyle = (visible) => ({
  position: 'fixed',
  bottom: 0,
  width: '100%',
  background: 'var(--bg-secondary)',
  borderTop: '1px solid var(--border-color)',
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  padding: visible ? '6px 0' : '0',
  height: visible ? 'auto' : '0',
  overflow: 'hidden',
  zIndex: 99,
  boxSizing: 'border-box',
  backdropFilter: 'blur(12px)',
  backgroundColor: 'rgba(18, 24, 38, 0.97)',
  transform: visible ? 'translateY(0)' : 'translateY(100%)',
  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  pointerEvents: visible ? 'auto' : 'none',
  visibility: visible ? 'visible' : 'hidden',
});

const topRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const appNameStyle = {
  margin: 0,
  fontSize: '22px',
  fontWeight: '800',
  letterSpacing: '-0.5px',
  background: 'linear-gradient(135deg, var(--accent-color) 0%, #a78bfa 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const linksContainerStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  justifyContent: 'flex-start',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none'
};

const navLinkStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-primary)',
  padding: '6px 10px',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  backdropFilter: 'blur(10px)',
  minWidth: '60px',
  flex: '0 0 auto',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  cursor: 'pointer',
  outline: 'none'
};

const activeLinkStyle = {
  background: 'var(--nav-active-bg)'
};

const navTextStyle = {
  fontSize: '10px',
  fontWeight: '500',
  letterSpacing: '0.2px',
  whiteSpace: 'nowrap'
};

const menuButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  background: 'var(--bg-card-hover)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(10px)'
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 998,
  backdropFilter: 'blur(2px)'
};

const sidebarStyle = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '280px',
  maxWidth: '80%',
  height: '100vh',
  background: 'var(--bg-gradient)',
  boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)',
  zIndex: 999,
  transition: 'transform 0.3s ease',
  overflowY: 'auto'
};

const sidebarHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  borderBottom: '2px solid #3b82f6'
};

const sidebarTitleStyle = {
  margin: 0,
  color: 'var(--text-primary)',
  fontSize: '24px',
  fontWeight: '600'
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: '32px',
  cursor: 'pointer',
  lineHeight: '1',
  padding: '0',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const sidebarContentStyle = {
  padding: '20px'
};

const menuItemsContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontSize: '14px',
  fontWeight: '500',
  width: '100%',
  textAlign: 'left'
};

const dividerStyle = {
  height: '1px',
  background: 'var(--border-color)',
  margin: '10px 0'
};

const confirmBoxStyle = {
  background: 'var(--bg-primary)',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  border: '1px solid #3b82f6',
  marginTop: '10px'
};

const confirmButtonStyle = {
  flex: 1,
  padding: '8px 16px',
  background: 'var(--accent-color)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '13px',
  transition: 'all 0.2s ease'
};

const cancelButtonStyle = {
  flex: 1,
  padding: '8px 16px',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '13px',
  transition: 'all 0.2s ease'
};

const fullscreenOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'var(--bg-gradient)',
  zIndex: 1000
};

const fullscreenFormContainerStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '100%'
};

const fullscreenHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '2px solid #3b82f6',
  background: 'var(--bg-gradient)',
  position: 'sticky',
  top: 0,
  zIndex: 10
};

const fullscreenTitleStyle = {
  margin: 0,
  color: 'var(--text-primary)',
  fontSize: '22px',
  fontWeight: '600'
};

const fullscreenCloseButtonStyle = {
  background: 'var(--bg-card-hover)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontSize: '28px',
  cursor: 'pointer',
  lineHeight: '1',
  padding: '4px',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  borderRadius: '6px',
  backdropFilter: 'blur(10px)'
};

const fullscreenBodyStyle = {
  flex: 1,
  padding: '30px 24px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
};

const fullscreenInputStyle = {
  padding: '18px 20px',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '2px solid var(--border-color)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  fontSize: '16px',
  outline: 'none',
  transition: 'all 0.2s ease',
  fontWeight: '500'
};

const fullscreenFooterStyle = {
  padding: '20px 24px',
  borderTop: '2px solid #3b82f6',
  background: 'var(--bg-gradient)',
  position: 'sticky',
  bottom: 0,
  zIndex: 10
};

const fullscreenButtonStyle = {
  width: '100%',
  padding: '18px 24px',
  background: 'var(--accent-color)',
  border: 'none',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  fontSize: '17px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const fullscreenMessageStyle = {
  padding: '16px 20px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  margin: '0',
  textAlign: 'center',
  lineHeight: '1.5'
};

const selectedCountStyle = {
  padding: '16px 20px',
  background: 'var(--border-color)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontWeight: '600',
  textAlign: 'center',
  maxHeight: '250px',
  overflowY: 'auto',
  wordBreak: 'break-word',
  transition: 'all 0.3s ease',
  lineHeight: '1.6'
};

const membersContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const membersHeaderStyle = {
  margin: '0',
  color: 'var(--text-primary)',
  fontSize: '16px',
  fontWeight: '600',
  paddingBottom: '8px',
  borderBottom: '1px solid var(--border-color)'
};

const membersListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  maxHeight: '300px',
  overflowY: 'auto'
};

const memberItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  background: 'rgba(59, 130, 246, 0.1)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  transition: 'all 0.3s ease'
};

const selectedMemberStyle = {
  background: 'rgba(34, 197, 94, 0.25)',
  border: '1px solid rgba(34, 197, 94, 0.6)'
};

const disabledMemberStyle = {
  opacity: '0.5',
  background: 'rgba(100, 100, 100, 0.1)'
};

const memberInfoStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  flex: 1
};

const memberNameStyle = {
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontWeight: '500'
};

const alreadyAddedStyle = {
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '11px'
};

export default Navbar;