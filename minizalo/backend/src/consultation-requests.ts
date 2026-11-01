import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';
import {staffScope} from './staff-booking.js';
import {collectionPage} from './collection-page.js';
import {customerRequest} from './customer-request.js';
import {localPhone} from './phone-identity.js';
export const CONSULTATION_PREFIX='MINIAPP_CONSULTATION:';
const uuid=(value:unknown)=>{if(typeof value!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value))throw new ApiError(400,'Invalid branch or request ID');return value;};
export function supportTicketView(row:Row){
  if(!String(row.subject).startsWith(CONSULTATION_PREFIX))return row;
  const [name,phone,...message]=String(row.message).split('\n');
  return {...row,subject:'Yêu cầu tư vấn',message:[name,phone,message.join('\n')].filter(Boolean).join('\n'),branch_id:String(row.subject).slice(CONSULTATION_PREFIX.length),contact_name:name,contact_phone:phone,consultation_message:message.join('\n')};
}
export async function createConsultation(store:Store,actorId:string,body:Row,key:unknown){
  const branchId=uuid(body.branchId),phone=localPhone(body.phone);
  if(typeof body.name!=='string'||!body.name.trim()||body.name.length>150||/[\r\n\0]/.test(body.name)||!phone||typeof body.message!=='string'||body.message.length>9000||body.message.includes('\0'))throw new ApiError(400,'Invalid consultation contact');
  const [branch]=await store.query(Prisma.sql`SELECT id FROM branches WHERE id=${branchId}::uuid AND is_active`);
  if(!branch)throw new ApiError(404,'Branch not found');
  const subject=CONSULTATION_PREFIX+branchId,message=[body.name.trim(),phone,body.message.trim()].join('\n');
  const row=await customerRequest(store,actorId,'support',key,{subject,message},async tx=>{
    const [saved]=await tx.query(Prisma.sql`INSERT INTO support_tickets(customer_id,subject,message) VALUES(${actorId}::uuid,${subject},${message}) RETURNING *`);return saved;
  });
  return supportTicketView(row);
}
export async function staffConsultations(store:Store,actorId:string,input:Record<string,unknown>){
  const scope=await staffScope(store,actorId),status=input.status??'';
  if(typeof status!=='string'||(status&&!['PENDING','PROCESSING','RESOLVED','CLOSED'].includes(status)))throw new ApiError(400,'Invalid request status');
  const page=await collectionPage(store,Prisma.sql`SELECT st.*,b.name AS branch_name FROM support_tickets st JOIN branches b ON st.subject=${CONSULTATION_PREFIX}||b.id::text
    WHERE (${scope.branchId}::uuid IS NULL OR b.id=${scope.branchId}::uuid) AND (${status}='' OR st.status::text=${status})`,input);
  return {tickets:page.rows.map(supportTicketView),nextCursor:page.nextCursor};
}
export async function replyConsultation(store:Store,actorId:string,id:unknown,body:Row){
  const scope=await staffScope(store,actorId),status=body.status;
  if(!['PROCESSING','RESOLVED','CLOSED'].includes(status)||typeof body.reply!=='string'||body.reply.length>10000||body.reply.includes('\0')||(status!=='PROCESSING'&&!body.reply.trim()))throw new ApiError(400,'A valid status and response are required');
  return store.transaction(async tx=>{
    const [row]=await tx.query(Prisma.sql`SELECT st.* FROM support_tickets st JOIN branches b ON st.subject=${CONSULTATION_PREFIX}||b.id::text
      WHERE st.id=${uuid(id)}::uuid AND (${scope.branchId}::uuid IS NULL OR b.id=${scope.branchId}::uuid) FOR UPDATE OF st`);
    if(!row)throw new ApiError(404,'Consultation request not found');
    if(row.status===status&&(row.admin_reply??'')===body.reply.trim())return supportTicketView(row);
    if(body.expectedStatus!==row.status||(body.expectedReply??'')!==(row.admin_reply??''))throw new ApiError(409,'Yêu cầu đã được người khác cập nhật. Vui lòng tải lại.');
    const [updated]=await tx.query(Prisma.sql`UPDATE support_tickets SET status=${status}::ticket_status,admin_reply=${body.reply.trim()},resolved_at=${status==='PROCESSING'?Prisma.sql`NULL`:Prisma.sql`clock_timestamp()`} WHERE id=${row.id}::uuid RETURNING *`);
    await tx.query(Prisma.sql`INSERT INTO audit_logs(actor_id,action,table_name,record_id,old_data,new_data) VALUES(${actorId}::uuid,'MINIAPP_CONSULTATION_REPLY','support_tickets',${row.id}::uuid,${JSON.stringify({status:row.status})}::jsonb,${JSON.stringify({status})}::jsonb) RETURNING id`);
    return supportTicketView(updated);
  });
}
