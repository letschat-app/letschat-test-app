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
    if (!this.spaces[chatId]) this.spaces[chatId] = {};
    this.spaces[chatId][spaceId] = spacename;
    this.notify();

    // Update spacesCache in localStorage
    try {
      const cache = JSON.parse(localStorage.getItem('spacesCache') || '{}');
      const chatSpaces = cache[chatId];
      if (chatSpaces) {
        const spaceObj = chatSpaces.find(s => s.id === parseInt(spaceId));
        if (spaceObj) {
          spaceObj.name = spacename;
          localStorage.setItem('spacesCache', JSON.stringify(cache));
          window.dispatchEvent(new CustomEvent('spaces_cache_updated', { detail: { chatId, spaces: chatSpaces } }));
        }
      }
    } catch (e) {
      console.error("[SpaceStore] Failed to update spacesCache", e);
    }

    if (chatId === 'simulation_guide') return;

    try {
      const res = await fetch(`${API}/user/set-space`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, spaceId, spacename })
      });
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
