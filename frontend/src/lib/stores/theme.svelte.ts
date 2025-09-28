import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
  let theme = $state<Theme>('light');

  // Initialize theme from localStorage or system preference
  if (browser) {
    const stored = localStorage.getItem('onlyone-theme') as Theme;
    if (stored) {
      theme = stored;
    } else {
      // Check system preference
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Apply initial theme
    updateDocument(theme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('onlyone-theme')) {
        theme = e.matches ? 'dark' : 'light';
        updateDocument(theme);
      }
    });
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

export const themeStore = createThemeStore();
export type { Theme };