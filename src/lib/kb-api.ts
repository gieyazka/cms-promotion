import { Article } from '@/types/article';
import { toApiPayload } from '@/lib/article-api-format';

/**
 * Client for the Earnex Knowledge Base backend (FastAPI, OpenAPI at `{base}/openapi.json`).
 *
 * Called straight from the browser — the server allows CORS for the dev origin, so there is
 * no Next.js proxy in between. That also means the bearer token, once there is one, lives in
 * `NEXT_PUBLIC_KB_API_TOKEN` and is visible to anyone with devtools. Fine for the prototype;
 * move the call behind a route handler before this goes anywhere real.
 *
 * Two write endpoints, and `syncKnowledgeBase()` picks between them:
 *   - `POST  /knowledge_base/create`             — first push, mints the uuid
 *   - `PATCH /knowledge_base/update/{id}`        — every push after that
 * The uuid is remembered as `article.backendId`, so an article has ONE backend record for its
 * whole life. An article synced before the update endpoint existed may have `syncedAt` but no
 * `backendId` (the create response did not always expose one); there is nothing to address a
 * PATCH at, so it creates once more and captures the id from that response.
 *
 * Only the editor's Save button calls this — the blur autosave and the tab-close flush stay
 * local on purpose, so a push is always a deliberate press.
 */

export const KB_API_BASE =
  process.env.NEXT_PUBLIC_KB_API_BASE ?? 'http://61.47.10.155:8012';

const KB_API_TOKEN = process.env.NEXT_PUBLIC_KB_API_TOKEN ?? '';

/**
 * Digs the created record's uuid out of the create response. The endpoint declares its
 * response as an empty schema, so the shape is not guaranteed — this checks the handful of
 * keys such an API plausibly uses and gives up rather than guessing. A miss is not an error —
 * the push succeeded — but it costs the article its handle: with no `backendId` the next Save
 * has nothing to PATCH and creates a second record.
 */
function extractBackendId(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const scopes = [body, (body as { data?: unknown }).data];
  for (const scope of scopes) {
    if (!scope || typeof scope !== 'object') continue;
    const record = scope as Record<string, unknown>;
    for (const key of ['id', 'knowledge_base_id', 'knowledgeBaseId']) {
      const value = record[key];
      if (typeof value === 'string' && value) return value;
    }
  }
  return undefined;
}

/**
 * `seo_path` → backend uuid, read from `GET /knowledge_base/list`. The fallback for a local
 * article that has no `backendId`: it may still HAVE a backend record — pushed before the id was
 * captured, or created by someone else — and `seo_path` is the only key both sides share, because
 * `toApiPayload` sends `article.seo_path || article.id` and the list returns it back.
 *
 * The endpoint caps `limit` at 100, so this pages until it has seen `total` records rather than
 * trusting one call to cover the whole table.
 */
async function backendIdsBySeoPath(): Promise<Map<string, string>> {
  const LIMIT = 100;
  const bySeoPath = new Map<string, string>();
  for (let offset = 0, total = Infinity; offset < total; offset += LIMIT) {
    const res = await fetch(
      `${KB_API_BASE}/knowledge_base/list?locale=th&limit=${LIMIT}&offset=${offset}`,
      { headers: KB_API_TOKEN ? { Authorization: `Bearer ${KB_API_TOKEN}` } : {} },
    );
    if (!res.ok) throw new Error(`could not list backend articles (${res.status})`);
    const body = (await res.json()) as { total?: number; items?: { id?: string; seo_path?: string }[] };
    const items = body.items ?? [];
    for (const it of items) if (it.seo_path && it.id) bySeoPath.set(it.seo_path, it.id);
    // A short page means the end of the table whatever `total` claims — without this, a `total`
    // that never shrinks (or is missing) would loop forever.
    if (items.length < LIMIT) break;
    total = body.total ?? offset + items.length;
  }
  return bySeoPath;
}

/**
 * Local article id → backend uuid, for the `related` block: the picker stores the ids from
 * `data/articles.json`, but the backend only knows its own records. Skips every round trip when
 * no `related` block names anyone.
 *
 * Two sources, cheapest first: `backendId` on the article being pointed AT (already known, no
 * network), and only for the ones still missing, a lookup by `seo_path` against
 * `/knowledge_base/list`. An id that neither source resolves has no record on the backend at all
 * and is dropped from the payload by `toApiPayload` — a link cannot point at a row that does not
 * exist. The resolved uuid is used for this push only; it is not written back to
 * `data/articles.json`, so an article that needs the fallback needs it again next time.
 *
 * Browser-only, like the rest of the push path: the relative `/api/articles` URL has no
 * server-side meaning.
 */
