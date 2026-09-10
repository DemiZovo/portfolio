import type { PublicEntry } from './content';

/** 文章展示文案：英文 locale 且有 titleEn 时用英文，否则回退中文。 */
export function entryTitle(entry: PublicEntry, locale: string): string {
  return locale === 'en' && 'titleEn' in entry.data && entry.data.titleEn ? entry.data.titleEn : entry.data.title;
}

export function entryDescription(entry: PublicEntry, locale: string): string {
  return locale === 'en' && 'descriptionEn' in entry.data && entry.data.descriptionEn
    ? entry.data.descriptionEn
    : entry.data.description;
}
