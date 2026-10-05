import { API } from "./UserAuth";
import { savePulseToStore, savePulsesBatchToStore, purgeExpiredPulseMedia, saveMineDataToDB, getMineDataFromDB, saveFeedDataToDB, getFeedDataFromDB } from "./PulseMediaCache";

/**
 * Pulse API Service
 * Handles HTTP requests for Ephemeral Statuses & Streaks.
 * Automatically saves viewed pulses into dedicated IndexedDB store and purges expired media client-side.
 */

const getHeaders = () => {
  const userId = localStorage.getItem("userid") || "";
  return {
    "Content-Type": "application/json",
    "User-Id": userId,
  };
};

const getBaseUrl = () => {
  if (!API) return "/api/pulse";
  const base = API.endsWith("/api") ? API.slice(0, -4) : API;
  return `${base}/api/pulse`;
};

export const fetchPutUrls = async ({
  fileName = "status_media",
  fileType = "image",
  needsImage = false,
  imageMime = "",
  needsAudio = false,
  audioMime = "",
  needsVideo = false,
  videoMime = "",
}) => {
  const res = await fetch(`${getBaseUrl()}/put-urls`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      fileName,
      fileType,
      needsImage,
      imageMime,
      needsAudio,
      audioMime,
      needsVideo,
      videoMime,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get presigned upload URLs (${res.status})`);
  }
  return await res.json();
};

export const uploadMediaToR2 = async (putUrl, file) => {
  const res = await fetch(putUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload media to storage (${res.status})`);
  }
  return true;
};

export const savePulseMediaKeys = async ({
  pulseUrl = null,
  pulseType = "image",
  durationSeconds = 15,
  imageFileKey = null,
  audioFileKey = null,
  videoFileKey = null,
}) => {
  const res = await fetch(`${getBaseUrl()}/save-media`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      pulseUrl: pulseUrl || imageFileKey || audioFileKey || videoFileKey,
      pulseType: pulseType || "image",
      durationSeconds: durationSeconds || 15,
      imageFileKey,
      audioFileKey,
      videoFileKey,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to save pulse media keys (${res.status})`);
  }
  return await res.json();
};

export const createPulse = async ({
  type = "text",
  content = "",
  pulseMediaId = null,
  bgColor = "#1e293b",
  fontStyle = "sans",
  visibility = "chats_only",
}) => {
  const res = await fetch(`${getBaseUrl()}/create`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      type,
      content,
      pulseMediaId,
      bgColor,
      fontStyle,
      visibility,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create pulse (${res.status})`);
  }
  const result = await res.json();
  if (result) {
    savePulseToStore(result);
  }
  return result;
};

export const getMinePulsesOffline = async () => {
  return await getMineDataFromDB();
};

export const getMyPulses = async () => {
  // Purge expired client-side first
  await purgeExpiredPulseMedia();

  const res = await fetch(`${getBaseUrl()}/mine`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch my pulses (${res.status})`);
  }
  const data = await res.json();
  
  // Cache owner pulses & views in IndexedDB for instant offline/online rendering
  if (data) {
    await saveMineDataToDB(data);
    if (data.activePulses) savePulsesBatchToStore(data.activePulses);
    if (data.expiredPulses) savePulsesBatchToStore(data.expiredPulses);
  }
  return data;
};

export const getPulseFeedOffline = async () => {
  return await getFeedDataFromDB();
};

export const getPulseFeed = async () => {
  // Purge expired client-side first
  await purgeExpiredPulseMedia();

  const res = await fetch(`${getBaseUrl()}/feed`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch pulse feed (${res.status})`);
  }
  const data = await res.json();
  const feedList = Array.isArray(data) ? data : (data?.feed || []);

  // Cache feed pulses & list in IndexedDB for instant offline-first rendering
  if (Array.isArray(feedList)) {
    await saveFeedDataToDB(feedList);
    feedList.forEach(item => {
      if (item.pulses) {
        savePulsesBatchToStore(item.pulses);
      }
    });
  }

  return feedList;
};

export const recordPulseView = async (pulseId) => {
  if (!pulseId) return;
  try {
    const res = await fetch(`${getBaseUrl()}/view/${pulseId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[PulseService] View record failed for pulse ${pulseId}:`, err);
  }
};

/**
 * Safely parses pulse dates returned by server.
 * Handles Java LocalDateTime arrays [year, month, day, hour, min, sec, nano],
 * ISO strings, timestamp numbers, and Date objects.
 */
export const parsePulseDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  if (Array.isArray(val)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = val;
    const ms = Math.floor(nano / 1000000);
    // Month in JS Date is 0-indexed (0 = Jan, 9 = Oct)
    const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof val === 'string') {
    if (/^\d+$/.test(val)) {
      const d = new Date(parseInt(val, 10));
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

export const formatPulseTime = (val, fallback = 'Just now') => {
  const d = parsePulseDate(val);
  if (!d) return fallback;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formats viewer timestamp according to strict LetsChat specifications:
 * - Main part (dynamic, changes over time):
 *   - < 5 min: "Just now"
 *   - 5..59 min: "N min ago"
 *   - >= 60 min (same day): "1:01 PM"
 *   - >= 60 min (previous day): "Yesterday, 1:01 PM"
 * - Bracket part (fixed, never changes):
 *   - "(within N min)" = gap between status posted time and viewed time, rounded up to whole minutes.
 *   - Shown ONLY if view happened within 1 hour of status creation.
 */
export const formatViewerTime = (viewedAtInput, createdAtInput, currentTimeInput = new Date()) => {
  const viewedDate = parsePulseDate(viewedAtInput);
  const createdDate = parsePulseDate(createdAtInput);
  const currentDate = parsePulseDate(currentTimeInput) || new Date();

  if (!viewedDate) return 'Recently';

  const viewedMs = viewedDate.getTime();
  const currentMs = currentDate.getTime();
  const createdMs = createdDate ? createdDate.getTime() : null;

  // 1. Main Part (Time since view)
  const diffFromCurrentMs = Math.max(0, currentMs - viewedMs);
  const diffFromCurrentMins = Math.floor(diffFromCurrentMs / 60000);

  let mainPart = '';

  if (diffFromCurrentMins < 5) {
    mainPart = 'Just now';
  } else if (diffFromCurrentMins < 60) {
    mainPart = `${diffFromCurrentMins} min ago`;
  } else {
    const timeString = viewedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const nowLocalDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const viewedLocalDate = new Date(viewedDate.getFullYear(), viewedDate.getMonth(), viewedDate.getDate());
    const dayDiff = Math.round((nowLocalDate - viewedLocalDate) / (1000 * 60 * 60 * 24));

    if (dayDiff === 0) {
      mainPart = timeString;
    } else if (dayDiff === 1) {
      mainPart = `Yesterday, ${timeString}`;
    } else {
      const monthDayStr = viewedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
      mainPart = `${monthDayStr}, ${timeString}`;
    }
  }

  // 2. Bracket Part (Gap between posted time and viewed time)
  let bracketPart = '';
  if (createdMs && viewedMs >= createdMs) {
    const gapMs = viewedMs - createdMs;
    const gapMinutes = Math.ceil(gapMs / 60000); // Rounded up to whole minutes

    if (gapMinutes <= 60) {
      const displayGap = gapMinutes < 1 ? 1 : gapMinutes;
      bracketPart = ` (within ${displayGap} min)`;
    }
  }

  return `${mainPart}${bracketPart}`;
};
