'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** 'md' (default) is the confirm-dialog width; 'xl' is for grids and other browsing UI. */
  size?: 'md' | 'xl';
  children: React.ReactNode;
}

const SIZES = { md: 'max-w-md', xl: 'max-w-4xl' } as const;

export function Modal({ isOpen, onClose, title, size = 'md', children }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full ${SIZES[size]} overflow-hidden animate-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-bold dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
