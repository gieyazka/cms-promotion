'use client';

import { useRef } from 'react';
import { Bold, Italic, Link2, Palette } from 'lucide-react';
import { TextColor } from '@/types/article';
import { TEXT_COLORS } from '@/lib/text-colors';

interface RichTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  /** Block-level text colour. Only rendered as a swatch row when `onColorChange` is provided. */
  color?: TextColor;
  onColorChange?: (color: TextColor) => void;
}

/** Wraps the current selection (or inserts a placeholder) with markdown-lite syntax. */
function wrapSelection(
  textarea: HTMLTextAreaElement | null,
  value: string,
  onChange: (value: string) => void,
  pre: string,
  post: string,
  fallback: string
) {
  if (!textarea) {
    onChange(value + pre + fallback + post);
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || fallback;
  const next = value.slice(0, start) + pre + selected + post + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + pre.length, start + pre.length + selected.length);
  });
}

export default function RichTextArea({ value, onChange, placeholder, rows = 3, color, onColorChange }: RichTextAreaProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const bold = () => wrapSelection(taRef.current, value, onChange, '**', '**', 'bold text');
  const italic = () => wrapSelection(taRef.current, value, onChange, '*', '*', 'italic text');
  const link = () => wrapSelection(taRef.current, value, onChange, '[', '](https://)', 'link text');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={bold}
          title="Bold"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          <Bold size={13} />
        </button>
        <button
          type="button"
          onClick={italic}
          title="Italic"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          <Italic size={13} />
        </button>
        <button
          type="button"
          onClick={link}
          title="Link"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          <Link2 size={13} />
        </button>
        {onColorChange && (
          <>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
            <span className="flex items-center gap-1 text-gray-400" title="สีตัวอักษร">
              <Palette size={13} />
            </span>
            {TEXT_COLORS.map((c) => {
              const selected = (color ?? 'default') === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onColorChange(c.value)}
                  title={c.label.en}
                  className={`w-5 h-5 rounded-md border transition-all ${
                    selected
                      ? 'border-blue-600 ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              );
            })}
          </>
        )}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y placeholder:text-gray-400"
      />
    </div>
  );
}
