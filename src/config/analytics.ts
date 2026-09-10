export type AnalyticsProvider = 'umami';

export interface AnalyticsConfig {
  enabled: boolean;
  provider: AnalyticsProvider;
  siteId: string;
  scriptUrl: string;
  showPublicCount: boolean;
}

/**
 * 统计功能的唯一配置入口。
 * 正式发布需设置 NEXT_PUBLIC_DEPLOY_ENV=production；
 * 本地 build/preview 不应设置该变量。
 */
export const analyticsConfig = {
  enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true',
  provider: 'umami',
  siteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? '',
  scriptUrl: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ?? '',
  showPublicCount: false,
} satisfies AnalyticsConfig;
