import { browser } from '$app/environment';
import { gameServerAPI } from '$lib/api/gameserver.js';
import { goto } from '$app/navigation';

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
  avatar_url: string | null;
  gamesPlayed: number;
  gamesWon: number;
}

interface UserState {
  // Authenticated user info
  user: AuthUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  displayName: string;
  avatarUrl: string | null;
}

function createUserStore() {
  let state = $state<UserState>({
    user: null,
    profile: null,
    isAuthenticated: false,
    isAnonymous: false,
    isLoading: false,
    displayName: '',
    avatarUrl: null
  });

  // Helper to update state from user data
  function updateFromUserData(userData: any) {
    // Guard: only update if data actually changed
    const newUserId = userData?.user?.id;
    const currentUserId = state.user?.id;

    if (newUserId === currentUserId && userData && state.user) {
      // Same user, don't update to prevent unnecessary reactivity
      return;
    }

    if (userData) {
      state.user = userData.user;
      state.profile = userData.profile;
      state.isAuthenticated = true;
      state.isAnonymous = userData.isAnonymous || false;
      state.displayName = userData.profile.name;
      state.avatarUrl = userData.profile.avatar_url || null;
    } else {
      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.isAnonymous = false;
      state.displayName = '';
      state.avatarUrl = null;
    }
  }

  return {
    get state() {
      return state;
    },

    // Update store from page data (called from +layout.svelte)
    updateFromUserData,

    setDisplayName(name: string) {
      state.displayName = name;
    },

    async login(email: string, password: string) {
      const result = await gameServerAPI.login(email, password);

      if (result.success && browser) {
        // Navigate to lobby - this naturally runs load functions
        await goto('/lobby');
      }

      return result;
    },

    async register(name: string, email: string, password: string) {
      const result = await gameServerAPI.register(name, email, password);

      if (result.success && browser) {
        // Navigate to lobby - this naturally runs load functions
        await goto('/lobby');
      }

      return result;
    },

    async signOut() {
      const result = await gameServerAPI.logout();

      if (browser) {
        // Navigate to home - this naturally runs load functions
        await goto('/');
      }

      return result;
    },

    async signInAnonymously() {
      if (!browser) return;

      const result = await gameServerAPI.signInAnonymous();

      if (result.success) {
        // Navigate to lobby - this naturally runs load functions
        await goto('/lobby');
      }

      return result;
    },

    async upgradeAccount(name: string, email: string, password: string) {
      const result = await gameServerAPI.upgradeAccount(name, email, password);

      if (result.success && browser) {
        // Navigate to lobby - this naturally runs load functions
        await goto('/lobby');
      }

      return result;
    },

    async uploadAvatar(avatarBase64: string) {
      const result = await gameServerAPI.uploadAvatar(avatarBase64);

      if (result.success && result.data) {
        state.avatarUrl = result.data.avatarUrl;
      }

      return result;
    }
  };
}

export const userStore = createUserStore();