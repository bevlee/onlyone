import { browser } from '$app/environment';
import { gameServerAPI, type MeResponse } from '$lib/api/gameserver.js';
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

function createUserSession() {
  let state = $state<UserState>({
    user: null,
    profile: null,
    isAuthenticated: false,
    isAnonymous: false,
    isLoading: false,
    displayName: '',
    avatarUrl: null
  });

 

  return {
    get state() {
      return state;
    },

     // Helper to update state from user data
    updateFromUserData(userData: MeResponse | null) {
      // Guard: only update if data actually changed
      const newUserId = userData?.user?.id;
      const currentUserId = state.user?.id;

      if (newUserId === currentUserId && userData && state.user) {
        // Same user, don't update to prevent unnecessary reactivity
        return;
      }
      console.log('Updating user session state from user data:', userData);

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
    },

    setDisplayName(name: string) {
      state.displayName = name;
    },

    async login(email: string, password: string) {
      const result = await gameServerAPI.login(email, password);

      if (result.success) {
        // Fetch full user data including profile
        const meResult = await gameServerAPI.getMe();

        if (meResult.success && meResult.data && meResult.data.user) {
          // Only update session if we got valid user data
          this.updateFromUserData(meResult.data);

          if (browser) {
            // Navigate to lobby
            await goto('/lobby');
          }
        } else {
          // Failed to get user data after login - don't log them in
          console.error('[UserSession] Failed to fetch user data after login');
          return {
            success: false,
            error: 'Failed to verify login. Please try again.',
          };
        }
      }

      return result;
    },

    async register(name: string, email: string, password: string) {
      const result = await gameServerAPI.register(name, email, password);

      if (result.success) {
        // Fetch full user data including profile
        const meResult = await gameServerAPI.getMe();

        if (meResult.success && meResult.data && meResult.data.user) {
          // Only update session if we got valid user data
          this.updateFromUserData(meResult.data);

          if (browser) {
            // Navigate to lobby
            await goto('/lobby');
          }
        } else {
          // Failed to get user data after registration - don't log them in
          console.error('[UserSession] Failed to fetch user data after registration');
          return {
            success: false,
            error: 'Failed to verify registration. Please try again.',
          };
        }
      }

      return result;
    },

    async signOut() {
      const result = await gameServerAPI.logout();

      // Clear user session state
      this.updateFromUserData(null);

      if (browser) {
        // Navigate to home
        await goto('/');
      }

      return result;
    },

    async signInAnonymously() {
      if (!browser) return;

      const result = await gameServerAPI.signInAnonymous();

      if (result.success) {
        // Fetch full user data including profile
        const meResult = await gameServerAPI.getMe();

        if (meResult.success && meResult.data && meResult.data.user) {
          // Only update session if we got valid user data
          this.updateFromUserData(meResult.data);

          // Navigate to lobby
          await goto('/lobby');
        } else {
          // Failed to get user data after anonymous sign-in - don't log them in
          console.error('[UserSession] Failed to fetch user data after anonymous sign-in');
          return {
            success: false,
            error: 'Failed to verify anonymous sign-in. Please try again.',
          };
        }
      }

      return result;
    },

    async upgradeAccount(name: string, email: string, password: string) {
      const result = await gameServerAPI.upgradeAccount(name, email, password);

      if (result.success) {
        // Fetch full user data including profile
        const meResult = await gameServerAPI.getMe();

        if (meResult.success && meResult.data && meResult.data.user) {
          // Only update session if we got valid user data
          this.updateFromUserData(meResult.data);

          if (browser) {
            // Navigate to lobby
            await goto('/lobby');
          }
        } else {
          // Failed to get user data after account upgrade - don't update session
          console.error('[UserSession] Failed to fetch user data after account upgrade');
          return {
            success: false,
            error: 'Failed to verify account upgrade. Please try again.',
          };
        }
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

export const userSession = createUserSession();