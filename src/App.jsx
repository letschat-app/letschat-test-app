import React, { Suspense, lazy , useEffect , useState} from "react";
import { Routes, Route, Navigate,useLocation } from "react-router-dom";
// Custom lazy wrapper to remove splash screen ONLY when the first dynamic chunk resolves
const lazyWithSplash = (importFunc) => {
  return lazy(() => 
    importFunc().then((module) => {
      const loader = document.getElementById('pwa-splash-loader');
      if (loader && !loader.classList.contains('fade-out')) {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 300);
      }
      return module;
    })
  );
};

const Search = lazyWithSplash(() => import("./pages/Search"));
import Navbar from "./Navbar";
import { purgeExpiredMessages } from "./service/db";
import messageStore from "./pages/MessageStore";
import EventPanel from "./service/EventPanel";
import { EventStorage } from "./service/EventStorage";
import { initWebsocket } from "./service/Websocket";
import SwipeWrapper from "./Swipewrapper"; 
import ChatLayout from "./layouts/ChatLayout";
import { PWAProvider } from "./context/PWAContext";
import UpdateToast from "./components/chat/UpdateToast";
import InAppToast from "./components/chat/InAppToast";
import { useNotifications } from "./hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { WifiOff } from "lucide-react";

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // Initial cleanup
    purgeExpiredMessages();

    // Periodic cleanup every 5 minutes
    const interval = setInterval(() => {
      purgeExpiredMessages();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const location = useLocation();
  const navigate=useNavigate();
  useNotifications(); // Initialize push notification logic
  const showNavbar = localStorage.getItem("userid") && location.pathname !== "/signin" && location.pathname !== "/login" && location.pathname !== "/welcome";

  useEffect(() => {
   // initWebsocket();
    const connectWS = () => {
      if (navigator.onLine) initWebsocket();
    };

    connectWS();
    window.addEventListener("online", connectWS);
    const id = localStorage.getItem("userid");
    const isAuthPage = location.pathname === "/login" || location.pathname === "/signin" || location.pathname === "/welcome";
    
    if (id) {
      // If logged in, don't allow visiting auth/landing pages
      if (isAuthPage || location.pathname === "/") {
        navigate("/chats", { replace: true });
      }
    } else {
      // If not logged in, allow landing, login, and signup pages
      if (!isAuthPage) {
        navigate("/welcome", { replace: true });
      }
    }
    return () => window.removeEventListener("online", connectWS);
  }, [location.pathname]);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  return (
    
    <>
    <PWAProvider>
    {isOffline && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        backgroundColor: '#b91c1c',
        color: '#ffffff',
        fontSize: '13px',
        fontWeight: '600',
        padding: '8px 16px',
        textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <WifiOff size={16} />
        <span>You are currently offline. Messages queued locally will auto-sync when reconnected.</span>
      </div>
    )}
    <UpdateToast />
    <EventStorage>
    <EventPanel>
    <InAppToast />
    
    <div style={{
      width:"100%",
      height:"100dvh",
      display:"flex",
      flexDirection:"column",
      overflow:"hidden",
      paddingTop: (showNavbar && isMobile && !location.pathname.startsWith('/chat/')) ? '60px' : '0',
      paddingBottom: '0',
      boxSizing: 'border-box',
      background: 'var(--bg-primary)'
    }}>
    {showNavbar && <Navbar />}
    <Suspense fallback={null}>
      
      <SwipeWrapper>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/welcome" />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/login" element={<Login />} />
          {/* New Desktop Layout Routing */}
          <Route element={<ChatLayout />}>
            <Route path="/chats" element={<ChatNames/>}/>
            <Route path="/chat/:chatid" element={<ChatBox />} />
            <Route path="/search" element={<Search />}/>
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/calendar" element={<SmoothCalendar/>}/>
            <Route path="/profile" element={<ProfilePage/>}/>
            <Route path="/profileupdate" element={<Profileupdate/>}/>
            <Route path="/starred" element={<StarredMessages />} />
          </Route>

          <Route path="/communities" element={<Communities />}>
            <Route path="recommended" element={<RecommendedCommunities />} />
            <Route path="my" element={<MyCommunities />} />
            <Route path="create" element={<CommunityCreationPage />} />
            <Route path="" element={<Navigate to="recommended" />} />
          </Route>
          <Route path="/post/:communityId" element={<UploadPost/>} />
          <Route path="/feed" element={<MediaFeed/>}/>
          <Route path="/calendar" element={<SmoothCalendar/>}/>
          <Route path="/share-target" element={<ShareTargetPage />} />
        </Routes>
      </SwipeWrapper>
      
      
    </Suspense>
    </div>
    </EventPanel>
    </EventStorage>
    </PWAProvider>
    </>
  );
}

export default App;