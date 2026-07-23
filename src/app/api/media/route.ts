import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_GALLERY, isMediaGallery, listImages, uploadImage } from '@/lib/minio';

/**
 * The image library backing the "choose from gallery" picker: GET lists what is already in
 * MinIO, POST puts a new file there. Uploads land in the same bucket the gallery reads, so a
 * freshly uploaded image is immediately pickable — and is served by the same public URL the
 * live site uses.
 *
 * `/api/upload` (local disk, `public/uploads`) is still what the promotions module uses; it is
 * untouched.
 */

function gallery(req: NextRequest) {
  const value = req.nextUrl.searchParams.get('gallery');
  return isMediaGallery(value) ? value : DEFAULT_GALLERY;
}

function failure(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  console.error(fallback, error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ items: await listImages(gallery(req)) });
  } catch (error) {
    return failure(error, 'Failed to list gallery images');
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const item = await uploadImage(gallery(req), file.name, buffer, file.type);
    return NextResponse.json(item);
  } catch (error) {
    return failure(error, 'Failed to upload image');
  }
}
