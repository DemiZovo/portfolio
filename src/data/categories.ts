/** Markdown 模式及分类首次初始化使用的默认列表，数组顺序即展示顺序。 */
export interface Category { slug: string; name: string; description: string; }

export const categories: Category[] = [
  {
    "slug": "ai-infra",
    "name": "智能与基础设施",
    "description": "模型、GPU、训练推理与分布式系统。"
  },
  {
    "slug": "web",
    "name": "Web 世界",
    "description": "浏览器、前端、网络与 Web 工程。"
  },
  {
    "slug": "engineering",
    "name": "工程实践",
    "description": "架构、后端、部署与工程取舍。"
  },
  {
    "slug": "dev",
    "name": "开发环境",
    "description": "Linux、Docker、WSL 与开发工具。"
  },
  {
    "slug": "other",
    "name": "其他",
    "description": "未被分类的零散记录与灵感碎片。"
  }
];