async function relatedBackendIds(article: Article): Promise<Map<string, string> | undefined> {
  const wanted = new Set(article.blocks.flatMap((b) => (b.type === 'related' ? b.ids : [])));
  if (wanted.size === 0) return undefined;

  const res = await fetch('/api/articles');
  if (!res.ok) throw new Error(`could not resolve related article ids (${res.status})`);
  const list: Article[] = await res.json();

  const byLocalId = new Map<string, string>();
  const missing: Article[] = [];
  for (const a of list) {
    if (!wanted.has(a.id)) continue;
    if (a.backendId) byLocalId.set(a.id, a.backendId);
    else missing.push(a);
  }

  if (missing.length > 0) {
    const bySeoPath = await backendIdsBySeoPath();
    for (const a of missing) {
      const found = bySeoPath.get(a.seo_path || a.id);
      if (found) byLocalId.set(a.id, found);
    }
  }
  return byLocalId;
}

/**
 * Sends the article payload and returns the parsed body. Throws on a network failure or a
 * non-2xx, with the status + body in the message so the caller can surface a 401/422 rather
 * than a generic "failed".
 */
async function send(path: string, method: 'POST' | 'PATCH', article: Article): Promise<unknown> {
  const payload = toApiPayload(article, await relatedBackendIds(article));
  const res = await fetch(`${KB_API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(KB_API_TOKEN ? { Authorization: `Bearer ${KB_API_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ''}`);
  }
  return res.json().catch(() => null);
}

/** POSTs the article in `KnowledgeBaseCreateInput` shape, creating a new backend record. */
export async function createKnowledgeBase(
  article: Article,
): Promise<{ backendId?: string; raw: unknown }> {
  const raw = await send('/knowledge_base/create', 'POST', article);
  return { backendId: extractBackendId(raw), raw };
}

/**
 * PATCHes an existing backend record. `KnowledgeBaseUpdateInput` makes every field optional,
 * but this sends the whole payload anyway: the editor has no concept of a partial save, and a
 * full body means a block deleted locally actually disappears server-side instead of lingering.
 *
 * `blocks` is replaced wholesale — `sort_order` comes from the array index in `toApiPayload`,
 * so a reorder is expressed by the new order of the list, not by patching individual blocks.
 */
export async function updateKnowledgeBase(
  backendId: string,
  article: Article,
): Promise<{ raw: unknown }> {
  const raw = await send(
    `/knowledge_base/update/${encodeURIComponent(backendId)}`,
    'PATCH',
    article,
  );
  return { raw };
}

/**
 * The status a permanently-deleted article is filed under on the backend. It is the CMS's own
 * status vocabulary — the same strings `toApiPayload` already sends as `status` on every
 * create/update — so this introduces no new contract. One knob: change it here if the backend
 * ever expects a different word for "not served any more".
 */
const DELETED_STATUS = 'trash';

/**
 * Takes a backend record out of circulation. There is no DELETE endpoint —
 * `PATCH /knowledge_base/status` is the only way to stop a record being served, so a
 * permanent delete in the CMS deactivates rather than removes.
 *
 * Called from the DELETE route handler (server side), not the browser, so the local store and
 * the backend can be changed together or not at all. Throws on a non-2xx, same as `send`.
 */
export async function deactivateKnowledgeBase(backendId: string): Promise<void> {
  const query = new URLSearchParams({ knowledge_base_id: backendId, status: DELETED_STATUS });
  const res = await fetch(`${KB_API_BASE}/knowledge_base/status?${query}`, {
    method: 'PATCH',
    headers: KB_API_TOKEN ? { Authorization: `Bearer ${KB_API_TOKEN}` } : {},
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ''}`);
  }
}

/**
 * The one entry point the editor should call: updates the article's backend record if it has
 * one, otherwise creates it. `created` tells the caller which happened, so the UI can say
 * "sent" versus "updated" without duplicating the branch.
 */
export async function syncKnowledgeBase(
  article: Article,
): Promise<{ backendId?: string; created: boolean; raw: unknown }> {
  if (article.backendId) {
    const { raw } = await updateKnowledgeBase(article.backendId, article);
    return { backendId: article.backendId, created: false, raw };
  }
  const { backendId, raw } = await createKnowledgeBase(article);
  return { backendId, created: true, raw };
}
