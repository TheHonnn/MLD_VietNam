import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';

const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
function deviceLabel(agent:string){
  const platform=/iPhone/i.test(agent)?'iPhone':/iPad/i.test(agent)?'iPad':/Android/i.test(agent)?'Android':/Windows/i.test(agent)?'Windows':/Macintosh|Mac OS/i.test(agent)?'Mac':/Linux/i.test(agent)?'Linux':'';
  const app=/Zalo/i.test(agent)?'Zalo':/Edg\//i.test(agent)?'Edge':/Firefox\//i.test(agent)?'Firefox':/Chrome\//i.test(agent)?'Chrome':/Safari\//i.test(agent)?'Safari':'Web';
  return [app,platform].filter(Boolean).join(' - ');
}
async function ownerLock(store:Store,userId:string){await store.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`sessions:${userId}`}))::text AS locked`);}
const unavailable=()=>new ApiError(401,'Login session has expired or was signed out',{code:'SESSION_REVOKED'});
function usable(row:Row|undefined){if(!row||row.revoked_at||new Date(row.expires_at).getTime()<=Date.now())throw unavailable();return row;}

export async function accountSession(store:Store,userId:string,token:string,payload:{iat?:number;exp?:number},agent:string,verifiedLogin=false){
  if(!Number.isInteger(payload.iat)||!payload.iat||payload.iat>Date.now()/1000+60)throw unavailable();
  const hash=tokenHash(token),expiresAt=new Date(Math.min(payload.exp??payload.iat+8*3600,payload.iat+8*3600)*1000);
  const [known]=await store.query(Prisma.sql`SELECT id,expires_at,revoked_at,last_seen_at FROM miniapp_account_sessions WHERE user_id=${userId}::uuid AND token_hash=${hash}`);
  if(known){
    usable(known);
    if(Date.now()-new Date(known.last_seen_at).getTime()>300000)await store.query(Prisma.sql`UPDATE miniapp_account_sessions SET last_seen_at=clock_timestamp() WHERE id=${known.id}::uuid AND revoked_at IS NULL RETURNING id`);
    return known.id as string;
  }
  return store.transaction(async tx=>{
    await ownerLock(tx,userId);
    const [existing]=await tx.query(Prisma.sql`SELECT id,expires_at,revoked_at FROM miniapp_account_sessions WHERE user_id=${userId}::uuid AND token_hash=${hash}`);
    if(existing)return String(usable(existing).id);
    if(!verifiedLogin){
      const [cutoff]=await tx.query(Prisma.sql`SELECT revoked_before FROM miniapp_account_revocations WHERE user_id=${userId}::uuid`);
      if(cutoff&&payload.iat!*1000<=new Date(cutoff.revoked_before).getTime())throw unavailable();
    }
    if(expiresAt.getTime()<=Date.now())throw unavailable();
    const [created]=await tx.query(Prisma.sql`INSERT INTO miniapp_account_sessions(user_id,token_hash,device_label,created_at,expires_at) VALUES(${userId}::uuid,${hash},${deviceLabel(agent.slice(0,2048))},${new Date(payload.iat!*1000)},${expiresAt}) RETURNING id`);
    return String(created.id);
  });
}
export async function accountSessions(store:Store,userId:string,currentId:string){
  const rows=await store.query(Prisma.sql`SELECT id,device_label,created_at,last_seen_at,expires_at FROM miniapp_account_sessions
    WHERE user_id=${userId}::uuid AND revoked_at IS NULL AND expires_at>clock_timestamp() ORDER BY (id=${currentId}::uuid) DESC,last_seen_at DESC,id DESC LIMIT 101`);
  return {sessions:rows.slice(0,100).map(row=>({...row,is_current:row.id===currentId})),has_more:rows.length>100};
}
async function activeCurrent(store:Store,userId:string,currentId:string){
  const [current]=await store.query(Prisma.sql`SELECT id,expires_at,revoked_at FROM miniapp_account_sessions WHERE id=${currentId}::uuid AND user_id=${userId}::uuid FOR UPDATE`);
  usable(current);
}
export async function revokeSession(store:Store,userId:string,id:string,currentId:string){
  return store.transaction(async tx=>{
    await ownerLock(tx,userId);
    await activeCurrent(tx,userId,currentId);
    const [row]=await tx.query(Prisma.sql`UPDATE miniapp_account_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE id=${id}::uuid AND user_id=${userId}::uuid RETURNING id`);
    if(!row)throw new ApiError(404,'Login session not found');
    return {revoked:true};
  });
}
export async function revokeOtherSessions(store:Store,userId:string,currentId:string){
  return store.transaction(async tx=>{
    await ownerLock(tx,userId);
    await activeCurrent(tx,userId,currentId);
    const rows=await tx.query(Prisma.sql`UPDATE miniapp_account_sessions SET revoked_at=clock_timestamp() WHERE user_id=${userId}::uuid AND id<>${currentId}::uuid AND revoked_at IS NULL RETURNING id`);
    // Also reject older signed tokens that have not yet been seen by this backend version.
    await tx.query(Prisma.sql`INSERT INTO miniapp_account_revocations(user_id,revoked_before) VALUES(${userId}::uuid,clock_timestamp())
      ON CONFLICT(user_id) DO UPDATE SET revoked_before=GREATEST(miniapp_account_revocations.revoked_before,EXCLUDED.revoked_before) RETURNING user_id`);
    return {revoked:true,count:rows.length};
  });
}
