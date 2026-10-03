import { API } from "./UserAuth";
import { savePulseToStore, savePulsesBatchToStore, purgeExpiredPulseMedia, saveMineDataToDB, getMineDataFromDB } from "./PulseMediaCache";

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
    "User-id": userId,
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

  // Cache feed pulses in IndexedDB
  if (Array.isArray(feedList)) {
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
