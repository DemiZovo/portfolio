import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { workshopProjects } from '@/data/workshop';
import { siteConfig } from '@/config/site';
import styles from './workshop.module.css';

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'workshop' });
  return { title: `${t('title')} | DemiZ`, description: locale === 'zh' ? 'DemiZ 的个人项目与代码。走进工坊，在 GitHub 探索每个项目。' : 'Personal projects and code by DemiZ. Explore each project on GitHub.' };
}

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function GitHub() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-1.99c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.66.41.35.77 1.05.77 2.12v3.14c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" /></svg>;
}

export default async function WorkshopPage() {
  const zh = (await getLocale()) === 'zh';
  return (
    <div className={styles.workshop}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><span aria-hidden="true">✧</span> THE WORKSHOP</p>
          <h1>{zh ? '工坊' : 'Workshop'}<span className={styles.titleDot}>.</span></h1>
          <p className={styles.intro}>{zh ? '把想法写进代码，做成可以打开的作品。' : 'Ideas, written in code. Projects you can explore.'}</p>
          <p className={styles.subline}>{zh ? '一些个人项目，一些动手尝试。点开一张卡片，去 GitHub 看看。' : 'Personal projects and hands-on experiments. Pick a card to explore its GitHub repository.'}</p>
        </div>
        <div className={styles.seal} aria-hidden="true"><span>IDEA</span><b>✧</b><span>CODE · CREATE</span></div>
      </header>

      <section aria-labelledby="workshop-projects">
        <div className={styles.sectionHead}>
          <h2 id="workshop-projects">{zh ? '项目陈列' : 'The collection'} <span>/ {String(workshopProjects.length).padStart(2, '0')}</span></h2>
          <span className={styles.destination}><GitHub /> {zh ? '在 GitHub 打开' : 'Explore on GitHub'}</span>
        </div>
        <div className={styles.grid}>
          {workshopProjects.map((project, index) => (
            <a key={project.name} className={`${styles.card} ${index === 0 ? styles.featured : ''}`} href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`${project.name} — GitHub${zh ? '（新标签页）' : ' (new tab)'}`}>
              <div className={`${styles.cover} ${styles[project.art]}`} aria-hidden="true">
                <div className={styles.coverTop}><span>DEMIZ / {String(index + 1).padStart(2, '0')}</span><span>✦</span></div>
                <div className={styles.orbit} />
                <div className={styles.artifact}><span className={styles.artifactLabel}>{project.coverLabel}</span><strong>{project.symbol}</strong><span className={styles.artifactLine} /><span className={styles.artifactLine} /></div>
                <span className={styles.coverBottom}>{project.coverFooter}</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardKicker}>{index === 0 ? (zh ? '正在构建的个人空间' : 'A personal space in the making') : `REPOSITORY ${String(index + 1).padStart(2, '0')}`}</p>
                <h3>{project.name}<span className={styles.openIcon}><Arrow /></span></h3>
                <p className={styles.description}>{zh ? project.description.zh : project.description.en}</p>
                <div className={styles.cardFoot}><span className={styles.language}>{project.language ?? (zh ? '个人仓库' : 'Personal repository')}</span><span className={styles.repoLink}>GitHub <Arrow /></span></div>
              </div>
            </a>
          ))}
        </div>
      </section>
      <footer className={styles.outro}>
        <div><span aria-hidden="true">✧</span><p>{zh ? '想法还在生长，代码也是。' : 'Ideas keep growing. So does the code.'}</p></div>
        <a href={siteConfig.author.github} target="_blank" rel="noopener noreferrer">{zh ? '前往我的 GitHub' : 'Visit my GitHub'} <Arrow /><span className={styles.srOnly}>{zh ? '（新标签页）' : ' (new tab)'}</span></a>
      </footer>
    </div>
  );
}
