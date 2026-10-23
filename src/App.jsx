import React, { Suspense, lazy , useEffect , useState} from "react";
import { Routes, Route, Navigate,useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { purgeExpiredMessages } from "./service/db";
import { purgeExpiredPulseMedia } from "./service/PulseMediaCache";
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
import { WifiOff } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import PendingOtpModal from "./components/modals/PendingOtpModal";

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
const Rooms = lazyWithSplash(() => import("./pages/Rooms"));
const ChatNames = lazyWithSplash(() => import("./pages/ChatNames"));
const Profileupdate = lazyWithSplash(() => import("./pages/Profileupdate"));
const ProfilePage = lazyWithSplash(() => import("./pages/ProfilePage"));
const ChatBox = lazyWithSplash(() => import("./pages/ChatBox"));
const Communities = lazyWithSplash(() => import("./pages/Communities"));
const RecommendedCommunities = lazyWithSplash(() => import("./pages/RecommendedCommunities"));
const MyCommunities = lazyWithSplash(() => import("./pages/MyCommunities"));
const CommunityCreationPage = lazyWithSplash(() => import("./pages/CommunityCreationPage"));
const UploadPost = lazyWithSplash(() => import("./pages/UploadPost"));
const MediaFeed = lazyWithSplash(() => import("./pages/MediaFeed"));
const SmoothCalendar = lazyWithSplash(() => import("./pages/SmoothCalendar"));
const ShareTargetPage = lazyWithSplash(() => import("./pages/ShareTargetPage"));
const StarredMessages = lazyWithSplash(() => import("./pages/StarredMessages"));
const PulsesTab = lazyWithSplash(() => import("./pages/PulsesTab"));
const LandingPage = lazyWithSplash(() => import("./pages/LandingPage"));
const Signin = lazyWithSplash(() => import("./pages/Signin"));
const Login = lazyWithSplash(() => import("./pages/Login"));

import CollisionAlertToast from "./components/chat/CollisionAlertToast";
import BookingRequestModal from "./components/modals/BookingRequestModal";

const PublicBookingPage = lazyWithSplash(() => import("./pages/PublicBookingPage"));
const PublicBookingView = lazyWithSplash(() => import("./pages/PublicBookingView"));
const LabsPage = lazyWithSplash(() => import("./pages/LabsPage"));
const BatchMessagingPage = lazyWithSplash(() => import("./pages/BatchMessagingPage"));
import { initSystemBroadcastSync } from "./service/SystemBroadcastService";
import { getPulseFeed } from "./service/PulseService";
import { badgeStore } from "./service/BadgeStore";

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
    // Initial cleanup of expired messages & pulses
    purgeExpiredMessages();
    purgeExpiredPulseMedia();

    // Periodic cleanup every 5 minutes
    const interval = setInterval(() => {
      purgeExpiredMessages();
      purgeExpiredPulseMedia();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Check for unseen pulses on app start
  useEffect(() => {
    const uid = localStorage.getItem("userid");
    if (!uid) return;

    const checkPulses = async () => {
      try {
        const feedList = await getPulseFeed();
        if (Array.isArray(feedList)) {
          const hasUnseen = feedList.some(item => item && !item.allSeen);
          badgeStore.setPulsesUnread(hasUnseen);
        }
      } catch (err) {
        console.warn("[App] Pulse startup check error:", err);
      }
    };

    checkPulses();
  }, []);

  const location = useLocation();
  const navigate=useNavigate();
  useNotifications(); // Initialize push notification logic
  const isBookingPage = location.pathname.startsWith("/book") || location.pathname.startsWith("/booking");
  const showNavbar = localStorage.getItem("userid") && location.pathname !== "/signin" && location.pathname !== "/login" && location.pathname !== "/welcome" && !isBookingPage;

  useEffect(() => {
    // System Broadcast Sync
    const cleanupBroadcast = initSystemBroadcastSync();

   // initWebsocket();
    const connectWS = () => {
      if (navigator.onLine) initWebsocket();
    };

    connectWS();
    window.addEventListener("online", connectWS);
    const id = localStorage.getItem("userid");
    const isAuthPage = location.pathname === "/login" || location.pathname === "/signin" || location.pathname === "/welcome";
    
    if (id) {
      // If logged in, don't allow visiting auth/landing pages (except public booking)
      if ((isAuthPage) || location.pathname === "/") {
        navigate("/chats", { replace: true });
      }
    } else {
      // If not logged in, allow landing, login, signup, and public booking page
      if (!isAuthPage && !isBookingPage) {
        navigate("/welcome", { replace: true });
      }
    }
    return () => {
      window.removeEventListener("online", connectWS);
      if (cleanupBroadcast) cleanupBroadcast();
    };
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
    <PendingOtpModal />
    <CollisionAlertToast />
    <BookingRequestModal />
    
    <div style={{
      width:"100%",
      height:"100dvh",
      display:"flex",
      flexDirection:"column",
      overflow:"hidden",
      paddingTop: (showNavbar && isMobile && !location.pathname.startsWith('/chat/') && !location.pathname.startsWith('/batch-message')) ? '60px' : '0',
      paddingBottom: '0',
      boxSizing: 'border-box',
      background: 'var(--bg-primary)'
    }}>
    {showNavbar && <Navbar />}
    <Suspense fallback={null}>
      <ErrorBoundary key={location.pathname}>
        <SwipeWrapper>
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/welcome" />} />
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/signin" element={<Signin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/book/:userIdentifier" element={<PublicBookingPage />} />
            <Route path="/booking/view/:tokenOrId" element={<PublicBookingView />} />
            {/* New Desktop Layout Routing */}
            <Route element={<ChatLayout />}>
              <Route path="/chats" element={<ChatNames/>}/>
              <Route path="/pulses" element={<PulsesTab/>}/>
              <Route path="/chat/:chatid" element={<ChatBox />} />
              <Route path="/search" element={<Search />}/>
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/calendar" element={<SmoothCalendar/>}/>
              <Route path="/profile/:targetUserId?" element={<ProfilePage/>}/>
              <Route path="/profileupdate" element={<Profileupdate/>}/>
              <Route path="/starred" element={<StarredMessages />} />
              <Route path="/labs" element={<LabsPage />} />
              <Route path="/batch-message" element={<BatchMessagingPage />} />
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
      </ErrorBoundary>
    </Suspense>
    </div>
    </EventPanel>
    </EventStorage>
    </PWAProvider>
    </>
  );
}

export default App;