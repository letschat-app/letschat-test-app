import useVisualViewport from '../hooks/useVisualViewport';
import { clearChatNotifications } from '../hooks/useNotifications';
import React, { useEffect, useState, useRef, useMemo, useLayoutEffect, useCallback, Suspense } from "react";

import { useParams, useLocation, useNavigate } from "react-router-dom";
import { resetToChats } from "../utils/navigation";

import { getchat } from "./ChatNames";

import { v4 as uuidv4 } from "uuid";

import { API } from "../service/UserAuth";

import { getsocket, sendSafe, sendMediaOpenedEvent } from "../service/Websocket";

import messageStore from "./MessageStore";

import ChatHeader from "../components/chat/ChatHeader";

import ChatMessageList from "../components/chat/ChatMessageList";

import ChatInputBar from "../components/chat/ChatInputBar";

import {
  resolveChatMediaUrl,
  getCurrentLocalDateTimeString,
  stripMentionEncoding,
  renderFormattedText as renderFormattedChatText,
  isWithin24Hours,
  formatBannerText,
  isEventPassed as checkIsEventPassed,
  isEventBannerPin,
} from "../utils/chatFormatting";

import { initDB, saveUsersBatchToDB, saveGroupMembersToDB, markSpaceMessagesAsOldInDB, getGroupMembersFromDB, isChatMuted, toggleMuteChat } from '../service/db';

import { useNotifications } from '../hooks/useNotifications';

import { useTheme } from '../context/ThemeContext';

import {
  X,
  Check,
  Clock,
  Copy,
  Forward,
  Reply,
  Calendar,
  Bird,
  User,
  Send
} from "lucide-react";

import { useEventMediator } from "../service/EventStorage";

import AssignmentMessage from "./AssignmentMessage";

import MediaMessage from '../components/chat/MediaMessage';
import { createPackedPreview } from '../service/TinyPreview';
import { useToast } from '../components/common/ToastProvider';
import '../components/chat/messages.css';
import { lazyModal } from '../utils/lazyModal';

const EventModal = lazyModal(() => import("../components/modals/EventModal"));
const GroupCalendarPanel = lazyModal(() => import("../components/chat/GroupCalendarPanel"));
const InfoModal = lazyModal(() => import("../components/modals/InfoModal"));
const AddMemberModal = lazyModal(() => import("../components/modals/AddMemberModal"));
const MessageStatusInfoModal = lazyModal(() => import("../components/modals/MessageStatusInfoModal"));
const AssignmentPostModal = lazyModal(() => import("../components/modals/AssignmentPostModal"));
const ClassroomMatrixModal = lazyModal(() => import("../components/modals/ClassroomMatrixModal"));
const ClassroomReportModal = lazyModal(() => import("../components/modals/ClassroomReportModal"));
const CameraCaptureModal = lazyModal(() => import('../components/modals/CameraCaptureModal'));
const MediaViewer = lazyModal(() => import('../components/chat/MediaViewer'));
const MediaPreviewModal = lazyModal(() => import('../components/chat/MediaPreviewModal'));
const ScheduleMessageModal = lazyModal(() => import('../components/modals/ScheduleMessageModal'));
const ScheduledListModal = lazyModal(() => import('../components/modals/ScheduledListModal'));
const CreatePollModal = lazyModal(() => import('../components/modals/CreatePollModal'));
const AttachPulseModal = lazyModal(() => import('../components/pulse/AttachPulseModal'));
const ReactorsModal = lazyModal(() => import('../components/chat/ReactorsModal'));
const ChatLegacyMediaOverlay = lazyModal(() => import('../components/chat/ChatLegacyMediaOverlay'));
const ChatActionModals = lazyModal(() => import('../components/chat/ChatActionModals'));
const GroupAlbumModal = lazyModal(() => import('../components/chat/GroupAlbumModal'));

import simulationService from "../service/SimulationService";

import { SIMULATION_ID } from "../service/SimulationScript";

import QuickAccessWheel from '../components/chat/QuickAccessWheel';

import { uploadMedia, getFileCategory, getVideoThumbnail, getPdfThumbnail, compressImageBlob } from '../service/MediaUploader';

import { saveBlobToCache, getMediaInfo, renameCacheKey } from '../service/MediaCache';

import spaceStore from "../service/SpaceStore";

const ImageEditor = lazyModal(() => import('../editor/ImageEditor'));



// Module-level throttle tracker: records last sync timestamp per `${chatId}_${spaceId}`

const lastChatSyncTimes = {};



