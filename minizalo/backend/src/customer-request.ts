import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';

// Persist only the fingerprint and resource reference, never a second copy of private answers.
export async function customerRequest(store:Store,userId:string,scope:'support'|'consultation',key:unknown,payload:unknown,create:(tx:Store)=>Promise<Row>) {
  if(key===undefined)return create(store); // Older clients remain compatible.
  if(typeof key!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(key))throw new ApiError(400,'Invalid Idempotency-Key');
  const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return store.transaction(async tx=>{
    await tx.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${userId}/${scope}/${key.toLowerCase()}`},0))::text AS locked`);
    const [previous]=await tx.query(Prisma.sql`SELECT * FROM miniapp_customer_requests WHERE user_id=${userId}::uuid AND scope=${scope} AND request_key=${key}::uuid`);
    if(previous){
      if(previous.payload_hash!==hash)throw new ApiError(409,'Request key was already used with different details');
      const table=scope==='support'?Prisma.sql`support_tickets`:Prisma.sql`consultation_surveys`;
      const [record]=await tx.query(Prisma.sql`SELECT * FROM ${table} WHERE id=${previous.resource_id}::uuid AND customer_id=${userId}::uuid`);
      if(!record)throw new ApiError(409,'Original request is no longer available');
      return record;
    }
    const record=await create(tx);
    await tx.query(Prisma.sql`INSERT INTO miniapp_customer_requests(user_id,scope,request_key,payload_hash,resource_id) VALUES(${userId}::uuid,${scope},${key}::uuid,${hash},${record.id}::uuid) RETURNING resource_id`);
    return record;
  });
}
