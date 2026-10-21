import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {syncNotifications} from './notifications.js';

export async function runReminderBatch(store:Store,cursor:string|null=null) {
  const owners=await store.query(Prisma.sql`SELECT u.id FROM users u WHERE u.is_active AND (${cursor}::uuid IS NULL OR u.id>${cursor}::uuid) AND (
    EXISTS(SELECT 1 FROM bookings b WHERE b.customer_id=u.id AND b.status IN ('PENDING','CONFIRMED')
      AND (b.booking_date+b.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' BETWEEN clock_timestamp() AND clock_timestamp()+interval '24 hours')
    OR EXISTS(SELECT 1 FROM user_packages p WHERE p.customer_id=u.id AND p.status='ACTIVE' AND p.expires_at<=clock_timestamp())) ORDER BY u.id LIMIT 100`);
  for(const owner of owners)await store.transaction(tx=>syncNotifications(tx,owner.id));
  return {processed:owners.length,nextCursor:owners.length===100?String(owners[99].id):null};
}

export function startReminderScheduler(store:Store) {
  let stopped=false,cursor:string|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  const tick=async()=>{
    try{const result=await runReminderBatch(store,cursor);cursor=result.nextCursor;}
    catch{console.error('Reminder batch failed; retrying without exposing customer data.');}
    finally{if(!stopped){timer=setTimeout(()=>void tick(),cursor?1000:60000);timer.unref();}}
  };
  timer=setTimeout(()=>void tick(),1000);timer.unref();
  return ()=>{stopped=true;if(timer)clearTimeout(timer);};
}
