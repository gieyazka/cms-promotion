'use client';

import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import {
  Bold, Italic, List, ListOrdered, Heading1, Heading2,
  Image as ImageIcon, Link as LinkIcon, Undo, Redo,
  AlignCenter, AlignLeft, AlignRight, Palette,
  Link2Off, Eraser, Upload, Globe, Smartphone, Eye
} from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

interface TiptapEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent) => void;
  isMobilePreview?: boolean;
}

const TiptapEditor = ({ content, onChange, isMobilePreview = false }: TiptapEditorProps) => {
  const { showToast } = useToast();
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'listItem'],
      }),
      TextStyle,
      Color,
    ],
    content: content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm md:prose-base dark:prose-invert px-4 py-3 focus:outline-none max-w-none min-h-[150px] dark:text-gray-100 [&_ol]:list-decimal [&_ul]:list-disc [&_li]:list-inside [&_li_p]:inline ${isMobilePreview ? 'max-w-[375px] mx-auto border-x border-dashed border-gray-200 dark:border-gray-800' : ''}`,
      },
    },
  });

  // Sync content when prop changes (essential for multi-language switching)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(content) !== JSON.stringify(currentContent)) {
        editor.commands.setContent(content || '', { emitUpdate: false });
      }
    }
  }, [content, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.url) {
          editor?.chain().focus().setImage({ src: data.url }).run();
          setIsImageModalOpen(false);
          showToast('Image uploaded successfully', 'success');
        }
      } catch (error) {
        showToast('Upload failed', 'error');
      }
    }
  };

  const insertImageUrl = () => {
    if (imageUrl) {
      editor?.chain().focus().setImage({ src: imageUrl }).run();
      setIsImageModalOpen(false);
      setImageUrl('');
    }
  };

  const insertLink = () => {
    if (linkUrl === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    } else if (editor?.state.selection.empty) {
      editor?.chain().focus().insertContent(`<a href="${linkUrl}">${linkUrl}</a> `).run();
    } else {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setIsLinkModalOpen(false);
    setLinkUrl('');
  };

  if (!editor) return null;

  return (
    <>
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="flex flex-wrap gap-2 p-2 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300 dark:border-gray-700">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}><Bold size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}><Italic size={16} /></button>
            <div className="relative group flex items-center">
              <input type="color" onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color || '#000000'} className="w-8 h-8 p-1 rounded cursor-pointer bg-transparent border-none" />
              <Palette size={14} className="absolute pointer-events-none right-0 bottom-0 text-gray-400" />
            </div>
            <button onClick={() => editor.chain().focus().unsetAllMarks().run()} className="p-1.5 rounded hover:bg-gray-200 text-gray-500"><Eraser size={16} /></button>
          </div>

          <div className="flex items-center gap-1 pr-2 border-r border-gray-300 dark:border-gray-700">
            <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : ''}`}><AlignLeft size={16} /></button>
            <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : ''}`}><AlignCenter size={16} /></button>
            <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : ''}`}><AlignRight size={16} /></button>
          </div>

          <div className="flex items-center gap-1 pr-2 border-r border-gray-300 dark:border-gray-700">
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : ''}`}><Heading1 size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : ''}`}><Heading2 size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : ''}`}><List size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700 text-blue-600' : ''}`}><ListOrdered size={16} /></button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setIsLinkModalOpen(true)} className={`p-1.5 rounded ${editor.isActive('link') ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}><LinkIcon size={16} /></button>
            <button onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} className="p-1.5 rounded disabled:opacity-20 text-red-500"><Link2Off size={16} /></button>
            <button onClick={() => setIsImageModalOpen(true)} className="p-1.5 rounded text-gray-700 dark:text-gray-300"><ImageIcon size={16} /></button>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
            <button onClick={() => editor.chain().focus().undo().run()} className="p-1.5 rounded hover:bg-gray-200"><Undo size={16} /></button>
            <button onClick={() => editor.chain().focus().redo().run()} className="p-1.5 rounded hover:bg-gray-200"><Redo size={16} /></button>
          </div>
        </div>
        <EditorContent editor={editor} />
      </div>

      {/* Link Modal */}
      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Insert Link">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button onClick={insertLink} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Apply Link</button>
        </div>
      </Modal>

      {/* Image Modal */}
      <Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} title="Insert Image">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Upload from Computer</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Upload className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to choose a file</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200 dark:border-gray-800"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-900 px-2 text-gray-500 font-bold">Or use URL</span></div>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="https://image-url.com/pic.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={insertImageUrl} className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-2 rounded-lg font-bold">Insert URL</button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TiptapEditor;
