import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

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

const projects = [
  {
    name: 'DemiZ Writer',
    status: 'Private',
    stack: ['Next.js', 'TypeScript', 'Vercel'],
    href: '/write',
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
              <Link href={project.href}>{t('open')}</Link>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
