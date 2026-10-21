import { concurrentMap } from '../utils/async-control';

const warmed = new Set<string>();
const active = new Map<string, Promise<void>>();
const MAX_IMAGES = 128;

export async function preloadCatalogImages(payloads: any[], signal?: AbortSignal) {
  const urls = new Set<string>();
  for (const payload of payloads) {
    for (const field of ['services','doctors','branches','courses','guidelines','instructors']) {
      if (!Array.isArray(payload?.[field])) continue;
      for (const record of payload[field]) {
        for (const value of [record.image,record.imageUrl,record.avatar,record.avatarUrl,...(Array.isArray(record.galleryUrls) ? record.galleryUrls : [])]) {
          if (typeof value !== 'string' || !value.trim()) continue;
          try {
            const url = new URL(value,window.location.origin);
            if (url.protocol !== 'https:' || url.username || url.password || warmed.has(url.href)) continue;
            urls.add(url.href);
          } catch { /* Missing or invalid catalog media remains blank. */ }
        }
      }
    }
  }
  await concurrentMap([...urls].slice(0,MAX_IMAGES),3,async url => {
    const pending = active.get(url);
    if (pending) return pending;
    const task = new Promise<void>(resolve => {
      const photo = new Image();
      let done = false;
      const finish = (loaded: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort',abort);
        photo.onload = photo.onerror = null;
        if (loaded) {
          warmed.add(url);
          while (warmed.size > MAX_IMAGES) warmed.delete(warmed.values().next().value!);
        } else photo.src = '';
        resolve();
      };
      const abort = () => finish(false);
      const timer = window.setTimeout(abort,15000);
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort',abort,{once:true});
      photo.referrerPolicy = 'no-referrer';
      photo.onload = () => finish(true);
      photo.onerror = abort;
      photo.src = url;
    });
    active.set(url,task);
    try { await task; } finally { active.delete(url); }
  },signal);
}
