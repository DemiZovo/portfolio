/**
 * 分类的唯一数据源。
 * 新增 / 改名 / 换卡牌 / 调顺序，都只改这个文件，不牵动任何文章。
 */

export interface Category {
  /** URL 段与文章 frontmatter 的 category 字段值，例如 "ai-infra"。 */
  slug: string;
  /** 展示名，例如 "AI & Infra"。 */
  name: string;
  /** 中文名，用于分类页副标题。 */
  zh: string;
  /** 一句话描述。 */
  description: string;
  /** 对应的库洛牌卡面（魔法属性），用于分类卡徽记。 */
  card: string;
  /** 排序权重，越小越靠前。 */
  order: number;
}

export const categories: Category[] = [
  {
    slug: 'ai-infra',
    name: 'AI & Infra',
    zh: '智能与基础设施',
    description: '模型、GPU、训练推理与分布式系统。',
    card: 'The Power',
    order: 1,
  },
  {
    slug: 'web',
    name: 'Web',
    zh: 'Web 世界',
    description: '浏览器、前端、网络与 Web 工程。',
    card: 'The Light',
    order: 2,
  },
  {
    slug: 'engineering',
    name: 'Engineering',
    zh: '工程实践',
    description: '架构、后端、部署与工程取舍。',
    card: 'The Create',
    order: 3,
  },
  {
    slug: 'dev',
    name: 'Dev',
    zh: '开发环境',
    description: 'Linux、Docker、WSL 与开发工具。',
    card: 'The Move',
    order: 4,
  },
  {
    slug: 'other',
    name: 'Other',
    zh: '其他',
    description: '未被分类的零散记录与灵感碎片。',
    card: 'The Maze',
    order: 5,
  },
];

const bySlug = new Map(categories.map((category) => [category.slug, category]));

export function getCategory(slug: string): Category | undefined {
  return bySlug.get(slug);
}

export function getOrderedCategories(): Category[] {
  return [...categories].sort((a, b) => a.order - b.order);
}
