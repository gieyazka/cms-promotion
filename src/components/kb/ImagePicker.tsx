'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Images, Loader2, Search, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

/**
 * The two ways to fill an image field: upload a new file, or pick one already in the MinIO
 * library. Both end at the same place — an upload goes into the same bucket the gallery lists,
 * so it appears in the grid immediately — and both hand back the object's public URL, which is
 * what gets stored on the article (see lib/minio.ts for why that URL and not a presigned one).
 *
 * The picker owns no image state: `value` is whatever the field currently holds, and every
 * choice is reported through `onChange`.
 */

type MediaItem = { name: string; url: string; size: number; lastModified: string | null };

export default function ImagePicker({
  value,
  onChange,
  gallery = 'knowledge-base',
  previewClassName = 'w-full max-h-48 object-cover',
}: {
  value: string;
  onChange: (url: string) => void;
  gallery?: 'knowledge-base' | 'promotion';
  previewClassName?: string;
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/media?gallery=${gallery}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error ?? 'upload failed');
      onChange(data.url);
      showToast('อัปโหลดรูปสำเร็จ', 'success');
    } catch (err) {
      showToast(`อัปโหลดไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setUploading(false);
      // Clearing lets the same file be chosen again after a failure.
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value && (
        <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className={previewClassName} />
          <button
            type="button"
            onClick={() => onChange('')}
            title="ลบรูป"
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-60 transition-colors"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดใหม่'}
        </button>
        <button
          type="button"
          onClick={() => setBrowsing(true)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Images size={16} />
          เลือกจากแกลเลอรี
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Remounted per open (no `key` needed — it is unmounted while closed), so the grid
          always refetches and a just-uploaded image is in the list. */}
      {browsing && (
        <GalleryModal
          gallery={gallery}
          onClose={() => setBrowsing(false)}
          onPick={(item) => {
            onChange(item.url);
            setBrowsing(false);
          }}
        />
      )}
    </div>
  );
}

function GalleryModal({
  gallery,
  onPick,
  onClose,
}: {
  gallery: string;
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/media?gallery=${gallery}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'load failed');
        return data.items as MediaItem[];
      })
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [gallery]);

  const close = useCallback(() => onClose(), [onClose]);

  const needle = query.trim().toLowerCase();
  const visible = items?.filter((item) => !needle || item.name.toLowerCase().includes(needle)) ?? [];

  return (
    <Modal isOpen onClose={close} title="เลือกรูปจากแกลเลอรี" size="xl">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อไฟล์..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
            โหลดแกลเลอรีไม่สำเร็จ: {error}
          </p>
        ) : !items ? (
          <div className="flex h-40 items-center justify-center text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <p className="flex h-40 items-center justify-center text-sm text-gray-500">
            {items.length === 0 ? 'ยังไม่มีรูปในแกลเลอรี' : 'ไม่พบรูปที่ค้นหา'}
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => onPick(item)}
                title={item.name}
                className="group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 text-left hover:border-blue-500 hover:ring-2 hover:ring-blue-500/30 transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.name} loading="lazy" className="h-28 w-full bg-gray-100 dark:bg-gray-800 object-cover" />
                <span className="block truncate px-2 py-1.5 text-[11px] text-gray-600 dark:text-gray-300">{item.name}</span>
              </button>
            ))}
          </div>
        )}

        {items && !error && (
          <p className="text-xs text-gray-500">
            {visible.length} / {items.length} รูป
          </p>
        )}
      </div>
    </Modal>
  );
}
