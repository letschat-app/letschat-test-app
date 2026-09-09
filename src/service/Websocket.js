import messageStore from "../pages/MessageStore";
import { updateMessageStatusInDB } from "./db";
import * as SyncService from "./SyncService";

let socket = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 50; // Increased for more long-term persistence
let volatileQueue = []; // Queue for messages while CONNECTING
let pingInterval = null;
let lastSoundTime = 0;
let pongTimeout = null;

function startPingPong() {
  stopPingPong();
  pingInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send("ping");
      // Wait up to 10 seconds for pong
      pongTimeout = setTimeout(() => {
        console.warn("[Websocket] Pong timeout, closing socket to reconnect...");
        if (socket) socket.close();
      }, 10000);
    }
  }, 30000);
}

function stopPingPong() {
  if (pingInterval) clearInterval(pingInterval);
  if (pongTimeout) clearTimeout(pongTimeout);
}

/**
 * Returns true if the WebSocket is currently open
 */
export function isSocketOpen() {
  return socket && socket.readyState === WebSocket.OPEN;
}

export function initWebsocket() {
  const userid = localStorage.getItem("userid");
  if (!userid) return;

  // Abort connection if manually placed in sleep mode
  if (localStorage.getItem('sleepMode') === 'true') {
    console.log("[Websocket] Init aborted: App is in Sleep Mode.");
    return;
  }

  // Connection URL

  //socket = new WebSocket(`ws://10.197.48.102:8080/chat?userid=${userid}`);
  socket = new WebSocket(`wss://letschat-backend-69jf.onrender.com/chat?userid=${userid}`);
  localStorage.setItem('socket', socket);

  socket.onopen = () => {
    console.log("WebSocket connected");
    reconnectAttempts = 0; // Reset on success

    // Automatic Flush: Send any pending messages from the offline queue
    SyncService.flushQueue(socket);

    // Drain Volatile Queue: Send ephemeral messages (check-in, load, etc.)
    if (volatileQueue.length > 0) {
      console.log(`[Websocket] Draining ${volatileQueue.length} volatile messages...`);
      while (volatileQueue.length > 0) {
        const msg = volatileQueue.shift();
        try {
          socket.send(JSON.stringify(msg));
        } catch (err) {
          console.error("[Websocket] Volatile drain failed:", err);
        }
      }
    }

    startPingPong();
  };

  socket.onmessage = (event) => {
    if (event.data === "pong") {
      if (pongTimeout) {
        clearTimeout(pongTimeout);
        pongTimeout = null;
      }
      return;
    }

    let msg;
    try {
      msg = JSON.parse(event.data);
      if (typeof msg === 'string') {
        msg = JSON.parse(msg); // Handle potentially double-serialized ngrok data
      }
    } catch (e) {
      console.error("[Websocket] Parse error:", e);
      return;
    }

    if (msg.type === 'batch') {
      messageStore.handleBatch(msg);
      return;
    }

    if (msg.type === 'indicator') {
      const uid = msg.senderid || msg.userid || msg.senderid_id;
      messageStore.setIndicator(msg.chatid, uid, msg.sendername, msg.content);
      return;
    }

    if ('status' in msg && 'sendername' in msg) {
      // Normal message or sync response
      messageStore.addMessage(msg);
      
      const actualMsgType = msg.msgtype || msg.type;
      const senderId = msg.userid || msg.senderid;
      const myId = localStorage.getItem('userid');

      if (senderId && senderId !== myId && !msg.isold) {
        if (actualMsgType !== 'reaction' && actualMsgType !== 'indicator' && !msg.isIndicator) {
          const now = Date.now();
          if (now - lastSoundTime > 10000) {
            lastSoundTime = now;
            const audio = new Audio(`${import.meta.env.BASE_URL}Incoming.mpeg`);
            audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
          }
        }
      }
    }
    else if ('status' in msg) {
      // Server Acknowledgement (ACK)
      console.log("[Websocket] Ack received:", msg);

      // Update DB and Store
      updateMessageStatusInDB(msg).catch(err => console.error(err));
      messageStore.updateMessageStatus(msg);

      // CRITICAL: Remove from offline sync queue now that we have server confirmation
      SyncService.removeFromQueue(msg.tempmsgid);
    }
    else {
      messageStore.addMessage(msg);
    }
  };

  socket.onerror = (e) => {
    console.error("WebSocket error", e);
  };

  socket.onclose = () => {
    console.warn("WebSocket closed");
    socket = null;
    stopPingPong();

    if (localStorage.getItem('sleepMode') === 'true') {
      console.log("[Websocket] Automatic reconnection suspended due to Sleep Mode.");
      return;
    }

    // Retry connection automatically every 10 seconds
    const delay = 10000;
    console.log(`[Websocket] Reconnecting in 10s... (Attempt ${reconnectAttempts + 1})`);

    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      reconnectAttempts++;
      initWebsocket();
    }, delay);
  };
}

