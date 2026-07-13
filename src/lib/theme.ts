export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'cms-theme';

function applyDark(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
}

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * The theme preference lives in localStorage, which the server cannot see. Reading it
 * during render would make the server and client produce different trees, which React 19
 * treats as a hydration error. useSyncExternalStore renders the server snapshot ('system')
 * through hydration and then swaps to the stored value — matching the pattern used for
 * `sidebar-collapsed` in Sidebar.tsx and `KB_PREVIEW_COLLAPSED_KEY` in ArticleEditor.tsx.
 */
export const themeStore = {
  listeners: new Set<() => void>(),
  mediaQuery: null as MediaQueryList | null,

  subscribe(listener: () => void) {
    themeStore.listeners.add(listener);

    // While 'system' is active, an OS-level scheme change must also flip the applied
    // class and notify subscribers, even though the stored theme value itself hasn't
    // changed. Track the media query listener alongside the store listener so it stays
    // in sync with whichever subscriber caused it to be needed, and clean up with it.
    if (!themeStore.mediaQuery) {
      themeStore.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      themeStore.mediaQuery.addEventListener('change', themeStore.handleMediaChange);
    }

    return () => {
      themeStore.listeners.delete(listener);
      if (themeStore.listeners.size === 0 && themeStore.mediaQuery) {
        themeStore.mediaQuery.removeEventListener('change', themeStore.handleMediaChange);
        themeStore.mediaQuery = null;
      }
    };
  },

  handleMediaChange() {
    if (themeStore.getSnapshot() === 'system') {
      applyDark(resolveIsDark('system'));
      themeStore.listeners.forEach((listener) => listener());
    }
  },

  getSnapshot(): Theme {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  },

  getServerSnapshot(): Theme {
    return 'system';
  },

  setTheme(theme: Theme) {
    window.localStorage.setItem(THEME_KEY, theme);
    applyDark(resolveIsDark(theme));
    themeStore.listeners.forEach((listener) => listener());
  },
};

export const setTheme = themeStore.setTheme;
