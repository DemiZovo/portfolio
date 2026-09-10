import { analyticsConfig } from '@/config/analytics';
import { siteConfig } from '@/config/site';

const isProductionDeployment =
  process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEPLOY_ENV === 'production';
const shouldOfferAnalytics =
  isProductionDeployment && analyticsConfig.enabled && Boolean(analyticsConfig.siteId && analyticsConfig.scriptUrl);
const productionHostname = new URL(siteConfig.url).hostname;

const loaderScript = `(() => {
  const loader = document.currentScript;
  if (!(loader instanceof HTMLScriptElement)) return;
  const privacySignal = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  if (privacySignal || location.hostname !== loader.dataset.productionHostname) return;
  try {
    const url = new URL(loader.dataset.scriptUrl ?? '');
    if (url.protocol !== 'https:' || loader.dataset.provider !== 'umami') return;
    const script = document.createElement('script');
    script.src = url.href;
    script.async = true;
    script.defer = true;
    script.dataset.websiteId = loader.dataset.siteId ?? '';
    script.dataset.domains = loader.dataset.productionHostname ?? '';
    script.dataset.doNotTrack = 'true';
    script.dataset.excludeSearch = 'true';
    script.dataset.excludeHash = 'true';
    document.head.append(script);
  } catch { /* 统计是非关键功能，配置或网络错误时静默降级。 */ }
})();`;

export default function Analytics() {
  if (!shouldOfferAnalytics) return null;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: loaderScript }}
      data-analytics-loader
      data-provider={analyticsConfig.provider}
      data-site-id={analyticsConfig.siteId}
      data-script-url={analyticsConfig.scriptUrl}
      data-production-hostname={productionHostname}
    />
  );
}
