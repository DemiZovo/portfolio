/** Curated public repositories. Update this list to add or remove showcase cards.
 * Descriptions are based on the owner's public repository metadata; no runtime GitHub API is needed.
 */
import type { WorkshopProject } from '@/lib/workshop-model';

export const workshopProjects: WorkshopProject[] = [
  {
    name: 'portfolio', url: 'https://github.com/DemiZovo/portfolio',
    description: { zh: '我的作品集网站。你正在浏览的这个空间，从页面到代码，都收录在这里。', en: 'My portfolio website. The space you are exploring, from its pages to the code behind them.' },
    language: 'TypeScript', art: 'portfolio', symbol: 'D.', coverLabel: 'A PERSONAL SPACE', coverFooter: 'DESIGN & CODE',
  },
  {
    name: 'DemiZ', url: 'https://github.com/DemiZovo/DemiZ',
    description: { zh: 'DemiZ 网站仓库，主要语言为 Astro。打开仓库，查看网站的代码与文件。', en: 'The DemiZ website repository, primarily written in Astro. Explore its code and files on GitHub.' },
    language: 'Astro', art: 'site', symbol: '</>', coverLabel: 'DEMIZ ON THE WEB', coverFooter: 'PAGES & POSSIBILITIES',
  },
  {
    name: 'mynotebook', url: 'https://github.com/DemiZovo/mynotebook',
    description: { zh: '“The first step is the most”——从第一步开始，翻开我的 notebook 仓库。', en: '“The first step is the most” — start with the first step and explore my notebook repository.' },
    art: 'notebook', symbol: 'Aa', coverLabel: 'MY NOTEBOOK', coverFooter: 'ONE PAGE AT A TIME',
  },
  {
    name: 'boy-poop', url: 'https://github.com/DemiZovo/boy-poop',
    description: { zh: '一个由 Codex 制作的 HTML 项目。具体内容，留给你去仓库里发现。', en: 'An HTML project made with Codex. Open the repository to discover what is inside.' },
    language: 'HTML', art: 'experiment', symbol: '{ }', coverLabel: 'A LITTLE EXPERIMENT', coverFooter: 'BUILT WITH CODEX',
  },
];
