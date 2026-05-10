'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import TiptapEditor from '@/components/TiptapEditor';
import { 
  Save, ArrowLeft, Plus, Trash2, GripVertical, Star, Link as LinkIcon, 
  Info, MousePointer2, Calendar, ArrowRight, ChevronUp, ChevronDown, Edit, X, Trash, Layout, Languages, Eye, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Promotion, PromotionSection, SectionType, DateConfig, DateConfigType } from '@/types/promotion';
import { useToast } from '@/components/ui/Toast';

export default function PromotionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lang, setLang] = useState<'th' | 'en'>('th');

  // Edit State
  const [editTitleTh, setEditTitleTh] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editDateConfig, setEditDateConfig] = useState<DateConfig | undefined>(undefined);
  const [editSections, setEditSections] = useState<PromotionSection[]>([]);

  useEffect(() => {
    fetch(`/api/promotions/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPromotion(data);
        setEditTitleTh(data.title_th);
        setEditTitleEn(data.title_en);
        setEditDateConfig(data.dateConfig);
        setEditSections(data.sections || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching promotion:', err);
        setIsLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (!editTitleTh || !editTitleEn) {
      showToast('Please enter title in both languages', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/promotions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_th: editTitleTh,
          title_en: editTitleEn,
          dateConfig: editDateConfig,
          sections: editSections,
          status: promotion?.status || 'draft',
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setPromotion(updated);
        setIsEditing(false);
        showToast('Changes saved successfully', 'success');
      } else {
        showToast('Failed to save changes', 'error');
      }
    } catch (error) {
      showToast('Error saving promotion', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const response = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/promotions');
        showToast('Promotion deleted', 'info');
      } else {
        showToast('Failed to delete', 'error');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const addSection = (type: SectionType = 'standard') => {
    setEditSections([
      ...editSections,
      { 
        id: Date.now().toString(), 
        type, 
        th: { title: '', content: null, ctaLabel: 'ปุ่มกด' },
        en: { title: '', content: null, ctaLabel: 'Button' },
        ctaLink: 'https://'
      }
    ]);
  };

  const removeSection = (sid: string) => {
    if (editSections.length === 1) return;
    setEditSections(editSections.filter(s => s.id !== sid));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...editSections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editSections.length) return;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setEditSections(newSections);
  };

  const updateSection = (sid: string, updates: any) => {
    setEditSections(editSections.map(s => {
      if (s.id !== sid) return s;
      if (updates.th || updates.en) return { ...s, ...updates };
      const currentLangData = s[lang];
      return { ...s, [lang]: { ...currentLangData, ...updates } };
    }));
  };

  const updateSharedSectionField = (sid: string, updates: Partial<PromotionSection>) => {
    setEditSections(editSections.map(s => s.id === sid ? { ...s, ...updates } : s));
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!promotion) return <div className="p-8 text-center text-red-500">Not found</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/promotions" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold dark:text-white">
              {isEditing ? 'Editing Multilingual' : (lang === 'th' ? promotion.title_th : promotion.title_en)}
            </h1>
            {!isEditing && (
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs font-bold text-gray-400 uppercase">Viewing: {lang.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Global Language Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mr-2">
            <button 
              onClick={() => setLang('th')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${lang === 'th' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              TH
            </button>
            <button 
              onClick={() => setLang('en')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${lang === 'en' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              EN
            </button>
          </div>

          {!isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold"
              >
                <Edit size={18} />
                <span>Edit All</span>
              </button>
              <button 
                onClick={handleDelete}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <Trash size={20} />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl hover:bg-gray-300 font-bold transition-all"
              >
                <X size={18} />
                <span>Cancel</span>
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 font-bold transition-all shadow-lg shadow-green-500/20 disabled:bg-green-300"
              >
                <Save size={18} />
                <span>{isSaving ? 'Saving...' : 'Save All'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {isEditing ? (
          /* EDIT MODE UI */
          <>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center space-x-2 mb-4 text-blue-500">
                <Languages size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Main Content ({lang.toUpperCase()})</span>
              </div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-tighter">Promotion Title</label>
              <input
                type="text"
                value={lang === 'th' ? editTitleTh : editTitleEn}
                onChange={(e) => lang === 'th' ? setEditTitleTh(e.target.value) : setEditTitleEn(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xl font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-6">
              {editSections.map((section, index) => (
                <div key={section.id} className={`bg-white dark:bg-gray-900 rounded-3xl border-2 p-1 ${
                  section.type === 'special' ? 'border-amber-200' : 
                  section.type === 'highlight_summary' ? 'border-blue-200' : 'border-gray-100 dark:border-gray-800'
                }`}>
                  <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-[22px]">
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-col">
                        <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="disabled:opacity-20"><ChevronUp size={16} /></button>
                        <button onClick={() => moveSection(index, 'down')} disabled={index === editSections.length - 1} className="disabled:opacity-20"><ChevronDown size={16} /></button>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{section.type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select 
                        value={section.type}
                        onChange={(e) => updateSharedSectionField(section.id, { type: e.target.value as SectionType })}
                        className="text-[10px] bg-transparent font-bold text-gray-400 uppercase outline-none"
                      >
                        <option value="standard">Standard</option>
                        <option value="special">Special</option>
                        <option value="highlight_summary">Summary</option>
                      </select>
                      <button onClick={() => removeSection(section.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <div className="p-8 space-y-4">
                    <input
                      type="text"
                      value={section[lang].title || ''}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder="Section title..."
                      className="w-full bg-transparent border-none text-xl font-bold outline-none dark:text-white"
                    />
                    <TiptapEditor 
                      key={`${section.id}-${lang}`}
                      content={section[lang].content} 
                      onChange={(c) => updateSection(section.id, { content: c })} 
                    />
                    
                    <div className="pt-6 border-t border-gray-50 dark:border-gray-800 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Button Text ({lang.toUpperCase()})</label>
                          <input 
                            value={section[lang].ctaLabel || ''} 
                            onChange={(e) => updateSection(section.id, { ctaLabel: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Link (Shared)</label>
                          <input 
                            value={section.ctaLink || ''} 
                            onChange={(e) => updateSharedSectionField(section.id, { ctaLink: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button onClick={() => addSection('standard')} className="w-full py-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl text-gray-300 font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">+ Add New Section</button>
          </>
        ) : (
          /* VIEW MODE UI */
          <>
            <div className="flex flex-wrap items-center gap-4">
              {promotion.dateConfig && (
                <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl font-bold border border-blue-100 dark:border-blue-800 text-sm">
                  <Calendar size={16} className="mr-2" />
                  {promotion.dateConfig.type === 'range' ? `${promotion.dateConfig.startDate} - ${promotion.dateConfig.endDate}` : 
                   promotion.dateConfig.type === 'onwards' ? `${promotion.dateConfig.startDate} Onwards` : 
                   promotion.dateConfig.startDate}
                </div>
              )}
            </div>

            <div className="space-y-10">
              {promotion.sections?.map((section) => (
                <div key={section.id} className={`overflow-hidden rounded-3xl border p-8 ${
                  section.type === 'special' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200' :
                  section.type === 'highlight_summary' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200' :
                  'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm'
                }`}>
                  {section[lang].title && (
                    <div className="flex items-center space-x-2 mb-6">
                      {section.type === 'highlight_summary' && <Info size={20} className="text-blue-500" />}
                      <h2 className="text-2xl font-black dark:text-white">{section[lang].title}</h2>
                    </div>
                  )}
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    <TiptapEditor 
                      key={`${section.id}-${lang}-view`}
                      content={section[lang].content} 
                      onChange={() => {}} 
                    />
                  </div>
                  {section[lang].ctaLabel && (
                    <div className="mt-8 flex justify-center">
                      <a 
                        href={section.ctaLink} 
                        target="_blank" 
                        className={`inline-flex items-center space-x-3 px-10 py-3 rounded-full text-lg font-black transition-all shadow-lg hover:-translate-y-1 ${
                          section.type === 'special' ? 'bg-amber-600 text-white shadow-amber-500/20' :
                          section.type === 'highlight_summary' ? 'bg-blue-600 text-white shadow-blue-500/20' :
                          'bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white'
                        }`}
                      >
                        <span>{section[lang].ctaLabel}</span>
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* JSON Preview Section */}
        <div className="mt-16 border-t border-gray-100 dark:border-gray-800 pt-10">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-2">
                <Layout size={18} className="text-gray-500" />
                <span className="font-bold text-gray-700 dark:text-gray-300">Data JSON Preview (Multilingual)</span>
              </div>
              <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest group-open:hidden">View JSON</div>
              <div className="text-[10px] text-red-500 font-black uppercase tracking-widest hidden group-open:block">Hide JSON</div>
            </summary>
            <div className="mt-4 p-6 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
              <pre className="text-[10px] text-emerald-400 font-mono overflow-auto max-h-[600px] leading-relaxed">
                {JSON.stringify(isEditing ? {
                  title_th: editTitleTh,
                  title_en: editTitleEn,
                  dateConfig: editDateConfig,
                  sections: editSections,
                } : promotion, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
