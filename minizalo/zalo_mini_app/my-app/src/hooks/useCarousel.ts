import { useEffect, useState } from 'react';

export function useCarousel(ids: string[], paused = false, initialIndex = 0) {
  const [selected, setSelected] = useState(ids[initialIndex] || '');
  const [visible, setVisible] = useState(() => !document.hidden);
  const signature = JSON.stringify(ids);
  const index = Math.max(0, ids.indexOf(selected));
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (paused || !visible || ids.length < 2) return;
    const timer = window.setTimeout(() => setSelected(ids[(index + 1) % ids.length]), 3000);
    return () => window.clearTimeout(timer);
  }, [signature, index, selected, paused, visible]);
  return { index, select: setSelected, move: (offset: number) => setSelected(ids[(index + offset + ids.length) % ids.length] || '') };
}
