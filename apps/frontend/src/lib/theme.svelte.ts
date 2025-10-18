import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

function createThemeStore() {

  let theme = $state<Theme>('light');
  
  // Initialize from localStorage
  if (browser) {
    const stored = localStorage.getItem('onlyone-theme') as Theme;
    if (stored) {
      theme = stored;
    }
    updateDocument(theme);
  }

  function updateDocument(newTheme: Theme) {
    if (!browser) return;

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return {
    get theme() {
      return theme;
    },

    get isDark() {
      return theme === 'dark';
    },

    toggle() {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      this.setTheme(newTheme);
    },

    setTheme(newTheme: Theme) {
      theme = newTheme;
      updateDocument(newTheme);

      if (browser) {
        localStorage.setItem('onlyone-theme', newTheme);
      }
    },

    setLight() {
      this.setTheme('light');
    },

    setDark() {
      this.setTheme('dark');
    }
  };
}

export const theme = createThemeStore();
export type { Theme };