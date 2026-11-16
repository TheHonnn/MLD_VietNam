import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminCommand } from '../../admin/api';

type CanvaStatus = { configured: boolean; connected: boolean; designId?: string };
type CanvaResult = { pdfUrl: string; designUrl: string };
const prefix = 'certificates/canva/';
const stateKey = 'mld_canva_certificate_state';

export function useCanvaCertificates(enabled: boolean) {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<CanvaStatus>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CanvaResult>();
  const [pending, setPending] = useState<{ ticket: string; certificateId?: string }>();
  const completing = useRef(false);
  const code = params.get('code');
  const state = params.get('state');
  const cancelled = params.get('error');

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    adminCommand<CanvaStatus>(prefix + 'status', undefined, controller.signal)
      .then(setStatus).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || (!code && !cancelled) || completing.current) return;
    completing.current = true;
    const expected = sessionStorage.getItem(stateKey);
    sessionStorage.removeItem(stateKey);
    setParams({ tab: 'template' }, { replace: true });
    if (!state || state !== expected || !code || cancelled) {
      setError('Kết nối Canva chưa hoàn tất. Hãy thử kết nối lại.');
      completing.current = false;
      return;
    }
    setBusy(true);
    setError('');
    adminCommand(prefix + 'connect/complete', { code, state })
      .then(() => adminCommand<CanvaStatus>(prefix + 'status'))
      .then(setStatus).catch(error => setError(error.message)).finally(() => {
        completing.current = false;
        setBusy(false);
      });
  }, [enabled, code, state, cancelled, setParams]);

  async function connect() {
    setBusy(true);
    setError('');
    try {
      const { url } = await adminCommand<{ url: string }>(prefix + 'connect', {});
      const target = new URL(url);
      if (target.origin !== 'https://www.canva.com' || target.pathname !== '/api/oauth/authorize')
        throw new Error('Đường dẫn kết nối Canva không hợp lệ.');
      sessionStorage.setItem(stateKey, target.searchParams.get('state') || '');
      window.location.assign(target.href);
    } catch (error) {
      setError((error as Error).message);
    } finally { setBusy(false); }
  }

  async function generate(certificateId?: string) {
    if (!status?.connected || busy) return;
    setResult(undefined);
    setError('');
    setBusy(true);
    try {
      const previous = pending?.certificateId === certificateId ? pending?.ticket : undefined;
      let ticket: string = previous ?? (await adminCommand<{ ticket: string }>(prefix + 'generate', { certificateId })).ticket;
      setPending({ ticket, certificateId });
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 1500));
        const reply: CanvaResult | { ticket: string } = await adminCommand<CanvaResult | { ticket: string }>(prefix + 'progress', { ticket });
        if ('pdfUrl' in reply) {
          setResult(reply);
          setPending(undefined);
          return;
        }
        ticket = reply.ticket;
        setPending({ ticket, certificateId });
      }
      setError('Canva vẫn đang xử lý. Bấm tiếp tục để kiểm tra lại.');
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  return { status, result, error, busy, pending, connect, generate, clearPending: () => setPending(undefined) };
}
