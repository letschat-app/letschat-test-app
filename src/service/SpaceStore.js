import { API } from "./UserAuth";

class SpaceStore {
  constructor() {
    this.spaces = {}; // { chatId: { spaceId: name } }
    this.listeners = [];
  }

  getSpaceName(chatId, spaceId) {
    if (parseInt(spaceId) === 0) return "Main";
    return (this.spaces[chatId] && this.spaces[chatId][spaceId]) || `Space ${spaceId}`;
  }

  async fetchSpaceNames(chatId) {
    if (!chatId) return;
    try {
      const res = await fetch(`${API}/user/get-space?chatId=${chatId}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const data = await res.json(); 
        // Expected format: [{ spaceId: 1, spacename: "Dev" }, ...]
        if (!this.spaces[chatId]) this.spaces[chatId] = {};
        
        // Handle both object and array response if backend varies
        const spacesArray = Array.isArray(data) ? data : (data.spaces || []);
        
        spacesArray.forEach(s => {
          this.spaces[chatId][s.spaceId] = s.spacename || s.spaceName || s.name || `Space ${s.spaceId}`;
        });
        this.notify();
      }
    } catch (e) {
      console.error("[SpaceStore] Fetch failed:", e);
    }
  }

  async setSpaceName(chatId, spaceId, spacename) {
    if (parseInt(spaceId) === 0) return;
    try {
      const res = await fetch(`${API}/user/set-space`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, spaceId, spacename })
      });
      if (res.ok) {
        if (!this.spaces[chatId]) this.spaces[chatId] = {};
        this.spaces[chatId][spaceId] = spacename;
        this.notify();
      }
    } catch (e) {
      console.error("[SpaceStore] Update failed:", e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l());
  }
}

const spaceStoreInstance = new SpaceStore();
export default spaceStoreInstance;
