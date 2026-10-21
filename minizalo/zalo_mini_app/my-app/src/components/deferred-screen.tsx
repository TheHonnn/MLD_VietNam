import React, { Suspense, useState } from 'react';
import { ArrowLeftIcon } from './Icons';

export function deferredScreen<P extends object>(load: () => Promise<{ default: React.ComponentType<P> }>): React.FC<P> {
  return function DeferredScreen(props: P) {
    const [Screen] = useState(() => React.lazy(load) as React.ComponentType<P>);
    return <Suspense fallback={<div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-[#FAF6F0] p-5 text-sm">
      <p role="status">Đang tải...</p>
      <button type="button" title="Quay lại" aria-label="Quay lại" className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white" onClick={() => history.back()}><ArrowLeftIcon size={20}/></button>
    </div>}>
      <Screen {...props} />
    </Suspense>;
  };
}