/**
 * Safely sends a message immediately or handles it based on its durability requirements.
 * Persistent messages (with tempmsgid) are queued in IndexedDB.
 * Ephemeral messages (indications, check-ins) are sent immediately or discarded.
 */
export async function sendSafe(msg) {
  // 1. Identify "Strictly Ephemeral" messages that must NOT be stored/queued
  const isIndicator = msg.type === 'indicator';
  const isPresenceSignal = ['check-out'].includes(msg.purpose);
  const isEphemeral = isIndicator || isPresenceSignal;

  // 2. Handle Persistent Messages (standard chat messages)
  if (!isEphemeral && msg.tempmsgid && !messageStore.isVolatile(msg.chatid || msg.userchatId)) {
    await SyncService.addToQueue(msg);
  }

  // 3. Connection State Routing
  if (!socket) {
    if (!isEphemeral) {
      console.log(`[Websocket] No socket, relying on sync queue (spaceid: ${msg.spaceid})`);
    } else {
      console.warn(`[Websocket] No socket: Ephemeral ${msg.type || msg.purpose} discarded`);
    }
    return;
  }

  switch (socket.readyState) {
    case WebSocket.OPEN:
      try {
        socket.send(JSON.stringify(msg));
        if (import.meta.env.DEV) console.log("[Websocket] Sent immediately:", msg.purpose || msg.type || 'message');
      } catch (err) {
        console.error("[Websocket] Instant send failed:", err);
      }
      break;

    case WebSocket.CONNECTING:
      if (isEphemeral) {
        // Ephemeral messages are strictly instant-send-or-discard
        if (import.meta.env.DEV) console.log(`[Websocket] Connecting: Ephemeral ${msg.purpose || msg.type} discarded`);
      } else if (msg.tempmsgid) {
        // Persistent messages are already in SyncService/IndexedDB
        if (import.meta.env.DEV) console.log(`[Websocket] Connecting: Persistent message held in IDB sync`);
      } else {
        // Fallback for other non-persistent types
        volatileQueue.push(msg);
      }
      break;

    case WebSocket.CLOSING:
    case WebSocket.CLOSED:
      if (isEphemeral) {
        if (import.meta.env.DEV) console.warn(`[Websocket] Socket ${socket.readyState}: Ephemeral ${msg.type || msg.purpose} discarded`);
      } else if (msg.tempmsgid) {
        if (import.meta.env.DEV) console.log("[Websocket] Socket closed: Message held in persistent sync queue");
      }
      break;

    default:
      console.warn("[Websocket] Unknown readyState:", socket.readyState);
  }
}

export function getsocket() {
  return socket;
}

/**
 * Manually toggle Sleep Mode.
 * Disconnects the socket without attempting to reconnect.
 */
export function toggleSleepMode(enable) {
  if (enable) {
    localStorage.setItem('sleepMode', 'true');
    clearTimeout(reconnectTimeout);
    stopPingPong();
    if (socket) {
      socket.close();
    }
    console.log("[Websocket] Sleep Mode activated: Network paused.");
  } else {
    localStorage.setItem('sleepMode', 'false');
    console.log("[Websocket] Sleep Mode deactivated: Resuming network.");
    // Attempt normal reconnection
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      reconnectAttempts = 0;
      initWebsocket();
    }
  }
}

