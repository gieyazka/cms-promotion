import { KB_API_BASE } from '@/lib/kb-api';

/**
 * Admin sign-in against `POST {KB_API_BASE}/admin/login`.
 *
 * The backend only *verifies* the credentials — it answers `{ status: 'ok' }` and hands back
 * NO token and NO cookie. So there is nothing to attach to later requests: this session is a
 * local record of "someone signed in", not an authorization credential. `kb-api.ts` still
 * sends whatever is in `NEXT_PUBLIC_KB_API_TOKEN` (currently nothing, and the KB endpoints do
 * not enforce auth yet). When the backend starts returning a JWT, put it in the session here
 * and read it from `kb-api.ts` — that is the only place that has to change.
 *
 * Failure comes back as HTTP 500 with `{"detail":"401: Invalid username or password"}`, not a
 * 401, so the status code alone cannot be trusted; `login()` reads `detail` for the message.
 */

const SESSION_KEY = 'kb-admin-session';

export type AdminLang = 'th' | 'en';

export type AdminSession = {
  username: string;
  lang: AdminLang;
  /** ISO timestamp of the successful sign-in. */
  at: string;
};

/**
 * localStorage is invisible to the server, so the session is read through
 * useSyncExternalStore (same reason as the sidebar's collapsed flag — see Sidebar.tsx).
 * getSnapshot must be referentially stable between renders, hence the parse cache: parsing
 * the JSON on every call would hand React a new object each time and loop forever.
 */
let cachedRaw: string | null = null;
let cachedSession: AdminSession | null = null;

export const adminSessionStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    adminSessionStore.listeners.add(listener);
    // Another tab signing in or out writes the same key; `storage` fires only in the others.
    window.addEventListener('storage', listener);
    return () => {
      adminSessionStore.listeners.delete(listener);
      window.removeEventListener('storage', listener);
    };
  },
  getSnapshot(): AdminSession | null {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cachedSession = raw ? (JSON.parse(raw) as AdminSession) : null;
      } catch {
        cachedSession = null;
      }
    }
    return cachedSession;
  },
  getServerSnapshot(): AdminSession | null {
    return null;
  },
  set(session: AdminSession | null) {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
    adminSessionStore.listeners.forEach((listener) => listener());
  },
};

/** Signs in and records the session. Throws with the backend's message when it is rejected. */
export async function login(username: string, password: string, lang: AdminLang): Promise<AdminSession> {
  let res: Response;
  try {
    res = await fetch(`${KB_API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, lang }),
    });
  } catch {
    throw new Error(`ติดต่อเซิร์ฟเวอร์ไม่ได้ (${KB_API_BASE})`);
  }
  const body: unknown = await res.json().catch(() => null);
  const detail =
    body && typeof body === 'object' && typeof (body as { detail?: unknown }).detail === 'string'
      ? (body as { detail: string }).detail
      : null;
  const ok =
    res.ok && !!body && typeof body === 'object' && (body as { status?: unknown }).status === 'ok';
  if (!ok) throw new Error(detail ?? `เข้าสู่ระบบไม่สำเร็จ (${res.status})`);

  const session: AdminSession = { username, lang, at: new Date().toISOString() };
  adminSessionStore.set(session);
  return session;
}

export function logout() {
  adminSessionStore.set(null);
}
