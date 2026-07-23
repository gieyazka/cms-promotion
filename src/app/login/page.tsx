'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { adminSessionStore, login, logout, type AdminLang } from '@/lib/admin-auth';
import { KB_API_BASE } from '@/lib/kb-api';
import { useToast } from '@/components/ui/Toast';

// Prototype convenience: the form opens pre-filled with the shared test account so the flow
// can be exercised in one click. The fields are ordinary inputs — type over them for any
// other account. Delete these two constants (and the initial state below) before this is
// pointed at anything but the dev backend.
const TEST_USERNAME = 'admin.earnex.gie';
const TEST_PASSWORD = '12345678';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const session = useSyncExternalStore(
    adminSessionStore.subscribe,
    adminSessionStore.getSnapshot,
    adminSessionStore.getServerSnapshot,
  );

  const [username, setUsername] = useState(TEST_USERNAME);
  const [password, setPassword] = useState(TEST_PASSWORD);
  const [lang, setLang] = useState<AdminLang>('th');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password, lang);
      showToast('เข้าสู่ระบบสำเร็จ', 'success');
      router.push('/knowledge-base');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">เข้าสู่ระบบผู้ดูแล</h1>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-all">{KB_API_BASE}/admin/login</p>

        {session && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm text-green-800 dark:text-green-300">
            <span className="truncate">เข้าสู่ระบบอยู่: {session.username}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                showToast('ออกจากระบบแล้ว', 'info');
              }}
              className="flex flex-none items-center gap-1 text-xs font-medium hover:underline"
            >
              <LogOut size={14} /> ออกจากระบบ
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อผู้ใช้</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">รหัสผ่าน</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ภาษา</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as AdminLang)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="th">ภาษาไทย</option>
              <option value="en">English</option>
            </select>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
