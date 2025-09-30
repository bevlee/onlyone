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
  // Authenticated user info
  user: AuthUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  displayName: string;
}

function createUserStore() {
  let state = $state<UserState>({
    user: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
    displayName: ''
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
      state.displayName = result.data.profile.name;
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

      return result;
    },

    async refreshAuth() {
      await checkAuthState();
    },

    generateGuestName() {
      const guestName = generateGuestId();
      this.setDisplayName(guestName);
    }
  };
}

export const userStore = createUserStore();