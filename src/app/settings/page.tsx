'use client';

import { createElement, useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { Theme, themeStore } from '@/lib/theme';

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const theme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-1 dark:text-white">Settings</h1>
      <p className="text-gray-500 mb-8">Preferences for this CMS</p>

      <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-bold mb-1 dark:text-white">Appearance</h2>
        <p className="text-sm text-gray-500 mb-4">Choose how the CMS looks on this device.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, label, icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => themeStore.setTheme(value)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                  active
                    ? 'border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-gray-800/50'
                }`}
              >
                {createElement(icon, { size: 22 })}
                <span className="text-sm font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
