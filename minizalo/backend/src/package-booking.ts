import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';

export async function reservePackage(store:Store,userId:string,packageId:string,serviceId:string,date:string,end:string,excludeBookingId:string|null=null) {
  const [owned]=await store.query(Prisma.sql`SELECT p.*,t.service_id,t.name FROM user_packages p JOIN treatment_packages t ON t.id=p.package_id
    WHERE p.id=${packageId}::uuid AND p.customer_id=${userId}::uuid FOR UPDATE OF p`);
  if(!owned) throw new ApiError(404,'Gói liệu trình không thuộc tài khoản này.');
  if(owned.service_id!==serviceId) throw new ApiError(400,'Dịch vụ không thuộc gói liệu trình.');
  if(owned.status!=='ACTIVE'||new Date(owned.expires_at).getTime()<=Date.parse(`${date}T${end}+07:00`)) throw new ApiError(409,'Gói không còn hoạt động hoặc hết hạn trước ngày hẹn.');
  const [{reserved}]=await store.query(Prisma.sql`SELECT count(*)::int AS reserved FROM miniapp_booking_packages WHERE user_package_id=${packageId}::uuid AND state='RESERVED' AND (${excludeBookingId}::uuid IS NULL OR booking_id<>${excludeBookingId}::uuid)`);
  const [{journals}]=await store.query(Prisma.sql`SELECT count(*)::int AS journals FROM treatment_journal WHERE user_package_id=${packageId}::uuid`);
  if(owned.total_sessions-Math.max(owned.completed_sessions,journals)-reserved<=0) throw new ApiError(409,'Không còn buổi trống trong gói; các buổi còn lại đã được giữ.');
  await store.query(Prisma.sql`INSERT INTO miniapp_package_baselines(user_package_id,legacy_sessions) VALUES(${packageId}::uuid,${Math.max(owned.completed_sessions-journals,0)}) ON CONFLICT(user_package_id) DO NOTHING RETURNING user_package_id`);
  return owned;
}
