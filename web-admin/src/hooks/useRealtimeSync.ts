import { useState, useEffect, useCallback, useRef } from 'react';
import {
  realtimeSyncService,
  RealtimeSyncStatus,
  RealtimeTable,
  RealtimeChangeEvent,
  RealtimeEventLog,
} from '../services/realtime.service';

export interface UseRealtimeSyncOptions {
  tables?: RealtimeTable[];
  onDataChange?: (event: RealtimeChangeEvent) => void;
  debounceMs?: number;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { tables, onDataChange, debounceMs = 300 } = options;

  const [status, setStatus] = useState<RealtimeSyncStatus>(() => realtimeSyncService.getStatus());
  const [isLive, setIsLive] = useState<boolean>(() => realtimeSyncService.isLive());
  const [lastSyncTime, setLastSyncTime] = useState<Date>(() => realtimeSyncService.getLastSyncTime());
  const [recentEvents, setRecentEvents] = useState<RealtimeEventLog[]>(() =>
    realtimeSyncService.getRecentLogs()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const debounceTimerRef = useRef<any>(null);
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  // Subscribe to status updates
  useEffect(() => {
    const unsubStatus = realtimeSyncService.subscribeStatus((newStatus, live) => {
      setStatus(newStatus);
      setIsLive(live);
      setLastSyncTime(realtimeSyncService.getLastSyncTime());
    });

    return () => {
      unsubStatus();
    };
  }, []);

  // Subscribe to table changes
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    const handleEvent = (event: RealtimeChangeEvent) => {
      setLastSyncTime(new Date());
      setRecentEvents(realtimeSyncService.getRecentLogs());

      if (onDataChangeRef.current) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          onDataChangeRef.current?.(event);
        }, debounceMs);
      }
    };

    if (tables && tables.length > 0) {
      tables.forEach((t) => {
        unsubs.push(realtimeSyncService.subscribeTable(t, handleEvent));
      });
    } else {
      unsubs.push(realtimeSyncService.subscribeTable('*', handleEvent));
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      unsubs.forEach((unsub) => unsub());
    };
  }, [tables, debounceMs]);

  // Force sync / refresh trigger
  const forceSync = useCallback(async (refetchCallback?: () => Promise<void> | void) => {
    setIsRefreshing(true);
    try {
      if (refetchCallback) {
        await refetchCallback();
      }
      setLastSyncTime(new Date());
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
    }
  }, []);

  const reconnect = useCallback(() => {
    realtimeSyncService.reconnect();
  }, []);

  return {
    status,
    isLive,
    lastSyncTime,
    recentEvents,
    isRefreshing,
    forceSync,
    reconnect,
  };
}
