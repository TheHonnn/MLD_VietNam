import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { concurrentMap } from '@/utils/async-control';

type Slot = { id: string; branchId: string; technicianId: string; startTime: string; endTime: string };

export function useDirectorySlots(branchIds: string[], serviceId: string, date: string) {
  const key = JSON.stringify([...new Set(branchIds)].sort());
  const requestKey = JSON.stringify([key, serviceId, date]);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string; slots: Slot[]; error: string; loading: boolean }>({ key: '', slots: [], error: '', loading: false });
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ key: requestKey, slots: [], error: '', loading: Boolean(serviceId && date) });
    if (!serviceId || !date) return;
    concurrentMap(JSON.parse(key) as string[], 3, id => apiClient.getSlots(id, date, serviceId, undefined, controller.signal), controller.signal).then(results => {
      if (cancelled) return;
      const failure = results.find(result => result?.error || !Array.isArray(result?.slots));
      setState({ key: requestKey, slots: failure ? [] : results.flatMap(result => result.slots), error: failure ? failure.error || 'Không thể tải lịch trống.' : '', loading: false });
    }).catch(() => {
      if (!cancelled) setState({ key: requestKey, slots: [], error: 'Không thể tải lịch trống.', loading: false });
    });
    return () => { cancelled = true; controller.abort(); };
  }, [key, serviceId, date, version]);
  const current = state.key === requestKey;
  return { slots: current ? state.slots : [], error: current ? state.error : '', loading: Boolean(serviceId && date) && (!current || state.loading), retry: () => setVersion(value => value + 1) };
}
