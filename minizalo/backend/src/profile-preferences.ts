import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';
export async function profilePreferences(store:Store,userId:string){
  const [schema]=await store.query(Prisma.sql`SELECT count(*)=4 AS ready FROM pg_attribute WHERE attrelid=to_regclass('public.miniapp_customer_profiles') AND NOT attisdropped AND attname IN ('occupation','theme','treatment_notify','course_notify')`);
  if(!schema?.ready)return {profile_extended:false};
  const [profile]=await store.query(Prisma.sql`SELECT occupation,theme,treatment_notify,course_notify FROM miniapp_customer_profiles WHERE user_id=${userId}::uuid`);
  return {profile_extended:true,occupation:'',theme:'LIGHT',treatment_notify:true,course_notify:true,...profile};
}
export async function saveProfilePreferences(store:Store,userId:string,input:Row){
  if(!['occupation','theme','treatmentNotify','courseNotify'].some(key=>input[key]!==undefined))return;
  if(input.occupation!==undefined&&(typeof input.occupation!=='string'||input.occupation.length>150||/[\x00-\x1f\x7f]/.test(input.occupation)))throw new ApiError(400,'Invalid occupation');
  if(input.theme!==undefined&&!['LIGHT','DARK','SYSTEM'].includes(input.theme))throw new ApiError(400,'Invalid interface theme');
  if(['treatmentNotify','courseNotify'].some(key=>input[key]!==undefined&&typeof input[key]!=='boolean'))throw new ApiError(400,'Invalid notification settings');
  if(!(await profilePreferences(store,userId)).profile_extended)throw new ApiError(409,'Profile preferences are not configured',{code:'PROFILE_SCHEMA_REQUIRED'});
  await store.query(Prisma.sql`INSERT INTO miniapp_customer_profiles(user_id,occupation,theme,treatment_notify,course_notify)
    VALUES(${userId}::uuid,${input.occupation?.trim()??''},${input.theme??'LIGHT'},${input.treatmentNotify??true},${input.courseNotify??true})
    ON CONFLICT(user_id) DO UPDATE SET occupation=COALESCE(${input.occupation?.trim()??null}::text,miniapp_customer_profiles.occupation),theme=COALESCE(${input.theme??null}::text,miniapp_customer_profiles.theme),treatment_notify=COALESCE(${input.treatmentNotify??null}::boolean,miniapp_customer_profiles.treatment_notify),course_notify=COALESCE(${input.courseNotify??null}::boolean,miniapp_customer_profiles.course_notify),updated_at=CURRENT_TIMESTAMP RETURNING user_id`);
}
