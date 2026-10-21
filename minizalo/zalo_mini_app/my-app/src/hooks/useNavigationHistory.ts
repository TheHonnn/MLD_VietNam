import { useEffect, useRef } from 'react';

const backLayers: {id:symbol;priority:number}[] = [];

export function useBackAction(enabled: boolean, back: () => void, priority = 0) {
  const callback = useRef(back);
  callback.current = back;
  useEffect(() => {
    if (!enabled) return;
    const id=Symbol('back-layer');
    backLayers.push({id,priority});
    const listener = (event: Event) => {
      const minimum=(event as CustomEvent<{minimumPriority:number}>).detail?.minimumPriority??0;
      const eligible=backLayers.filter(layer=>layer.priority>=minimum).sort((a,b)=>a.priority-b.priority);
      const top=eligible[eligible.length-1];
      if(top?.id!==id)return;
      event.preventDefault();callback.current();
    };
    window.addEventListener('mld:before-back',listener);
    return () => { window.removeEventListener('mld:before-back',listener);const index=backLayers.findIndex(layer=>layer.id===id);if(index>=0)backLayers.splice(index,1); };
  }, [enabled,priority]);
}

// History stores opaque IDs only. View snapshots never persist patient or booking data.
export function useNavigationHistory<T>(key: string, snapshot: T, restore: (value: T) => void, owner: string, allowNested = true) {
  const current = useRef({snapshot,restore,owner,allowNested});
  current.current = {snapshot,restore,owner,allowNested};
  const views = useRef(new Map<string,{snapshot:T;owner:string;key:string}>());
  const trail = useRef<string[]>([]);
  const namespace = useRef(`${Date.now()}:${Math.random()}`);
  const sequence = useRef(0);
  const skip = useRef<string | null>(null);
  const travelling = useRef(false);
  const selected = useRef('');
  const previousOwner = useRef(owner);
  const anchor = useRef({key,snapshot,owner});
  useEffect(() => {
    const entry=views.current.get(selected.current);
    if(entry?.key===key&&entry.owner===owner)entry.snapshot=snapshot;
  },[snapshot,key,owner]);
  useEffect(() => {
    const pop = (event: PopStateEvent) => {
      const nested = new CustomEvent('mld:before-back',{cancelable:true,detail:{minimumPriority:current.current.allowNested?0:1}});
      if (!travelling.current && !window.dispatchEvent(nested)) {
        history.pushState({...history.state,mldView:selected.current},'');
        return;
      }
      travelling.current=false;
      const target = views.current.get(event.state?.mldView);
      if (!target || target.owner !== current.current.owner) {
        // Old browser entries can outlive the bounded, account-scoped view cache.
        const fallback=anchor.current;
        if(fallback.owner!==current.current.owner)return;
        const id=`${namespace.current}:${++sequence.current}`;
        views.current.clear();views.current.set(id,{...fallback});trail.current=[id];selected.current=id;
        skip.current=fallback.key;
        history.replaceState({...history.state,mldView:id},'');
        current.current.restore(fallback.snapshot);
        return;
      }
      selected.current = event.state.mldView;
      skip.current = target.key;
      current.current.restore(target.snapshot);
    };
    window.addEventListener('popstate',pop);
    return () => window.removeEventListener('popstate',pop);
  }, []);
  useEffect(() => {
    if (skip.current === key) { skip.current=null; return; }
    skip.current=null;
    const changedOwner = previousOwner.current !== owner;
    previousOwner.current = owner;
    if (changedOwner) { views.current.clear(); trail.current=[];anchor.current={key,snapshot:current.current.snapshot,owner}; }
    const position=trail.current.indexOf(selected.current);
    if (!changedOwner) {
      if (views.current.get(selected.current)?.key === key) return;
      for(let index=position-1;index>=0;index--) {
        if(views.current.get(trail.current[index])?.key===key) {
          travelling.current=true;history.go(index-position);return;
        }
      }
    }
    const id = `${namespace.current}:${++sequence.current}`;
    views.current.set(id,{snapshot:current.current.snapshot,owner,key});
    trail.current=[...trail.current.slice(0,position+1),id].slice(-64);
    while (views.current.size > 64) views.current.delete(views.current.keys().next().value!);
    const replace = sequence.current === 1 || changedOwner;
    selected.current=id;
    history[replace?'replaceState':'pushState']({...history.state,mldView:id},'');
  }, [key,owner]);
}
