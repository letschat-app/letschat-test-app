import axios from 'axios';
import { API } from './UserAuth';

class UserDiscoveryStore {
  constructor() {
    this.users = [];
    this.isLoaded = false;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this.users));
  }

  async fetchUsers(force = false) {
    if (this.isLoaded && !force) {
      return this.users;
    }

    try {
      const response = await axios.get(`${API}/user/explore`);
      if (response.data && Array.isArray(response.data)) {
        // Reverse the list as requested
        this.users = [...response.data].reverse();
        this.isLoaded = true;
        this.notify();
      }
      return this.users;
    } catch (error) {
      console.error("Error exploring users:", error);
      return this.users;
    }
  }

  getRandomUsers(count = 20) {
    if (this.users.length === 0) return [];
    const shuffled = [...this.users].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  clear() {
    this.users = [];
    this.isLoaded = false;
    this.notify();
  }
}

const userDiscoveryStore = new UserDiscoveryStore();

// Clear on app close/refresh if needed, though session storage or just memory is fine.
// The user said "when user closes the app just remove the list from memory" 
// Memory is naturally cleared on close.

export default userDiscoveryStore;
