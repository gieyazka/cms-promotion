import { JSONContent } from '@tiptap/react';

export type SectionType = 'standard' | 'special' | 'highlight' | 'highlight_summary' | 'cta_button';
export type DateConfigType = 'range' | 'onwards' | 'single';

export interface LocalizedContent {
  title?: string;
  content: JSONContent | null;
  ctaLabel?: string;
}

export interface BlockContent {
  locale: string;
  data: JSONContent;
}

export interface PromotionSection {
  id: string;
  type: SectionType;
  // Localized fields
  th: LocalizedContent;
  en: LocalizedContent;
  // Shared fields
  ctaLink?: string;
  sort_order: number;
  translations: BlockContent[];
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
