const warmed = new Set<string>();

export async function preloadCatalogImages(payloads: any[]) {
  const urls: string[] = [];
  for (const payload of payloads) {
    for (const field of ['services','doctors','branches','courses','guidelines','instructors']) {
      if (!Array.isArray(payload?.[field])) continue;
      for (const record of payload[field]) {
        for (const value of [record.image,record.imageUrl,record.avatar,record.avatarUrl,...(record.galleryUrls || [])]) {
          if (typeof value !== 'string' || !value.trim()) continue;
          try {
            const url = new URL(value,window.location.origin);
            if (!['http:','https:'].includes(url.protocol) || url.username || url.password || warmed.has(url.href)) continue;
            warmed.add(url.href); urls.push(url.href);
          } catch { /* Missing or invalid catalog media remains blank. */ }
        }
      }
    }
  }
  let index = 0;
  await Promise.all(Array.from({length:Math.min(3,urls.length)},async () => {
    while (index < urls.length) {
      const url = urls[index++];
      await new Promise<void>(resolve => {
        const photo = new Image();
        const timer = window.setTimeout(() => { warmed.delete(url); resolve(); },15000);
        photo.referrerPolicy = 'no-referrer';
        photo.onload = () => { window.clearTimeout(timer); resolve(); };
        photo.onerror = () => { window.clearTimeout(timer); warmed.delete(url); resolve(); };
        photo.src = url;
      });
    }
  }));
}
