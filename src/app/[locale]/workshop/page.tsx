import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'workshop' });
  return {
    title: `${t('title')} | DemiZ`,
    description: 'DemiZ 的工作台：一些因为自己想用，所以顺手做出来的东西。',
  };
}

// 私有编辑功能尚未实现，因此本页不链接不存在的编辑路由。
const projects = [
  {
    name: 'DemiZ Writer',
    status: 'Building',
    stack: ['Next.js', 'TypeScript', 'Vercel'],
    href: '',
  },
];

export default async function WorkshopPage() {
  const t = await getTranslations('workshop');

  return (
    <>
      <section className="page-head">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="page-head__title">{t('title')}</h1>
        <p className="page-head__desc">{t('heroDesc')}</p>
      </section>

      <section className="workshop-list" aria-label={t('projectsAria')}>
        {projects.map((project) => (
          <article className="project-row" key={project.name}>
            <div className="project-row__main">
              <p className="project-row__status">{project.status}</p>
              <h2 className="project-row__name">{project.name}</h2>
              <p className="project-row__desc">{t('projectDesc')}</p>
              <p className="project-row__stack">{project.stack.join(' · ')}</p>
            </div>
            <div className="project-row__actions">
              {project.href ? <a href={project.href}>{t('open')}</a> : <span className="project-row__soon">{t('comingSoon')}</span>}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
