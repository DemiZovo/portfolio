import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().trim().min(1, '请填写项目名称').max(80),
  url: z.string().trim().regex(/^https:\/\/github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})\/[a-zA-Z0-9_.-]{1,100}\/?$/, '请填写完整的 GitHub 仓库地址').refine(s => !['.', '..'].includes(s.split('/')[4]), '仓库地址无效'),
  description: z.object({ zh: z.string().trim().min(1, '请填写中文简介').max(240), en: z.string().trim().max(240).default('') }),
  language: z.string().trim().max(40).optional(),
  art: z.enum(['portfolio', 'site', 'notebook', 'experiment']),
  symbol: z.string().trim().min(1).max(8),
  coverLabel: z.string().trim().max(40),
  coverFooter: z.string().trim().max(40),
});
export const projectsSchema = z.array(projectSchema).max(60).superRefine((projects, ctx) => {
  const urls = new Set<string>();
  projects.forEach((p, i) => {
    const url = p.url.toLowerCase().replace(/\/$/, '').replace(/\.git$/, '');
    if (urls.has(url)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, 'url'], message: '同一个仓库只能添加一次' });
    urls.add(url);
  });
});
export type WorkshopProject = z.infer<typeof projectSchema>;
export interface ProjectSnapshot { projects: WorkshopProject[]; version: number }
