'use client';

import { createElement, useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ICON_NAMES, getIcon } from '@/lib/icons';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = ICON_NAMES.filter((name) => name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Choose icon"
        className="w-11 h-11 flex-none rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
      >
        {createElement(getIcon(value), { size: 20 })}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Choose an icon">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-6 gap-2 max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="col-span-6 text-center text-sm text-gray-400 py-6">No icons found</div>
            ) : (
              filtered.map((name) => {
                const ItemIcon = getIcon(name);
                const active = name === value;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border p-1 transition-colors ${
                      active
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                        : 'border-gray-100 dark:border-gray-800 text-gray-500 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <ItemIcon size={20} />
                    <span className="text-[8px] leading-none truncate max-w-full">{name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
