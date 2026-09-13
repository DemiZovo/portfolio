import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

// HAST element 的最小形状（避免引入 @types/hast 依赖）。
interface HElement {
  type: string;
  tagName: string;
  properties?: Record<string, unknown>;
  children?: Array<HElement | { type: string; value: string; [k: string]: unknown }>;
}

// 收集标题 + 给代码块加 data-language + 注入复制按钮（服务端渲染，点击逻辑在 MagicEffects）。
function annotate(headings: Heading[]) {
  return (tree: unknown) => {
    visit(tree as never, 'element', (node) => {
      const element = node as unknown as HElement;
      if (element.tagName && /^h[1-6]$/.test(element.tagName)) {
        const text = (element.children ?? []).map((child) => ('value' in child ? String(child.value) : '')).join('');
        headings.push({
          depth: Number(element.tagName[1]),
          slug: String(element.properties?.id ?? ''),
          text,
        });
      }
      if (element.tagName === 'pre') {
        const code = (element.children ?? []).find((child) => 'tagName' in child && child.tagName === 'code') as HElement | undefined;
        const langClass = ((code?.properties?.className ?? []) as unknown[]).find((c) => typeof c === 'string' && c.startsWith('language-'));
        if (langClass) element.properties = { ...element.properties, 'data-language': String(langClass).replace('language-', '') };
        element.children = [
          ...(element.children ?? []),
          {
            type: 'element',
            tagName: 'button',
            properties: { type: 'button', className: ['code-copy'], 'data-code-copy': '' },
            children: [
              { type: 'element', tagName: 'span', properties: { 'aria-hidden': 'true' }, children: [{ type: 'text', value: '✦' }] },
              { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: '复制代码' }] },
            ],
          },
        ];
      }
    });
  };
}

// Raw HTML is discarded by remarkRehype; also reject active URL schemes.
function safeUrls() {
  return (tree: unknown) => {
    visit(tree as never, 'element', (node) => {
      const element = node as unknown as HElement;
      for (const key of ['href', 'src']) {
        const value = element.properties?.[key];
        if (typeof value !== 'string') continue;
        const normalized = value.replace(/[\u0000-\u0020\u007f]/g, '').toLowerCase();
        if (/^[a-z][a-z0-9+.-]*:/.test(normalized) && !/^(https?:|mailto:)/.test(normalized)) delete element.properties![key];
      }
    });
  };
}

export async function renderMarkdown(markdown: string): Promise<{ html: string; headings: Heading[] }> {
  const headings: Heading[] = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)        // 使用 github-slugger 生成稳定的标题锚点
    .use(rehypeHighlight)   // highlight.js 语法高亮，加 language-* class
    .use(safeUrls)
    .use(annotate, headings)
    .use(rehypeStringify)
    .process(markdown);
  return { html: String(file), headings };
}
