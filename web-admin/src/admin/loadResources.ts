import { adminCommand, Resource } from './api';

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new DOMException('Đã hủy yêu cầu.', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export async function loadResources(signal: AbortSignal, onRetry?: (attempt: number) => void): Promise<Resource[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await adminCommand<Resource[]>('resources', undefined, signal);
      if (!Array.isArray(result) || result.some(item => !item || typeof item.name !== 'string' || (item.actions !== undefined && !Array.isArray(item.actions)))) {
        throw new Error('Máy chủ trả về danh sách quyền không hợp lệ.');
      }
      return result;
    } catch (error) {
      const code = (error as { statusCode?: number })?.statusCode;
      if (signal.aborted || attempt >= 2 || ![0, 429, 502, 503, 504].includes(code ?? -1)) throw error;
      onRetry?.(attempt + 1);
      await pause(1000 * (attempt + 1), signal);
    }
  }
}
