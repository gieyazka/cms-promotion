import { adminSessionStore } from '@/lib/admin-auth';

/**
 * Stamps a write request with whoever is signed in, for the audit log (lib/audit-log.ts).
 * Client-side only — it reads the session out of localStorage.
 *
 * Signed out, the header is simply absent and the entry is filed as "unknown"; the request
 * still goes through, because nothing in this prototype is gated on being logged in.
 */
export function actorHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const session = adminSessionStore.getSnapshot();
  return session ? { 'x-actor': session.username } : {};
}

/** `actorHeaders()` merged with the JSON content type every write in this app sends. */
export function jsonWriteHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...actorHeaders() };
}
