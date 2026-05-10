'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TiptapEditor from '@/components/TiptapEditor';
import { 
  Save, ArrowLeft, Plus, Trash2, GripVertical, Star, Link as LinkIcon, 
  Info, MousePointer2, Calendar, ArrowRight, ChevronUp, ChevronDown, Layout, Languages
} from 'lucide-react';
import Link from 'next/link';
import { PromotionSection, SectionType, DateConfig, DateConfigType } from '@/types/promotion';
import { useToast } from '@/components/ui/Toast';

export default function NewPromotion() {
  const router = useRouter();
  const { showToast } = useToast();
  const [lang, setLang] = useState<'th' | 'en'>('th');
  
  const [title_th, setTitleTh] = useState('');
  const [title_en, setTitleEn] = useState('');
  
  const [dateConfig, setDateConfig] = useState<DateConfig>({
    type: 'range',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  const [sections, setSections] = useState<PromotionSection[]>([
    { 
      id: Date.now().toString(), 
      type: 'highlight_summary', 
      th: { title: '', content: null, ctaLabel: 'ดูรายละเอียด' },
      en: { title: '', content: null, ctaLabel: 'View Details' },
      ctaLink: 'https://'
    }
  ]);
  
  const [isSaving, setIsSaving] = useState(false);

  const addSection = (type: SectionType = 'standard') => {
    setSections([
      ...sections,
      { 
        id: Date.now().toString(), 
        type, 
        th: { title: '', content: null, ctaLabel: 'ปุ่มกด' },
        en: { title: '', content: null, ctaLabel: 'Click Here' },
        ctaLink: 'https://'
      }
    ]);
    showToast(`Added new ${type} section`, 'info');
  };

  const removeSection = (id: string) => {
    if (sections.length === 1) return;
    setSections(sections.filter(s => s.id !== id));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setSections(newSections);
  };

  const updateSection = (id: string, updates: any) => {
    setSections(sections.map(s => {
      if (s.id !== id) return s;
      
      // If updating localized fields
      if (updates.th || updates.en) {
        return { ...s, ...updates };
      }
      
      // If updating field in current language
      const currentLangData = s[lang];
      return { 
        ...s, 
        [lang]: { ...currentLangData, ...updates }
      };
    }));
  };

  const updateSharedSectionField = (id: string, updates: Partial<PromotionSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSave = async () => {
    if (!title_th || !title_en) {
      showToast('Please enter title in both languages', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_th,
          title_en,
          dateConfig,
          sections,
          createdAt: new Date().toISOString(),
          status: 'draft',
        }),
      });

      if (response.ok) {
        showToast('Promotion created successfully!', 'success');
        router.push('/promotions');
      } else {
        showToast('Failed to save promotion', 'error');
      }
    } catch (error) {
      showToast('Error saving promotion', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/promotions" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold">New Multilingual Promotion</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Language Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button 
              onClick={() => setLang('th')}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${lang === 'th' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ไทย (TH)
            </button>
            <button 
              onClick={() => setLang('en')}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${lang === 'en' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ENG (EN)
            </button>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 font-bold disabled:bg-blue-300"
          >
            <Save size={20} />
            <span>{isSaving ? 'Saving...' : 'Save All'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Main Title Block */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 text-blue-500">
            <Languages size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Main Content ({lang.toUpperCase()})</span>
          </div>
          <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-tighter">Promotion Title</label>
          <input
            type="text"
            value={lang === 'th' ? title_th : title_en}
            onChange={(e) => lang === 'th' ? setTitleTh(e.target.value) : setTitleEn(e.target.value)}
            placeholder={`Enter promotion title in ${lang === 'th' ? 'Thai' : 'English'}...`}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xl font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        {/* Shared Date Config */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 text-amber-500">
            <Calendar size={18} />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Settings (Shared)</span>
          </div>
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Display Format</label>
              <select 
                value={dateConfig.type}
                onChange={(e) => setDateConfig({ ...dateConfig, type: e.target.value as DateConfigType })}
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="range">Range (From - To)</option>
                <option value="onwards">Onwards (Start Date Only)</option>
                <option value="single">Single Day</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Date</label>
              <input
                type="date"
                value={dateConfig.startDate}
                onChange={(e) => setDateConfig({ ...dateConfig, startDate: e.target.value })}
                className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            {dateConfig.type === 'range' && (
              <>
                <div className="pb-2"><ArrowRight size={18} className="text-gray-300" /></div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateConfig.endDate}
                    onChange={(e) => setDateConfig({ ...dateConfig, endDate: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sections List */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div 
              key={section.id} 
              className={`relative bg-white dark:bg-gray-900 rounded-3xl border-2 transition-all ${
                section.type === 'special' ? 'border-amber-200 dark:border-amber-900/50 shadow-md' :
                section.type === 'highlight_summary' ? 'border-blue-200 dark:border-blue-900/50 shadow-sm' :
                'border-gray-100 dark:border-gray-800 shadow-sm'
              }`}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 rounded-t-[22px]">
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col">
                    <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-0.5 text-gray-300 hover:text-blue-500 disabled:opacity-10"><ChevronUp size={16} /></button>
                    <button onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1} className="p-0.5 text-gray-300 hover:text-blue-500 disabled:opacity-10"><ChevronDown size={16} /></button>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{section.type.replace('_', ' ')}</span>
                  <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 ml-4">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded shadow-sm ${lang === 'th' ? 'bg-white dark:bg-gray-600 text-blue-600' : 'text-gray-400'}`}>TH</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded shadow-sm ${lang === 'en' ? 'bg-white dark:bg-gray-600 text-blue-600' : 'text-gray-400'}`}>EN</span>
                  </div>
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
                  <button onClick={() => removeSection(section.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>

              {/* Section Content */}
              <div className="p-8 space-y-6">
                <input
                  type="text"
                  value={section[lang].title || ''}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  placeholder={`Section title in ${lang.toUpperCase()}...`}
                  className={`w-full px-0 bg-transparent border-none text-xl font-bold outline-none placeholder:text-gray-300 ${
                    section.type === 'highlight_summary' ? 'text-blue-600' : 'text-gray-800 dark:text-gray-100'
                  }`}
                />
                
                <TiptapEditor 
                  key={`${section.id}-${lang}`} // Re-mount editor when language changes for this section
                  content={section[lang].content} 
                  onChange={(newContent) => updateSection(section.id, { content: newContent })} 
                />

                {/* Optional CTA inside Section */}
                <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Button Text ({lang.toUpperCase()})</label>
                        <input
                          type="text"
                          value={section[lang].ctaLabel || ''}
                          onChange={(e) => updateSection(section.id, { ctaLabel: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Button Link (Shared)</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                          <input
                            type="text"
                            value={section.ctaLink || ''}
                            onChange={(e) => updateSharedSectionField(section.id, { ctaLink: e.target.value })}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Section Buttons */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <button onClick={() => addSection('highlight_summary')} className="add-btn text-blue-600 border-blue-200 hover:border-blue-500"><Info size={18} /><span>Add Summary Block</span></button>
          <button onClick={() => addSection('standard')} className="add-btn"><Plus size={18} /><span>Add Standard Block</span></button>
          <button onClick={() => addSection('special')} className="add-btn text-amber-600 border-amber-200 hover:border-amber-500"><Star size={18} /><span>Add Special Block</span></button>
        </div>

        {/* JSON Preview Section */}
        <div className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-8">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-2">
                <Layout size={18} className="text-gray-500" />
                <span className="font-bold text-gray-700 dark:text-gray-300">Live JSON Preview (Multilingual)</span>
              </div>
              <div className="text-xs text-blue-500 font-black uppercase tracking-widest group-open:hidden">Show JSON</div>
              <div className="text-xs text-red-500 font-black uppercase tracking-widest hidden group-open:block">Hide JSON</div>
            </summary>
            <div className="mt-4 p-6 bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
              <pre className="text-[11px] text-green-400 font-mono overflow-auto max-h-[500px] leading-relaxed">
                {JSON.stringify({
                  title_th,
                  title_en,
                  dateConfig,
                  sections,
                  createdAt: new Date().toISOString(),
                }, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </div>

      <style jsx>{`
        .add-btn {
          @apply flex flex-col items-center justify-center space-y-2 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-100 dark:border-gray-800 p-6 rounded-3xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-bold;
        }
      `}</style>
    </div>
  );
}
