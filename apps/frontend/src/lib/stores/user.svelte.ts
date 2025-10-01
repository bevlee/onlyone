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
    isLoading: true,
    displayName: '',
    avatarUrl: null
  });

  // Check auth state on initialization
  if (browser) {
    checkAuthState();
  }

  async function checkAuthState() {
    if (!browser) return;

    const result = await gameServerAPI.getMe();

    if (result.success && result.data) {
      state.user = result.data.user;
      state.profile = result.data.profile;
      state.isAuthenticated = true;
      state.isAnonymous = (result.data as any).isAnonymous || false;
      state.displayName = result.data.profile.name;
      state.avatarUrl = (result.data.profile as any).avatar_url || null;
    }

    state.isLoading = false;
  }

  return {
    get state() {
      return state;
    },

    setDisplayName(name: string) {
      state.displayName = name;
    },

    async login(email: string, password: string) {
      const result = await gameServerAPI.login(email, password);

      if (result.success && result.data) {
        state.user = result.data.user;
        state.isAuthenticated = true;

        // Get full profile after login (sets displayName)
        await checkAuthState();
      }

      return result;
    },

    async register(name: string, email: string, password: string) {
      const result = await gameServerAPI.register(name, email, password);

      if (result.success && result.data) {
        state.user = result.data.user;
        state.isAuthenticated = true;

        // Get full profile after registration (sets displayName)
        await checkAuthState();
      }

      return result;
    },

    async signOut() {
      const result = await gameServerAPI.logout();

      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.isAnonymous = false;
      state.avatarUrl = null;

      return result;
    },

    async refreshAuth() {
      await checkAuthState();
    },

    async signInAnonymously() {
      if (!browser) return;

      const result = await gameServerAPI.signInAnonymous();

      if (result.success && result.data) {
        state.user = result.data.user;
        state.isAuthenticated = true;
        state.isAnonymous = true;

        // Get full profile after anonymous sign in
        await checkAuthState();
      }

      return result;
    },

    async upgradeAccount(name: string, email: string, password: string) {
      const result = await gameServerAPI.upgradeAccount(name, email, password);

      if (result.success && result.data) {
        state.user = result.data.user;
        state.isAnonymous = false;

        // Get updated profile
        await checkAuthState();
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