import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { getWorkshopProjects } from '@/lib/workshop-server';
import { siteConfig } from '@/config/site';
import styles from './workshop.module.css';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'workshop' });
  return { title: `${t('title')} | DemiZ`, description: locale === 'zh' ? 'DemiZ 的个人项目与代码。了解项目用途，在 GitHub 查看源码。' : 'Personal projects by DemiZ. Discover what they do and explore the code on GitHub.' };
}

export default async function WorkshopPage() {
  const zh = (await getLocale()) === 'zh';
  const { projects, unavailable } = await getWorkshopProjects();
  const newTab = zh ? '（新标签页）' : ' (new tab)';

  return (
    <div className={styles.workshop}>
      <header className={styles.header}>
        <h1>{zh ? '工坊' : 'Workshop'}</h1>
        <p>{zh ? '一些个人项目，记录想法如何变成可以使用的工具。' : 'Personal projects, turning ideas into useful tools.'}</p>
      </header>
      <section aria-labelledby="workshop-projects">
        <div className={styles.sectionHead}>
          <h2 id="workshop-projects" className="section-title">{zh ? '项目' : 'Projects'} <span>({projects.length})</span></h2>
          <a href={siteConfig.author.github} target="_blank" rel="noopener noreferrer">
            {zh ? '我的 GitHub' : 'My GitHub'} <span aria-hidden="true">↗</span><span className={styles.srOnly}>{newTab}</span>
          </a>
        </div>
        <div className={styles.grid}>
          {projects.length === 0 && <p className={styles.empty} role="status">{unavailable ? (zh ? '项目暂时无法加载，请稍后刷新。' : 'Projects are temporarily unavailable. Please try again later.') : (zh ? '工坊暂时没有展示项目。' : 'No projects are on display yet.')}</p>}
          {projects.map((project) => (
            <article className={styles.project} key={project.name}>
              <h3><a href={project.url} target="_blank" rel="noopener noreferrer">{project.name}<span className={styles.srOnly}>{newTab}</span></a></h3>
              <p className={styles.description}>{zh ? project.description.zh : (project.description.en || project.description.zh)}</p>
              <div className={styles.projectFoot}>
                <span>{project.language || (zh ? '个人仓库' : 'Personal repository')}</span>
                <a href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`${project.name} — GitHub${newTab}`}>
                  {zh ? '查看源码' : 'View source'} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
