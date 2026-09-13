import { cache } from 'react';
import { workshopProjects } from '@/data/workshop';
import { projectsSchema, type WorkshopProject } from './workshop-model';

export const getWorkshopProjects = cache(async (): Promise<{ projects: WorkshopProject[]; unavailable: boolean }> => {
  if (process.env.CONTENT_SOURCE !== 'supabase') return { projects: workshopProjects, unavailable: false };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { projects: [], unavailable: true };
  try {
    const response = await fetch(`${url}/rest/v1/workshop_projects?id=eq.true&select=projects`, {
      headers: { apikey: key }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error('Projects unavailable');
    const rows = await response.json();
    if (rows.length !== 1) throw new Error('Projects not initialized');
    // NULL means not yet managed in Writer. [] is an intentionally empty showcase.
    return { projects: rows[0].projects === null ? workshopProjects : projectsSchema.parse(rows[0].projects), unavailable: false };
  } catch {
    // Never resurrect deleted cards from the source file on a database failure.
    return { projects: [], unavailable: true };
  }
});
