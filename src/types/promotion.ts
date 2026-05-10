import { JSONContent } from '@tiptap/react';

export type SectionType = 'standard' | 'special' | 'highlight' | 'highlight_summary' | 'cta_button';
export type DateConfigType = 'range' | 'onwards' | 'single';

export interface LocalizedContent {
  title?: string;
  content: JSONContent | null;
  ctaLabel?: string;
}

export interface PromotionSection {
  id: string;
  type: SectionType;
  // Localized fields
  th: LocalizedContent;
  en: LocalizedContent;
  // Shared fields
  ctaLink?: string;
}

export interface DateConfig {
  type: DateConfigType;
  startDate: string;
  endDate?: string;
}

export interface Promotion {
  id: string;
  // Localized main title
  title_th: string;
  title_en: string;
  
  dateConfig?: DateConfig;
  sections: PromotionSection[];
  createdAt: string;
  status: 'draft' | 'active';
}
