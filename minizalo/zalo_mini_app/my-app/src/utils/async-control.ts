export function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const aborted = () => reject(new Error('Da huy thao tac hoac het thoi gian cho.'));
    // Attach both handlers even after cancellation so a late SDK rejection is handled.
    operation.then(value => { cleanup(); if (!signal.aborted) resolve(value); }, error => { cleanup(); reject(error); });
    const cleanup = () => signal.removeEventListener('abort', aborted);
    if (signal.aborted) aborted();
    else signal.addEventListener('abort', aborted, { once: true });
  });
}

export async function concurrentMap<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>, signal?: AbortSignal): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length && !signal?.aborted) {
      const position = index++;
      results[position] = await task(items[position]);
    }
  }));
  return results;
}
