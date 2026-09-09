import React, { useEffect, useState, useRef, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import imageCompression from 'browser-image-compression';
import { getchat } from "./ChatNames";
import { v4 as uuidv4 } from "uuid";
import { API } from "../service/UserAuth";
import { getsocket, initWebsocket, sendSafe } from "../service/Websocket";
import messageStore from "./MessageStore";
import { initDB, saveUsersBatchToDB, saveGroupMembersToDB, markMessagesAsOldInDB, getGroupMembersFromDB } from '../service/db';
import { useNotifications } from '../hooks/useNotifications';
import {
  ArrowUp,
  Plus,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Mic,
  X,
  ArrowDown,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Forward,
  Reply,
  Search as SearchIcon,
  Info,
  Calendar,
  UserPlus,
  Trash2,
  MoreVertical,
  Star,
  Pin,
  PinOff,
  Bird,
  Download,
  ChevronDown,
  Share2,
  Loader2,
  XCircle,
  Zap
} from "lucide-react";
import { useEventMediator } from "../service/EventStorage";
import AssignmentMessage from "./AssignmentMessage";
import EyeIcon from "../components/chat/EyeIcon";
import EventModal from "../components/modals/EventModal";
import InfoModal from "../components/modals/InfoModal";
import AssignmentPostModal from "../components/modals/AssignmentPostModal";
import MediaUploadButton from '../components/MediaUploadButton';
import EmojiPicker from 'emoji-picker-react';
import CameraCaptureModal from '../components/modals/CameraCaptureModal';
import MediaMessage from '../components/chat/MediaMessage';
import MediaViewer from '../components/chat/MediaViewer';
import MediaPreviewModal from '../components/chat/MediaPreviewModal';
import Avatar from '../components/chat/Avatar';
import PushPermissionPrompt from '../components/chat/PushPermissionPrompt';
import ScheduleMessageModal from '../components/modals/ScheduleMessageModal';
import ScheduledListModal from '../components/modals/ScheduledListModal';
import simulationService from "../service/SimulationService";
import { SIMULATION_ID } from "../service/SimulationScript";
import QuickAccessWheel from '../components/chat/QuickAccessWheel';

import { uploadMedia, formatFileSize, getFileCategory, getVideoThumbnail, getPdfThumbnail } from '../service/MediaUploader';
import { saveBlobToCache, getMediaInfo, renameCacheKey } from '../service/MediaCache';
import spaceStore from "../service/SpaceStore";
import { Edit2 } from "lucide-react";

const ChatBox = () => {
  const { chatid } = useParams();
  const navigate = useNavigate();
  const isSimulation = chatid === SIMULATION_ID;

  const [chat, setChat] = useState(() => {
    if (chatid === SIMULATION_ID) {
      return {
        id: SIMULATION_ID,
        chatName: "LetsChat Guide 🤖",
        type: "guide",
        role: "student"
      };
    }
    const cached = JSON.parse(localStorage.getItem("chatsMap") || "{}");
    return cached[chatid] || { id: chatid, chatName: "Chat" };
  });

  useEffect(() => {
    if (chatid === SIMULATION_ID) {
      setChat({
        id: SIMULATION_ID,
        chatName: "LetsChat Guide 🤖",
        type: "guide",
        role: "student"
      });
      return;
    }
    const cached = JSON.parse(localStorage.getItem("chatsMap") || "{}");
    if (cached[chatid]) {
      setChat(cached[chatid]);
    } else {
      setChat({ id: chatid, chatName: "Chat" });
    }
  }, [chatid]);
  const { requestPermissionAndGetToken } = useNotifications();
  const currentUserId = localStorage.getItem('userid');
  const myDisplayName = localStorage.getItem('username') || currentUserId;
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null)
  const [url, setUrl] = useState(null)
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const [emojiPickerPos, setEmojiPickerPos] = useState({ bottom: 0, left: 0 });
  const location = useLocation();
  const [activeSpace, setActiveSpace] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('space')) || 0;
  });

  // Mentions State
  const [chatMembers, setChatMembers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [mentionStartIndex, setMentionStartIndex] = useState(null);
  const [mentionsPos, setMentionsPos] = useState({ bottom: 0, left: 0 });
  const [activeMentions, setActiveMentions] = useState([]);
  const [spaceNames, setSpaceNames] = useState({});
  const [isQuickAccessPinned, setIsQuickAccessPinned] = useState(false);

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

  // Fetch chat members for @ mentions if group, classroom, or room
  useEffect(() => {
    if (chat && (chat.type === 'group' || chat.type === 'classroom' || chat.type === 'room')) {
      const fetchMembers = async () => {
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
          console.warn("Failed to fetch members for mentions, checking offline cache:", ex);
          getGroupMembersFromDB(chat.chatId).then(cached => {
             if (cached && cached.length) setChatMembers(cached);
          });
        }
      };
      fetchMembers();
    }
  }, [chatid, chat, currentUserId]);
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
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingUnreadCount, setPendingUnreadCount] = useState(0);
  const [unreadMarker, setUnreadMarker] = useState({ count: 0, firstId: null });

  const [messages, setMessages] = useState([]);

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

  const filteredMessages = useMemo(() => {
    return allVisibleMessages.filter(msg => msg.spaceid === activeSpace);
  }, [allVisibleMessages, activeSpace]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sId = parseInt(params.get('space')) || 0;
    setActiveSpace(sId);

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



  const URL_REGEX = /(https?:\/\/[^\s]+)/g;
  const MENTION_REGEX = /(?:<|&lt;)@[^:]+:(?:.*?)(?:>|&gt;)/g;
  const COMBINED_REGEX = /(https?:\/\/[^\s]+|(?:<|&lt;)@[^:]+:(?:.*?)(?:>|&gt;))/g;

  const stripMentionEncoding = (text) => {
    if (!text) return text;
    return text.replace(/(?:<|&lt;)@[^:]+:(.*?)(?:>|&gt;)/g, '@$1');
  };

  const renderLinkifiedText = (text) => {
    if (!text) return null;
    const parts = text.split(COMBINED_REGEX);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.match(URL_REGEX)) {
        return (
          <span
            key={i}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setActiveLinkMenu({
                url: part,
                x: e.clientX,
                y: e.clientY
              });
            }}
            style={{
              color: '#60a5fa',
              textDecoration: 'underline',
              cursor: 'pointer',
              wordBreak: 'break-all',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#60a5fa'}
          >
            {part}
          </span>
        );
      } else if (part.match(MENTION_REGEX)) {
        const match = part.match(/(?:<|&lt;)@([^:]+):(.*?)(?:>|&gt;)/);
        if (match) {
          const uid = match[1];
          const name = match[2];
          const isMe = uid === localStorage.getItem('userid');
          return (
            <span
              key={i}
              style={{
                color: isMe ? '#f59e0b' : '#3b82f6', // Orange if me, Blue if someone else
                fontWeight: isMe ? 'bold' : '600',
                backgroundColor: isMe ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                padding: '2px 6px',
                borderRadius: '6px',
                margin: '0 2px'
              }}
            >
              @{name}
            </span>
          );
        }
      }
      return part;
    });
  };

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
      alert("No shareable media (images, videos, or files) selected.");
      return;
    }

    if (!navigator.share) {
      alert("Native sharing is not supported on this browser.");
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
            const url = (info.fileKey && info.fileKey.startsWith('http'))
              ? info.fileKey
              : `${API}/files/media/serve/${info.fileKey}`;

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
          alert("Platform does not support sharing this file type.");
        }
      } else {
        alert("Platform does not support sharing this file type.");
      }
    } catch (err) {
      if (err.name !== 'AbortError') { // Ignore user cancel
        console.error("Sharing failed:", err);
        alert("Sharing failed. Please try again.");
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
  const [pendingMediaFile, setPendingMediaFile] = useState(null);
  const [uploadProgressInternal, setUploadProgressInternal] = useState(0);
  const [isUploadingInternal, setIsUploadingInternal] = useState(false);
  //  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState(1);
  const [showInputBox, setShowInputBox] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isSharingMedia, setIsSharingMedia] = useState(false);
  const activeUploads = useRef(new Map()); // Map<tempmsgid, AbortController>
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

      // Background Member Sync
      const chatsMap = JSON.parse(localStorage.getItem("chatsMap") || "{}");
      const chatEnv = chatsMap[chatid];
      if (chatEnv && (chatEnv.type === 'group' || chatEnv.type === 'classroom')) {
        fetch(`${API}/group/getmembers/${chatEnv.chatId || chatEnv.chatid}`, {
          headers: { "Content-Type": "application/json", "User-Id": localStorage.getItem("userid") }
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.length) {
              setChatMembers(data);
              saveUsersBatchToDB(data);
              saveGroupMembersToDB(chatEnv.chatId, data);
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
    } catch (err) { alert(err.message); }
  };

  const handleDeleteSchedule = async (msgid) => {
    try {
      const res = await fetch(`${API}/delete/${msgid}`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to delete scheduled message");
      fetchScheduledMessages();
      if (scheduledMessages.length <= 1) setShowScheduledList(false);
    } catch (err) { alert(err.message); }
  };

  // const [showInfo,setShowInfo] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
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


  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const close = (e) => {
      if (
        !emojiButtonRef.current?.contains(e.target) &&
        !emojiPickerRef.current?.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [showEmojiPicker]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUrl(url);
      setFile(file)
      console.log(url)
    }
    e.target.value = "";
  };

  const sendReaction = (msg, text) => {
    if (!text) return;
    const reactionMsg = {
      chatid,
      tempmsgid: `reaction-${uuidv4()}`,
      content: text,
      type: 'text',
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
    const newName = prompt("Enter new name for this space:", currentName);
    if (newName && newName.trim() && newName !== currentName) {
      await spaceStore.setSpaceName(chatid, activeSpace, newName.trim());
    }
  };

  let socket = getsocket();

  useEffect(() => {
    if (!chatid) {
      navigate("/chats");
      return;
    }
    if (isSimulation) return;
    // Notify server of check-in to this specific chat and space
    getchat(chatid, activeSpace, null, chat?.type);
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
      markMessagesAsOldInDB(chatid).catch(err =>
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

      if (msg && msg.chatid === chatid) {
        console.log("[ChatBox] Global store updated for chatid:", chatid);
        const updatedMessages = [...messageStore.getMessages(chatid)];
        setMessages(updatedMessages);

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
    messageStore.addListener(handleNewMessage);
    return () => {
      messageStore.removeListener(handleNewMessage);
      messageStore.removeListener(handleIndicatorUpdate);
      // localStorage.removeItem(chatid);
      messageStore.setActivechatbox(null)
      const json = {
        purpose: "check-out",
        userchatId: chatid,
        usermsgId: activeSpace
      }
      stopIndicators();
      updateV();
      console.log("leaving");
      sendSafe(json);
      //messageStore.setCount(chatid)
      //navigate("/chats");
    }
  }, [chatid]);

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
      if (!isRecording && input.trim().length === 0) {
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

  function getCurrentLocalDateTimeString() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  // --- Mentions Logic ---
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    notifyActivity('typing');

    // Mentions detection
    if (chat?.type === 'group' || chat?.type === 'classroom' || chat?.type === 'room') {
      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = val.substring(0, cursorPosition);
      
      // Look for "@" preceded by space or start of string, followed by up to 30 characters
      const match = textBeforeCursor.match(/(?:^|\s)@([A-Za-z0-9_ \-.]{0,30})$/);
      if (match) {
        setMentionStartIndex(cursorPosition - match[1].length - 1);
        const query = match[1].toLowerCase();
        setMentionQuery(query);
        
        // Filter members
        const filtered = chatMembers.filter(m => 
          (m.chatName || m.userName || m.username || '').toLowerCase().includes(query)
        );
        setFilteredMembers(filtered);
        
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setMentionsPos({
            bottom: window.innerHeight - rect.top + 16,
            left: Math.max(8, rect.left - 4),
          });
        }
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    }
  };

  const handleSelectMention = (member) => {
    if (mentionStartIndex !== null) {
      const beforeMention = input.substring(0, mentionStartIndex);
      const afterMention = input.substring(mentionStartIndex + mentionQuery.length + 1);

      // Use plain text for the input box so the user sees a clean @Name
      const name = member.chatName || member.userName || member.username;
      const mentionText = `@${name}`;
      
      const newVal = beforeMention + mentionText + ' ' + afterMention;
      setInput(newVal);
      
      // Store the active mention mapping for encoding when the message is sent
      const userId = member.userId || member.userid || member.id;
      setActiveMentions(prev => [...prev, { id: userId, name: name }]);
      
      // Set cursor pos
      setTimeout(() => {
        if (inputRef.current) {
          const newPos = mentionStartIndex + mentionText.length + 1;
          inputRef.current.setSelectionRange(newPos, newPos);
          inputRef.current.focus();
        }
      }, 0);
    }
    setShowMentions(false);
  };
  // ----------------------

  const sendMessage = async () => {
    if (input.trim()) {
      let processedInput = input;
      
      if (activeMentions.length > 0) {
        // Sort by name length descending to replace longest names first (e.g. 'John Doe' before 'John')
        const sortedMentions = [...activeMentions].sort((a, b) => b.name.length - a.name.length);
        
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
        repliedto: repliedto ? repliedto.msgid : null,
        forwardedfrom: null,
        spaceid: activeSpace
      };
      await sendSafe(msg);

      // Request push permission after sending 3 total messages across any chat
      const totalSent = parseInt(localStorage.getItem('totalMessagesSent') || '0', 10) + 1;
      localStorage.setItem('totalMessagesSent', totalSent.toString());

      if (totalSent >= 3 && window.Notification && window.Notification.permission === 'default') {
        const hasAskedPush = localStorage.getItem('hasAskedPushPermission');
        if (!hasAskedPush) {
          setShowPermissionModal(true);
          localStorage.setItem('hasAskedPushPermission', 'true');
        }
      }

      autoPinIfRoom();
      messageStore.addMessage(msg);
      setrepliedto(null);
      setshowreplytomsg(false);
      setShowEmojiPicker(false);
      setInput("");
      setActiveMentions([]);
      stopIndicators();
      resetInChatTimer();
    }
  };
  const sendImage = async () => {
    setIsUploading(true);
    setUrl(null)
    if (!file) return

    const formdata = new FormData()
    formdata.append('file', file)
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        fileType: file.type,
        useWebWorker: true,
      };
      console.log('Starting image compression...');
      const compressedFile = await imageCompression(file, options);
      console.log(`Original Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Compressed Size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
      console.log('Compressed File Name:', compressedFile.name);
      const formdata = new FormData()
      formdata.append('file', compressedFile, file.name);
      const res = await fetch(`${API}/files/media/upload`, {
        method: "POST",
        body: formdata,
      });
      const text = await res.text();
      console.log(text)
      const msg = {
        tempmsgid: uuidv4().toString(),
        chatid,
        userid: localStorage.getItem('userid'),
        sendername: myDisplayName,
        type: "image",
        content: text,
        timestamp: getCurrentLocalDateTimeString(),
        repliedto: repliedto ? repliedto.msgid : null,
        spaceid: activeSpace
      };
      await sendSafe(msg);
      autoPinIfRoom();

      // Track total messages for push prompt
      const totalSent = parseInt(localStorage.getItem('totalMessagesSent') || '0', 10) + 1;
      localStorage.setItem('totalMessagesSent', totalSent.toString());
      if (totalSent >= 3 && window.Notification && window.Notification.permission === 'default') {
        if (!localStorage.getItem('hasAskedPushPermission')) {
          setShowPermissionModal(true);
          localStorage.setItem('hasAskedPushPermission', 'true');
        }
      }

      messageStore.addMessage(msg);
      setrepliedto(null);
      setshowreplytomsg(false);
      setFile(null);
      setUrl(null);
    } catch (err) {
      console.error(err);
      alert(err.message)
    } finally {
      setIsUploading(false);
    }
  }

  // ── New global media send ─────────────────────────────────────────────────
  const sendMediaMessage = async (result, originalMeta) => {
    const { mainKey, thumbKey, mimeType, fileName, mediaId } = result;
    const category = mimeType?.split('/')[0];
    let msgType = 'file';
    if (category === 'image') msgType = 'image';
    else if (category === 'video') msgType = 'video';
    else if (category === 'audio') msgType = 'audio';

    // Merge upload results into the original metadata to preserve ALL fields
    const finalMsg = {
      ...originalMeta,
      type: msgType,
      content: mediaId || mainKey,
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

    // Track total messages for push prompt
    const totalSent = parseInt(localStorage.getItem('totalMessagesSent') || '0', 10) + 1;
    localStorage.setItem('totalMessagesSent', totalSent.toString());
    if (totalSent >= 3 && window.Notification && window.Notification.permission === 'default') {
      if (!localStorage.getItem('hasAskedPushPermission')) {
        setShowPermissionModal(true);
        localStorage.setItem('hasAskedPushPermission', 'true');
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
      }, controller.signal);

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
      if (err.name === 'AbortError') {
        console.log(`[${typeLabel}] Upload aborted for:`, originalMeta.tempmsgid);
      } else {
        console.error(`[${typeLabel}] Background upload failed:`, err);
        messageStore.updateMessage(chatid, originalMeta.tempmsgid, { status: 'failed', uploadProgress: 0 });
      }
    } finally {
      activeUploads.current.delete(originalMeta.tempmsgid);
    }
  };

  const handleCaptureFile = async (file, typeLabel = 'Camera Capture', options = {}) => {
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert(`The captured file exceeds the 50MB size limit and cannot be sent.`);
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

    // Start background process
    performMediaUpload(file, optimisticMsg, typeLabel);
  };

  const retryMediaUpload = (msg) => {
    if (!msg.optimisticFile) return;
    saveBlobToCache(msg.tempmsgid, msg.optimisticFile, 'mainCache').catch(console.error);
    messageStore.updateMessage(chatid, msg.tempmsgid, { status: 'uploading', uploadProgress: 0 });
    // Pass the whole message object to preserve metadata during retry
    performMediaUpload(msg.optimisticFile, msg, 'Retry Upload');
  };

  // ── Audio Recording State and Logic ───────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
      // If permission denied, trigger the onboarding modal (Permissions step)
      setModalInitialStep(1);
      setShowPermissionModal(true);
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
      // If permission denied, trigger the onboarding modal (Permissions step)
      setModalInitialStep(1);
      setShowPermissionModal(true);
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

  // ── Shared input bar (emoji left, attach left, inside input box) ───────────
  const toggleEmojiPicker = (e) => {
    e?.stopPropagation();
    if (!showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPickerPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(8, rect.left - 20),
      });
      setShowEmojiPicker(true);
    } else {
      setShowEmojiPicker(false);
    }
  };

  const renderInputBar = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px',
      padding: isMobile ? '10px 14px' : '12px 24px',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky', bottom: 0,
      width: '100%', boxSizing: 'border-box',
      zIndex: 100,
      paddingBottom: isMobile ? 'max(10px, env(safe-area-inset-bottom))' : '12px',
    }}>
      {/* Emoji picker — PORTAL position to escape stacking contexts and backdrop filters completely */}
      {showEmojiPicker && createPortal(
        <div
          ref={emojiPickerRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: `${emojiPickerPos.bottom}px`,
            left: `${emojiPickerPos.left}px`,
            zIndex: 999999,
          }}
        >
          <style>{`
            .epr-main { background: #1a1a1a !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius:16px !important; box-shadow: 0 16px 48px rgba(0,0,0,0.7) !important; }
            .epr-category-nav { background: transparent !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
            .epr-search-container input { background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 10px !important; color: #ddd !important; }
            .epr-emoji-category-label { background: #1a1a1a !important; color: rgba(255,255,255,0.35) !important; font-size: 11px !important; }
            .epr-btn:hover { background: rgba(255,255,255,0.08) !important; }
            .epr-skin-tones { display: none !important; }
          `}</style>
          <EmojiPicker
            theme="dark"
            onEmojiClick={(d) => {
              setInput(p => p + d.emoji);
              inputRef.current?.focus();
              notifyActivity('typing');
            }}
            height={360} width={310}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>,
        document.body
      )}

      {/* Dynamic Input Bar (Recording UI or Text UI) */}
      {isRecording ? (
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '24px',
          padding: '2px 16px 2px 16px',
          minHeight: '44px',
          animation: 'muFadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '10px', height: '10px', backgroundColor: '#ef4444',
              borderRadius: '50%', animation: 'recordBlink 1s infinite'
            }} />
            <span style={{ color: '#ef4444', fontSize: '15px', fontWeight: '600', fontFamily: 'monospace' }}>
              {formatRecordingTime(recordingTime)}
            </span>
          </div>

          <button
            onClick={() => stopRecording(true)}
            style={{
              background: 'transparent', border: 'none', color: '#ef4444',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              padding: '6px'
            }}
            title="Cancel Recording"
          >
            <Trash2 size={20} />
          </button>
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '2px 8px 2px 6px',
          minHeight: '44px',
          transition: 'all 0.2s ease',
        }}>
          {/* Emoji button */}
          <div
            ref={emojiButtonRef}
            onClick={toggleEmojiPicker}
            title="Emoji"
            style={{
              cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%',
              color: showEmojiPicker ? '#60a5fa' : '#9ca3af',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Smile size={20} strokeWidth={2.5} />
          </div>

          {/* Attach button */}
          <MediaUploadButton
            onUploadComplete={sendMediaMessage}
            onFileSelect={setPendingMediaFile}
            onError={err => alert('Upload failed: ' + err.message)}
            onCameraClick={handleCameraClick}
            onScheduleClick={() => {
              setScheduleEditData(null);
              setShowScheduleModal(true);
            }}
            style={{
              flexShrink: 0,
              color: '#9ca3af',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              transition: 'all 0.2s ease'
            }}
          />

          {/* Mentions Dropdown - PORTAL position to completely escape stacking contexts and overflow clipping */}
          {showMentions && filteredMembers.length > 0 && createPortal(
            <div style={{
              position: 'fixed',
              bottom: `${mentionsPos.bottom}px`,
              left: `${mentionsPos.left}px`,
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '8px',
              width: '240px',
              maxHeight: '260px',
              overflowY: 'auto',
              boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
              zIndex: 999999,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.2s ease-out'
            }}>
              {filteredMembers.map((member, i) => (
                <button
                  key={member.id || member.userId || member.userid}
                  onClick={() => handleSelectMention(member)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    width: '100%', padding: '10px 14px',
                    background: 'transparent', border: 'none',
                    borderRadius: '10px', cursor: 'pointer',
                    color: '#f0f0f0', fontSize: '14px', fontWeight: '500',
                    textAlign: 'left',
                    marginBottom: i < filteredMembers.length - 1 ? '2px' : 0,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1.5px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#60a5fa', flexShrink: 0, fontSize: '14px', fontWeight: 'bold'
                  }}>
                    {(member.chatName || member.userName || member.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.chatName || member.userName || member.username}
                  </div>
                </button>
              ))}
            </div>,
            document.body
          )}

          {/* Text input */}
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim()) sendMessage();
              if (e.key === 'Escape') setShowEmojiPicker(false);
            }}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: '15.5px', color: '#fff',
              padding: '10px 10px 10px 6px', minWidth: 0,
            }}
          />
        </div>
      )}

      {/* Send or Mic button */}
      <button
        onClick={isRecording ? () => stopRecording(false) : (input.trim() ? sendMessage : startRecording)}
        style={{
          background: isRecording ? '#10b981' : (input.trim() ? '#2563eb' : '#10b981'),
          color: 'white',
          border: 'none',
          padding: 0,
          borderRadius: '50%',
          width: '44px', height: '44px',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isRecording ? 'scale(1.15)' : 'scale(1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = isRecording ? 'scale(1.2)' : 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = isRecording ? 'scale(1.15)' : 'scale(1)'}
        title={isRecording ? "Send Voice Note" : (input.trim() ? "Send Message" : "Record Voice Note")}
      >
        {isRecording ? <ArrowUp size={24} /> : (input.trim() ? <ArrowUp size={24} /> : <Mic size={20} />)}
      </button>

      <style>{`
        @keyframes recordBlink {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );

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




  const formatTime12Hour = (timestamp, showSeconds = false) => {
    const date = new Date(timestamp);
    const hours = date.getHours() % 12 || 12; // Convert to 12-hour format
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';

    if (showSeconds) {
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds} ${ampm}`;
    }
    return `${hours}:${minutes} ${ampm}`;
  };
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

  const formatDateWithLabel = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1, d2) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    if (isSameDay(messageDate, today)) {
      return `Today, ${messageDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
    } else if (isSameDay(messageDate, yesterday)) {
      return `Yesterday, ${messageDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
    } else {
      return messageDate.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  const getDateOnly = (timestamp) => {
    return new Date(timestamp).toISOString().split("T")[0];
  };
  let lastdate = "";
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
        element.style.backgroundColor = "rgba(137, 180, 245, 0.66)";
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
      timestamp: new Date().toISOString(),
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
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [draftEvent, setDraftEvent] = useState(null);

  const saveChanges = () => {
    const dateKey = typeof draftEvent.date === 'string' ? draftEvent.date : draftEvent.date.toISOString().split('T')[0];
    updateEvent(dateKey, draftEvent);
    console.log(draftEvent);
    update(draftEvent);
    // setDraftEvent(null);
  }


  const update = async (event) => {
    console.log("[ChatBox] Updating event:", event);
    if (!event) {
      console.warn("[ChatBox] Update called with null event");
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




  const isSidePanelOpen = !isMobile && (showInfo || ShowEventModal || showpost || showadd || showAssignmentDetail);

  return (
    <div className="chat-layout-wrapper" style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
      {showClearModal && (
        <div
          onClick={() => setShowClearModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              padding: '28px',
              borderRadius: '20px',
              maxWidth: '340px',
              width: '90%',
              textAlign: 'center',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px'
            }}>
              <Trash2 size={28} />
            </div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', margin: 0 }}>Clear Chat?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              Messages will be cleared from this device only. They remain visible on other devices.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={() => handleClearChat(false)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--accent-color)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Clear {spaceName}
              </button>
              <button
                onClick={() => handleClearChat(true)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #ef4444',
                  background: 'transparent',
                  color: '#ef4444',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Clear All Spaces
              </button>
              <button
                onClick={() => setShowClearModal(false)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
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
            <style>{`
              @keyframes guideSlideDown {
                from { opacity: 0; transform: translate(-50%, -20px); }
                to { opacity: 1; transform: translate(-50%, 0); }
              }
            `}</style>
          </div>
        )}
        {/* Localized Media Preview Modal */}
        {pendingMediaFile && (
          <MediaPreviewModal
            file={pendingMediaFile}
            isUploading={isUploadingInternal}
            uploadProgress={uploadProgressInternal}
            onCancel={() => {
              if (!isUploadingInternal) setPendingMediaFile(null);
            }}
            onSend={(thumbBlob) => {
              const file = pendingMediaFile;
              setPendingMediaFile(null);
              handleCaptureFile(file, 'Gallery Upload', { silent: true, thumbBlob });
            }}
          />
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
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
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
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#374151'}
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
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Bird size={16} /> Open in New Tab
              </button>
            </div>
          </div>
        )}
        <div style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? '12px' : '16px 24px',
          backgroundColor: 'var(--bg-card)',
          backdropFilter: 'var(--glass-effect)',
          borderBottom: "1px solid var(--border-color)",
          flexWrap: "nowrap",
          gap: isMobile ? '8px' : '12px',
          minHeight: isMobile ? '56px' : '72px',
          zIndex: 10
        }}>
          {/* Left Section */}
          <div
            onClick={clickInfo}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? '8px' : '12px',
              flex: "1 1 auto",
              minWidth: isMobile ? "120px" : "150px",
              cursor: 'pointer',
              padding: '4px 0',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isMobile && (
              <button
                onClick={(e) => { e.stopPropagation(); updateV(); navigate("/chats", { state: { showSpacesForChat: chatid }, replace: true }); messageStore.setCount(chatid) }}
                style={{
                  all: 'unset',
                  fontSize: isMobile ? '20px' : '24px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#9ca3af',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                ←
              </button>
            )}

            <Avatar
              chat={chat}
              size={isMobile ? 32 : 36}
              style={{ cursor: 'pointer' }}
              showStatus={chat.type === 'private'}
              isOnline={isOnline}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                  {chat?.chatName || "Chat"}
                </span>
                {messageStore.isVolatile(chatid) && (
                  <span
                    title="Messages in this room are temporarily cached for 30 minutes and then automatically deleted."
                    style={{
                      fontSize: '10px',
                      backgroundColor: '#fbbf24', // Amber/Yellow for temporary status
                      color: '#000',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      fontWeight: '800',
                      cursor: 'help'
                    }}
                  >
                    30m Room
                  </span>
                )}
              </div>
              {chat.type === 'private' && (
                <div style={{ fontSize: '11px', color: isOnline ? '#10b981' : 'var(--text-secondary)', fontWeight: '500' }}>
                  {isOnline ? 'Online' : (() => {
                    const presenceId = chat.userId || chat.id || chatid;
                    const lastSeen = localStorage.getItem(`lastSeen_${presenceId}`);
                    if (!lastSeen) return 'Offline';
                    const date = new Date(lastSeen);
                    const diff = (Date.now() - date.getTime()) / 1000;
                    if (diff < 120) return 'Last seen just now';
                    if (diff < 3600) return `Last seen ${Math.floor(diff / 60)}m ago`;
                    if (diff < 86400) return `Last seen ${Math.floor(diff / 3600)}h ago`;
                    return `Last seen ${date.toLocaleDateString()}`;
                  })()}
                </div>
              )}
              {isMobile && (
                <span style={{
                  fontSize: '10px',
                  color: 'var(--accent-color)',
                  fontWeight: '700',
                  opacity: 0.9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: chat.type === 'private' ? '-1px' : '1px'
                }}>
                  {spaceName}
                </span>
              )}
              {messageStore.isVolatile(chatid) && chat?.motto && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                  {chat.motto}
                </span>
              )}
            </div>
          </div>

          {/* Center Section - Space Navigation */}
          {chat.type !== "classroom" && !isMobile && (
            <div style={{
              display: 'flex',
              gap: isMobile ? '8px' : '12px',
              alignItems: 'center',
              backgroundColor: 'var(--nav-bg)',
              padding: '6px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              flexBasis: isMobile ? 'auto' : 'auto',
              justifyContent: 'center',
            }}>
              {/* Subtle Space Name Display */}
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: '#60a5fa',
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#60a5fa' }} />
                {spaceName}
              </div>
            </div>
          )}

          {/* Right Section */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
            {(chat.type === "classroom" || chat.type === "room") && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInviteMenu(!showInviteMenu);
                  }}
                  style={{
                    padding: isMobile ? '6px 10px' : '8px 14px',
                    backgroundColor: copiedId ? '#10b981' : '#374151',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '600',
                  border: copiedId ? '1px solid #059669' : '1px solid #4b5563',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!copiedId) {
                    e.currentTarget.style.backgroundColor = '#4b5563';
                    e.currentTarget.style.borderColor = '#6b7280';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copiedId) {
                    e.currentTarget.style.backgroundColor = '#374151';
                    e.currentTarget.style.borderColor = '#4b5563';
                  }
                }}
              >
                <span>{copiedId ? '✓' : '📋'}</span>
                <span>{copiedId ? 'Copied!' : chat.id}</span>
              </button>
              {showInviteMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  minWidth: '120px'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInviteMenu(false);
                      copyClassroomId();
                    }}
                    style={{
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    Copy ID
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInviteMenu(false);
                      setShowInviteModal(true);
                    }}
                    style={{
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    Invite
                  </button>
                </div>
              )}
            </div>
            )}

            <button
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <MoreVertical size={20} />
            </button>

            {showHeaderMenu && (
              <>
                <div
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                  onClick={() => setShowHeaderMenu(false)}
                />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '6px',
                  minWidth: '180px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                  zIndex: 101,
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <button
                    onClick={togglePin}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {isCurrentChatPinned ? <PinOff size={16} /> : <Pin size={16} />}
                    {isCurrentChatPinned ? 'Unpin Chat' : 'Pin Chat'}
                  </button>
                  <button
                    onClick={toggleQuickAccessPin}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {isQuickAccessPinned ? <Zap size={16} fill="var(--text-primary)" /> : <Zap size={16} />}
                    {isQuickAccessPinned ? 'Remove from Quick Access' : 'Pin to Quick Access'}
                  </button>

                  <button
                    onClick={() => {
                      setShowClearModal(true);
                      setShowHeaderMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 size={16} />
                    Clear Chat
                  </button>
                  <button
                    onClick={() => {
                      setShowHeaderMenu(false);
                      navigate(`/starred?chatid=${chatid}`);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Star size={16} /> View Starred
                  </button>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                  <button
                    onClick={() => { setShowHeaderMenu(false); clickInfo(); }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Info size={16} /> Contact Info
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {scheduledMessages && scheduledMessages.length > 0 && (
          <div
            onClick={() => setShowScheduledList(true)}
            style={{
              padding: '6px 12px', background: '#064e3b', color: '#34d399',
              fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              borderBottom: '1px solid #047857', cursor: 'pointer', transition: '0.2s', zIndex: 10
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#065f46'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#064e3b'}
          >
            <Clock size={16} />
            View {scheduledMessages.length} Upcoming Scheduled Message{scheduledMessages.length > 1 ? 's' : ''}
          </div>
        )}

        {/* Space navigation removed - handled in ChatNames list */}




        <div
          ref={messagesContainerRef}
          className="hide-scrollbar"
          onScroll={async (e) => {
            const el = e.target;

            // --- NEW: Scroll to bottom detection ---
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            const isScrollingDown = el.scrollTop > lastScrollTopRef.current;

            if (distanceFromBottom > 200) {
              if (isScrollingDown) {
                setShowScrollDownBtn(true);
                isScrolledUpRef.current = true;
              } else if (el.scrollTop < lastScrollTopRef.current) {
                // Only hide if explicitly scrolling UP away from bottom
                setShowScrollDownBtn(false);
              }
            } else {
              // We are at the bottom
              setShowScrollDownBtn(false);
              isScrolledUpRef.current = false;
              setUnreadSinceScrolled(0);
            }
            lastScrollTopRef.current = el.scrollTop;
            // ---------------------------------------

            const threshold = 300; // Trigger load when within 300px of top
            const oldScrollHeight = el.scrollHeight;

            if (el.scrollTop < threshold && !isLoadingMoreRef.current) {
              const chatMessages = messageStore.getMessages(chatid);
              if (!chatMessages || chatMessages.length === 0) return;
              const oldestTimestamp = messageStore.getBatchFrontier(chatid, activeSpace) || chatMessages[0].timestamp;

              isLoadingMoreRef.current = true;

              // 1. Concurrent WebSocket load more for ALL chats
              if (hasMoreInServerRef.current) {
                const now = Date.now();
                if (oldestTimestamp !== lastLoadMoreTimestampRef.current || (now - lastLoadMoreTimeRef.current) > 5 * 60 * 1000) {
                  lastLoadMoreTimestampRef.current = oldestTimestamp;
                  lastLoadMoreTimeRef.current = now;
                  console.log("[ChatBox] Sync load-more via WebSocket triggered for timestamp:", oldestTimestamp);
                  sendSafe({
                    purpose: "load-more",
                    userchatId: chatid,
                    usermsgId: activeSpace,
                    timestamp: oldestTimestamp
                  });
                }
              }

              // 2. Local DB load (fetch up to 50 msgs)
              if (hasMoreInDBRef.current) {
                messageStore.loadMoreMessages(chatid, oldestTimestamp, 50, activeSpace).then(loadedMsgs => {
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
                // Wait briefly for WebSocket batch to arrive if IDB is empty
                setTimeout(() => {
                  if (isMounted.current) isLoadingMoreRef.current = false;
                }, 1000);
              }
            }
          }}
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: isMobile ? '12px' : '16px',
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? '10px' : '12px',
            touchAction: 'pan-y',
          }}
        >


          {/* Floating space bubbles removed - handled in ChatNames list */}



          {filteredMessages.map(msg => {
            const isReceived = msg.userid
              ? (String(msg.userid) !== String(localStorage.getItem("userid")))
              : (msg.sendername && msg.sendername !== myDisplayName);
            const dateOnly = getDateOnly(msg.timestamp);
            const showDate = dateOnly !== lastdate;
            const event = (msg.msgid && eventByMsgId.get(String(msg.msgid))) || (msg.tempmsgid ? eventByMsgId.get(String(msg.tempmsgid)) : null);

            if (showDate) {
              lastdate = dateOnly;
            }

            return (
              <React.Fragment key={msg.msgid || msg.tempmsgid}>
                {showDate && (
                  <div
                    style={{
                      border: "1px solid #3a3a3a",
                      textAlign: "center",
                      color: "#b0b0b0",
                      padding: isMobile ? '6px 12px' : '8px 16px',
                      borderRadius: '20px',
                      fontSize: isMobile ? '11px' : '12px',
                      fontWeight: "500",
                      margin: "12px auto",
                      backgroundColor: "#252525",
                      cursor: "pointer",
                      userSelect: "none",
                      maxWidth: "180px",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                    }}
                    ref={(el) => (messageRefs.current[`date-${dateOnly}`] = el)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (collapsedView) {
                        // If in collapsed view, expand ALL messages and scroll to this date
                        setCollapsedView(false);
                        // Scroll to this date's first message after expanding
                        setTimeout(() => {
                          const element = messageRefs.current[`date-${dateOnly}`];
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }, 100);
                      } else {
                        // Collapse all messages, show only dates
                        setCollapsedView(true);
                      }
                    }}
                  >
                    {formatDateWithLabel(msg.timestamp)}
                  </div>
                )}

                {!collapsedView && (
                  <>
                    {unreadMarker.firstId === (msg.msgid || msg.tempmsgid) && (
                      <div style={{
                        margin: '24px auto',
                        textAlign: 'center',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '12px 0'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: 0, right: 0, top: '50%',
                          height: '1px',
                          backgroundColor: 'rgba(59, 130, 246, 0.4)',
                          zIndex: 0
                        }} />
                        <span style={{
                          backgroundColor: '#1e3a8a',
                          color: '#ffffff',
                          padding: '6px 16px',
                          borderRadius: '24px',
                          fontSize: '11px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '1.2px',
                          zIndex: 1,
                          border: '2px solid #3b82f6',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{ fontSize: '14px' }}>🔔</span>
                          {unreadMarker.count} New Message{unreadMarker.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {msg.sendername === "server" || msg.type === "banner" ? (
                      <div style={{
                        alignSelf: "center",
                        backgroundColor: "#2a2a2a",
                        color: "#9ca3af",
                        padding: isMobile ? '6px 12px' : '8px 16px',
                        borderRadius: '16px',
                        fontSize: isMobile ? '12px' : '13px',
                        border: "1px solid #3a3a3a",
                      }}>
                        {/* {msg.content} */}
                        {
                          msg.userid
                            ? (
                              msg.userid === localStorage.getItem('userid')
                                ? msg.content.split('/')[1]
                                : msg.content.split('/')[0]
                            )
                            : msg.content
                        }
                      </div>
                    ) : (
                      <div style={{
                        position: "relative",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        animation: "fadeIn 0.3s ease-in",
                      }}>
                        {msg.isdeleted || msg.isdeletedeone ? (
                          <div
                            ref={(el) => (messageRefs.current[msg.msgid] = el)}
                            style={{
                              alignSelf: isReceived ? "flex-start" : "flex-end",
                              backgroundColor: isReceived ? "#1f2937" : "#2d3748",
                              color: "#9ca3af",
                              padding: isMobile ? '8px 12px' : '10px 14px',
                              borderRadius: isReceived ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                              maxWidth: isMobile ? "80%" : "70%",
                              wordWrap: "break-word",
                              cursor: "pointer",
                              border: "1px solid #374151",
                              transition: "all 0.2s ease",
                              fontSize: isMobile ? '13px' : '14px',
                            }}
                            onClick={() => { revive(msg) }}
                          >
                            {isReceived && (
                              <div style={{
                                fontSize: isMobile ? '11px' : '12px',
                                fontWeight: "600",
                                color: "#60a5fa",
                                marginBottom: "4px",
                              }}>
                                {msg.sendername}
                              </div>
                            )}

                            <p style={{ margin: "4px 0", fontSize: isMobile ? '13px' : '14px', fontStyle: "italic" }}>
                              {msg.isdeletedeone && isReceived
                                ? `This message was deleted by ${chatlist.find(u => u.id === msg.isdeletedeone)?.chatName || "user"}`
                                : 'This message was deleted by you'}
                            </p>
                          </div>
                        ) : (
                          <div
                            ref={(el) => (messageRefs.current[msg.msgid] = el)}
                            style={{
                              alignSelf: isReceived ? "flex-start" : "flex-end",
                              backgroundColor: selectedMessages.has(msg)
                                ? (isReceived ? "#374151" : "#3b82f6")
                                : (isReceived ? "#1f2937" : "#1e40af"),
                              color: "#ffffff",
                              padding: isMobile ? '8px 12px' : '10px 14px',
                              borderRadius: isReceived ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                              maxWidth: isMobile ? "80%" : "70%",
                              wordWrap: "break-word",
                              cursor: "pointer",
                              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                              transition: (swipeOffset[msg.msgid] || 0) === 0 ? "all 0.2s ease" : "none",
                              fontSize: isMobile ? '13px' : '14px',
                              position: "relative",
                              userSelect: "none",
                              WebkitUserSelect: "none",
                              touchAction: "pan-y", // Allow native vertical scroll, custom horizontal swipe
                              transform: `translateX(${swipeOffset[msg.msgid] || 0}px)`,
                            }}
                            onMouseEnter={() => !isMobile && setHoveredMsgId(msg.msgid || msg.tempmsgid)}
                            onMouseLeave={() => !isMobile && setHoveredMsgId(null)}
                            //onDoubleClick={(e) => msgSelect(e, msg)}
                            onClick={() => handleClickMessage(msg)}
                            {...(isMobile
                              ? {
                                onTouchStart: (e) => {
                                  handleSwipeStart(e, msg.msgid);
                                  handleTouchStart(msg);
                                },
                                onTouchMove: (e) => {
                                  handleSwipeMove(e, msg.msgid);
                                },
                                onTouchEnd: () => {
                                  handleTouchEnd(msg);
                                  handleSwipeEnd(msg);
                                },
                              }
                              : {}
                            )}
                          >
                            {msg.forwardedfrom && (
                              <div style={{
                                fontSize: '10px',
                                marginBottom: "6px",
                                color: "#9ca3af",
                                fontStyle: "italic",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}>
                                <span>↪</span> Forwarded
                              </div>
                            )}

                            {/* Swipe Reply Indicator */}
                            {isMobile && (swipeOffset[msg.msgid] || 0) > 30 && (
                              <div
                                style={{
                                  position: "absolute",
                                  left: "-35px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  opacity: Math.min((swipeOffset[msg.msgid] || 0) / 70, 1),
                                  color: "#60a5fa",
                                  fontSize: "20px",
                                  transition: "opacity 0.1s ease",
                                }}
                              >
                                ↩
                              </div>
                            )}

                            {isReceived && (
                              <div style={{
                                fontSize: isMobile ? '11px' : '12px',
                                fontWeight: "600",
                                marginBottom: "6px",
                                color: "#60a5fa",
                              }}>
                                {msg.sendername}
                              </div>
                            )}

                            {msg.repliedto && (() => {
                              const repliedMsg = messages.find(m => m.msgid === msg.repliedto);
                              return repliedMsg ? (
                                <div
                                  style={{
                                    backgroundColor: repliedMsg.status === null ? "#374151" : "#1e3a8a",
                                    borderLeft: "3px solid #60a5fa",
                                    padding: '6px 10px',
                                    borderRadius: "6px",
                                    marginBottom: "8px",
                                    fontSize: isMobile ? '11px' : '12px',
                                    cursor: "pointer",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSpace(repliedMsg.spaceid);
                                    const element = messageRefs.current[msg.repliedto];
                                    if (element) {
                                      element.scrollIntoView({ behavior: "smooth", block: "center" });
                                      const originalBg = element.style.backgroundColor;
                                      element.style.backgroundColor = "rgba(137, 180, 245, 0.66)";
                                      element.style.transition = "background-color 2s ease";
                                      setTimeout(() => {
                                        element.style.backgroundColor = originalBg || "";
                                      }, 2000);
                                    }
                                  }}
                                >
                                  <div style={{ fontWeight: "600", color: '#60a5fa', marginBottom: "2px" }}>
                                    {repliedMsg.status === null ? repliedMsg.sendername : "You"}
                                  </div>
                                  <div style={{ color: "#d1d5db" }}>
                                    {repliedMsg.type === 'text' && (stripMentionEncoding(repliedMsg.content).length > 50
                                      ? stripMentionEncoding(repliedMsg.content).substring(0, 50) + '...'
                                      : stripMentionEncoding(repliedMsg.content))}
                                    {repliedMsg.type === 'image' && '📷 Photo'}
                                  </div>
                                </div>
                              ) : null;
                            })()}

                            <div style={{ fontSize: isMobile ? '13px' : '14px', lineHeight: "1.5" }}>
                              {msg.type === 'text' && renderLinkifiedText(msg.content)}
                              {msg.type == 'assignment' && (<AssignmentMessage id={msg.content} userRole={chat.role} isMobile={isMobile} onOpenPanel={(id) => { setSelectedAssignmentId(id); setShowAssignmentDetail(true); }} />)}
                              {['image', 'video', 'audio', 'file', 'pdf'].includes(msg.type) && msg.content && (
                                <MediaMessage
                                  msg={msg}
                                  isReceived={isReceived}
                                  isMobile={isMobile}
                                  isSelectionMode={isSelectionMode}
                                  onOpenViewer={setViewingMedia}
                                  onRetry={retryMediaUpload}
                                />
                              )}
                            </div>

                            {/* Reactions Display */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '4px',
                                marginTop: '8px'
                              }}>
                                {Object.entries(msg.reactions).map(([text, reactors]) => (
                                  <div
                                    key={text}
                                    title={reactors.map(r => r.username).join(', ')}
                                    style={{
                                      backgroundColor: isReceived ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                      padding: '2px 6px',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      border: '1px solid rgba(255,255,255,0.05)',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => setReactionInfo({ emoji: text, reactors })}
                                  >
                                    <span>{text}</span>
                                    <span style={{ opacity: 0.8, fontSize: '9px', fontWeight: '700' }}>{reactors.length}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: "6px",
                              gap: "6px"
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                {(msg.isStarred || (!isMobile && hoveredMsgId === (msg.msgid || msg.tempmsgid))) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                      onClick={(e) => toggleStar(e, msg)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '0',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: msg.isStarred ? '#fbbf24' : (isReceived ? "#9ca3af" : "#bfdbfe"),
                                        transition: 'transform 0.2s ease',
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                      <Star size={14} fill={msg.isStarred ? "#fbbf24" : "none"} />
                                    </button>
                                  </div>
                                )}

                                <span style={{
                                  color: isReceived ? "#9ca3af" : "#bfdbfe",
                                  fontWeight: "500",
                                  fontSize: "11px"
                                }}>
                                  {formatTime12Hour(msg.timestamp, selectedMessages.has(msg))}
                                </span>
                              {msg.revived && (
                                  <span style={{
                                    fontSize: '10px',
                                    color: "#10b981",
                                    fontWeight: "500",
                                    backgroundColor: "#065f46",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}>
                                    ⟳ Revived
                                  </span>
                                )}
                                {!isReceived && chat.type !== 'classroom' && (
                                  <EyeIcon status={msg.status || "sending"} />
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                            {event && msg.type === 'text' && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "-8px",
                                  right: isReceived ? "auto" : "8px",
                                  left: isReceived ? "8px" : "auto",
                                  width: isMobile ? '18px' : '20px',
                                  height: isMobile ? '18px' : '20px',
                                  backgroundColor: event.isAdded ? "#10b981" : "#ef4444",
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "white",
                                  fontSize: isMobile ? '10px' : '11px',
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                                  zIndex: 10,
                                  border: "1.5px solid var(--bg-primary)",
                                  animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event);
                                  setShowEventModal(true);
                                  setEventRecived(isReceived);
                                }}
                              >
                                {event.isAdded ? "i" : "+"}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </React.Fragment>
                );
          })}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px 0'
                }}>
                  {import.meta.env.DEV && transientIndicators.length > 0 && console.log("[ChatBox] Rendering indicators:", transientIndicators)}
                  {transientIndicators.map(ind => (
                    <div
                      key={ind.userid}
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: "rgba(31, 41, 55, 0.4)",
                        color: "#9ca3af",
                        padding: isMobile ? '6px 12px' : '8px 16px',
                        borderRadius: '16px 16px 16px 4px',
                        fontSize: isMobile ? '12px' : '13px',
                        border: "1px solid rgba(55, 65, 81, 0.3)",
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginLeft: '8px',
                        fontStyle: 'italic',
                        animation: 'fadeIn 0.3s ease-out'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#60a5fa' }}>
                        {chat.type === 'private' ? (chat.chatName || "Other") : ind.sendername}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {ind.content === 'typing' && (
                          <span style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                            is typing
                            <span className="dot-blink-1">.</span>
                            <span className="dot-blink-2">.</span>
                            <span className="dot-blink-3">.</span>
                          </span>
                        )}
                        {ind.content === 'recording' && (
                          <span style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#ef4444' }}>
                            recording audio
                            <div className="rec-pulse" style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                          </span>
                        )}
                        {ind.content === 'in-chat' && (
                          <span>is in chat</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <style>{`
            @keyframes blink { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
            .dot-blink-1 { animation: blink 1.4s infinite 0s; }
            .dot-blink-2 { animation: blink 1.4s infinite 0.2s; }
            .dot-blink-3 { animation: blink 1.4s infinite 0.4s; }
            @keyframes pulse-red { 0% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(0.8); opacity: 0.5; } }
            .rec-pulse { animation: pulse-red 1s infinite; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
                <div ref={bottomRef} />

                {/* Add CSS for scrollbar styling */}
                <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .hide-scrollbar::-webkit-scrollbar-track {
          background: #111827;
          border-radius: 10px;
        }
        
        .hide-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 10px;
        }
        
        .hide-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
              </div>

        {/* --- Mentions: Jump to Mention FAB --- */}
        {firstUnreadMentionId && !isSelectionMode && (
          <button
            onClick={() => scrollToMessage(firstUnreadMentionId)}
            title="Jump to Mention"
            style={{
              position: 'absolute',
              bottom: showScrollDownBtn ? '145px' : '90px', // sit above the scroll bottom button if it exists
              right: '20px',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#f59e0b',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 50,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            @
          </button>
        )}

        {/* --- NEW: Scroll to Bottom FAB --- */ }
            {
              showScrollDownBtn && !isSelectionMode && (
                <button
                  onClick={scrollToBottom}
                  style={{
                    position: 'absolute',
                    bottom: '90px',
                    right: '20px',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    zIndex: 100,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <ChevronDown style={{ width: '24px', height: '24px' }} strokeWidth={3} />
                  {unreadSinceScrolled > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: '800',
                      borderRadius: '50%',
                      minWidth: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      border: '2px solid #1e293b',
                    }}>
                      {unreadSinceScrolled > 99 ? '99+' : unreadSinceScrolled}
                    </div>
                  )}
                </button>
              )
            }
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
                    color: "#1d1d1dff",

                  }} onClick={(e) => { e.stopPropagation(); reply() }}
                  >Reply</button>
                  <button style={{
                    padding: "4px 8px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    border: "none",
                    background: "#dbeafe",
                    color: "#1d1d1dff",
                  }} onClick={(e) => { e.stopPropagation(); forward() }}
                  >Forward</button>
                  <button style={{
                    padding: "4px 8px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    border: "none",
                    background: "#dbeafe",
                    color: "#1d1d1dff",
                  }} onClick={(e) => { e.stopPropagation(); delet() }}
                  >Delete</button>
                </div>
              )
            }

            {/* Camera Modal — Contained within the ChatBox area */ }
            {
              cameraOpen && (
                <CameraCaptureModal
                  onCapture={(file) => {
                    setCameraOpen(false);
                    handleCaptureFile(file, 'Camera Capture');
                  }}
                  onClose={() => setCameraOpen(false)}
                />
              )
            }

            {/* Bottom Section */ }
            <div style={{ position: "relative" }}>

              {/* Selection Menu - Shows when messages are selected */}
              {isSelectionMode && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--bg-secondary, #1a1a2e)",
                    borderTop: "2px solid #60a5fa",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Row 1: Count + Cancel */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: isMobile ? "8px 16px" : "10px 16px",
                    borderBottom: "1px solid rgba(96,165,250,0.15)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        color: "#60a5fa",
                        fontSize: "14px",
                        fontWeight: "700",
                        background: "#1e3a8a",
                        padding: "4px 12px",
                        borderRadius: "12px",
                        minWidth: "28px",
                        textAlign: "center",
                      }}>
                        {selectedMessages.size}
                      </div>
                      <span style={{ color: "#9ca3af", fontSize: "13px" }}>
                        selected
                      </span>
                    </div>
                    <button
                      onClick={clearSelection}
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        color: "#ef4444",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: "20px",
                        padding: "5px 14px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: '700' }}>X</span> Cancel
                    </button>
                  </div>

                  {/* Row 2: Action Buttons */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-around",
                    padding: isMobile ? "6px 4px" : "8px 16px",
                    gap: "4px",
                  }}>
                    {(() => {
                      const items = Array.from(selectedMessages);
                      const anyPending = items.some(m => !m.msgid || m.status === 'uploading' || m.status === 'failed' || m.isOptimistic);

                      if (anyPending) {
                        return (
                          <button
                            onClick={handleCancelUploads}
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              padding: "8px 16px",
                              borderRadius: "20px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span style={{ fontSize: '18px', fontWeight: '700', marginRight: '8px' }}>X</span>
                            Cancel Upload
                          </button>
                        );
                      }

                      const actionBtnStyle = (color = "#60a5fa") => ({
                        background: "transparent",
                        color,
                        border: "none",
                        padding: isMobile ? "8px 10px" : "8px 12px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        borderRadius: "10px",
                        flex: 1,
                        minWidth: 0,
                        transition: "background 0.15s",
                      });

                      const labelStyle = {
                        fontSize: "10px",
                        fontWeight: "500",
                        color: "#9ca3af",
                        whiteSpace: "nowrap",
                      };

                      return (
                        <>
                          {selectedMessages.size === 1 && (
                            <button onClick={reply} style={actionBtnStyle()}>
                              <Reply size={isMobile ? 19 : 20} />
                              {isMobile && <span style={labelStyle}>Reply</span>}
                            </button>
                          )}

                          <button onClick={delet} style={actionBtnStyle("#ef4444")}>
                            <Trash2 size={isMobile ? 19 : 20} />
                            {isMobile && <span style={labelStyle}>Delete</span>}
                          </button>

                          <button onClick={forward} style={actionBtnStyle()}>
                            <Forward size={isMobile ? 19 : 20} />
                            {isMobile && <span style={labelStyle}>Forward</span>}
                          </button>

                          {selectedMessages.size === 1 && (
                            <button
                              onClick={(e) => {
                                const msg = Array.from(selectedMessages)[0];
                                toggleStar(e, msg);
                                clearSelection();
                              }}
                              style={actionBtnStyle(items[0]?.isStarred ? "#fbbf24" : "#60a5fa")}
                            >
                              <Star size={isMobile ? 19 : 20} fill={items[0]?.isStarred ? "#fbbf24" : "none"} />
                              {isMobile && <span style={labelStyle}>{items[0]?.isStarred ? "Unstar" : "Star"}</span>}
                            </button>
                          )}

                          {selectedMessages.size === 1 && items[0]?.type === 'text' && (
                            <button onClick={handleCopySelected} style={actionBtnStyle()} title="Copy Text">
                              <Copy size={isMobile ? 19 : 20} />
                              {isMobile && <span style={labelStyle}>Copy</span>}
                            </button>
                          )}

                          <button
                            onClick={handleShareSelected}
                            disabled={isSharingMedia}
                            style={actionBtnStyle(isSharingMedia ? "#4b5563" : "#60a5fa")}
                            title="Share Media"
                          >
                            {isSharingMedia ? <Loader2 size={isMobile ? 19 : 20} className="animate-spin" /> : <Share2 size={isMobile ? 19 : 20} />}
                            {isMobile && <span style={labelStyle}>Share</span>}
                          </button>

                          <button
                            onClick={toggleInputBox}
                            style={{
                              ...actionBtnStyle(),
                              background: showInputBox ? "rgba(37,99,235,0.15)" : "transparent",
                            }}
                          >
                            <ChevronDown
                              size={isMobile ? 19 : 20}
                              style={{ transform: showInputBox ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.3s" }}
                            />
                            {isMobile && <span style={labelStyle}>{showInputBox ? "Hide" : "Show"}</span>}
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  {/* Row 3: Reaction Panel */}
                  {selectedMessages.size === 1 && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isMobile ? "flex-start" : "space-between",
                      padding: "8px 16px",
                      background: "rgba(30, 41, 59, 0.95)",
                      borderTop: "1px solid var(--border-color)",
                      borderBottomLeftRadius: "24px",
                      borderBottomRightRadius: "24px",
                      gap: isMobile ? "12px" : "8px",
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch"
                    }}>
                      {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            const msg = Array.from(selectedMessages)[0];
                            sendReaction(msg, emoji);
                            clearSelection();
                          }}
                          style={{
                            background: 'none', border: 'none', fontSize: '24px',
                            cursor: 'pointer', transition: 'transform 0.1s', padding: '4px',
                            flexShrink: 0
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                      <input
                        type="text"
                        placeholder="+"
                        style={{
                          width: '40px',
                          minWidth: '40px',
                          flexShrink: 0,
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '12px',
                          color: 'white',
                          textAlign: 'center',
                          padding: '6px',
                          fontSize: '18px'
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            const msg = Array.from(selectedMessages)[0];
                            sendReaction(msg, e.target.value.trim());
                            clearSelection();
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}


              {/* Input Box Section - Animated wrapper */}
              <div
                style={{
                  maxHeight: showInputBox ? "500px" : "0",
                  overflow: "hidden",
                  transition: "max-height 0.3s ease",
                }}
              >
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column" }}>
                  {showreplytomsg && (
                    <div
                      style={{
                        backgroundColor: repliedto.status == null ? "#1f2937" : "#1e40af",
                        borderLeft: "4px solid #007bff",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        //marginBottom: "15%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: "13px",
                            color: repliedto.status == null ? "#60a5fa" : "#e5e7eb",
                          }}
                        >
                          {repliedto.status === null ? repliedto.sendername : "You"}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#ffffff",
                            wordWrap: "break-word",
                          }}
                        >
                          {repliedto.type == 'text' && repliedto.content}
                          {repliedto.type == 'image' && "Photo"}
                        </div>
                      </div>
                      <div style={{ display: 'flex' }}>
                        <div style={{
                          width: '20px',
                          height: '40px',
                          overflow: 'hidden',
                          position: 'relative',
                        }}>
                          {repliedto.type == 'image' &&
                            <img src={`${API}/files/media/serve/${repliedto.content}`} style={{ width: '100%', height: '100%', }} />
                          }
                        </div>
                        <button
                          onClick={cancelreply}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#f54d4dff",
                            fontSize: "16px",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {((chat.status === 'allowed' || chat.type === 'room' || chat.type === 'direct' || !chat.type) && chat.status !== 'removed' && chat.status !== 'left') ? (
                    chat.type === 'classroom' ? (
                      activeSpace !== 0 && activeSpace !== 1 ? (
                        /* Classroom + activeSpace not 0 or 1 → normal chat for everyone */
                        renderInputBar()
                      ) : chat.role === 'faculty' ? (
                        activeSpace === 1 ? (
                          /* Classroom + activeSpace 1 + faculty → Post Assignment */
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              padding: "10px",
                              background: "#1e1e1e",
                              borderTop: "1px solid #333",
                              position: "sticky",
                              bottom: 0,
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          >
                            <button
                              style={{
                                background: "#16a34a",
                                color: "white",
                                border: "none",
                                borderRadius: "20px",
                                padding: "10px 24px",
                                cursor: "pointer",
                                fontSize: "15px",
                              }}
                              onClick={postAssignment}
                            >
                              Post an Assignment
                            </button>
                          </div>
                        ) : (
                          /* Classroom + activeSpace 0 + faculty → normal chat */
                          renderInputBar()
                        )
                      ) : (
                        /* Classroom + student + activeSpace 0/1 → "You are a student" */
                        <div
                          style={{
                            padding: "10px",
                            background: "#1e1e1e",
                            color: "#aaa",
                            textAlign: "center",
                            borderTop: "1px solid #333",
                            position: "sticky",
                            bottom: 0,
                            width: "100%",
                            boxSizing: "border-box",
                            fontStyle: "italic",
                          }}
                        >
                          You are a student
                        </div>
                      )
                    ) : (
                      /* Not classroom → normal chat input */
                      renderInputBar()
                    )) : (
                    <div
                      style={{
                        padding: "10px",
                        background: "#1e1e1e",
                        color: "#aaa",
                        textAlign: "center",
                        borderTop: "1px solid #333",
                        position: "sticky",
                        bottom: 0,
                        width: "100%",
                        boxSizing: "border-box",
                        fontStyle: "italic",
                      }}
                    >
                      You can't Chat in this conversation
                      {chat.status === 'removed' && " - You were removed"}
                      {chat.status === 'left' && " - You left"}
                    </div>
                  )
                  }
                </div>
              </div>
            </div>




            {
              showforward && (
                <>
                  {/* Backdrop */}
                  <div
                    style={{
                      position: 'fixed',
                      inset: '0',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: '40'
                    }}
                    onClick={() => setshowforward(false)}
                  />

                  {/* Floating Container */}
                  <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'var(--text-primary)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    zIndex: '50',
                    width: '80%',
                    maxHeight: '384px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--message-bg-incoming)' }}>Forward to Chat</h2>
                      <button
                        onClick={() => cancelforward()}
                        style={{
                          color: '#6b7280',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '20px',
                          fontWeight: 'bold'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#374151'}
                        onMouseLeave={(e) => e.target.style.color = '#6b7280'}
                      >
                        X
                      </button>
                    </div>

                    {/* Chat List */}
                    <div style={{ flex: '1', overflowY: 'auto', padding: '8px' }}>
                      {chatlist.map((chat) => (
                        <button
                          key={chat.chatId}
                          onClick={() => { handleForward(chat.chatId); cancelforward() }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ color: 'var(--message-bg-incoming)', fontWeight: '500' }}>
                            {chat.chatName}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                </>
              )
            }

            {
              showInviteModal && (
                <>
                  {/* Backdrop */}
                  <div
                    style={{
                      position: 'fixed',
                      inset: '0',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: '40'
                    }}
                    onClick={() => setShowInviteModal(false)}
                  />

                  {/* Floating Container */}
                  <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'var(--text-primary)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    zIndex: '50',
                    width: '80%',
                    maxHeight: '384px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--message-bg-incoming)' }}>Invite to {chat.chatName}</h2>
                      <button
                        onClick={() => setShowInviteModal(false)}
                        style={{
                          color: '#6b7280',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '20px',
                          fontWeight: 'bold'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#374151'}
                        onMouseLeave={(e) => e.target.style.color = '#6b7280'}
                      >
                        X
                      </button>
                    </div>

                    {/* Chat List */}
                    <div style={{ flex: '1', overflowY: 'auto', padding: '8px' }}>
                      {chatlist.map((c) => (
                        <button
                          key={c.chatId}
                          onClick={() => { handleInvite(c.chatId); setShowInviteModal(false); }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ color: 'var(--message-bg-incoming)', fontWeight: '500' }}>
                            {c.chatName}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )
            }

            {/* Network Error Dialog */ }
            {
              networkError && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      inset: '0',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: '60'
                    }}
                    onClick={() => setNetworkError(false)}
                  />
                  <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'var(--text-primary)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    zIndex: '70',
                    width: '80%',
                    maxWidth: '350px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: 'var(--message-bg-incoming)'
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                          <line x1="12" y1="20" x2="12.01" y2="20"></line>
                          <path d="M4.93 10.93a10 10 0 0 1 14.14 0"></path>
                          <line x1="2" y1="2" x2="22" y2="22"></line>
                        </svg>
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Connection</h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                        You seem to be offline or have a slow connection. Please check your internet and try again.
                      </p>
                    </div>
                    <button
                      onClick={() => setNetworkError(false)}
                      style={{
                        padding: '14px',
                        backgroundColor: '#f3f4f6',
                        color: 'var(--message-bg-incoming)',
                        border: 'none',
                        borderTop: '1px solid #e5e7eb',
                        fontWeight: '600',
                        fontSize: '15px',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      Okay
                    </button>
                  </div>
                </>
              )
            }
            {
              showdelet && (
                <>
                  {/* Backdrop */}
                  <div
                    style={{
                      position: 'fixed',
                      inset: '0',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: '40'
                    }}
                    onClick={() => { setshowdelet(false); setdeleted([]); }}
                  />

                  {/* Floating Container */}
                  <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'var(--text-primary)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    zIndex: '50',
                    width: '80%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--message-bg-incoming)' }}>Delete Message</h2>
                      <button
                        onClick={() => { setshowdelet(false); setdeleted([]); }}
                        style={{
                          color: 'var(--danger-color)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '20px',
                          fontWeight: 'bold'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#dc2626'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--danger-color)'}
                      >
                        X
                      </button>
                    </div>

                    {/* Buttons Container */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Delete for Me - Always Visible */}
                      {chat.type !== 'classroom' && (
                        <button
                          onClick={() => { setshowdelet(false); dforme() }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: '#e5e7eb',
                            color: 'var(--message-bg-incoming)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                        >
                          Delete for Me
                        </button>
                      )}
                      {/* Delete for Everyone - Conditional */}
                      {showEveryone && (
                        <button
                          onClick={() => { setshowdelet(false); console.log("delete for everyone"); dforeone() }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: 'var(--danger-color)',
                            color: 'var(--text-primary)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--danger-color)'}
                        >
                          Delete for Everyone
                        </button>
                      )}

                      {chat.type === 'classroom' && deleted?.userid === localStorage.getItem("userid") && (
                        <button
                          onClick={() => { setshowdelet(false); console.log("delete for everyone"); }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: 'var(--danger-color)',
                            color: 'var(--text-primary)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--danger-color)'}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )
            }

            {
              revpanel && (revev.isdeletedeone === localStorage.getItem("userid") || (revev.isdeleted == true && !revev.isdeletedeone)) && (
                <>
                  {/* Backdrop */}
                  <div
                    style={{
                      position: 'fixed',
                      inset: '0',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: '40'
                    }}
                    onClick={() => { setrevpanel(false); setrevev(null) }}
                  />

                  {/* Floating Container */}
                  <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'var(--text-primary)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    zIndex: '50',
                    width: '80%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--message-bg-incoming)' }}>Revive Message</h2>
                      <button
                        onClick={() => { setrevpanel(false); setrevev(null) }}
                        style={{
                          color: 'var(--danger-color)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '20px',
                          fontWeight: 'bold'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#dc2626'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--danger-color)'}
                      >
                        X
                      </button>
                    </div>

                    {/* Buttons Container */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Revive for Me - Always Visible */}

                      <button
                        onClick={() => { revivforme() }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: '#e5e7eb',
                          color: 'var(--message-bg-incoming)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                      >
                        Revive for Me
                      </button>

                      {/* Revive for Everyone - Conditional */}
                      {(revev.status !== null && revev.isdeletedeone === localStorage.getItem("userid")) && (
                        <button
                          onClick={() => { revivforeone() }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: '#10b981',
                            color: 'var(--text-primary)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                        >
                          Revive for Everyone
                        </button>
                      )}

                      {chat.type === 'classroom' && (revev?.userid === localStorage.getItem("userid") || chat.role === 'faculty') && (
                        <button
                          onClick={() => { revivforeone() }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: '#10b981',
                            color: 'var(--text-primary)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                        >
                          Revive
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )
            }
            {
              url && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.9)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 9999,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "90%",
                      height: "90%",
                      background: "#111",
                      borderRadius: "12px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    {/* Close Button - Top Left */}
                    <button
                      onClick={() => setUrl(null)}
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        background: "#111",
                        color: 'red',
                        border: "none",
                        fontSize: "20px",
                        borderRadius: "50%",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      ✕
                    </button>

                    {/* Image - Center */}
                    <img
                      src={url}
                      alt="preview"
                      style={{
                        maxWidth: "80%",
                        maxHeight: "75%",
                        objectFit: "contain",
                        borderRadius: "8px",
                      }}
                    />

                    {/* Send Button - Bottom Right */}
                    <button
                      onClick={sendImage}
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        right: "10px",
                        background: "#1e90ff",
                        border: "none",
                        padding: "10px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Bird size={22} />
                    </button>
                  </div>
                </div>
              )
            }
            {
              isUploading && (
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999
                }}>
                  <div style={{
                    backgroundColor: 'var(--text-primary)',
                    borderRadius: '8px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      border: '3px solid #e5e7eb',
                      borderTop: '3px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{
                      color: '#374151',
                      fontWeight: '500',
                      margin: 0
                    }}>Uploading media...</p>
                  </div>
                  <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
                </div>
              )
            }
            {
              showmedia && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.9)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 9999,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      background: "#111",
                      borderRadius: "12px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                    }}
                  >
                    {/* Header - Top */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        background: "rgba(0, 0, 0, 0.5)",
                        backdropFilter: "blur(4px)",
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        zIndex: 10,
                      }}
                    >
                      {/* Left Side - Back Button and Name */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        {/* Back Button */}
                        <button
                          onClick={() => setshowmedia(null)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#fff",
                            fontSize: "24px",
                            cursor: "pointer",
                            padding: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          &larr;
                        </button>

                        {/* Chat Name */}
                        <span
                          style={{
                            color: "#fff",
                            fontSize: "18px",
                            fontWeight: "500",
                          }}
                        >
                          {showmedia.status == null ? showmedia.sendername : "You"}
                        </span>
                      </div>

                      {/* Right Side - Download Button */}
                      <a
                        //href={`${API}/files/media/serve/${showmedia.content}`}
                        onClick={async () => {
                          try {
                            const response = await fetch(`${API}/files/media/serve/${showmedia.content}`);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = showmedia.content || 'download';
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            console.error('Download failed:', error);
                            // Fallback: open in new tab if fetch fails
                            window.open(`${API}/files/media/serve/${showmedia.content}`, '_blank');
                          }
                        }}
                        download
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "#fff",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          textDecoration: "none",
                          fontSize: "14px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                        }}
                      >
                        <Download size={18} />

                      </a>
                    </div>

                    {/* Image - Center */}
                    <img
                      src={`${API}/files/media/serve/${showmedia.content}`}
                      alt="preview"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        borderRadius: "8px",
                      }}
                    />
                  </div>
                </div>
              )
            }
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
            zIndex: 50,
            boxShadow: '-4px 0 15px rgba(0,0,0,0.5)'
          }}>
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
                event={SelectedEvent}
                isReceived={EventRecived}
                onClose={() => {
                  if (hasChanges) {
                    setShowSaveDialog(true);
                  } else {
                    setShowEventModal(false);
                  }
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
                  getchat();
                  closeadd();
                }}
                isPanel={true}
              />
            )}
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
            <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
          </div>
        )}

        {/* Dialogs for Event Changes */}
        {showSaveDialog && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '18px' }}>Save Changes?</h3>
              <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>You have unsaved changes. Do you want to save them before closing?</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setShowSaveDialog(false); setShowEventModal(false); setHasChanges(false); saveChanges(); }} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Save</button>
                <button onClick={() => { setShowSaveDialog(false); setShowEventModal(false); setHasChanges(false); }} style={{ flex: 1, padding: '12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Discard</button>
                <button onClick={() => setShowSaveDialog(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showCancelDialog && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '18px' }}>Cancel Event?</h3>
              <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Are you sure you want to cancel this event? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setShowCancelDialog(false); setShowEventModal(false); setHasChanges(false); }} style={{ flex: 1, padding: '12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Yes, Cancel Event</button>
                <button onClick={() => setShowCancelDialog(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Go Back</button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Modals (Floating) */}
        {isMobile && showpost && (
          <AssignmentPostModal
            chatid={chatid}
            onClose={() => setShowpost(false)}
            sendApi={sendAssignment}
          />
        )}

        {isMobile && ShowEventModal && SelectedEvent && (
          <EventModal
            event={SelectedEvent}
            isReceived={EventRecived}
            onClose={() => {
              if (hasChanges) {
                setShowSaveDialog(true);
              } else {
                setShowEventModal(false);
              }
            }}
            hasChanges={hasChanges}
            setHasChanges={setHasChanges}
            onDraftChange={setDraftEvent}
            onCancelEvent={() => setShowCancelDialog(true)}
            updateEventApi={update}
          />
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

        {isMobile && showadd && (
          <AddMemberModal
            chat={chat}
            API={API}
            myDisplayName={myDisplayName}
            onClose={closeadd}
            onSuccess={() => {
              getchat();
              closeadd();
            }}
          />
        )}

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
        {viewingMedia && (
          <MediaViewer
            media={viewingMedia}
            onClose={() => setViewingMedia(null)}
          />
        )}




        <ScheduleMessageModal
          isOpen={showScheduleModal}
          initialData={scheduleEditData}
          onClose={() => {
            setShowScheduleModal(false);
            setScheduleEditData(null);
          }}
          onSubmit={handleScheduleSubmit}
        />

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

        {showPermissionModal && (
          <PushPermissionPrompt
            onAllow={async () => {
              setShowPermissionModal(false);
              await requestPermissionAndGetToken();
            }}
            onDismiss={() => setShowPermissionModal(false)}
          />
        )}

        {reactionInfo && (
          <div 
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
            }}
            onClick={() => setReactionInfo(null)}
          >
            <div 
              style={{
                backgroundColor: '#1e293b', borderRadius: '16px',
                padding: '20px', width: '90%', maxWidth: '320px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Reaction {reactionInfo.emoji}
                </h3>
                <button 
                  onClick={() => setReactionInfo(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
                >×</button>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reactionInfo.reactors.map((reactor, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontWeight: 'bold' }}>
                      {(reactor.username || '?')[0].toUpperCase()}
                    </div>
                    <span style={{ color: '#e2e8f0', fontSize: '15px' }}>{reactor.userId === localStorage.getItem('userid') ? 'You' : reactor.username}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Copied Toast Indicator */}
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: `translateX(-50%) translateY(${copiedId ? '0' : '20px'})`,
          opacity: copiedId ? 1 : 0,
          pointerEvents: 'none',
          background: 'rgba(31, 41, 55, 0.95)',
          border: '1px solid #374151',
          color: '#60a5fa',
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
        <QuickAccessWheel currentChatId={chatid} />
      </div>
      );
};

      export default ChatBox;
