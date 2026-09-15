import { siteConfig } from '@/config/site';
import { siteUrl } from '@/lib/site';

interface Props {
  type: 'website' | 'article';
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  publishedTime?: string;
  updatedTime?: string;
  tags?: string[];
}

export default function JsonLd({ type, title, description, image, url, publishedTime, updatedTime, tags = [] }: Props) {
  const data =
    type === 'article'
      ? {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: title,
          description,
          image: siteUrl(image ?? siteConfig.defaultSocialImage),
          url: siteUrl(url ?? '/'),
          inLanguage: siteConfig.locale,
          datePublished: publishedTime,
          dateModified: updatedTime ?? publishedTime,
          author: { '@type': 'Person', name: siteConfig.author.name, url: siteUrl('/zh') },
          keywords: tags.join(', '),
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteConfig.name,
          description: siteConfig.description,
          url: siteUrl('/'),
          inLanguage: siteConfig.locale,
          author: { '@type': 'Person', name: siteConfig.author.name, sameAs: [siteConfig.author.github, siteConfig.author.leetcode] },
        };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