const ChatBox = () => {
  const toast = useToast();

  const { chatid } = useParams();
  const { isInputFocused = false, isIOS = (typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))) } = useVisualViewport?.() || {};

  useEffect(() => {
    if (!chatid) return;
    clearChatNotifications(chatid);
    const recheckTimer = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        clearChatNotifications(chatid);
      }
    }, 1500);
    const onActive = () => {
      if (document.visibilityState !== 'hidden') {
        clearChatNotifications(chatid);
      }
    };
    document.addEventListener('visibilitychange', onActive);
    window.addEventListener('focus', onActive);
    window.addEventListener('pageshow', onActive);
    return () => {
      clearTimeout(recheckTimer);
      document.removeEventListener('visibilitychange', onActive);
      window.removeEventListener('focus', onActive);
      window.removeEventListener('pageshow', onActive);
    };
  }, [chatid]);

  const navigate = useNavigate();

  const { theme } = useTheme();

  const isSimulation = chatid === SIMULATION_ID;



  const [chat, setChat] = useState(() => {

    if (chatid === SIMULATION_ID || chatid === "BROADCAST_SYSTEM") {

      return {

        id: SIMULATION_ID,

        chatId: SIMULATION_ID,

        chatName: "LetsChat",

        type: "guide",

        role: "student",

        isSimulation: true,

        isSystem: true,

        verified: true,

        profile: `${import.meta.env.BASE_URL}icon.png`

      };

    }

    const cached = JSON.parse(localStorage.getItem("chatsMap") || "{}");

    return cached[chatid] || { id: chatid, chatId: chatid, chatName: "Chat" };

  });



  useEffect(() => {

    if (chatid === "BROADCAST_SYSTEM") {

      navigate(`/chat/${SIMULATION_ID}`, { replace: true });

      return;

    }

    if (chatid === SIMULATION_ID) {

      setChat({

        id: SIMULATION_ID,

        chatId: SIMULATION_ID,

        chatName: "LetsChat",

        type: "guide",

        role: "student",

        isSimulation: true,

        isSystem: true,

        verified: true,

        profile: `${import.meta.env.BASE_URL}icon.png`

      });

      return;

    }

    const cached = JSON.parse(localStorage.getItem("chatsMap") || "{}");

    if (cached[chatid]) {

      setChat(cached[chatid]);

    } else {

      setChat({ id: chatid, chatId: chatid, chatName: "Chat" });

    }

  }, [chatid]);

  useEffect(() => {
    const handleChatUpdated = (e) => {
      const detail = e?.detail;
      if (!detail || String(detail.chatId) !== String(chatid)) return;
      setChat((prev) => (prev ? { ...prev, ...detail } : detail));
    };
    window.addEventListener('letschat_chat_updated', handleChatUpdated);
    return () => window.removeEventListener('letschat_chat_updated', handleChatUpdated);
  }, [chatid]);

  const { requestPermissionAndGetToken } = useNotifications();

  const currentUserId = localStorage.getItem('userid');

  const myDisplayName = localStorage.getItem('username') || currentUserId;

  const composerRef = useRef(null);

  const inputDraftRef = useRef("");

  const [cameraOpen, setCameraOpen] = useState(false);

  const [isOnline, setIsOnline] = useState(false);

  const location = useLocation();

  const [activeSpace, setActiveSpace] = useState(() => {

    const params = new URLSearchParams(window.location.search || (window.location.hash && window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : ''));

    return parseInt(params.get('space') || params.get('spaceId')) || 0;

  });



  // Chat members for @mentions

  const [chatMembers, setChatMembers] = useState([]);

  const [spaceNames, setSpaceNames] = useState({});

  const [isQuickAccessPinned, setIsQuickAccessPinned] = useState(false);

  const [isSyncingMessages, setIsSyncingMessages] = useState(false);

  const isMountedRef = useRef(true);



  useEffect(() => {

    isMountedRef.current = true;

    return () => {

      isMountedRef.current = false;

    };

  }, []);



  useEffect(() => {

    if (chatid) {

      const pinned = JSON.parse(localStorage.getItem('quick_access_chats') || '[]');

      setIsQuickAccessPinned(pinned.includes(chatid));

    }

  }, [chatid]);



  const toggleQuickAccessPin = () => {

    const pinned = JSON.parse(localStorage.getItem('quick_access_chats') || '[]');

    let updated;

    if (pinned.includes(chatid)) {

      updated = pinned.filter(id => id !== chatid);

      setIsQuickAccessPinned(false);

    } else {

      updated = [...pinned, chatid];

      setIsQuickAccessPinned(true);

    }

    localStorage.setItem('quick_access_chats', JSON.stringify(updated));

    window.dispatchEvent(new Event('quick-access-updated'));

    setShowHeaderMenu(false);

  };





  useEffect(() => {

    const viewportMeta = document.querySelector('meta[name="viewport"]');

    if (viewportMeta) {

      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, interactive-widget=resizes-content');

    }

    return () => {

      if (viewportMeta) {

        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');

      }

    };

  }, []);



  useEffect(() => {

    if (chatid) {

      spaceStore.fetchSpaceNames(chatid);

    }

    const unsubscribe = spaceStore.subscribe(() => {

      if (chatid) setSpaceNames({ ...spaceStore.spaces[chatid] });

    });

    return unsubscribe;

  }, [chatid]);



  useEffect(() => {

    if (location.state?.openInfo) {

      setShowInfo(true);

      // Clear state to avoid reopening on refresh

      navigate(location.pathname, { replace: true, state: { ...location.state, openInfo: undefined } });

    }

  }, [location.state?.openInfo, navigate, location.pathname]);



  useEffect(() => {

    if (location.state?.openGroupCalendar || location.state?.selectedEvent) {

      if (location.state?.selectedEvent) {

        setHasChanges(false);

        setSelectedEvent({ ...location.state.selectedEvent, chatid, isGroup: true });

        setShowGroupCalendar(false);

        setShowEventModal(true);

      } else {

        setShowGroupCalendar(true);

      }

      navigate(location.pathname, {

        replace: true,

        state: { ...location.state, openGroupCalendar: undefined, selectedEvent: undefined }

      });

    }

  }, [location.state?.openGroupCalendar, location.state?.selectedEvent, chatid, navigate, location.pathname]);



  // Fetch chat members for @ mentions if group, classroom, or room

  useEffect(() => {

    if (chat && (chat.type === 'group' || chat.type === 'classroom' || chat.type === 'room')) {

      const fetchMembers = async () => {

        // Cache first: immediate read from IndexedDB

        getGroupMembersFromDB(chat.chatId).then(cached => {

          if (cached && cached.length) setChatMembers(cached);

        });

        try {

          const res = await fetch(`${API}/group/getmembers/${chat.chatId}`, {

            method: "GET",

            headers: {

              "Content-Type": "application/json",

              "User-Id": currentUserId,

            },

          });

          if (res.ok) {

            const data = await res.json();

            setChatMembers(data);

            saveGroupMembersToDB(chat.chatId, data);

            saveUsersBatchToDB(data);

          } else {

            throw new Error("Network fetch failed");

          }

        } catch (ex) {

          console.warn("Failed to fetch members for mentions, using offline cache:", ex);

        }

      };

      fetchMembers();

    }

  }, [chatid, chat, currentUserId]);

  const handlePollCreated = (pollData) => {

    if (!pollData || !chatid) return;

    const tempId = "temp-poll-" + uuidv4();

    const pollContent = JSON.stringify({ poll_id: pollData.poll_id });

    const localTimestamp = getCurrentLocalDateTimeString();



    const pollMsg = {

      tempmsgid: tempId,

      chatid: String(chatid),

      userid: currentUserId,

      sendername: myDisplayName,

      type: "poll",

      content: pollContent,

      spaceid: activeSpace || 0,

      timestamp: localTimestamp,

      status: "pending",

      poll: {

        poll_id: pollData.poll_id,

        question: pollData.question,

        allow_multiple: pollData.allow_multiple,

        allow_user_options: pollData.allow_user_options,

        anonymous: pollData.anonymous,

        is_hidden_voting: Boolean(pollData.is_hidden_voting),

        expires_at: pollData.expires_at,

        total_voters: 0,

        total_members: (chat && chat.type === 'private') ? 2 : ((chatMembers && chatMembers.length) || 2),

        options: (pollData.options || []).map(opt => ({

          option_id: opt.option_id,

          option_text: opt.text || opt.option_text || String(opt),

          count: 0,

          voters: []

        })),

        user_votes: []

      }

    };



    messageStore.addMessage(pollMsg);



    sendSafe({

      tempmsgid: tempId,

      chatid: String(chatid),

      type: "poll",

      content: pollContent,

      spaceid: activeSpace || 0,

      timestamp: localTimestamp

    });



    const totalSent = parseInt(localStorage.getItem('totalMessagesSent') || '0', 10) + 1;

    localStorage.setItem('totalMessagesSent', totalSent.toString());

    if (totalSent >= 1 && window.Notification && window.Notification.permission !== 'granted') {

      const dismissed = localStorage.getItem('replyNotifyDismissed');

      if (dismissed !== 'true') {

        setShowReplyNotifyBanner(true);

      }

    }

  };



  const { events, updateEvent, addEvent: addEventToMediator } = useEventMediator();

  const messagesContainerRef = useRef(null);

  const isLoadingMoreRef = useRef(false);

  const hasMoreInDBRef = useRef(true);

  const hasMoreInServerRef = useRef(true);

  const lastLoadMoreTimestampRef = useRef(null);

  const lastLoadMoreTimeRef = useRef(0);

  const [activeLinkMenu, setActiveLinkMenu] = useState(null);

  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);

  const [unreadSinceScrolled, setUnreadSinceScrolled] = useState(0);

  const isScrolledUpRef = useRef(false);

  const lastScrollTopRef = useRef(0);

  const lastActivityRef = useRef(Date.now());

  const activityTimerRef = useRef(null);

  const pulseTimerRef = useRef(null);

  const idleTimerRef = useRef(null);

  const inChatActiveRef = useRef(false);

  const [transientIndicators, setTransientIndicators] = useState([]);

  const [hoveredMsgId, setHoveredMsgId] = useState(null);

  const [reactionPickerTarget, setReactionPickerTarget] = useState(null);

  const [reactionInfo, setReactionInfo] = useState(null);

  const isMounted = useRef(true);

  const [showReplyNotifyBanner, setShowReplyNotifyBanner] = useState(() => {

    const dismissed = localStorage.getItem('replyNotifyDismissed');

    const totalSent = parseInt(localStorage.getItem('totalMessagesSent') || '0', 10);

    const hasPerm = window.Notification && window.Notification.permission === 'granted';

    return totalSent >= 1 && dismissed !== 'true' && !hasPerm;

  });



  useEffect(() => {

    const dismissed = localStorage.getItem('replyNotifyDismissed');

    const totalSent = parseInt(localStorage.getItem('totalMessagesSent') || '0', 10);

    const hasPerm = window.Notification && window.Notification.permission === 'granted';

    if (totalSent >= 1 && dismissed !== 'true' && !hasPerm) {

      setShowReplyNotifyBanner(true);

    } else {

      setShowReplyNotifyBanner(false);

    }

  }, [chatid]);



  const handleDismissReplyNotifyBanner = () => {

    localStorage.setItem('replyNotifyDismissed', 'true');

    setShowReplyNotifyBanner(false);

  };



  const handleEnableReplyNotify = async () => {

    try {

      await requestPermissionAndGetToken();

      if (window.Notification && (window.Notification.permission === 'granted' || window.Notification.permission === 'denied')) {

        localStorage.setItem('replyNotifyDismissed', 'true');

        setShowReplyNotifyBanner(false);

      }

    } catch (err) {

      console.warn("Failed to request push notification permission:", err);

      localStorage.setItem('replyNotifyDismissed', 'true');

      setShowReplyNotifyBanner(false);

    }

  };

  const [showClassroomMatrixModal, setShowClassroomMatrixModal] = useState(false);

  const [showReportExportModal, setShowReportExportModal] = useState(false);

  const [showPollModal, setShowPollModal] = useState(false);

  const [showAttachPulseModal, setShowAttachPulseModal] = useState(false);

  const [attachedPulse, setAttachedPulse] = useState(null);

  const [pendingUnreadCount, setPendingUnreadCount] = useState(0);

  const [unreadMarker, setUnreadMarker] = useState({ count: 0, firstId: null });



  const [messages, setMessages] = useState([]);
  const [pendingMediaItems, setPendingMediaItems] = useState(() => messageStore.getPendingMedia(chatid));
  const pendingAnnounceTimers = useRef(new Map());
  const pendingAnnouncedSet = useRef(new Set());
  const abortedPendingIds = useRef(new Set());



  const allVisibleMessages = useMemo(() => {

    const clearedAtMap = JSON.parse(localStorage.getItem('clearedAt') || '{}');

    const globalClearedAt = clearedAtMap[`${chatid}_all`] || 0;

    const globalTime = globalClearedAt ? new Date(globalClearedAt).getTime() : 0;



    return messages.filter(m => {

      if (!m.timestamp) return true;

      const spaceClearedAt = clearedAtMap[`${chatid}_${m.spaceid}`] || 0;

      const spaceTime = spaceClearedAt ? new Date(spaceClearedAt).getTime() : 0;

      const effectiveClearedAt = Math.max(globalTime, spaceTime);



      const msgTime = new Date(m.timestamp).getTime();

      return msgTime > effectiveClearedAt;

    });

  }, [messages, chatid]);



  const [filterMember, setFilterMember] = useState(null);

  const [showFilterModal, setShowFilterModal] = useState(false);

  const [userStreakMap, setUserStreakMap] = useState({});



  useEffect(() => {

    if (chatMembers && chatMembers.length > 0) {

      const map = {};

      chatMembers.forEach(m => {

        if (m.userId && (m.pulseStreak || m.streak)) {

          map[m.userId] = m.pulseStreak || m.streak;

        }

      });

      setUserStreakMap(prev => ({ ...prev, ...map }));

    }

  }, [chatMembers]);



  const filteredMessages = useMemo(() => {

    let list = allVisibleMessages.filter(msg => msg.spaceid === activeSpace);

    const pendingForSpace = (pendingMediaItems || []).filter(
      p => Number(p.spaceid ?? 0) === Number(activeSpace ?? 0) && String(p.senderid) !== String(currentUserId)
    );
    if (pendingForSpace.length > 0) {
      list = [...list, ...pendingForSpace].sort((a, b) => {
        const ta = new Date(a.timestamp).getTime() || 0;
        const tb = new Date(b.timestamp).getTime() || 0;
        return ta - tb;
      });
    }

    if (filterMember) {

      list = list.filter(msg => {

        if (filterMember.userId && msg.userid) {

          if (String(msg.userid) === String(filterMember.userId)) return true;

        }

        if (filterMember.userName && msg.sendername) {

          if (msg.sendername.toLowerCase() === filterMember.userName.toLowerCase()) return true;

        }

        return false;

      });

    }

    return list;

  }, [allVisibleMessages, activeSpace, filterMember, pendingMediaItems]);



  const filterCandidates = useMemo(() => {

    const map = new Map();

    if (chatMembers && chatMembers.length > 0) {

      chatMembers.forEach(m => map.set(String(m.userId), { userId: m.userId, userName: m.userName, profile: m.profile, role: m.role }));

    }

    allVisibleMessages.forEach(msg => {

      const uId = msg.userid ? String(msg.userid) : null;

      const name = msg.sendername;

      if (uId && !map.has(uId)) {

        map.set(uId, { userId: uId, userName: name || "User", profile: null });

      } else if (name && name !== "server" && !uId) {

        if (!map.has(name)) {

          map.set(name, { userId: null, userName: name, profile: null });

        }

      }

    });

    return Array.from(map.values());

  }, [chatMembers, allVisibleMessages]);



  useEffect(() => {

    const params = new URLSearchParams(location.search || (location.hash && location.hash.includes('?') ? '?' + location.hash.split('?')[1] : ''));

    const sId = parseInt(params.get('space') || params.get('spaceId')) || 0;

    setActiveSpace(sId);
    const assignId = params.get('assignmentId');
    if (assignId) {
      setSelectedAssignmentId(assignId);
      setShowAssignmentDetail(true);
    }



    if (chatid) {

      // Capture unread state before clearing for the marker

      const currentUnread = messageStore.getSpaceCount(chatid, sId);

      if (currentUnread > 0) {

        setPendingUnreadCount(currentUnread);

        // Reset marker for the new view session

        setUnreadMarker({ count: 0, firstId: null });

      } else {

        setPendingUnreadCount(0);

        setUnreadMarker({ count: 0, firstId: null });

      }

      messageStore.setCount(chatid, sId);

    }

  }, [location.search, chatid]);



  // Resolve where to put the "Unread Messages" divider

  useEffect(() => {

    if (!chatid || isSimulation || pendingUnreadCount === 0) return;

    if (unreadMarker.firstId) return;



    if (filteredMessages.length >= pendingUnreadCount) {

      const firstUnreadMsg = filteredMessages[filteredMessages.length - pendingUnreadCount];

      if (firstUnreadMsg) {

        const targetId = firstUnreadMsg.msgid || firstUnreadMsg.tempmsgid;

        setUnreadMarker({

          count: pendingUnreadCount,

          firstId: targetId

        });

        setPendingUnreadCount(0); // Marker established

        setTimeout(() => {

          const el = messageRefs.current[targetId];

          if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });

        }, 100);

      }

    }

  }, [filteredMessages, chatid, activeSpace, isSimulation, pendingUnreadCount]);



  useEffect(() => () => { isMounted.current = false; }, []);







  const renderFormattedText = useCallback(
    (text) => renderFormattedChatText(text, { onLinkClick: setActiveLinkMenu }),
    []
  );

  const handleCopySelected = () => {

    const selectedText = Array.from(selectedMessages)

      .filter(m => m && m.type === 'text')

      .map(m => stripMentionEncoding(m.content))

      .join('\n');



    if (selectedText) {

      navigator.clipboard.writeText(selectedText).then(() => {

        setCopiedId(true);

        setTimeout(() => setCopiedId(false), 2000);

        setIsSelectionMode(false);

        setSelectedMessages(new Set());

      }).catch(err => {

        console.error("Failed to copy", err);

      });

    }

  };



  const handleShareSelected = async () => {

    const selectedMediaMsgs = Array.from(selectedMessages)

      .filter(m => m && ['image', 'video', 'file', 'pdf', 'audio'].includes(m.type));



    if (selectedMediaMsgs.length === 0) {

      toast.info("No shareable media (images, videos, or files) selected.");

      return;

    }



    if (!navigator.share) {

      toast.info("Native sharing is not supported on this browser.");

      return;

    }



    setIsSharingMedia(true);



    try {

      const filesToShare = [];



      const results = await Promise.allSettled(

        selectedMediaMsgs.map(async (msg) => {

          const mediaId = msg.content;

          const info = await getMediaInfo(mediaId);



          let blob;

          try {

            const db = await initDB();

            const cacheKey = (msg.tempmsgid && msg.status === 'sending') ? msg.tempmsgid : `${mediaId}_full`;

            const cachedParams = await db.get('mainCache', cacheKey);

            if (cachedParams && cachedParams.blob) {

              blob = cachedParams.blob;

              console.log(`[Share] Using cached blob for ${cacheKey}`);

            }

          } catch (e) {

            console.error('Failed to read from IDB cache during share', e);

          }



          if (!blob) {

            console.log(`[Share] Cache miss, fetching from network for ${mediaId}`);

            const url = resolveChatMediaUrl(info.fileKey);



            const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });

            if (!response.ok) throw new Error("Fetch failed");

            blob = await response.blob();

          }



          // Use filename from metadata or fallback

          const fileName = info.fileName || `file_${mediaId}`;

          return new File([blob], fileName, { type: blob.type || 'application/octet-stream' });

        })

      );



      results.forEach(res => {

        if (res.status === 'fulfilled') {

          filesToShare.push(res.value);

        }

      });



      if (filesToShare.length === 0) {

        throw new Error("Could not prepare any files for sharing.");

      }



      // Check if the set of files can be shared

      if (navigator.canShare && navigator.canShare({ files: filesToShare })) {

        await navigator.share({

          files: filesToShare,

          title: `Shared from ${chat?.chatName || 'LetsChat'}`,

          text: `Selected media from chat`

        });



        // Success: clear selection

        setIsSelectionMode(false);

        setSelectedMessages(new Set());

      } else if (filesToShare.length > 1) {

        // Fallback: try sharing just the first one if multiple fail

        if (navigator.canShare({ files: [filesToShare[0]] })) {

          await navigator.share({

            files: [filesToShare[0]],

            title: `Shared from ${chat?.chatName || 'LetsChat'}`,

            text: `(Sharing 1 of ${filesToShare.length} selected files)`

          });

          setIsSelectionMode(false);

          setSelectedMessages(new Set());

        } else {

          toast.info("Platform does not support sharing this file type.");

        }

      } else {

        toast.info("Platform does not support sharing this file type.");

      }

    } catch (err) {

      if (err.name !== 'AbortError') { // Ignore user cancel

        console.error("Sharing failed:", err);

        toast.error("Sharing failed. Please try again.");

      }

    } finally {

      setIsSharingMedia(false);

    }

  };

  const [showClassroomNav, setShowClassroomNav] = useState(true);

  const [lastScrollTop, setLastScrollTop] = useState(0);

  const [copiedId, setCopiedId] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const inputRef = useRef(null);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  const [showAssignmentDetail, setShowAssignmentDetail] = useState(false);

  const [viewingMedia, setViewingMedia] = useState(null);

  const [viewingGallery, setViewingGallery] = useState(null);

  const [activeAlbumGroup, setActiveAlbumGroup] = useState(null);

  const [editingViewerSrc, setEditingViewerSrc] = useState(null);

  const [pendingMediaFile, setPendingMediaFile] = useState(null);

  const [uploadProgressInternal, setUploadProgressInternal] = useState(0);

  const [isUploadingInternal, setIsUploadingInternal] = useState(false);

  const [showInputBox, setShowInputBox] = useState(true);

  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const [selectedMessages, setSelectedMessages] = useState(new Set());

  const [isSharingMedia, setIsSharingMedia] = useState(false);

  const activeUploads = useRef(new Map()); // Map<tempmsgid, AbortController>

  const [showMediaWaitModal, setShowMediaWaitModal] = useState(false);

  const [pendingTextMessage, setPendingTextMessage] = useState(null);

  const queuedTextMessagesRef = useRef([]);

  const [queuedCount, setQueuedCount] = useState(0);

  const [selectedQueuedMsg, setSelectedQueuedMsg] = useState(null);

  const lastSoundTimeRef = useRef(0);



  // Scheduled Messages State

  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [showScheduledList, setShowScheduledList] = useState(false);

  const [scheduledMessages, setScheduledMessages] = useState([]);

  const [scheduleEditData, setScheduleEditData] = useState(null);

  const [showClearModal, setShowClearModal] = useState(false);



  const fetchScheduledMessages = async () => {

    if (!chatid) return;

    try {

      const res = await fetch(`${API}/schedule/get/${chatid}`, {

        headers: { 'user-id': localStorage.getItem('userid') }

      });

      if (res.ok) {

        const data = await res.json();

        setScheduledMessages(Array.isArray(data) ? data : []);

      }

    } catch (err) { console.error("Failed to fetch scheduled: ", err); }

  };



  useEffect(() => {

    if (chatid) {

      fetchScheduledMessages();



      // Background Member Sync (SWR Hydration + Fresh Revalidation)

      const chatsMap = JSON.parse(localStorage.getItem("chatsMap") || "{}");

      const chatEnv = chatsMap[chatid];

      if (chatEnv && (chatEnv.type === 'group' || chatEnv.type === 'classroom')) {

        const targetChatId = chatEnv.chatId || chatEnv.chatid;

        // 1. Immediate cache hydration from IndexedDB
        getGroupMembersFromDB(targetChatId).then(cached => {
          if (cached && cached.length) {
            setChatMembers(cached);
          }
        }).catch(e => console.error("Cached members read failed:", e));

        // 2. Background fresh revalidation
        fetch(`${API}/group/getmembers/${targetChatId}`, {

          headers: { "Content-Type": "application/json", "User-Id": localStorage.getItem("userid") }

        })

          .then(res => res.ok ? res.json() : null)

          .then(data => {

            if (data && data.length) {

              setChatMembers(data);

              saveUsersBatchToDB(data);

              saveGroupMembersToDB(targetChatId, data);

            }

          }).catch(err => console.error("Background members sync failed:", err));

      }

    }

  }, [chatid]);



  const handleScheduleSubmit = async (data) => {

    try {

      const payload = {

        chatId: chatid,

        senderId: localStorage.getItem('userid'),

        spaceId: activeSpace,

        messageType: data.messageType || 'text',

        message: data.message,

        time: data.time

      };

      if (data.msgid) payload.msgid = data.msgid;



      const res = await fetch(`${API}/schedule/create`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(payload)

      });

      if (!res.ok) throw new Error("Failed to schedule message");



      setShowScheduleModal(false);

      setScheduleEditData(null);

      fetchScheduledMessages();

    } catch (err) { toast.error(err.message); }

  };



  const handleDeleteSchedule = async (msgid) => {

    try {

      const res = await fetch(`${API}/schedule/delete/${msgid}`, { method: 'POST' });

      if (!res.ok) throw new Error("Failed to delete scheduled message");

      fetchScheduledMessages();

      if (scheduledMessages.length <= 1) setShowScheduledList(false);

    } catch (err) { toast.error(err.message); }

  };



  // const [showInfo,setShowInfo] = useState(false);

  useEffect(() => {

    const checkMobile = () => {

      setIsMobile(window.innerWidth < 1024);

    };



    checkMobile();

    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);

  }, []);



  // Simulation Logic

  const [guideStep, setGuideStep] = useState(null);



  useEffect(() => {

    if (isSimulation) {

      simulationService.start((step) => {

        setGuideStep(step);

      });

      return () => simulationService.stop();

    }

  }, [chatid, isSimulation]);



  useEffect(() => {

    if (isSimulation) {

      simulationService.handleUserAction("space_change", activeSpace);

    }

  }, [activeSpace, isSimulation]);





  const sendReaction = (msg, text) => {

    const cleanText = typeof text === 'string' ? text.trim().slice(0, 15) : '';

    if (!cleanText) return;

    const reactionMsg = {

      chatid,

      tempmsgid: `reaction-${uuidv4()}`,

      content: cleanText,

      type: 'reaction',

      msgtype: 'reaction',

      repliedTo: msg.msgid || msg.tempmsgid,

      repliedto: msg.msgid || msg.tempmsgid,

      userid: localStorage.getItem('userid'),

      sendername: localStorage.getItem('username') || localStorage.getItem('userid'),

      timestamp: new Date().toISOString(),

      spaceid: activeSpace,

      isold: false

    };



    // Update local store immediately for feedback

    messageStore.addMessage(reactionMsg);

    setMessages([...messageStore.getMessages(chatid)]);



    // Send via websocket

    sendSafe(reactionMsg);



    setReactionPickerTarget(null);

  };



  const [repliedto, setrepliedto] = useState(null);







  const spaceName = useMemo(() => {

    if (chat?.type === 'classroom') {

      return activeSpace === 0 ? "Announcements" : activeSpace === 1 ? "Assignments" : "Q&A Discussion";

    }



    let storeName = spaceStore.getSpaceName(chatid, activeSpace);

    if (storeName === `Space ${activeSpace}`) {

      const cachedSpaces = JSON.parse(localStorage.getItem('spacesCache') || '{}');

      const chatSpaces = cachedSpaces[chatid];

      if (chatSpaces) {

        const spaceObj = chatSpaces.find(s => s.id === activeSpace);

        if (spaceObj && spaceObj.name && spaceObj.name !== `Space ${activeSpace}`) {

          return spaceObj.name;

        }

      }

    }

    return storeName;

  }, [chat?.type, activeSpace, spaceNames, chatid]);



  const handleRenameSpace = async () => {

    if (activeSpace === 0 || chat?.type === 'classroom') return;

    const currentName = spaceStore.getSpaceName(chatid, activeSpace);

    const newName = await prompt({ title: "Rename Space", message: "Enter new name for this space:", defaultValue: currentName });

    if (newName && newName.trim() && newName !== currentName) {

      await spaceStore.setSpaceName(chatid, activeSpace, newName.trim());

    }

  };



  const syncChatOnOpen = async (targetChatId, targetSpaceId) => {

    if (!targetChatId || targetChatId === SIMULATION_ID || targetChatId === "BROADCAST_SYSTEM") return;



    const sId = Number(targetSpaceId || 0);

    const syncKey = `${targetChatId}_${sId}`;

    const now = Date.now();

    const lastSync = lastChatSyncTimes[syncKey] || 0;

    if (now - lastSync < 25000) {

      console.log(`[ChatBox] Skipping sync for ${syncKey}, last synced ${Math.round((now - lastSync) / 1000)}s ago`);

      return;

    }

    lastChatSyncTimes[syncKey] = now;



    if (isMountedRef.current) setIsSyncingMessages(true);



    try {

      // Find latest message timestamp in store for targetChatId and sId

      let cursorTimestamp = null;

      const existing = (messageStore.getMessages(targetChatId) || []).filter(m => {

        const msgSpace = m.spaceid !== undefined ? m.spaceid : (m.spaceId !== undefined ? m.spaceId : 0);

        return Number(msgSpace) === sId;

      });



      if (existing.length > 0) {

        for (const m of existing) {

          if (m.timestamp && (!cursorTimestamp || new Date(m.timestamp) > new Date(cursorTimestamp))) {

            cursorTimestamp = m.timestamp;

          }

        }

      }



      let hasMore = true;

      while (hasMore) {

        let url = `${API}/user/chatbox/${encodeURIComponent(targetChatId)}/sync-messages?spaceId=${sId}`;

        if (cursorTimestamp) {

          url += `&lastTimestamp=${encodeURIComponent(cursorTimestamp)}`;

        }



        const res = await fetch(url, {

          method: 'GET',

          headers: {

            'Content-Type': 'application/json',

            'User-Id': currentUserId || localStorage.getItem('userid'),

            'ngrok-skip-browser-warning': 'true'

          }

        });



        if (!res.ok) {

          console.warn('[ChatBox] sync-messages failed with status:', res.status);

          break;

        }



        const data = await res.json();

        if (!data || !data.msgs) {

          break;

        }



        data.usermsgId = data.usermsgId !== undefined ? data.usermsgId : sId;

        messageStore.handleBatch(data);



        // Refresh event or poll data if present

        if (Array.isArray(data.msgs) && data.msgs.length > 0) {

          data.msgs.forEach(m => {

            if (m.poll && messageStore.handlePollUpdate) {

              try {

                messageStore.handlePollUpdate({

                  ...m.poll,

                  chatid: targetChatId,

                  msgid: m.msgid || m.messageId || m.tempmsgid

                });

              } catch (e) {

                console.warn('[ChatBox] handlePollUpdate error:', e);

              }

            }

            if (m.content && messageStore.parseCallback) {

              try {

                messageStore.parseCallback({

                  ...m,

                  chatid: targetChatId,

                  msgid: m.msgid || m.messageId || m.tempmsgid

                });

              } catch (e) {

                console.warn('[ChatBox] parseCallback error:', e);

              }

            }

          });

          // Dispatch group calendar & event refresh

          window.dispatchEvent(new CustomEvent('letschat_refresh_events'));

          window.dispatchEvent(new CustomEvent('letschat_event_sync'));

        }



        if (data.hasmore === true && data.msgs && data.msgs.length > 0) {

          const lastMsg = data.msgs[data.msgs.length - 1];

          if (lastMsg && lastMsg.timestamp) {

            cursorTimestamp = lastMsg.timestamp;

            hasMore = true;

          } else {

            hasMore = false;

          }

        } else {

          hasMore = false;

        }

      }

    } catch (err) {

      console.warn('[ChatBox] syncChatOnOpen error:', err);

    } finally {

      if (isMountedRef.current) {

        setIsSyncingMessages(false);

      }

    }

  };



  let socket = getsocket();



  useEffect(() => {

    if (!chatid) {

      resetToChats(navigate);

      return;

    }

    if (isSimulation) return;

    // Notify server of check-in to this specific chat and space

    getchat(chatid, activeSpace, null, chat?.type);

    syncChatOnOpen(chatid, activeSpace);

  }, [chatid, activeSpace, isSimulation]);



  useEffect(() => {

    socket = getsocket();

    //const socket=localStorage.getItem('socket');

    setMessages([]);

    // Load initial messages from IDB (including temporary room cache)

    messageStore.loadAllSpacesMessages(chatid, 20).then(() => {

      const msgs = messageStore.getMessages(chatid);

      setMessages([...msgs]);



      // Notify server that messages have been read

      const lastReceivedMsg = msgs.filter(m => m.userid !== localStorage.getItem('userid')).pop();

      if (lastReceivedMsg && lastReceivedMsg.status !== 'read' && lastReceivedMsg.status !== 'seen') {

        sendSafe({

          purpose: "read",

          userchatId: chatid,

          usermsgId: lastReceivedMsg.msgid || lastReceivedMsg.tempmsgid,

          spaceId: activeSpace

        });

      }



      // Mark all isold:false messages as old in IDB only.

      // This ensures that on the next session, these messages are treated as history.

      markSpaceMessagesAsOldInDB(chatid, activeSpace).catch(err =>

        console.warn('[ChatBox] markMessagesAsOldInDB failed:', err)

      );

    });



    // Listener for new messages

    const handleNewMessage = (msg) => {

      // Handle batch load event

      if (msg && msg.type === 'batch_loaded' && msg.chatid === chatid) {

        hasMoreInServerRef.current = msg.hasmore;

        const el = messagesContainerRef.current;

        const oldScrollHeight = el ? el.scrollHeight : 0;



        const updatedMessages = [...messageStore.getMessages(chatid)];

        setMessages(updatedMessages);



        requestAnimationFrame(() => {

          if (el) el.scrollTop = el.scrollHeight - oldScrollHeight + el.scrollTop;

        });

        return;

      }



      const incomingChatId = msg ? (msg.chatid || msg.chatId || msg.userchatId) : null;

      if (msg && msg.pendingChanged && String(incomingChatId) === String(chatid)) {
        setPendingMediaItems([...messageStore.getPendingMedia(chatid)]);
        if (!isScrolledUpRef.current) {
          scrollToBottom();
        }
        return;
      }

      if (msg && String(incomingChatId) === String(chatid)) {

        console.log("[ChatBox] Global store updated for chatid:", chatid);

        const updatedMessages = [...messageStore.getMessages(chatid)];

        setMessages(updatedMessages);
        setPendingMediaItems([...messageStore.getPendingMedia(chatid)]);



        // Notify server that messages have been read

        const lastReceivedMsg = updatedMessages.filter(m => m.userid !== localStorage.getItem('userid')).pop();

        if (lastReceivedMsg && lastReceivedMsg.status !== 'read' && lastReceivedMsg.status !== 'seen') {

          sendSafe({

            purpose: "read",

            userchatId: chatid,

            usermsgId: lastReceivedMsg.msgid || lastReceivedMsg.tempmsgid,

            spaceId: activeSpace

          });

        }

        if (msg.type !== 'indicator' && msg.type !== 'onlineStatusUpdate' && document.visibilityState !== 'hidden') {
          clearChatNotifications(chatid);
        }



        // --- NEW: Scroll behavior on new message ---

        if (msg.type !== 'indicator' && msg.type !== 'onlineStatusUpdate' && msg.type !== 'batch_loaded') {

          // Sound logic is now handled globally in Websocket.js



          if (isScrolledUpRef.current) {

            // If scrolled up, just increment counter and do NOT scroll down

            setUnreadSinceScrolled(prev => prev + 1);

          } else {

            scrollToBottom();

          }

        }

        // -------------------------------------------

      }

    };



    // Initial space setup handled by URL useEffect



    setShowInputBox(true);

    setIsSelectionMode(false);

    setSelectedMessages(new Set());

    hasMoreInDBRef.current = true;

    isLoadingMoreRef.current = false;

    hasMoreInServerRef.current = true;



    messageStore.setActivechatbox(chatid);

    messageStore.setActiveSpace(activeSpace);

    messageStore.addListener(handleNewMessage);

    const sendCheckOutForSpace = () => {
      if (!chatid) return;
      stopIndicators();
      updateV();
      sendSafe({
        purpose: "check-out",
        userchatId: chatid,
        chatid: chatid,
        chatId: chatid,
        usermsgId: activeSpace
      });
    };

    const handleVisibilityOrHide = () => {
      if (document.visibilityState === 'hidden') {
        sendCheckOutForSpace();
      } else if (document.visibilityState === 'visible' && chatid) {
        messageStore.setActivechatbox(chatid);
        messageStore.setActiveSpace(activeSpace);
        sendSafe({
          purpose: "check-in",
          userchatId: chatid,
          chatid: chatid,
          chatId: chatid,
          usermsgId: activeSpace
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrHide);
    window.addEventListener('pagehide', sendCheckOutForSpace);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.removeEventListener('pagehide', sendCheckOutForSpace);
      messageStore.removeListener(handleNewMessage);
      messageStore.removeListener(handleIndicatorUpdate);
      messageStore.setActivechatbox(null);
      messageStore.setActiveSpace(null);
      console.log("leaving");
      sendCheckOutForSpace();
    }
  }, [chatid, activeSpace]);



  const handleClearChat = (clearAll) => {

    const clearedAtMap = JSON.parse(localStorage.getItem('clearedAt') || '{}');

    const now = new Date().toISOString();

    if (clearAll) {

      clearedAtMap[`${chatid}_all`] = now;

    } else {

      clearedAtMap[`${chatid}_${activeSpace}`] = now;

    }

    localStorage.setItem('clearedAt', JSON.stringify(clearedAtMap));



    // Refresh local messages state

    setMessages([...messageStore.getMessages(chatid)]);

    setShowClearModal(false);

    setShowHeaderMenu(false);

  };





  const [showmedia, setshowmedia] = useState(null);

  const [statusInfoMsg, setStatusInfoMsg] = useState(null);



  useEffect(() => {

    if (showmedia && (showmedia.msgid || showmedia.tempmsgid)) {

      const targetMsgId = showmedia.msgid || showmedia.tempmsgid;

      const targetChatId = showmedia.chatid || chatid || chat?.id || chat?.chatId;

      if (targetChatId && targetMsgId) {

        sendMediaOpenedEvent(targetChatId, targetMsgId);

      }

    }

  }, [showmedia, chatid]);



  // --- NEW: Header Menu State ---

  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const [showInviteMenu, setShowInviteMenu] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);

  const [isCurrentChatPinned, setIsCurrentChatPinned] = useState(() => {

    const pinned = JSON.parse(localStorage.getItem('pinnedChats') || '[]');

    return pinned.includes(chatid);

  });



  useEffect(() => {

    const pinned = JSON.parse(localStorage.getItem('pinnedChats') || '[]');

    setIsCurrentChatPinned(pinned.includes(chatid));

  }, [chatid]);



  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {

    if (chatid) {

      isChatMuted(chatid).then(muted => setIsMuted(!!muted));

    }

  }, [chatid]);



  const togglePin = (e) => {

    e.stopPropagation();

    const pinned = JSON.parse(localStorage.getItem('pinnedChats') || '[]');

    const isPinned = pinned.includes(chatid);

    let updated;

    if (isPinned) {

      updated = pinned.filter(id => id !== chatid);

    } else {

      updated = [...pinned, chatid];

    }

    localStorage.setItem('pinnedChats', JSON.stringify(updated));

    setIsCurrentChatPinned(!isPinned);

    setShowHeaderMenu(false);

    // Optional: Dispatch event so ChatNames can update if it's listening

    window.dispatchEvent(new Event('storage'));

  };

  // ------------------------------



  // --- NEW: Ephemeral Indicators State Sync ---

  const handleIndicatorUpdate = (msg) => {

    if (!msg) return;

    if (import.meta.env.DEV) console.log("[ChatBox] Indicator Update Signal:", msg.type, "for chat:", msg.chatid, "Current chat:", chatid);



    // Using loose equality (==) to handle string/number comparison

    if (msg.chatid == chatid && msg.type === 'indicator') {

      const myId = localStorage.getItem('userid');

      const indicators = messageStore.getIndicators(chatid).filter(ind => ind.userid != myId);

      if (import.meta.env.DEV) console.log("[ChatBox] Updating transient indicators (filtered):", indicators);

      setTransientIndicators(indicators);

    }

  };



  useEffect(() => {

    const myId = localStorage.getItem('userid');

    const initialIndicators = messageStore.getIndicators(chatid).filter(ind => ind.userid != myId);

    setTransientIndicators(initialIndicators);

    messageStore.addListener(handleIndicatorUpdate);

    return () => messageStore.removeListener(handleIndicatorUpdate);

  }, [chatid]);



  // --- NEW: Indicator Broadcasting Engine ---

  const sendIndicator = (content) => {

    if (!chatid || isSimulation) return;

    const msg = {

      type: "indicator",

      content,

      chatid,

      sendername: myDisplayName,

      senderid: localStorage.getItem('userid'), // Changed from userid to senderid

      spaceid: activeSpace

    };

    if (import.meta.env.DEV) console.log("[ChatBox] Sending Indicator:", msg);

    sendSafe(msg);

  };



  const stopIndicators = () => {

    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);

    if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    inChatActiveRef.current = false;

  };



  const resetInChatTimer = () => {

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    if (inChatActiveRef.current) {

      inChatActiveRef.current = false;

      // Should we send a 'stop' indicator? For simplicity, we just stop pulsing 

      // and wait for the recipient's TTL to expire.

    }



    idleTimerRef.current = setTimeout(() => {

      if (!isRecording && inputDraftRef.current.trim().length === 0) {

        startPulsing('in-chat');

        inChatActiveRef.current = true;

      }

    }, 5000);

  };



  const startPulsing = (content) => {

    sendIndicator(content);

    if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);

    // Pulse faster than receiving TTL (3s) to keep it alive

    pulseTimerRef.current = setInterval(() => sendIndicator(content), 2000);

  };



  const notifyActivity = (type) => {

    if (!chatid || isSimulation) return;



    lastActivityRef.current = Date.now();

    resetInChatTimer();



    // 1. If we aren't already pulsing OR the content has changed (e.g. from in-chat to typing), start immediately

    // We'll just call startPulsing to reset the interval with the new content

    startPulsing(type);



    // 2. Clear previous idle timer (which stops the pulsing)

    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);



    // 3. Set new idle timer to stop indicators after 5s of no activity

    activityTimerRef.current = setTimeout(() => {

      stopIndicators();

      // Fall back to in-chat indication immediately after typing/recording stops

      startPulsing('in-chat');

      inChatActiveRef.current = true;

    }, 5000);

  };



  const autoPinIfRoom = () => {

    if (chat?.type === 'room') {

      const pinned = JSON.parse(localStorage.getItem('pinnedRoomIds') || '[]');

      if (!pinned.includes(chatid)) {

        const updated = [...pinned, chatid];

        localStorage.setItem('pinnedRoomIds', JSON.stringify(updated));

        window.dispatchEvent(new Event('storage'));

      }

    }

  };



  useEffect(() => {

    // Initial In-Chat timer on mount/chat change

    stopIndicators();

    resetInChatTimer();

    return () => stopIndicators();

  }, [chatid]);



  // -------------------------------------------



  // Online Status Polling for Active Contact

  useEffect(() => {

    if (!chatid || chat.id === 'SIMULATION_ID' || chat.type !== 'private') return;



    // Resolve the actual user ID for presence (URL chatid might be a chat record ID)

    const presenceId = chat.userId || chat.id || chatid;



    let timerId = null;

    let isActive = true;



    const scheduleNext = (delay) => {

      if (!isActive) return;

      if (timerId) clearTimeout(timerId);

      timerId = setTimeout(runPoll, delay);

    };



    const runPoll = async () => {

      if (!isActive) return;



      if (!navigator.onLine) {

        if (import.meta.env.DEV) console.log("[StatusPoll] ChatBox Offline, retrying in 10s");

        scheduleNext(10000);

        return;

      }



      if (import.meta.env.DEV) console.log("[StatusPoll] ChatBox polling for:", presenceId);



      try {

        const res = await fetch(`${API}/user/check-status`, {

          method: "POST",

          headers: {

            "Content-Type": "application/json",

            "ngrok-skip-browser-warning": "true",

            "User-Id": localStorage.getItem('userid')

          },

          body: JSON.stringify([presenceId])

        });



        if (res.ok) {

          const statusMap = await res.json();

          const online = !!statusMap[presenceId];



          if (!online && isOnline) {

            localStorage.setItem(`lastSeen_${presenceId}`, new Date().toISOString());

          }

          setIsOnline(online);

          messageStore.updateOnlineStatuses(statusMap);

          scheduleNext(60000); // 1 min sync on success

        } else {

          scheduleNext(10000); // 10s retry on server error

        }

      } catch (err) {

        console.error("Failed to check active contact status:", err);

        scheduleNext(10000); // 10s retry on network error

      }

    };



    // Initial state from global store

    if (messageStore.onlineStatuses[presenceId] !== undefined) {

      setIsOnline(!!messageStore.onlineStatuses[presenceId]);

    }



    runPoll();



    const handleGlobalStatusUpdate = (update) => {

      if (!update) return;

      if (update.type === 'onlineStatusUpdate' && update.statusMap[presenceId] !== undefined) {

        setIsOnline(!!update.statusMap[presenceId]);

      }

    };

    messageStore.addListener(handleGlobalStatusUpdate);



    return () => {

      isActive = false;

      if (timerId) clearTimeout(timerId);

      messageStore.removeListener(handleGlobalStatusUpdate);

    };

  }, [chatid, chat.id, chat.userId, chat.type]);



  const handleDraftChange = useCallback((val) => {
    inputDraftRef.current = val;
  }, []);

  const clearComposer = useCallback(() => {
    composerRef.current?.clearDraft?.();
    inputDraftRef.current = '';
  }, []);



  const flushQueuedTextMessages = async () => {

    if (queuedTextMessagesRef.current.length > 0) {

      console.log(`[MediaQueue] Flushing ${queuedTextMessagesRef.current.length} queued text messages...`);

      const queue = [...queuedTextMessagesRef.current];

      queuedTextMessagesRef.current = [];

      setQueuedCount(0);

      for (const item of queue) {

        if (item.tempmsgid) {

          messageStore.removeOptimistic(chatid, item.tempmsgid);

        }

        await sendMessage(item.content || item.text, item.rawMentions || item.mentions, item.repliedto);

      }

    }

  };



  const handleSendQueuedNow = (msg) => {

    if (!msg) return;

    queuedTextMessagesRef.current = queuedTextMessagesRef.current.filter(m => m.tempmsgid !== msg.tempmsgid);

    setQueuedCount(queuedTextMessagesRef.current.length);

    if (msg.tempmsgid) {

      messageStore.removeOptimistic(chatid, msg.tempmsgid);

    }

    sendMessage(msg.content || msg.text, msg.rawMentions || msg.mentions, msg.repliedto);

    setSelectedQueuedMsg(null);

  };



  const handleDeleteQueued = (msg) => {

    if (!msg) return;

    queuedTextMessagesRef.current = queuedTextMessagesRef.current.filter(m => m.tempmsgid !== msg.tempmsgid);

    setQueuedCount(queuedTextMessagesRef.current.length);

    if (msg.tempmsgid) {

      messageStore.removeOptimistic(chatid, msg.tempmsgid);

    }

    setSelectedQueuedMsg(null);

  };



  const handleWaitForMedia = () => {
    if (!pendingTextMessage) return;
    const isStillUploading = activeUploads.current.size > 0;
    if (!isStillUploading) {
      const msgToSend = pendingTextMessage;
      setShowMediaWaitModal(false);
      setPendingTextMessage(null);
      clearComposer();
      sendMessage(msgToSend.text, msgToSend.mentions, msgToSend.repliedto, false);
    } else {
      const tempmsgid = uuidv4().toString();
      const queuedMsg = {
        tempmsgid,
        chatid,
        userid: localStorage.getItem('userid'),
        sendername: myDisplayName,
        type: 'text',
        content: pendingTextMessage.text,
        timestamp: getCurrentLocalDateTimeString(),
        repliedto: pendingTextMessage.repliedto ? (pendingTextMessage.repliedto.msgid || pendingTextMessage.repliedto) : null,
        forwardedfrom: null,
        spaceid: activeSpace,
        isQueuedForMedia: true,
        status: 'waiting_for_upload',
        rawMentions: pendingTextMessage.mentions,
        text: pendingTextMessage.text,
        mentions: pendingTextMessage.mentions,
      };
      messageStore.addMessage(queuedMsg);
      queuedTextMessagesRef.current.push(queuedMsg);
      setQueuedCount(queuedTextMessagesRef.current.length);
      clearComposer();
      setrepliedto(null);
      setshowreplytomsg(false);
      setShowMediaWaitModal(false);
      setPendingTextMessage(null);
    }
  };

  const handleSendAnywayMedia = () => {
    if (!pendingTextMessage) return;
    const msgToSend = pendingTextMessage;
    setShowMediaWaitModal(false);
    setPendingTextMessage(null);
    clearComposer();
    sendMessage(msgToSend.text, msgToSend.mentions, msgToSend.repliedto, false);
  };

  const handleSendMessageClick = (draftText, draftMentions = []) => {
    const textValue = typeof draftText === 'string' ? draftText : inputDraftRef.current;
    if (!textValue.trim() && !attachedPulse) return;

    const isMediaUploading = activeUploads.current.size > 0;
    if (isMediaUploading) {
      setPendingTextMessage({
        text: textValue,
        mentions: Array.isArray(draftMentions) ? [...draftMentions] : [],
        repliedto,
      });
      setShowMediaWaitModal(true);
    } else {
      const fallbackText = textValue.trim() ? textValue : (attachedPulse ? 'Check out this pulse!' : '');
      sendMessage(fallbackText, draftMentions, undefined, true);
    }
  };

  const sendMessage = async (overrideText = null, overrideMentions = null, overrideRepliedTo = null, shouldClearInput = false) => {
    const textToSend = typeof overrideText === 'string'
      ? overrideText
      : (attachedPulse ? 'Check out this pulse!' : '');

    const mentionsToSend = Array.isArray(overrideMentions) ? overrideMentions : [];

    const repliedtoToSend = overrideRepliedTo !== undefined && overrideRepliedTo !== null

      ? overrideRepliedTo

      : (attachedPulse ? `PULSE_TAG:${attachedPulse.pulse.pulseId || attachedPulse.pulse.id}` : repliedto);

    const spaceIdToSend = (attachedPulse && attachedPulse.targetSpaceId !== undefined)

      ? attachedPulse.targetSpaceId

      : activeSpace;



    if (textToSend && textToSend.trim()) {

      let processedInput = textToSend;

      

      if (mentionsToSend && mentionsToSend.length > 0) {

        // Sort by name length descending to replace longest names first (e.g. 'John Doe' before 'John')

        const sortedMentions = [...mentionsToSend].sort((a, b) => b.name.length - a.name.length);

        

        // Use placeholders to prevent nested replacements

        sortedMentions.forEach((mention, index) => {

          processedInput = processedInput.split(`@${mention.name}`).join(`__MENTION_${index}__`);

        });

        

        // Replace placeholders with final encoded tags

        sortedMentions.forEach((mention, index) => {

          processedInput = processedInput.split(`__MENTION_${index}__`).join(`<@${mention.id}:${mention.name}>`);

        });

      }



      const msg = {

        tempmsgid: uuidv4().toString(),

        chatid,

        userid: localStorage.getItem('userid'),

        sendername: myDisplayName,

        type: "text",

        content: processedInput,

        timestamp: getCurrentLocalDateTimeString(),

        repliedto: repliedtoToSend ? (repliedtoToSend.msgid || repliedtoToSend) : null,

        forwardedfrom: null,

        spaceid: spaceIdToSend

      };

      await sendSafe(msg);



      // Trigger reply notify banner on first message sent

      const totalSent = parseInt(localStorage.getItem('totalMessagesSent') || '0', 10) + 1;

      localStorage.setItem('totalMessagesSent', totalSent.toString());



      if (totalSent >= 1 && window.Notification && window.Notification.permission !== 'granted') {

        const dismissed = localStorage.getItem('replyNotifyDismissed');

        if (dismissed !== 'true') {

          setShowReplyNotifyBanner(true);

        }

      }



      autoPinIfRoom();

      messageStore.addMessage(msg);

      setAttachedPulse(null);

      setrepliedto(null);

      setshowreplytomsg(false);

      if (shouldClearInput || !overrideText) clearComposer();

      sendIndicator('stop');

      stopIndicators();

      resetInChatTimer();

    }

  };



  // ── New global media send ─────────────────────────────────────────────────

  const sendMediaMessage = async (result, originalMeta) => {

    const { mainKey, thumbKey, mimeType, fileName, mediaId } = result;

    const category = getFileCategory(mimeType || originalMeta?.mimeType || '', fileName || originalMeta?.fileName || '');

    let msgType = 'file';

    if (category === 'image' || originalMeta?.type === 'image') msgType = 'image';

    else if (category === 'video' || originalMeta?.type === 'video') msgType = 'video';

    else if (category === 'audio' || originalMeta?.type === 'audio') msgType = 'audio';

    if (originalMeta?.tempmsgid) {
      const pid = originalMeta.tempmsgid;
      abortedPendingIds.current.add(pid);
      const timer = pendingAnnounceTimers.current.get(pid);
      if (timer) {
        clearTimeout(timer);
        pendingAnnounceTimers.current.delete(pid);
      }
      pendingAnnouncedSet.current.delete(pid);
    }

    // Merge upload results into the original metadata to preserve ALL fields

    const { optimisticFile: _omitFile, _thumbBlob: _omitThumbBlob, ...cleanOriginalMeta } = originalMeta || {};

    const finalMsg = {

      ...cleanOriginalMeta,

      pendingid: originalMeta.tempmsgid || null,

      type: msgType,

      content: mediaId || mainKey,

      mainKey: mainKey ?? originalMeta.mainKey ?? null,

      thumbKey: thumbKey ?? originalMeta.thumbKey ?? null,

      mediaId: mediaId ?? originalMeta.mediaId ?? null,

      fileName: fileName ?? originalMeta.fileName ?? null,

      mimeType: mimeType ?? originalMeta.mimeType ?? null,

      isOptimistic: false, // Mark as final

      status: 'sent'

    };



    // This will replace the optimistic message in the store

    autoPinIfRoom();

    messageStore.addMessage(finalMsg);

    await sendSafe(finalMsg);



    // Track total messages and trigger reply notify banner on first message sent

    const totalSent = parseInt(localStorage.getItem('totalMessagesSent') || '0', 10) + 1;

    localStorage.setItem('totalMessagesSent', totalSent.toString());

    if (totalSent >= 1 && window.Notification && window.Notification.permission !== 'granted') {

      const dismissed = localStorage.getItem('replyNotifyDismissed');

      if (dismissed !== 'true') {

        setShowReplyNotifyBanner(true);

      }

    }



    // Clear reply state only if THIS message was specifically replying to it

    if (repliedto && originalMeta.repliedto === repliedto.msgid) {

      setrepliedto(null);

      setshowreplytomsg(false);

    }

  };



  const performMediaUpload = async (file, originalMeta, typeLabel) => {

    const controller = new AbortController();

    activeUploads.current.set(originalMeta.tempmsgid, controller);



    try {

      const result = await uploadMedia(file, ({ stage: s, progress: p }) => {

        messageStore.updateMessage(chatid, originalMeta.tempmsgid, { uploadProgress: p });

      }, controller.signal, originalMeta._thumbBlob);



      // Bind the temporary cached blob statically onto its finalized key securely!

      await renameCacheKey(originalMeta.tempmsgid, `${result.mediaId}_full`, 'mainCache');

      // Also migrate the thumb cache key

      await renameCacheKey(`${originalMeta.tempmsgid}_thumb`, `${result.mediaId}_thumb`, 'thumbCache');



      await sendMediaMessage({

        ...result,

        mimeType: file.type,

        fileName: file.name,

        fileSize: file.size,

        mediaId: result.mediaId,

      }, originalMeta);

    } catch (err) {

      if (originalMeta?.tempmsgid) {
        const pid = originalMeta.tempmsgid;
        abortedPendingIds.current.add(pid);
        const timer = pendingAnnounceTimers.current.get(pid);
        if (timer) {
          clearTimeout(timer);
          pendingAnnounceTimers.current.delete(pid);
        }
        if (pendingAnnouncedSet.current.has(pid)) {
          pendingAnnouncedSet.current.delete(pid);
          sendSafe({
            type: 'media_pending_cancel',
            chatid,
            spaceid: activeSpace || 0,
            pendingid: pid
          });
        }
      }

      if (err.name === 'AbortError') {

        console.log(`[${typeLabel}] Upload aborted for:`, originalMeta.tempmsgid);

      } else {

        console.error(`[${typeLabel}] Background upload failed:`, err);

        messageStore.updateMessage(chatid, originalMeta.tempmsgid, { status: 'failed', uploadProgress: 0 });

      }

    } finally {

      activeUploads.current.delete(originalMeta.tempmsgid);

      if (activeUploads.current.size === 0) {

        flushQueuedTextMessages();

      }

    }

  };



  const schedulePendingAnnouncement = (pid, fileObj, cat, meta, thumbBlob) => {
    abortedPendingIds.current.delete(pid);
    const timer = setTimeout(async () => {
      try {
        if (abortedPendingIds.current.has(pid)) return;
        const px = await createPackedPreview(fileObj, cat, thumbBlob, chat?.type);
        if (abortedPendingIds.current.has(pid)) return;
        const pendingFrame = {
          type: 'media_pending',
          chatid,
          spaceid: activeSpace || 0,
          pendingid: pid,
          timestamp: meta.timestamp,
          kind: cat,
          fileName: (fileObj.name || 'file').slice(0, 120),
          fileSize: fileObj.size,
          w: meta.width || null,
          h: meta.height || null,
          duration: meta.duration || null,
          noOfPages: meta.noOfPages || null,
          px: px || null
        };
        sendSafe(pendingFrame);
        pendingAnnouncedSet.current.add(pid);
      } catch (err) {
        console.warn('[ChatBox] Failed to announce media_pending:', err);
      } finally {
        pendingAnnounceTimers.current.delete(pid);
      }
    }, 400);
    pendingAnnounceTimers.current.set(pid, timer);
  };

  const handleCaptureFile = async (file, typeLabel = 'Camera Capture', options = {}) => {

    if (!file) return;



    if (file.size > 50 * 1024 * 1024) {

      toast.error(`The captured file exceeds the 50MB size limit and cannot be sent.`);

      return;

    }



    const tempmsgid = uuidv4().toString();

    const optimisticUrl = URL.createObjectURL(file);

    const category = getFileCategory(file.type, file.name);

    // Direct PDF detection by extension/mime — category might return 'file' if MIME is non-standard

    const isPdfFile = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');

    const isVideoFile = category === 'video' || file.type?.startsWith('video/');

    console.log('[THUMB DEBUG] handleCaptureFile | file.type:', file.type, '| file.name:', file.name, '| category:', category, '| isPdfFile:', isPdfFile, '| options.thumbBlob:', options.thumbBlob);



    let optimisticThumbUrl = null;

    let thumbBlobForCache = options.thumbBlob || null; // Blob passed directly from modal



    // If no modal-provided blob, generate thumbnail now

    if (!thumbBlobForCache) {

      try {

        if (isVideoFile) {

          const result = await getVideoThumbnail(file);

          if (result.blob) thumbBlobForCache = result.blob;

        } else if (category === 'pdf' || isPdfFile) {

          const result = await getPdfThumbnail(file);

          if (result?.blob) thumbBlobForCache = result.blob;

        } else if (category === 'image') {

          try {
            thumbBlobForCache = await compressImageBlob(file, 320, 320, 0.4);
          } catch (e) {
            thumbBlobForCache = file;
          }

        }

      } catch (err) {

        console.warn("Optimistic thumb generation failed", err);

      }

    }



    // Proactively cache the main blob and thumb blob for offline persistence

    saveBlobToCache(tempmsgid, file, 'mainCache').catch(console.error);

    if (thumbBlobForCache) {

      // Save under tempmsgid_thumb — MediaMessage will look here first

      saveBlobToCache(`${tempmsgid}_thumb`, thumbBlobForCache, 'thumbCache').catch(console.error);

      optimisticThumbUrl = URL.createObjectURL(thumbBlobForCache);

      console.log('[THUMB DEBUG] Thumb blob saved to IDB key:', `${tempmsgid}_thumb`, '| blob URL:', optimisticThumbUrl, '| blob size:', thumbBlobForCache.size);

    } else {

      console.warn('[THUMB DEBUG] No thumbBlobForCache! thumbBlob option was:', options.thumbBlob);

    }



    // Instant UI feedback

    const optimisticMsg = {

      tempmsgid,

      chatid,

      userid: localStorage.getItem('userid'),

      sendername: myDisplayName,

      type: category,

      content: tempmsgid, // Placeholder

      optimisticUrl,

      optimisticThumbUrl, // Injected for real-time flawless preview

      _thumbBlob: thumbBlobForCache,

      optimisticFile: file, // Stored in memory/IDB via messageStore

      isOptimistic: true,

      status: 'uploading',

      uploadProgress: 0,

      fileName: file.name,

      mimeType: file.type,

      timestamp: getCurrentLocalDateTimeString(),

      repliedto: repliedto ? repliedto.msgid : null,

      spaceid: activeSpace,

    };



    messageStore.addMessage(optimisticMsg);



    // Clear reply state early for UX

    setrepliedto(null);

    setshowreplytomsg(false);

    // Schedule 400ms debounced ephemeral pending placeholder
    schedulePendingAnnouncement(tempmsgid, file, category, optimisticMsg, thumbBlobForCache);

    // Start background process

    performMediaUpload(file, optimisticMsg, typeLabel);

  };



  const retryMediaUpload = (msg) => {

    if (!msg.optimisticFile) return;

    saveBlobToCache(msg.tempmsgid, msg.optimisticFile, 'mainCache').catch(console.error);

    messageStore.updateMessage(chatid, msg.tempmsgid, { status: 'uploading', uploadProgress: 0 });

    if (msg.tempmsgid && msg.optimisticFile) {
      schedulePendingAnnouncement(msg.tempmsgid, msg.optimisticFile, msg.type, msg, null);
    }

    // Pass the whole message object to preserve metadata during retry

    performMediaUpload(msg.optimisticFile, msg, 'Retry Upload');

  };



  // ── Audio Recording State and Logic ───────────────────────────────────────

  const [isRecording, setIsRecording] = useState(false);

  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]);

  const timerIntervalRef = useRef(null);

  const startRecording = async () => {

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];



      mediaRecorder.ondataavailable = (event) => {

        if (event.data.size > 0) {

          audioChunksRef.current.push(event.data);

        }

      };



      mediaRecorder.start();

      setIsRecording(true);

      setRecordingTime(0);

      notifyActivity('recording');



      timerIntervalRef.current = setInterval(() => {

        setRecordingTime(prev => prev + 1);

      }, 1000);

    } catch (err) {

      console.error("Microphone access denied or error:", err);

      toast.error("Microphone permission was denied. Please allow microphone access in your browser settings to record voice messages.");

    }

  };



  const handleCameraClick = async () => {

    try {

      // Proactively check camera permission- by trying to get stream

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // Stop the stream immediately, we just wanted to check permission

      stream.getTracks().forEach(track => track.stop());

      setCameraOpen(true);

    } catch (err) {

      console.error("Camera access denied or error:", err);

      toast.error("Camera permission was denied. Please allow camera access in your browser settings to use the camera.");

    }

  };



  const stopRecording = (discard = false) => {

    if (mediaRecorderRef.current && isRecording) {

      mediaRecorderRef.current.onstop = () => {

        clearInterval(timerIntervalRef.current);

        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());



        if (!discard && audioChunksRef.current.length > 0) {

          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || 'audio/webm' });

          const ext = mediaRecorderRef.current.mimeType?.includes('mp4') ? 'mp4' : 'webm';

          const file = new File([audioBlob], `VoiceNote_${Date.now()}.${ext}`, { type: audioBlob.type });

          handleCaptureFile(file, 'Voice Note', { silent: true });

        }

        setIsRecording(false);

        setRecordingTime(0);

        audioChunksRef.current = [];

        stopIndicators();

        resetInChatTimer();

      };

      mediaRecorderRef.current.stop();

    }

  };



  const bottomRef = useRef(null);



  const bottomRef2 = useRef(null)

  const prevLastMsgId = useRef(null);

  useEffect(() => {

    if (filteredMessages.length === 0) return;

    const lastMsg = filteredMessages[filteredMessages.length - 1];



    // Scroll only if a new message (new msgid or tempmsgid) is added

    const lastId = lastMsg.msgid || lastMsg.tempmsgid;

    if (lastId && lastId !== prevLastMsgId.current) {

      console.log("scrolling.........")

      if (bottomRef?.current) {

        console.log("scrolled")

        //bottomRef.current.scrollIntoView({ behavior: "smooth" });

        bottomRef.current.parentElement.scrollTo({

          top: bottomRef.current.parentElement.scrollHeight,

          behavior: "instant"

        });

      }

    }



    prevLastMsgId.current = lastId;

  }, [messages, activeSpace]);

  useEffect(() => {

    prevLastMsgId.current = null;

  }, [activeSpace]);

  useEffect(() => {

    const el = messagesContainerRef.current;

    if (!el) return;



    const ro = new ResizeObserver(() => {

      const nearBottom =

        el.scrollHeight - el.scrollTop - el.clientHeight < 50;



      if (nearBottom) {

        el.scrollTop = el.scrollHeight;

      }

    });



    ro.observe(el);



    return () => ro.disconnect();

  }, []);











  const [visited, setVisited] = useState(() => {

    return JSON.parse(localStorage.getItem("visited") || "{}");

  });



  const updateV = (chatId = chatid, timestamp = Date.now()) => {

    console.log("updated:", chatId, timestamp)

    setVisited(prev => {

      console.log(prev);

      const updated = {

        ...prev,

        [chatId]: timestamp

      };



      localStorage.setItem("visited", JSON.stringify(updated));

      return updated;

    });

  };



  const [chatnames, setchatnames] = useState([]);

  const [member, addmember] = useState(null);

  const fetchuser = () => {

    const userId = localStorage.getItem("userid");

    fetch(`${API}/user/chatbox/${userId}`)

      //.then(res=> console.log(res.json()))

      .then(res => res.json()) // ✅ expect JSON array like ["Group 1", "Group 2"]

      .then(data => {

        const chat = data.filter(item => item.type === "private");

        setchatnames(chat);

      })

      .catch(err => {

        console.error(err);

      });

    console.log(chatnames)

  }

  const [showadd, setshowadd] = useState(false);

  const openadd = () => {

    setshowadd(true);

    fetchuser();

  }

  const closeadd = () => {

    setshowadd(false);

  }

  const addtogroup = async () => {

    if (!member) {

      return;

    }

    const response = await fetch(`${API}/group/add/${chat.id}/${member.id}`, {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'User-Id': localStorage.getItem('userid') // sending user ID in header

      }

    });

    const res = await response.text();

    console.log(res);

    closeadd();

  }



  // const location = useLocation();

  const { scrollToMsgId } = location.state || {};

  const messageRefs = useRef({});

  useEffect(() => {

    if (scrollToMsgId && messageRefs.current[scrollToMsgId]) {

      const element = messageRefs.current[scrollToMsgId];

      console.log("Scroling to ", scrollToMsgId);



      // Delay slightly to ensure layout is completely painted

      const scrollTimer = setTimeout(() => {

        // Scroll

        element.scrollIntoView({ behavior: "smooth", block: "center" });



        // Inline highlight

        const originalBg = element.style.backgroundColor;

        element.style.backgroundColor = "var(--accent-tint)";

        element.style.transition = "background-color 2s ease";



        // Restore after 2s

        setTimeout(() => {

          element.style.backgroundColor = originalBg || "";

        }, 2000);

      }, 300);



      window.history.replaceState({}, document.title);



      return () => clearTimeout(scrollTimer);

    }

    else {

      console.log(messageRefs.current[scrollToMsgId]);

    }

  }, [scrollToMsgId, messages]);





  const PANEL_WIDTH = 210;

  const PANEL_HEIGHT = 40;

  const MARGIN = 70;

  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const containerRef = useRef(null);

  const [selectedMessage, setSelectedMessage] = useState(null);

  const panelref = useRef(null);

  useEffect(() => {

    const handleClickOutside = (e) => {

      if (

        selectedMessage &&

        !messageRefs.current[selectedMessage.msgid]?.contains(e.target) &&

        !panelref.current?.contains(e.target)

      ) {

        setSelectedMessage(null);

      }

    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, [selectedMessage]);

  const lastTap = useRef(0);

  const [select, setselect] = useState(null);

  const msgSelect = (e, msg) => {

    const now = Date.now();

    const TAP_DELAY = 300;

    if (e.type === 'dblclick') {

      handleClickMessage(msg)

      return

    }

    if (e.type === 'touchend') {

      if (now - lastTap.current < TAP_DELAY) {

        handleClickMessage(msg);

      }

      lastTap.current = now;

      return;

    }

  }

  const clickTimeout = useRef(null);

  const mediateSelect = (msg) => {

    const now = Date.now();

    const TAP_DELAY = 300;



    if (now - lastTap.current < TAP_DELAY) {

      if (clickTimeout.current) {

        clearTimeout(clickTimeout.current);

        clickTimeout.current = null;

      }

      handleClickMessage(msg);

      console.log("dbclick")

      lastTap.current = 0

    }

    else {

      if (clickTimeout.current) {

        clearTimeout(clickTimeout.current);

      }

      clickTimeout.current = setTimeout(() => {

        setshowmedia(msg);

        console.log("single click");

        clickTimeout.current = null;

      }, TAP_DELAY);

      lastTap.current = now;

    }

    return;

  }



  const handleClickMessage0 = (msg) => {

    if (chat.type === 'classroom' && (activeSpace === 1)) return;



    const msgEl = messageRefs.current[msg.msgid];

    if (!msgEl || !containerRef.current) return;

    console.log(msg.content);

    const containerRect = containerRef.current.getBoundingClientRect();

    const msgRect = msgEl.getBoundingClientRect();



    // Decide vertical position (top/bottom)

    let top;

    if (containerRect.bottom - msgRect.bottom >= PANEL_HEIGHT + MARGIN) {

      // enough space below

      top = msgRect.bottom - containerRect.top;

    } else if (msgRect.top - containerRect.top >= PANEL_HEIGHT + MARGIN) {

      // enough space above

      top = msgRect.top - containerRect.top - PANEL_HEIGHT - 20;

    } else {

      // clamp inside container

      top = Math.min(

        containerRect.height - PANEL_HEIGHT - MARGIN,

        Math.max(MARGIN, msgRect.top - containerRect.top)

      );

    }



    // Decide horizontal position (left/right)

    let left;

    if (containerRect.right - 20 - msgRect.left >= PANEL_WIDTH + MARGIN) {

      // enough space to the right

      left = msgRect.left - containerRect.left;

    } else if (msgRect.right - 20 - containerRect.left >= PANEL_WIDTH + MARGIN) {

      // enough space to the left

      left = msgRect.right - containerRect.left - PANEL_WIDTH - 20;

    } else {

      // clamp inside container

      left = Math.min(

        containerRect.width - 20 - PANEL_WIDTH - MARGIN,

        Math.max(MARGIN, msgRect.left - containerRect.left - 20)

      );

    }



    setPanelPos({ top, left });

    setSelectedMessage(msg);

  };

  const [showreplytomsg, setshowreplytomsg] = useState(false);

  const reply = () => {

    //console.log("replying for ",selectedMessage.content);

    //setrepliedto(selectedMessages[0])

    selectedMessages.forEach(msg => {

      setrepliedto(msg);

    })

    setshowreplytomsg(true);

    clearSelection();

    inputRef.current.focus();

    //console.log(selectedMessages[0])

    //setSelectedMessages([]);

  }

  const cancelreply = () => {

    setrepliedto(null);

    setshowreplytomsg(false);

    //setSelectedMessages([]);

  }



  const [chatlist, setChatList] = useState(null);

  useEffect(() => {

    const stored = localStorage.getItem("chatsMap");

    if (stored) {

      const chatsMap = JSON.parse(stored);

      const chatArray = Object.values(chatsMap);

      setChatList(chatArray);

    }

  }, []);

  const [forwards, setforward] = useState([]);

  const [showforward, setshowforward] = useState(false);

  const forward = () => {

    //console.log("forwarding ",selectedMessage.content)

    setforward(selectedMessages);

    setshowforward(true);

    setSelectedMessage(null);

  }



  const handleInvite = async (targetChatId) => {

    if (!chat || (chat.type !== 'classroom' && chat.type !== 'room')) return;

    const inviteLink = `${window.location.origin}/${chat.type === 'classroom' ? 'chats' : 'rooms'}?join${chat.type === 'classroom' ? 'Classroom' : 'Room'}=${chat.id}`;

    const inviteMsg = `I would like to invite you to ${chat.chatName}\n\n${inviteLink}`;

    

    const messageData = {

      chatid: targetChatId,

      sendername: localStorage.getItem("username"),

      userid: localStorage.getItem("userid"),

      content: inviteMsg,

      type: "text",

      timestamp: getCurrentLocalDateTimeString(),

      status: "sent"

    };

    try {

      await fetch(`${API}/message/addMessage`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          "User-Id": localStorage.getItem("userid")

        },

        body: JSON.stringify(messageData),

      });

      // Try to send via socket as well for real-time

      const socket = getsocket();

      if (socket && socket.readyState === WebSocket.OPEN) {

        sendSafe(JSON.stringify({ type: "send-message", data: messageData }));

      }

    } catch (err) {

      console.error("Failed to send invite", err);

    }

  };



  const cancelforward = () => {

    setforward(null);

    setshowforward(false);

    setSelectedMessage(null);

  }



  const handleForward = async (targetChatId) => {

    if (!forwards || forwards.length === 0) return;



    getchat(targetChatId);



    for (const originalMsg of forwards) {

      console.log(originalMsg)

      const msg = {

        tempmsgid: uuidv4(),

        chatid: targetChatId,

        type: originalMsg.type,

        content: originalMsg.content,

        timestamp: getCurrentLocalDateTimeString(),

        repliedto: null,

        forwardedfrom: originalMsg.chatid, // preserve origin

        spaceid: 0

      };

      await sendSafe(msg);

      messageStore.addMessage(msg);

    }



    setforward([]);

    setshowforward(false);

    clearSelection();



    navigate(`/chat/${targetChatId}`);

  };





  const [deleted, setdeleted] = useState([]);

  const [showdelet, setshowdelet] = useState(false);

  const [showEveryone, setSHowEveryOne] = useState(false)

  const [networkError, setNetworkError] = useState(false);

  const delet = () => {

    setSHowEveryOne(true)

    setdeleted(selectedMessages);

    console.log(selectedMessages);

    selectedMessages.forEach(msg => {

      if (msg.status == null) {

        setSHowEveryOne(false);

      }

    })

    //setSelectedMessages();

    setshowdelet(true);

  }

  const dforme = () => {

    const socket = getsocket();

    if (!navigator.onLine || !socket || socket.readyState !== WebSocket.OPEN) {

      setNetworkError(true);

      setshowdelet(false);

      return;

    }

    // const json={

    //   purpose:"delete-for-me",

    //   userchatId:chatid,

    //   usermsgId:deleted.msgid,

    // }

    // socket.send(JSON.stringify(json));

    // messageStore.delete(chatid,deleted.msgid,"me");

    deleted.forEach(msg => {

      const json = {

        tempmsgid: uuidv4().toString(),

        purpose: "delete-for-me",

        userchatId: chatid,

        usermsgId: msg.msgid,

        spaceid: activeSpace

      }

      sendSafe(json);

      messageStore.delete(chatid, msg.msgid, "me");

    })

    setdeleted([]);

    clearSelection();

    setSHowEveryOne(false);

  }

  const dforeone = () => {

    const socket = getsocket();

    if (!navigator.onLine || !socket || socket.readyState !== WebSocket.OPEN) {

      setNetworkError(true);

      setshowdelet(false);

      return;

    }

    // const json={

    //   purpose:"delete-for-eone",

    //   userchatId:chatid,

    //   usermsgId:deleted.msgid,

    // }

    // socket.send(JSON.stringify(json));

    // messageStore.delete(chatid,deleted.msgid,"eone");

    deleted.forEach(msg => {

      const json = {

        tempmsgid: uuidv4().toString(),

        purpose: "delete-for-eone",

        userchatId: chatid,

        usermsgId: msg.msgid,

        spaceid: activeSpace

      }

      sendSafe(json);

      messageStore.delete(chatid, msg.msgid, "eone");

    })

    setdeleted([]);

    setSHowEveryOne(false);

  }

  const [revev, setrevev] = useState(null)

  const [revpanel, setrevpanel] = useState(false)

  const revive = (msg) => {

    setrevev(msg);

    setSelectedMessage(null);

    setrevpanel(true);

  }



  const revivforme = () => {

    const socket = getsocket();

    if (!navigator.onLine || !socket || socket.readyState !== WebSocket.OPEN) {

      setNetworkError(true);

      setrevpanel(false);

      return;

    }

    setrevpanel(false);

    const json = {

      tempmsgid: uuidv4().toString(),

      purpose: "revive-for-me",

      userchatId: chatid,

      usermsgId: revev.msgid,

      spaceid: activeSpace

    }

    sendSafe(json);

    messageStore.revive(chatid, revev.msgid, "me");

    setrevev(null);

  }

  const revivforeone = () => {

    const socket = getsocket();

    if (!navigator.onLine || !socket || socket.readyState !== WebSocket.OPEN) {

      setNetworkError(true);

      setrevpanel(false);

      return;

    }

    setrevpanel(false);

    const json = {

      tempmsgid: uuidv4().toString(),

      purpose: "revive-for-eone",

      userchatId: chatid,

      usermsgId: revev.msgid,

      spaceid: activeSpace

    }

    sendSafe(json);

    messageStore.revive(chatid, revev.msgid, "eone");

    setrevev(null);

  }



  const handleCancelUploads = () => {

    const selected = Array.from(selectedMessages);



    selected.forEach(msg => {

      const tempId = msg.tempmsgid || msg.msgid;



      // 1. Abort active network request if any

      const controller = activeUploads.current.get(tempId);

      if (controller) {

        console.log("[Cancel] Aborting active transfer:", tempId);

        controller.abort();

        activeUploads.current.delete(tempId);

      }



      // 2. Remove from store & database

      messageStore.removeOptimistic(chatid, tempId);

    });



    clearSelection();

  };





  const showEvent = () => {



  }

  const eventByMsgId = useMemo(() => {

    const map = new Map();



    Object.values(events)

      .flat()

      .forEach(e => {

        if (e.msgref) {

          map.set(String(e.msgref), e);

        }

      });



    return map;

  }, [events]);



  const [SelectedEvent, setSelectedEvent] = useState(null);

  const [ShowEventModal, setShowEventModal] = useState(false);



  useEffect(() => {

    if (isSimulation && ShowEventModal) {

      simulationService.handleUserAction("event_modal_open", true);

    }

  }, [ShowEventModal, isSimulation]);



  const [EventRecived, setEventRecived] = useState(false);

  const [hasChanges, setHasChanges] = useState(false);

  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleConfirmCancelEvent = async () => {

    setShowCancelDialog(false);

    setShowEventModal(false);

    setHasChanges(false);



    const eventToCancel = SelectedEvent || draftEvent;

    if (!eventToCancel) return;



    try {

      const payload = {

        groupEventId: eventToCancel.groupEventId || eventToCancel.id,

        eventId: eventToCancel.eventId || eventToCancel.id,

        chatId: chatid,

        eventTitle: eventToCancel.eventTitle || eventToCancel.title,

        action: 'cancelled',

        startTime: eventToCancel.startTime,

        endTime: eventToCancel.endTime,

        scope: eventToCancel.scope || 'ALL'

      };



      await fetch(`${API}/user/event/update`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'User-Id': currentUserId,

          'ngrok-skip-browser-warning': 'true'

        },

        body: JSON.stringify(payload)

      });



      window.dispatchEvent(new CustomEvent('letschat_refresh_events'));

    } catch (e) {

      console.warn('Failed to cancel event:', e);

    }

  };



  const [draftEvent, setDraftEvent] = useState(null);





  const update = async (event) => {

    console.log("[ChatBox] Updating event:", event);

    if (!event) {

      console.warn("[ChatBox] Update called with null event");

      return;

    }

    if (!event.id && !event.eventId && !event.groupEventId && (!event.msgref || String(event.msgref).trim() === '')) {

      console.log("[ChatBox] Skipping update for event without ID or msgref");

      return;

    }



    const { id, title, startTime, endTime, description, color, msgref, chatid, action, date, isAdded, isSync, isSimulation } = event;



    if (isSimulation) {

      console.log("[ChatBox] Simulation event - skipping server update.");

      if (isAdded) {

        // Update local state so icon changes from + to ✓

        const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        updateEvent(dateKey, event);

        simulationService.handleUserAction("event_added", true);

      }

      return;

    }



    const body = {

      eventId: id,

      userId: localStorage.getItem('userid'),

      eventTitle: title,

      startTime: startTime ? add(date, startTime) : add(date, '10:00'),

      endTime: endTime ? (endTime.includes(':') ? add(date, endTime) : '') : '',

      eventDetails: description || '',

      eventColor: color || '',

      msgId: String(msgref || ''),

      chatId: String(chatid || ''),

      action: action,

      isAdded: isAdded,

      isSync: isSync,

    }



    console.log("[ChatBox] Sending server update with body:", body);



    try {

      const response = await fetch(`${API}/user/update`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify(body),

      });



      if (response.ok) {

        const result = await response.text();

        console.log("[ChatBox] Server update success:", result);



        // Update local state immediately so UI reflects changes (like + changing to ℹ)

        const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        updateEvent(dateKey, { ...event, isSync: true });

      } else {

        const errorText = await response.text();

        console.error("[ChatBox] Server update failed:", response.status, errorText);

      }

    } catch (error) {

      console.error("[ChatBox] Network error during event update:", error);

    }

  }

  const add = (date, time) => {

    const [hours, minutes] = time.split(':').map(Number);

    const utc = new Date(date).setHours(hours, minutes);

    return new Date(utc).toISOString();

  }





  const [collapsedView, setCollapsedView] = useState(false);

  // const navigate = useNavigate();

  const scrollToBottom = () => {

    setShowScrollDownBtn(false);

    setUnreadSinceScrolled(0);

    isScrolledUpRef.current = false;

    lastScrollTopRef.current = 1000000; // Reset to a high value so next scroll up works correctly



    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        const container = messagesContainerRef.current;

        if (!container) return;



        container.scrollTo({

          top: container.scrollHeight,

          behavior: "instant"

        });

      });

    });

  };



  const scrollToMessage = (msgid) => {

    const el = messageRefs.current[msgid];

    if (el) {

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const originalBg = el.style.backgroundColor;

      el.style.transition = 'background-color 0.5s ease';

      el.style.backgroundColor = 'rgba(245, 158, 11, 0.3)';

      setTimeout(() => { el.style.backgroundColor = originalBg; }, 1500);

    }

  };



  // --- 24-Hour Active Pinned Banner System (Name Changes) ---

  const [isBannerPinsExpanded, setIsBannerPinsExpanded] = useState(false);

  const [highlightedPinId, setHighlightedPinId] = useState(null);





  const [dismissedBannerPinIds, setDismissedBannerPinIds] = useState(() => {

    try {

      return JSON.parse(localStorage.getItem(`dismissed_pins_${chatid}`) || '[]');

    } catch (e) {

      return [];

    }

  });



  const handleDismissBannerPin = (e, pinOrId) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const ids = [];
    if (typeof pinOrId === 'string') {
      ids.push(pinOrId);
    } else if (pinOrId && typeof pinOrId === 'object') {
      if (pinOrId.msgid) ids.push(pinOrId.msgid);
      if (pinOrId.tempmsgid) ids.push(pinOrId.tempmsgid);
      if (pinOrId.timestamp) ids.push(String(pinOrId.timestamp));
    }
    const updated = Array.from(new Set([...dismissedBannerPinIds, ...ids]));
    setDismissedBannerPinIds(updated);
    try {
      localStorage.setItem(`dismissed_pins_${chatid}`, JSON.stringify(updated));
    } catch (err) {}
  };



  const [groupEventsList, setGroupEventsList] = useState(() => {
    if (!chatid) return [];
    try {
      return JSON.parse(localStorage.getItem(`group_events_${chatid}`) || '[]');
    } catch (e) {
      return [];
    }
  });

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!chatid) return;
    const fetchEventsForChat = async () => {
      try {
        const res = await fetch(`${API}/user/event/group/${chatid}`, {
          headers: {
            'User-Id': currentUserId || localStorage.getItem('userid'),
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setGroupEventsList(data);
            try {
              localStorage.setItem(`group_events_${chatid}`, JSON.stringify(data));
            } catch (err) {}
          }
        }
      } catch (e) {}
    };
    fetchEventsForChat();
    const onRefresh = () => fetchEventsForChat();
    window.addEventListener('letschat_event_sync', onRefresh);
    window.addEventListener('letschat_refresh_events', onRefresh);
    return () => {
      window.removeEventListener('letschat_event_sync', onRefresh);
      window.removeEventListener('letschat_refresh_events', onRefresh);
    };
  }, [chatid, currentUserId]);

  const isEventPassed = useCallback(
    (m) => checkIsEventPassed(m, { groupEventsList, events, currentTime }),
    [groupEventsList, events, currentTime]
  );

  const activeBannerPins = useMemo(() => {

    if (!messages || messages.length === 0) return [];

    return messages

      .filter((m) => {

        if (!m) return false;
        const isDismissed = (
          dismissedBannerPinIds.includes(m.msgid) ||
          (m.tempmsgid && dismissedBannerPinIds.includes(m.tempmsgid)) ||
          (m.timestamp && dismissedBannerPinIds.includes(String(m.timestamp)))
        );
        if (isDismissed) return false;        // Event banner pins: stay pinned until event is passed or dismissed with X
        if (isEventBannerPin(m)) {
          if (isEventPassed(m)) {
            return false;
          }
          return true;
        }

        // General banner pins (e.g. name changes): 24-hour expiration

        if (m.type === "banner-pin" && isWithin24Hours(m.timestamp)) {

          return true;

        }

        return false;

      })

      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  }, [messages, dismissedBannerPinIds, isEventPassed]);



  const handleBannerPinClick = useCallback((pin) => {
    if (!pin) return;
    if (isEventBannerPin(pin)) {
      const eventId = pin.repliedto || pin.repliedTo || pin.eventid || pin.groupEventId || (typeof pin.content === 'string' ? pin.content.split('/')[2] : null);
      setCalendarHighlightEventId(eventId || null);
      setShowEventModal(false);
      setShowGroupCalendar(true);
    } else {
      scrollToMessage(pin.msgid);
    }
  }, []);



  // Member Entrance Highlight: When entering chat, highlight unread banner-pin

  useEffect(() => {

    if (!chatid || activeBannerPins.length === 0) return;

    const myId = localStorage.getItem('userid');

    const latestPin = activeBannerPins[0];

    if (!latestPin) return;



    const storageKey = `last_seen_pin_${chatid}`;

    const lastSeenPinId = localStorage.getItem(storageKey);



    if (lastSeenPinId !== (latestPin.msgid || latestPin.timestamp) && String(latestPin.userid || latestPin.senderid) !== String(myId)) {

      setHighlightedPinId(latestPin.msgid);

      const timer = setTimeout(() => {

        setHighlightedPinId(null);

        localStorage.setItem(storageKey, latestPin.msgid || latestPin.timestamp);

      }, 5000);

      return () => clearTimeout(timer);

    }

  }, [chatid, activeBannerPins]);



  const firstUnreadMentionId = useMemo(() => {

    if (!unreadMarker.firstId) return null;

    const startIndex = filteredMessages.findIndex(m => (m.msgid || m.tempmsgid) === unreadMarker.firstId);

    if (startIndex === -1) return null;

    

    const currentUserId = localStorage.getItem('userid');

    const mentionSyntax = `<@${currentUserId}:`;

    

    for (let i = startIndex; i < filteredMessages.length; i++) {

      if (filteredMessages[i].content?.includes(mentionSyntax)) {

        return filteredMessages[i].msgid || filteredMessages[i].tempmsgid;

      }

    }

    return null;

  }, [filteredMessages, unreadMarker.firstId]);



  useLayoutEffect(() => {

    scrollToBottom();

  }, []);



  const [showpost, setShowpost] = useState(false)

  const postAssignment = () => {

    setShowpost(true);

  }



  const sendAssignment = async (assignmentId) => {

    try {

      const msg = {

        tempmsgid: uuidv4().toString(),

        chatid,

        type: "assignment",

        content: assignmentId,

        timestamp: getCurrentLocalDateTimeString(),

        repliedto: null,

        forwardedfrom: null,

        spaceid: activeSpace

      };

      await sendSafe(msg);

      messageStore.addMessage(msg);

      return { ok: true };

    } catch (error) {

      console.error(error);

      return { ok: false };

    }

  }

  const [assignment, setAssignment] = useState({})

  const showAssignment = async (id) => {

    try {

      const response = await fetch(`${API}/classroom/assignment/get/${id}`, {

        method: "GET",

        headers: {

          "Content-Type": "application/json",

          'User-Id': localStorage.getItem('userid'),

        },

      });

      if (response.ok) {

        const data = await response.json();

        console.log(data);

        return data;

      }

    } catch (error) {

      console.log(error)

    }

  }



  useEffect(() => {

    const json = {

      purpose: "check-in",

      userchatId: chatid,

      usermsgId: activeSpace,

    }

    sendSafe(json);

    console.log("sedning,", json);

  }, [activeSpace])



  useEffect(() => {

    const handleScroll = () => {

      if (chat.type !== 'classroom' || !messagesContainerRef.current) return;



      const scrollTop = messagesContainerRef.current.scrollTop;



      if (scrollTop > lastScrollTop && scrollTop > 50) {

        // Scrolling down

        setShowClassroomNav(true);

      } else {

        // Scrolling up

        setShowClassroomNav(true);

      }



      setLastScrollTop(scrollTop);

    };



    const container = messagesContainerRef.current;

    if (container) {

      container.addEventListener('scroll', handleScroll);

      return () => container.removeEventListener('scroll', handleScroll);

    }

  }, [lastScrollTop]);



  const copyClassroomId = () => {

    if (chat.type === 'classroom' || chat.type === 'room') {

      navigator.clipboard.writeText(chat.id).then(() => {

        setCopiedId(true);

        setTimeout(() => setCopiedId(false), 2000);

      }).catch(err => {

        console.error('Failed to copy:', err);

        // Fallback for older browsers

        const textArea = document.createElement('textarea');

        textArea.value = chat.id;

        document.body.appendChild(textArea);

        textArea.select();

        try {

          document.execCommand('copy');

          setCopiedId(true);

          setTimeout(() => setCopiedId(false), 2000);

        } catch (err) {

          console.error('Fallback copy failed:', err);

        }

        document.body.removeChild(textArea);

      });

    }

  };



  const [showInfo, setShowInfo] = useState(false);

  const [showGroupCalendar, setShowGroupCalendar] = useState(false);
  const [calendarHighlightEventId, setCalendarHighlightEventId] = useState(null);

  const [hasNewGroupEvent, setHasNewGroupEvent] = useState(false);



  useEffect(() => {

    const handleSync = (e) => {

      const msg = e.detail;

      if (msg && String(msg.chatId) === String(chatid) && !showGroupCalendar) {

        setHasNewGroupEvent(true);

      }

    };

    window.addEventListener('letschat_event_sync', handleSync);

    return () => window.removeEventListener('letschat_event_sync', handleSync);

  }, [chatid, showGroupCalendar]);



  const clickInfo = () => {

    setShowInfo(true);

  }



  //swipe to reply and msg selection

  const [swipeOffset, setSwipeOffset] = useState({});

  const touchStartX = useRef(0);

  const touchCurrentX = useRef(0);

  const touchStartY = useRef(0);

  const touchCurrentY = useRef(0);

  const swipeHandled = useRef(false);

  const activeSwipeMsgId = useRef(null);

  const hasMoved = useRef(false);

  const isScrollingVertically = useRef(false);



  const SWIPE_START_THRESHOLD = 10;

  const SWIPE_REPLY_THRESHOLD = 70;



  const longPressTimer = useRef(null);

  const longPressTriggered = useRef(false)



  const clearSelection = () => {

    setSelectedMessages(new Set());

    setIsSelectionMode(false);

    setShowInputBox(true);

  };



  // Swipe handlers

  const handleSwipeStart = (e, msgId) => {

    if (isSelectionMode) return;



    touchStartX.current = e.touches[0].clientX;

    touchCurrentX.current = touchStartX.current;

    touchStartY.current = e.touches[0].clientY;

    touchCurrentY.current = touchStartY.current;



    swipeHandled.current = false;

    hasMoved.current = false;

    isScrollingVertically.current = false;

    activeSwipeMsgId.current = msgId;

  };



  const handleSwipeMove = (e, msgId) => {

    if (isSelectionMode || activeSwipeMsgId.current !== msgId || isScrollingVertically.current) return;



    touchCurrentX.current = e.touches[0].clientX;

    touchCurrentY.current = e.touches[0].clientY;



    const deltaX = touchCurrentX.current - touchStartX.current;

    const deltaY = touchCurrentY.current - touchStartY.current;



    // Detect if this is a vertical scroll early on

    if (!hasMoved.current && Math.abs(deltaY) > 5 && Math.abs(deltaY) > Math.abs(deltaX)) {

      isScrollingVertically.current = true;

      clearTimeout(longPressTimer.current);

      return;

    }



    // Mark movement only if meaningful

    if (Math.abs(deltaX) > SWIPE_START_THRESHOLD) {

      hasMoved.current = true;

      clearTimeout(longPressTimer.current); // cancel long press ONLY now

    }



    // Only allow right swipe, cap at 80px

    if (deltaX > 0) {

      setSwipeOffset(prev => ({

        ...prev,

        [msgId]: Math.min(deltaX, 80)

      }));

    }

  };



  const handleSwipeEnd = (msg) => {

    const deltaX = touchCurrentX.current - touchStartX.current;



    // Right swipe only (> threshold)

    if (

      deltaX > SWIPE_REPLY_THRESHOLD &&

      !isSelectionMode &&

      !swipeHandled.current &&

      activeSwipeMsgId.current === msg.msgid

    ) {

      swipeHandled.current = true;



      // Trigger reply

      setrepliedto(msg);

      setshowreplytomsg(true);

      inputRef.current.focus();



      // Optional haptic feedback

      if (navigator.vibrate) navigator.vibrate(20);

    }



    // Reset swipe offset with animation

    setSwipeOffset(prev => ({

      ...prev,

      [msg.msgid]: 0

    }));



    // Reset refs

    touchStartX.current = 0;

    touchCurrentX.current = 0;

    hasMoved.current = false;

    activeSwipeMsgId.current = null;

  };



  // Handle touch start for mobile long press

  const toggleStar = async (e, msg) => {

    e.stopPropagation();

    const isStarred = !msg.isStarred;

    const updatedMsg = { ...msg, isStarred };



    // Update Memory and DB

    messageStore.updateMessage(msg.chatid, msg.msgid || msg.tempmsgid, { isStarred });



    // If it's the current chat, we might need a force update if handled locally, 

    // but messageStore.updateMessage already triggers notifyListeners.

  };



  const handleTouchStart = (msg) => {

    //console.log("started");

    longPressTriggered.current = false;



    longPressTimer.current = setTimeout(() => {

      if (hasMoved.current) return; // don't long-press if swiping

      //console.log("selected");

      longPressTriggered.current = true;



      // Haptic feedback on mobile

      if (navigator.vibrate) navigator.vibrate(30);



      // Trigger your selection mode (adapt to your existing selection logic)

      setSelectedMessages(new Set([msg]));

      setIsSelectionMode(true);

      setShowInputBox(true);

      // Show your panel or selection UI here

    }, 300);

  };



  // Handle touch end for mobile

  const handleTouchEnd = (msg) => {

    clearTimeout(longPressTimer.current);



    // TAP (only if not swipe, not long press)

    if (!hasMoved.current && !longPressTriggered.current) {

      // Handle tap if needed - or call your existing click handler

      // handleClickMessage(msg);

    }

  };

  const toggleInputBox = () => {

    setShowInputBox(!showInputBox);

  };



  const handleClickMessage = (msg) => {

    if (isSelectionMode) {

      // In selection mode, clicking toggles selection

      const newSelected = new Set(selectedMessages);



      if (newSelected.has(msg)) {

        // Deselect this message

        newSelected.delete(msg);



        // If no messages left, exit selection mode

        if (newSelected.size === 0) {

          setIsSelectionMode(false);

        }

      } else {

        // Add this message to selection

        newSelected.add(msg);

      }



      setSelectedMessages(newSelected);

    } else if (!isMobile) {

      // Desktop: instant click to enter selection mode

      setIsSelectionMode(true);

      setShowInputBox(true);

      setSelectedMessages(new Set([msg]));

    }

  };

  const [unreadSpaces, setUnreadSpaces] = useState(new Set());

  useEffect(() => {

    // Space-aware loading: when space changes, fetch history if needed

    if (chatid && activeSpace !== undefined) {

      isLoadingMoreRef.current = true;

      messageStore.loadInitialMessages(chatid, 20, activeSpace).then((loaded) => {

        const currentMsgs = messageStore.getMessages(chatid);

        setMessages([...currentMsgs]);

        // Reset "has more" check for this specific space

        hasMoreInDBRef.current = !(loaded && loaded.length < 20);

        isLoadingMoreRef.current = false;

      });

    }

  }, [chatid, activeSpace]);



  useEffect(() => {

    const unreadSet = new Set();

    // console.log('Building unread spaces list...');

    // console.log('Current active space:', activeSpace);



    messages.forEach(msg => {

      // console.log(`Message ${msg.msgid}: spaceid=${msg.spaceid}, isold=${msg.isold}, activeSpace=${activeSpace}`);



      // If message is unread (isold: false) and not in current active space

      if (msg.isold === false && msg.spaceid !== activeSpace) {

        //console.log(`Adding space ${msg.spaceid} to unread list`);

        unreadSet.add(msg.spaceid);

      }

      else {

        if (msg.isold == undefined && !msg.tempmsgid && msg.spaceid !== activeSpace) {

          console.log(`Adding space ${msg.spaceid} to unread list incoming msg`);

          unreadSet.add(msg.spaceid);

        }

      }

    });



    //console.log('Final unread spaces:', Array.from(unreadSet));

    setUnreadSpaces(unreadSet);

  }, [messages, activeSpace]);

  const handleSpaceClick = (spaceId) => {

    console.log(unreadSpaces);

    // Switch to that space

    setActiveSpace(spaceId);

    messageStore.updateIsOld(chatid, spaceId);



    // Mark all messages in that space as read

    setMessages(messages.map(msg =>

      msg.spaceid === spaceId ? { ...msg, isold: true } : msg

    ));



  };









  const handleMessagesScroll = useCallback((e) => {
    const el = e.target;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isScrollingDown = el.scrollTop > lastScrollTopRef.current;

    if (distanceFromBottom > 200) {
      if (isScrollingDown) {
        setShowScrollDownBtn(true);
        isScrolledUpRef.current = true;
      } else if (el.scrollTop < lastScrollTopRef.current) {
        setShowScrollDownBtn(false);
      }
    } else {
      setShowScrollDownBtn(false);
      isScrolledUpRef.current = false;
      setUnreadSinceScrolled(0);
    }
    lastScrollTopRef.current = el.scrollTop;

    const threshold = 300;
    const oldScrollHeight = el.scrollHeight;

    if (el.scrollTop < threshold && !isLoadingMoreRef.current) {
      const spaceMessages = (messageStore.getMessages(chatid) || []).filter((m) => {
        const msgSpace = m.spaceid !== undefined ? m.spaceid : (m.spaceId !== undefined ? m.spaceId : 0);
        return Number(msgSpace) === Number(activeSpace || 0);
      });
      if (!spaceMessages || spaceMessages.length === 0) return;
      const oldestTimestamp = messageStore.getBatchFrontier(chatid, activeSpace) || spaceMessages[0].timestamp;

      isLoadingMoreRef.current = true;

      if (hasMoreInServerRef.current) {
        const now = Date.now();
        if (oldestTimestamp !== lastLoadMoreTimestampRef.current || (now - lastLoadMoreTimeRef.current) > 5 * 60 * 1000) {
          lastLoadMoreTimestampRef.current = oldestTimestamp;
          lastLoadMoreTimeRef.current = now;
          console.log('[ChatBox] Sync load-more via WebSocket triggered for timestamp:', oldestTimestamp);
          sendSafe({
            purpose: 'load-more',
            userchatId: chatid,
            usermsgId: activeSpace,
            timestamp: oldestTimestamp,
          });
        }
      }

      if (hasMoreInDBRef.current) {
        messageStore.loadMoreMessages(chatid, oldestTimestamp, 50, activeSpace).then((loadedMsgs) => {
          if (loadedMsgs && loadedMsgs.length > 0) {
            if (loadedMsgs.length < 50) hasMoreInDBRef.current = false;
            setMessages([...messageStore.getMessages(chatid)]);
            requestAnimationFrame(() => {
              if (el) el.scrollTop = el.scrollHeight - oldScrollHeight;
            });
          } else {
            hasMoreInDBRef.current = false;
          }
          isLoadingMoreRef.current = false;
        }).catch(() => {
          isLoadingMoreRef.current = false;
        });
      } else {
        setTimeout(() => {
          if (isMounted.current) isLoadingMoreRef.current = false;
        }, 1000);
      }
    }
  }, [chatid, activeSpace]);

  const handleToggleDateCollapse = useCallback((dateOnly) => {
    setCollapsedView((prev) => {
      if (prev) {
        setTimeout(() => {
          const element = messageRefs.current[`date-${dateOnly}`];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 50);
        return false;
      }
      return true;
    });
  }, []);

  const handleJumpToReplied = useCallback((repliedMsg, repliedToId) => {
    setActiveSpace(repliedMsg.spaceid);
    const element = messageRefs.current[repliedToId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = 'var(--accent-tint)';
      element.style.transition = 'background-color 2s ease';
      setTimeout(() => {
        element.style.backgroundColor = originalBg || '';
      }, 2000);
    }
  }, []);

  const handleOpenAssignmentPanel = useCallback((id) => {
    setSelectedAssignmentId(id);
    setShowAssignmentDetail(true);
  }, []);

  const handleShowReactors = useCallback((msg) => {
    setReactionInfo({ reactions: msg.reactions, msg });
  }, []);

  const handleOpenEventFromBadge = useCallback((event, isReceived) => {
    setHasChanges(false);
    setDraftEvent(null);
    setSelectedEvent(event);
    setShowEventModal(true);
    setEventRecived(isReceived);
  }, []);

  const handleSuggestHello = useCallback(() => composerRef.current?.setDraft?.('Hello 👋'), []);
  const handleSuggestNote = useCallback(() => composerRef.current?.setDraft?.('Hey! Sharing a quick note: '), []);
  const handleSuggestSchedule = useCallback(() => setShowScheduleModal(true), []);
  const handleOpenStatusInfoFromBar = useCallback((msg) => {
    setStatusInfoMsg(msg);
    clearSelection();
  }, []);
  const handleOpenScheduleFromBar = useCallback(() => {
    setScheduleEditData(null);
    setShowScheduleModal(true);
  }, []);

  const galleryMediaItems = useMemo(() => {
    return (filteredMessages || [])
      .filter((m) => m && ['image', 'video'].includes(m.type) && !m.isdeleted && !m.isdeletedeone && (m.content || m.optimisticUrl))
      .map((m) => ({
        id: m.msgid || m.tempmsgid || m.content,
        msgid: m.msgid,
        tempmsgid: m.tempmsgid,
        content: m.content,
        mediaId: m.content,
        fileType: m.type,
        type: m.type,
        fileName: m.fileName || (m.type === 'video' ? 'Video' : 'Image'),
        timestamp: m.timestamp,
        sendername: m.sendername,
        isReceived: m.userid ? String(m.userid) !== String(currentUserId) : false,
        optimisticUrl: m.optimisticUrl,
        optimisticThumbUrl: m.optimisticThumbUrl,
        thumbKey: m.thumbKey || m.thumbnailKey,
        mainKey: m.mainKey || m.fileKey,
        duration: m.duration,
      }));
  }, [filteredMessages, currentUserId]);

  const handleOpenMediaViewer = useCallback((target) => {
    if (!target) return;
    if (target.mediaList && Array.isArray(target.mediaList)) {
      setViewingGallery({
        media: target.media,
        mediaList: target.mediaList,
        initialIndex: target.initialIndex || 0,
        initialId: target.initialId,
      });
      return;
    }

    const targetId = target.msgid || target.tempmsgid || target.mediaId || target.id || target.content;
    let foundIndex = -1;
    if (targetId) {
      foundIndex = galleryMediaItems.findIndex(
        (m) => m.id === targetId || m.mediaId === targetId || m.msgid === targetId || m.tempmsgid === targetId
      );
    }

    if (foundIndex !== -1) {
      setViewingGallery({
        mediaList: galleryMediaItems,
        initialIndex: foundIndex,
      });
    } else {
      setViewingGallery({
        media: target,
        mediaList: [target],
        initialIndex: 0,
      });
    }
  }, [galleryMediaItems]);

  const isSidePanelOpen = !isMobile && (showInfo || ShowEventModal || showpost || showadd || showAssignmentDetail || showGroupCalendar);



  return (

    <div className="chat-layout-wrapper" style={{ display: 'flex', width: '100%', height: isIOS && isInputFocused ? 'var(--vvh, 100dvh)' : '100%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>

      {/* Main Chat Column */}

      <div ref={containerRef} style={{

        flex: 1,

        maxWidth: "100%",

        display: "flex",

        flexDirection: "column",

        overflow: "hidden",

        boxSizing: "border-box",

        backgroundColor: "var(--bg-primary)",

        height: '100%',

        position: "relative",

      }}>

        {guideStep && (

          <div style={{

            position: 'absolute',

            top: '84px',

            left: '50%',

            transform: 'translateX(-50%)',

            backgroundColor: 'var(--accent-color)',

            color: 'white',

            padding: '12px 24px',

            borderRadius: '16px',

            boxShadow: '0 10px 30px color-mix(in srgb, var(--accent-solid) 45%, transparent)',

            zIndex: 2000,

            maxWidth: '90%',

            width: 'max-content',

            fontSize: '14px',

            fontWeight: '600',

            textAlign: 'center',

            border: '2px solid rgba(255, 255, 255, 0.2)',

            backdropFilter: 'blur(8px)',

            animation: 'guideSlideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'

          }}>

            <div dangerouslySetInnerHTML={{ __html: guideStep.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />

          </div>

        )}

        {/* Localized Media Preview Modal */}

        {pendingMediaFile && (

          <Suspense fallback={null}>
            <MediaPreviewModal

              file={pendingMediaFile}

              isUploading={isUploadingInternal}

              uploadProgress={uploadProgressInternal}

              onCancel={() => {

                if (!isUploadingInternal) setPendingMediaFile(null);

              }}

              onSend={(thumbBlob, editedFile) => {

                const file = editedFile || pendingMediaFile;

                setPendingMediaFile(null);

                handleCaptureFile(file, 'Gallery Upload', { silent: true, thumbBlob });

              }}

              onFileChange={setPendingMediaFile}

            />
          </Suspense>

        )}

        {/* {renderPermissionModal()}

        {renderAssignmentModal()} */}



        {activeLinkMenu && (

          <div

            style={{

              position: 'fixed',

              top: 0,

              left: 0,

              width: '100vw',

              height: '100vh',

              zIndex: 9999,

              background: 'transparent'

            }}

            onClick={() => setActiveLinkMenu(null)}

          >

            <div

              style={{

                position: 'absolute',

                top: Math.min(activeLinkMenu.y, window.innerHeight - 100),

                left: Math.min(activeLinkMenu.x, window.innerWidth - 150),

                backgroundColor: 'var(--bg-card)',

                border: '1px solid var(--border-color)',

                borderRadius: '8px',

                padding: '4px',

                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',

                display: 'flex',

                flexDirection: 'column',

                minWidth: '140px',

                animation: 'fadeIn 0.1s ease-out'

              }}

              onClick={(e) => e.stopPropagation()}

            >

              <button

                onClick={() => {

                  navigator.clipboard.writeText(activeLinkMenu.url);

                  setActiveLinkMenu(null);

                }}

                style={{

                  padding: '8px 12px',

                  textAlign: 'left',

                  background: 'transparent',

                  border: 'none',

                  color: 'white',

                  cursor: 'pointer',

                  borderRadius: '4px',

                  fontSize: '14px',

                  display: 'flex',

                  alignItems: 'center',

                  gap: '8px'

                }}

                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}

                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}

              >

                <Copy size={16} /> Copy Link

              </button>

              <button

                onClick={() => {

                  window.open(activeLinkMenu.url, '_blank');

                  setActiveLinkMenu(null);

                }}

                style={{

                  padding: '8px 12px',

                  textAlign: 'left',

                  background: 'transparent',

                  border: 'none',

                  color: 'white',

                  cursor: 'pointer',

                  borderRadius: '4px',

                  fontSize: '14px',

                  display: 'flex',

                  alignItems: 'center',

                  gap: '8px'

                }}

                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}

                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}

              >

                <Bird size={16} /> Open in New Tab

              </button>

            </div>

          </div>

        )}

        <ChatHeader
          chat={chat}
          chatid={chatid}
          isMobile={isMobile}
          isOnline={isOnline}
          activeSpace={activeSpace}
          spaceName={spaceName}
          clickInfo={clickInfo}
          onBack={() => {
            updateV();
            messageStore.setCount(chatid);
            resetToChats(navigate, { chatId: chatid });
          }}
          handleRenameSpace={handleRenameSpace}
          onOpenClassroomMatrix={() => setShowClassroomMatrixModal(true)}
          copiedId={copiedId}
          copyClassroomId={copyClassroomId}
          showInviteMenu={showInviteMenu}
          setShowInviteMenu={setShowInviteMenu}
          onOpenInviteModal={() => setShowInviteModal(true)}
          showGroupCalendar={showGroupCalendar}
          onToggleGroupCalendar={() => {
            setShowGroupCalendar(!showGroupCalendar);
            setHasNewGroupEvent(false);
          }}
          hasNewGroupEvent={hasNewGroupEvent}
          showHeaderMenu={showHeaderMenu}
          setShowHeaderMenu={setShowHeaderMenu}
          isCurrentChatPinned={isCurrentChatPinned}
          togglePin={togglePin}
          isQuickAccessPinned={isQuickAccessPinned}
          toggleQuickAccessPin={toggleQuickAccessPin}
          isMuted={isMuted}
          onToggleMute={async () => {
            setShowHeaderMenu(false);
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            await toggleMuteChat(chatid, nextMuted);
          }}
          onOpenFilterModal={() => setShowFilterModal(true)}
          onOpenClearModal={() => setShowClearModal(true)}
          onOpenStarred={() => navigate(`/starred?chatid=${chatid}`)}
          onOpenGroupCalendarFromMenu={() => setShowGroupCalendar(true)}
        />



        {scheduledMessages && scheduledMessages.length > 0 && (

          <div

            onClick={() => setShowScheduledList(true)}

            style={{

              padding: '6px 12px', background: '#064e3b', color: 'var(--success-color)',

              fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',

              borderBottom: '1px solid var(--success-color)', cursor: 'pointer', transition: '0.2s', zIndex: 10

            }}

            onMouseEnter={(e) => e.currentTarget.style.background = '#065f46'}

            onMouseLeave={(e) => e.currentTarget.style.background = '#064e3b'}

          >

            <Clock size={16} />

            View {scheduledMessages.length} Upcoming Scheduled Message{scheduledMessages.length > 1 ? 's' : ''}

          </div>

        )}



        {/* Sticky Pinned Name Change Banners (Last 24 Hours) - Shown to every member */}

        {activeBannerPins.length > 0 && (

          <div

            style={{

              width: "100%",

              backgroundColor: "rgba(10, 17, 32, 0.96)",

              backdropFilter: "blur(10px)",

              WebkitBackdropFilter: "blur(10px)",

              borderBottom: "1px solid var(--accent-tint-border)",

              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",

              zIndex: 15,

              position: "relative",

              transition: "all 0.25s ease",

            }}

          >

            {!isBannerPinsExpanded ? (

              <div

                style={{

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  padding: isMobile ? "7px 12px" : "8px 16px",

                  gap: "10px",

                  cursor: "pointer",

                }}

                onClick={() => {

                  if (activeBannerPins.length > 1) {

                    setIsBannerPinsExpanded(true);

                  } else {

                    handleBannerPinClick(activeBannerPins[0]);

                  }

                }}

                title={activeBannerPins.length > 1 ? "Click to view all pinned name changes" : "Click to jump to message"}

              >

                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>

                  <span style={{ fontSize: "14px", flexShrink: 0 }}>📌</span>

                  <span style={{

                    fontSize: isMobile ? "12px" : "13px",

                    fontWeight: "600",

                    color: "var(--text-primary)",

                    overflow: "hidden",

                    textOverflow: "ellipsis",

                    whiteSpace: "nowrap",

                  }}>

                    {formatBannerText(activeBannerPins[0])}

                  </span>

                </div>



                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>

                  {activeBannerPins.length > 1 && (

                    <button

                      type="button"

                      onClick={(e) => {

                        e.stopPropagation();

                        setIsBannerPinsExpanded(true);

                      }}

                      style={{

                        background: "var(--accent-tint-border)",

                        border: "1px solid var(--accent-tint-border)",

                        color: 'var(--accent-text)',

                        fontSize: "11px",

                        fontWeight: "700",

                        padding: "2px 8px",

                        borderRadius: "12px",

                        cursor: "pointer",

                        display: "flex",

                        alignItems: "center",

                        gap: "3px",

                      }}

                    >

                      +{activeBannerPins.length - 1} more ▾

                    </button>

                  )}



                  <button

                    type="button"

                    onClick={(e) => handleDismissBannerPin(e, activeBannerPins[0].msgid || activeBannerPins[0].tempmsgid)}

                    style={{

                      background: "transparent",

                      border: "none",

                      color: "var(--text-secondary)",

                      cursor: "pointer",

                      padding: "4px",

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      borderRadius: "6px",

                      lineHeight: 1,

                      transition: "background 0.15s ease",

                    }}

                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)"}

                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}

                    title="Dismiss"

                    aria-label="Dismiss banner"

                  >

                    <X size={15} color="var(--text-secondary)" />

                  </button>

                </div>

              </div>

            ) : (

              <div style={{ padding: isMobile ? "10px 12px" : "12px 16px" }}>

                <div style={{

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  marginBottom: "8px",

                  paddingBottom: "6px",

                  borderBottom: "1px solid var(--bg-hover)",

                }}>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

                    <span style={{ fontSize: "14px" }}>📌</span>

                    <span style={{ fontSize: "12px", fontWeight: "700", color: 'var(--accent-text)', textTransform: "uppercase", letterSpacing: "0.5px" }}>

                      Pinned Name Changes ({activeBannerPins.length})

                    </span>

                  </div>

                  <button

                    type="button"

                    onClick={() => setIsBannerPinsExpanded(false)}

                    style={{

                      background: "transparent",

                      border: "none",

                      color: 'var(--accent-text)',

                      fontSize: "11px",

                      fontWeight: "600",

                      cursor: "pointer",

                      display: "flex",

                      alignItems: "center",

                      gap: "2px",

                    }}

                  >

                    Show less ▴

                  </button>

                </div>



                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }} className="hide-scrollbar">

                  {activeBannerPins.map((pin) => (

                    <div

                      key={pin.msgid || pin.tempmsgid || pin.timestamp}

                      onClick={() => handleBannerPinClick(pin)}

                      style={{

                        display: "flex",

                        alignItems: "center",

                        justifyContent: "space-between",

                        padding: "6px 10px",

                        backgroundColor: "var(--bg-hover)",

                        borderRadius: "8px",

                        cursor: "pointer",

                        transition: "background 0.15s ease",

                        gap: "10px",

                      }}

                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-tint)")}

                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}

                    >

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>

                        <span style={{ fontSize: "12px", color: 'var(--accent-text)' }}>•</span>

                        <span style={{

                          fontSize: "12px",

                          color: "var(--text-primary)",

                          overflow: "hidden",

                          textOverflow: "ellipsis",

                          whiteSpace: "nowrap",

                        }}>

                          {formatBannerText(pin)}

                        </span>

                      </div>

                      <button

                        type="button"

                        onClick={(e) => handleDismissBannerPin(e, pin.msgid || pin.tempmsgid)}

                        style={{

                          background: "transparent",

                          border: "none",

                          color: "var(--text-secondary)",

                          cursor: "pointer",

                          padding: "2px 4px",

                          display: "flex",

                          alignItems: "center",

                          justifyContent: "center",

                          borderRadius: "4px",

                          lineHeight: 1,

                          flexShrink: 0

                        }}

                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)"}

                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}

                        title="Dismiss"

                        aria-label="Dismiss pin"

                      >

                        <X size={13} color="var(--text-secondary)" />

                      </button>

                    </div>

                  ))}

                </div>

              </div>

            )}

          </div>

        )}



        {/* Space navigation removed - handled in ChatNames list */}



        <ChatMessageList
          isSyncingMessages={isSyncingMessages}
          messagesContainerRef={messagesContainerRef}
          onScroll={handleMessagesScroll}
          isMobile={isMobile}
          filteredMessages={filteredMessages}
          messages={messages}
          myDisplayName={myDisplayName}
          currentUserId={currentUserId}
          userStreakMap={userStreakMap}
          chat={chat}
          eventByMsgId={eventByMsgId}
          collapsedView={collapsedView}
          unreadMarker={unreadMarker}
          chatlist={chatlist}
          selectedMessages={selectedMessages}
          hoveredMsgId={hoveredMsgId}
          swipeOffset={swipeOffset}
          highlightedPinId={highlightedPinId}
          isSelectionMode={isSelectionMode}
          chatMembers={chatMembers}
          messageRefs={messageRefs}
          transientIndicators={transientIndicators}
          bottomRef={bottomRef}
          firstUnreadMentionId={firstUnreadMentionId}
          showScrollDownBtn={showScrollDownBtn}
          unreadSinceScrolled={unreadSinceScrolled}
          onSuggestHello={handleSuggestHello}
          onSuggestNote={handleSuggestNote}
          onSuggestSchedule={handleSuggestSchedule}
          onToggleDateCollapse={handleToggleDateCollapse}
          onBannerPinClick={handleBannerPinClick}
          onRevive={revive}
          onHoverChange={setHoveredMsgId}
          onClickMessage={handleClickMessage}
          onSwipeStart={handleSwipeStart}
          onSwipeMove={handleSwipeMove}
          onSwipeEnd={handleSwipeEnd}
          onTouchStartMsg={handleTouchStart}
          onTouchEndMsg={handleTouchEnd}
          onJumpToReplied={handleJumpToReplied}
          renderFormattedText={renderFormattedText}
          onOpenAssignmentPanel={handleOpenAssignmentPanel}
          onOpenMediaViewer={handleOpenMediaViewer}
          onOpenAlbum={setActiveAlbumGroup}
          onRetryMediaUpload={retryMediaUpload}
          onShowReactors={handleShowReactors}
          onToggleStar={toggleStar}
          onOpenQueuedMsg={setSelectedQueuedMsg}
          onOpenEvent={handleOpenEventFromBadge}
          onScrollToMention={scrollToMessage}
          onScrollToBottom={scrollToBottom}
        />

            {/* ---------------------------------- */ }



            {

              selectedMessage && (

                <div ref={panelref}

                  style={{

                    position: "absolute",

                    top: panelPos.top,

                    left: panelPos.left,

                    width: PANEL_WIDTH,

                    height: PANEL_HEIGHT,

                    borderRadius: "6px",

                    padding: "6px",

                    display: "flex",

                    gap: "6px",

                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",

                    background: "rgba(228, 26, 26, 0.5)",

                    border: "2px solid red",

                    pointerEvents: "auto",

                    zIndex: 9999,

                  }}

                >

                  <button style={{

                    padding: "4px 8px",

                    cursor: "pointer",

                    borderRadius: "4px",

                    border: "none",

                    background: "#dbeafe",

                    color: "var(--bg-card)",



                  }} onClick={(e) => { e.stopPropagation(); reply() }}

                  >Reply</button>

                  <button style={{

                    padding: "4px 8px",

                    cursor: "pointer",

                    borderRadius: "4px",

                    border: "none",

                    background: "#dbeafe",

                    color: "var(--bg-card)",

                  }} onClick={(e) => { e.stopPropagation(); forward() }}

                  >Forward</button>

                  <button style={{

                    padding: "4px 8px",

                    cursor: "pointer",

                    borderRadius: "4px",

                    border: "none",

                    background: "#dbeafe",

                    color: "var(--bg-card)",

                  }} onClick={(e) => { e.stopPropagation(); delet() }}

                  >Delete</button>

                </div>

              )

            }



            {/* Camera Modal — Contained within the ChatBox area */ }

            {

              cameraOpen && (

                <Suspense fallback={null}>
                  <CameraCaptureModal

                    onCapture={(file) => {

                      setCameraOpen(false);

                      setPendingMediaFile(file);

                    }}

                    onClose={() => setCameraOpen(false)}

                  />
                </Suspense>

              )

            }



            {/* Bottom Section */ }
            <ChatInputBar
              ref={composerRef}
              isMobile={isMobile}
              theme={theme}
              chat={chat}
              chatid={chatid}
              isSimulation={isSimulation}
              SIMULATION_ID={SIMULATION_ID}
              activeSpace={activeSpace}
              spaceStore={spaceStore}
              inputRef={inputRef}
              onDraftChange={handleDraftChange}
              notifyActivity={notifyActivity}
              isSelectionMode={isSelectionMode}
              selectedMessages={selectedMessages}
              clearSelection={clearSelection}
              handleCancelUploads={handleCancelUploads}
              reply={reply}
              delet={delet}
              forward={forward}
              toggleStar={toggleStar}
              handleCopySelected={handleCopySelected}
              onOpenStatusInfo={handleOpenStatusInfoFromBar}
              handleShareSelected={handleShareSelected}
              isSharingMedia={isSharingMedia}
              showInputBox={showInputBox}
              toggleInputBox={toggleInputBox}
              sendReaction={sendReaction}
              filterMember={filterMember}
              onClearFilter={() => setFilterMember(null)}
              showreplytomsg={showreplytomsg}
              repliedto={repliedto}
              cancelreply={cancelreply}
              attachedPulse={attachedPulse}
              onDetachPulse={() => setAttachedPulse(null)}
              showReplyNotifyBanner={showReplyNotifyBanner}
              handleEnableReplyNotify={handleEnableReplyNotify}
              handleDismissReplyNotifyBanner={handleDismissReplyNotifyBanner}
              isRecording={isRecording}
              recordingTime={recordingTime}
              startRecording={startRecording}
              stopRecording={stopRecording}
              chatMembers={chatMembers}
              onSendText={handleSendMessageClick}
              sendMediaMessage={sendMediaMessage}
              setPendingMediaFile={setPendingMediaFile}
              handleCameraClick={handleCameraClick}
              onOpenPollModal={() => setShowPollModal(true)}
              onOpenAttachPulseModal={() => setShowAttachPulseModal(true)}
              onOpenScheduleModal={handleOpenScheduleFromBar}
              queuedCount={queuedCount}
              flushQueuedTextMessages={flushQueuedTextMessages}
              showMediaWaitModal={showMediaWaitModal}
              pendingTextMessage={pendingTextMessage}
              onCloseMediaWaitModal={() => setShowMediaWaitModal(false)}
              onWaitForMedia={handleWaitForMedia}
              onSendAnywayMedia={handleSendAnywayMedia}
              selectedQueuedMsg={selectedQueuedMsg}
              onCloseQueuedMsg={() => setSelectedQueuedMsg(null)}
              onSendQueuedNow={handleSendQueuedNow}
              onDeleteQueued={handleDeleteQueued}
              postAssignment={postAssignment}
            />

            {showmedia && (
              <Suspense fallback={null}>
                <ChatLegacyMediaOverlay
                  showmedia={showmedia}
                  onClose={() => setshowmedia(null)}
                  onEditImage={(url) => setEditingViewerSrc(url)}
                  toast={toast}
                />
              </Suspense>
            )}

            <div ref={bottomRef2} />

      </div>



        {/* Side Panel (4th Column) */}

        {!isMobile && isSidePanelOpen && (

          <div className="chat-side-panel" style={{

            position: 'absolute',

            right: 0,

            top: 0,

            width: '50%',

            height: '100%',

            borderLeft: '1px solid var(--border-color)',

            backgroundColor: 'var(--bg-card)',

            display: 'flex',

            flexDirection: 'column',

            animation: 'slideInRight 0.3s ease-out',

            zIndex: 1000,

            boxShadow: '-4px 0 15px rgba(0,0,0,0.5)'

          }}>

            <Suspense fallback={null}>

              {showGroupCalendar && (

                <GroupCalendarPanel

                  chatId={chatid}

                  groupName={chat?.chatname || 'Group Calendar'}

                  highlightEventId={calendarHighlightEventId}
                  onClose={() => { setShowGroupCalendar(false); setCalendarHighlightEventId(null); }}

                  onOpenCreateEvent={(params) => {

                    setEventRecived(false);

                    setHasChanges(false);

                    setSelectedEvent({ chatid, isGroup: true, title: '', description: '', ...params });

                    setShowGroupCalendar(false);

                    setShowEventModal(true);

                  }}

                  onOpenEvent={(ev) => {
                    setEventRecived(false);
                    setHasChanges(false);
                    setDraftEvent(null);
                    setSelectedEvent({ ...ev, chatid, isGroup: true });
                    setShowGroupCalendar(false);
                    setShowEventModal(true);
                  }}

                />

              )}

              {showInfo && (

                <InfoModal

                  chat={chat}

                  onClose={() => setShowInfo(false)}

                  API={API}

                  navigate={navigate}

                  getchat={getchat}

                  isPanel={true}

                />

              )}

              {ShowEventModal && SelectedEvent && (

                <EventModal

                  __onLoadError={() => {
                    setShowEventModal(false);
                    setDraftEvent(null);
                  }}

                  event={SelectedEvent}

                  isReceived={EventRecived}

                  onClose={() => {
                    setShowEventModal(false);
                    setHasChanges(false);
                    setDraftEvent(null);
                    if (SelectedEvent?.isGroup) {
                      setShowGroupCalendar(true);
                    }
                  }}

                  onEventCreated={() => {

                    setShowEventModal(false);

                    setHasChanges(false);

                    setDraftEvent(null);

                    setShowGroupCalendar(true);

                  }}

                  hasChanges={hasChanges}

                  setHasChanges={setHasChanges}

                  onDraftChange={setDraftEvent}

                  onCancelEvent={() => setShowCancelDialog(true)}

                  updateEventApi={update}

                  isPanel={true}

                />

              )}

              {showpost && (

                <AssignmentPostModal

                  chatid={chatid}

                  onClose={() => setShowpost(false)}

                  sendApi={sendAssignment}

                  isPanel={true}

                />

              )}

              {showadd && (

                <AddMemberModal

                  chat={chat}

                  API={API}

                  myDisplayName={myDisplayName}

                  onClose={closeadd}

                  onSuccess={() => {

                    getchat(chatid);

                    closeadd();

                  }}

                  isPanel={true}

                />

              )}

            </Suspense>

            {showAssignmentDetail && selectedAssignmentId && (

              <AssignmentMessage

                id={selectedAssignmentId}

                userRole={chat?.role}

                isMobile={false}

                isPanel={true}

                isDetailOnly={true}

                onClose={() => { setShowAssignmentDetail(false); setSelectedAssignmentId(null); }}

              />

            )}

          </div>

        )}



        {(showClearModal || showforward || showInviteModal || showFilterModal || networkError || showdelet || (revpanel && revev) || showCancelDialog) && (

          <Suspense fallback={null}>

            <ChatActionModals

              __onLoadError={() => {
                setShowClearModal(false);
                setshowforward(false);
                setShowInviteModal(false);
                setShowFilterModal(false);
                setNetworkError(false);
                setshowdelet(false);
                setrevpanel(false);
                setShowCancelDialog(false);
              }}

              showClearModal={showClearModal}

              setShowClearModal={setShowClearModal}

              handleClearChat={handleClearChat}

              spaceName={spaceName}

              showforward={showforward}

              setshowforward={setshowforward}

              cancelforward={cancelforward}

              chatlist={chatlist}

              handleForward={handleForward}

              showInviteModal={showInviteModal}

              setShowInviteModal={setShowInviteModal}

              chat={chat}

              handleInvite={handleInvite}

              showFilterModal={showFilterModal}

              setShowFilterModal={setShowFilterModal}

              filterCandidates={filterCandidates}

              filterMember={filterMember}

              setFilterMember={setFilterMember}

              networkError={networkError}

              setNetworkError={setNetworkError}

              showdelet={showdelet}

              setshowdelet={setshowdelet}

              setdeleted={setdeleted}

              dforme={dforme}

              showEveryone={showEveryone}

              dforeone={dforeone}

              deleted={deleted}

              revpanel={revpanel}

              setrevpanel={setrevpanel}

              revev={revev}

              setrevev={setrevev}

              revivforme={revivforme}

              revivforeone={revivforeone}

              showCancelDialog={showCancelDialog}

              setShowCancelDialog={setShowCancelDialog}

              handleConfirmCancelEvent={handleConfirmCancelEvent}

            />

          </Suspense>

        )}



        {/* Mobile Modals (Floating) */}

        <Suspense fallback={null}>

          {isMobile && showpost && (

            <AssignmentPostModal

              chatid={chatid}

              onClose={() => setShowpost(false)}

              sendApi={sendAssignment}

            />

          )}

          {isMobile && ShowEventModal && SelectedEvent && (

            <EventModal

              __onLoadError={() => {
                setShowEventModal(false);
                setDraftEvent(null);
              }}

              event={SelectedEvent}

              isReceived={EventRecived}

              onClose={() => {
                setShowEventModal(false);
                setHasChanges(false);
                setDraftEvent(null);
                if (SelectedEvent?.isGroup) {
                  setShowGroupCalendar(true);
                }
              }}

              onEventCreated={() => {

                setShowEventModal(false);

                setHasChanges(false);

                setDraftEvent(null);

                setShowGroupCalendar(true);

              }}

              hasChanges={hasChanges}

              setHasChanges={setHasChanges}

              onDraftChange={setDraftEvent}

              onCancelEvent={() => setShowCancelDialog(true)}

              updateEventApi={update}

            />

          )}

          {isMobile && showGroupCalendar && (

            <div style={{

              position: 'fixed',

              inset: 0,

              zIndex: 10000,

              backgroundColor: 'var(--bg-secondary)'

            }}>

              <GroupCalendarPanel

                chatId={chatid}

                groupName={chat?.chatname || 'Group Calendar'}

                highlightEventId={calendarHighlightEventId}
                onClose={() => { setShowGroupCalendar(false); setCalendarHighlightEventId(null); }}

                onOpenCreateEvent={(params) => {

                  setEventRecived(false);

                  setHasChanges(false);

                  setSelectedEvent({ chatid, isGroup: true, title: '', description: '', ...params });

                  setShowGroupCalendar(false);

                  setShowEventModal(true);

                }}

                onOpenEvent={(ev) => {
                  setEventRecived(false);
                  setHasChanges(false);
                  setDraftEvent(null);
                  setSelectedEvent({ ...ev, chatid, isGroup: true });
                  setShowGroupCalendar(false);
                  setShowEventModal(true);
                }}

              />

            </div>

          )}

          {isMobile && showInfo && (

            <InfoModal

              chat={chat}

              onClose={() => setShowInfo(false)}

              API={API}

              navigate={navigate}

              getchat={getchat}

            />

          )}

          {!!statusInfoMsg && (

            <MessageStatusInfoModal

              isOpen={!!statusInfoMsg}

              onClose={() => setStatusInfoMsg(null)}

              message={statusInfoMsg}

              chat={chat}

              members={chatMembers}

            />

          )}

          {isMobile && showadd && (

            <AddMemberModal

              chat={chat}

              API={API}

              myDisplayName={myDisplayName}

              onClose={closeadd}

              onSuccess={() => {

                getchat(chatid);

                closeadd();

              }}

            />

          )}

        </Suspense>



        {isMobile && showAssignmentDetail && selectedAssignmentId && (

          <AssignmentMessage

            id={selectedAssignmentId}

            userRole={chat?.role}

            isMobile={true}

            isPanel={false}

            isDetailOnly={true}

            onClose={() => { setShowAssignmentDetail(false); setSelectedAssignmentId(null); }}

          />

        )}

        {(viewingGallery || viewingMedia) && (
          <Suspense fallback={null}>
            <MediaViewer
              media={viewingGallery?.media || viewingMedia}
              mediaList={viewingGallery?.mediaList || (viewingMedia ? [viewingMedia] : [])}
              initialIndex={viewingGallery?.initialIndex || 0}
              initialId={viewingGallery?.initialId}
              onClose={() => {
                setViewingGallery(null);
                setViewingMedia(null);
              }}
              onEdit={(media) => {
                setEditingViewerSrc(media.fileUrl);
              }}
            />
          </Suspense>
        )}

        {activeAlbumGroup && (
          <Suspense fallback={null}>
            <GroupAlbumModal
              group={activeAlbumGroup}
              onClose={() => setActiveAlbumGroup(null)}
              onOpenViewer={handleOpenMediaViewer}
              selectedMessages={selectedMessages}
              onClickMessage={handleClickMessage}
              onReply={reply}
              onDelete={delet}
              onForward={forward}
              onToggleStar={toggleStar}
              isMobile={isMobile}
            />
          </Suspense>
        )}

        {editingViewerSrc && (
          <React.Suspense fallback={null}>
            <ImageEditor
              src={editingViewerSrc}
              onDone={(editedFile) => {
                setEditingViewerSrc(null);
                setViewingMedia(null);
                setViewingGallery(null);
                setshowmedia(null);
                setPendingMediaFile(editedFile);
              }}
              onCancel={() => setEditingViewerSrc(null)}
            />
          </React.Suspense>
        )}

        <Suspense fallback={null}>

          {showScheduleModal && (

            <ScheduleMessageModal

              isOpen={showScheduleModal}

              initialData={scheduleEditData}

              onClose={() => {

                setShowScheduleModal(false);

                setScheduleEditData(null);

              }}

              onSubmit={handleScheduleSubmit}

            />

          )}

          {showScheduledList && (

            <ScheduledListModal

              isOpen={showScheduledList}

              scheduledMessages={scheduledMessages}

              onClose={() => setShowScheduledList(false)}

              onEdit={(msg) => {

                setShowScheduledList(false);

                setScheduleEditData(msg);

                setShowScheduleModal(true);

              }}

              onDelete={handleDeleteSchedule}

            />

          )}

          {reactionInfo && (

            <ReactorsModal

              reactionInfo={reactionInfo}

              onClose={() => setReactionInfo(null)}

              onSendReaction={sendReaction}

              isMobile={isMobile}

            />

          )}

          {showClassroomMatrixModal && (

            <ClassroomMatrixModal

              roomId={chat?.id || chat?.roomId || chatid}

              classroomName={chat?.chatName || chat?.name || ''}

              userRole={chat?.role || 'student'}

              isOpen={showClassroomMatrixModal}

              onClose={() => setShowClassroomMatrixModal(false)}

            />

          )}

          {showReportExportModal && (

            <ClassroomReportModal

              roomId={chat?.id || chat?.roomId || chatid}

              classroomName={chat?.chatName || chat?.name || ''}

              isOpen={showReportExportModal}

              onClose={() => setShowReportExportModal(false)}

            />

          )}

          {showAttachPulseModal && (

            <AttachPulseModal

              isOpen={showAttachPulseModal}

              onClose={() => setShowAttachPulseModal(false)}

              onSelectPulse={(pulse, targetSpaceId) => {

                setAttachedPulse({ pulse, targetSpaceId });

              }}

              chatId={chatid}

              chatMembers={chatMembers}

              chatType={chat?.type}

              currentActiveSpace={activeSpace}

            />

          )}

          {showPollModal && (

            <CreatePollModal

              isOpen={showPollModal}

              onClose={() => setShowPollModal(false)}

              chatId={chatid}

              currentUserId={currentUserId}

              onPollCreated={handlePollCreated}

            />

          )}

        </Suspense>

        {/* Copied Toast Indicator */}
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: `translateX(-50%) translateY(${copiedId ? '0' : '20px'})`,
          opacity: copiedId ? 1 : 0,
          pointerEvents: 'none',
          background: 'rgba(31, 41, 55, 0.95)',
          border: '1px solid var(--border-color)',
          color: 'var(--accent-text)',
          padding: '10px 24px',
          borderRadius: '24px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 9999
        }}>
          <Copy size={16} /> Copied to clipboard!
        </div>

        {/* Mobile Quick Access Radial Wheel */}
        {isMobile && <QuickAccessWheel currentChatId={chatid} />}

      </div>

      );

};



      export default ChatBox;

