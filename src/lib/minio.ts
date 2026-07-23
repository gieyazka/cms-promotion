import * as Minio from 'minio';
import { KB_API_BASE } from '@/lib/kb-api';

/**
 * Server-side access to the Earnex MinIO instance — the image library the CMS picks from and
 * uploads into. Import this from route handlers only: it holds the admin credentials.
 *
 * Reading an object does NOT go through this client. Every gallery has a matching endpoint on
 * the Earnex API (`/knowledge_base/image/{name}`, `/promotion/image/{name}`) that streams the
 * object straight out of the bucket, and that is the URL stored on an article — a stable,
 * credential-free address the public site can serve too. Presigned URLs would expire, and
 * proxying through Next would tie the published article to this CMS being up.
 *
 * That endpoint addresses objects by BASENAME while the bucket stores them under `images/`,
 * so the prefix is stripped on the way out and re-applied on the way in. Verified against the
 * live server: `images/7-gold-facts-trading.png` in the bucket is served as
 * `/knowledge_base/image/7-gold-facts-trading.png` (the prefixed form 404s).
 */

export type MediaGallery = 'knowledge-base' | 'promotion';

const GALLERIES: Record<MediaGallery, { bucket: string; prefix: string; publicPath: string }> = {
  'knowledge-base': { bucket: 'knowledge-base', prefix: 'images/', publicPath: 'knowledge_base/image' },
  promotion: { bucket: 'promotion', prefix: 'images/', publicPath: 'promotion/image' },
};

export const DEFAULT_GALLERY: MediaGallery = 'knowledge-base';

export function isMediaGallery(value: string | null | undefined): value is MediaGallery {
  return !!value && value in GALLERIES;
}

export type MediaItem = {
  /** Object name without the bucket prefix — what the public URL is built from. */
  name: string;
  url: string;
  size: number;
  lastModified: string | null;
};

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

let client: Minio.Client | null = null;

/**
 * Built lazily so that merely importing this module (as a route handler's dependency graph
 * does at build time) cannot fail on a missing credential — only actually using the gallery
 * does, and then with a message that says which variable is absent.
 */
function getClient(): Minio.Client {
  if (client) return client;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error('MINIO_ACCESS_KEY / MINIO_SECRET_KEY are not set (see .env.local)');
  }
  client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT ?? '61.47.10.156',
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey,
    secretKey,
  });
  return client;
}

/** The public, credential-free URL for an object — this is what gets stored on an article. */
export function publicUrl(gallery: MediaGallery, name: string): string {
  return `${KB_API_BASE}/${GALLERIES[gallery].publicPath}/${encodeURIComponent(name)}`;
}

/** Every image in the gallery, newest first. */
export async function listImages(gallery: MediaGallery): Promise<MediaItem[]> {
  const { bucket, prefix } = GALLERIES[gallery];
  const stream = getClient().listObjectsV2(bucket, prefix, true);
  const items: MediaItem[] = [];

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (obj) => {
      // A "directory" entry has no name/size; a non-image is not for this picker.
      if (!obj.name || !IMAGE_EXTENSIONS.test(obj.name)) return;
      const name = obj.name.slice(prefix.length);
      if (!name) return;
      items.push({
        name,
        url: publicUrl(gallery, name),
        size: obj.size ?? 0,
        lastModified: obj.lastModified ? new Date(obj.lastModified).toISOString() : null,
      });
    });
    stream.on('end', () => resolve());
    stream.on('error', reject);
  });

  // No lastModified sorts last rather than first — an unknown date is not a new upload.
  return items.sort((a, b) => (b.lastModified ?? '').localeCompare(a.lastModified ?? ''));
}

/**
 * Stores a new image and returns it exactly as `listImages` would describe it. The timestamp
 * prefix keeps names unique: the public endpoint addresses objects by basename, so two files
 * called `banner.png` would otherwise be the same image.
 */
export async function uploadImage(
  gallery: MediaGallery,
  originalName: string,
  buffer: Buffer,
  contentType: string,
): Promise<MediaItem> {
  const { bucket, prefix } = GALLERIES[gallery];
  const safeName = originalName.replace(/[^\w.-]+/g, '-').replace(/^-+/, '') || 'image';
  const name = `${Date.now()}-${safeName}`;
  await getClient().putObject(bucket, `${prefix}${name}`, buffer, buffer.length, {
    'Content-Type': contentType || 'application/octet-stream',
  });
  return { name, url: publicUrl(gallery, name), size: buffer.length, lastModified: new Date().toISOString() };
}
