/**
 * 站点已迁移到 Vercel 根路径，不再有子路径 base。
 * 保留此恒等实现以最小化迁移改动面（组件里的 sitePath(...) 调用点不动）。
 */
export function sitePath(path = '/'): string {
  return path.startsWith('/') ? path : `/${path}`;
}
