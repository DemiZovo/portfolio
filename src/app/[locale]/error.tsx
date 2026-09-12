'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section role="alert" className="route-loading"><h1>页面暂时无法打开</h1><p>请重试，或使用导航返回其他页面。</p><button type="button" onClick={reset}>重试 · Retry</button></section>;
}
