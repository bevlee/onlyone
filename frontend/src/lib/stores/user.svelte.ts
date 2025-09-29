import { browser } from '$app/environment';
import { gameServerAPI } from '$lib/api/gameserver.js';

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  gamesPlayed: number;
  gamesWon: number;
}

interface UserState {
  // Anonymous user info
  anonymousName: string;

  // Authenticated user info
  user: AuthUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Display name (anonymous name or user name)
  displayName: string;
}

function createUserStore() {
  let state = $state<UserState>({
    anonymousName: '',
    user: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
    displayName: ''
  });

  // Load anonymous name from localStorage on initialization
  if (browser) {
    const saved = localStorage.getItem('onlyone-anonymous-name');
    if (saved) {
      state.anonymousName = saved;
      state.displayName = saved;
    }

    // Check auth state on initialization
    checkAuthState();
  }

  async function checkAuthState() {
    if (!browser) return;

    const result = await gameServerAPI.getMe();

    if (result.success && result.data) {
      state.user = result.data.user;
      state.profile = result.data.profile;
      state.isAuthenticated = true;
      state.displayName = result.data.profile?.name || result.data.user?.email || '';
    } else {
      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.displayName = state.anonymousName;
    }

    state.isLoading = false;
  }

  function generateGuestId(): string {
    return `Guest-${Math.floor(Math.random() * 10000)}`;
  }

  return {
    get state() {
      return state;
    },

    setAnonymousName(name: string) {
      state.anonymousName = name;
      if (!state.isAuthenticated) {
        state.displayName = name;
      }

      if (browser) {
        localStorage.setItem('onlyone-anonymous-name', name);
      }
    },

    clearAnonymousName() {
      state.anonymousName = '';
      if (!state.isAuthenticated) {
        state.displayName = '';
      }

      if (browser) {
        localStorage.removeItem('onlyone-anonymous-name');
      }
    },

    async login(email: string, password: string) {
      const result = await gameServerAPI.login(email, password);

      if (result.success && result.data) {
        state.user = result.data.user;
        state.isAuthenticated = true;
        state.displayName = result.data.user.user_metadata?.name || result.data.user.email || '';

        // Get full profile after login
        await checkAuthState();
      }

      return result;
    },

    async register(name: string, email: string, password: string) {
      const result = await gameServerAPI.register(name, email, password);

      if (result.success && result.data) {
        state.user = result.data.user;
        state.isAuthenticated = true;
        state.displayName = result.data.user.user_metadata?.name || result.data.user.email || '';

        // Get full profile after registration
        await checkAuthState();
      }

      return result;
    },

    async signOut() {
      const result = await gameServerAPI.logout();

      // Clear state regardless of API result
      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.displayName = state.anonymousName;

      return result;
    },

    async refreshAuth() {
      await checkAuthState();
    },

    generateGuestName() {
      const guestName = generateGuestId();
      this.setAnonymousName(guestName);
    }
  };
}

export const userStore = createUserStore();