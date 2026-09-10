/** 阅读时长估算。中文正文按每分钟约 300 字，英文按每分钟约 220 词，取两者上限再向上取整。 */

const CJK = /[一-鿿㐀-䶿]/g;
const LATIN_WORD = /[A-Za-z0-9]+(?:[.'-][A-Za-z0-9]+)*/g;

/** 从 Markdown 正文估算阅读分钟数，最低 1 分钟。 */
export function readingMinutes(markdown: string): number {
  const cjk = (markdown.match(CJK) ?? []).length;
  const latin = (markdown.match(LATIN_WORD) ?? []).length;
  const minutes = Math.max(cjk / 300, latin / 220);
  return Math.max(1, Math.ceil(minutes));
}
