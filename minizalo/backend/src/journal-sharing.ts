import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';
import {bookingAccess} from './staff-booking.js';

async function accessibleJournal(store:Store,actorId:string,id:string){
  const permission=await bookingAccess(store,actorId);
  const [record]=await store.query(Prisma.sql`SELECT j.*,u.full_name AS customer_name,t.full_name AS technician_name,
    br.name AS branch_name,room.name AS room_name,tp.name AS package_name
    FROM treatment_journal j JOIN users u ON u.id=j.customer_id
    LEFT JOIN bookings b ON b.id=j.booking_id LEFT JOIN branches br ON br.id=b.branch_id
    LEFT JOIN technicians t ON t.id=j.technician_id LEFT JOIN branch_rooms room ON room.id=j.assigned_room_id
    LEFT JOIN user_packages up ON up.id=j.user_package_id LEFT JOIN treatment_packages tp ON tp.id=up.package_id
    WHERE j.id=${id}::uuid AND (j.customer_id=${actorId}::uuid OR (b.id IS NOT NULL AND ${permission}))`);
  if(!record)throw new ApiError(404,'Record not found');
  return record;
}
const revision=(row:Row)=>createHash('sha256').update(JSON.stringify(row)).digest('hex');
export async function createJournalShare(store:Store,actorId:string,id:string,key:string){
  const record=await accessibleJournal(store,actorId,id),expiresAt=new Date(Date.now()+24*3600_000).toISOString();
  const token=jwt.sign({actorId,revision:revision(record)},key,{algorithm:'HS256',issuer:'mld-miniapp-api',audience:'journal-share',subject:id,expiresIn:'24h',jwtid:randomUUID()});
  return {path:`/share/journals/${token}`,pdfPath:`/share/journals/${token}/pdf`,expiresAt};
}
export async function sharedJournal(store:Store,token:string,key:string){
  let payload:jwt.JwtPayload;
  try{payload=jwt.verify(token,key,{algorithms:['HS256'],issuer:'mld-miniapp-api',audience:'journal-share'}) as jwt.JwtPayload;}catch{throw new ApiError(404,'Journal link is unavailable or expired');}
  if(typeof payload.actorId!=='string'||typeof payload.sub!=='string'||!/^([0-9a-f]{8}-[0-9a-f-]{27})$/i.test(payload.actorId)||!/^([0-9a-f]{8}-[0-9a-f-]{27})$/i.test(payload.sub))throw new ApiError(404,'Journal link is unavailable or expired');
  const [active]=await store.query(Prisma.sql`SELECT id FROM users WHERE id=${payload.actorId}::uuid AND is_active`);
  if(!active)throw new ApiError(404,'Journal link is unavailable or expired');
  const record=await accessibleJournal(store,payload.actorId,payload.sub);
  if(revision(record)!==payload.revision)throw new ApiError(404,'Journal link is unavailable or expired');
  return record;
}
const text=(value:unknown)=>typeof value==='string'?value:'';
const escape=(value:unknown)=>text(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const sections=(row:Row)=>[['Khách hàng',row.customer_name],['Ngày chăm sóc',row.session_date instanceof Date?row.session_date.toISOString().slice(0,10):String(row.session_date||'').slice(0,10)],['Buổi',row.session_number==null?'':String(row.session_number)],['Liệu trình',row.package_name],['Chi nhánh',row.branch_name],['Phòng',row.room_name],['Chuyên viên',row.technician_name],['Trước chăm sóc',row.condition_before],['Sau chăm sóc',row.condition_after],['Nội dung chăm sóc',row.treatment_notes],['Lời dặn',row.specialist_advice]].filter(([,value])=>value!=null&&String(value).trim());
const safePhotos=(value:unknown):string[]=>Array.isArray(value)?value.flatMap(src=>{try{const url=new URL(src);return url.protocol==='https:'&&!url.username&&!url.password?[url.href]:[];}catch{return [];}}):[];
export function journalPage(record:Row,pdfPath:string,nonce:string){
  const photos=[['Trước chăm sóc',record.before_photos],['Sau chăm sóc',record.after_photos],['Xác nhận của khách hàng',record.customer_signature_url?[record.customer_signature_url]:[]]];
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nhật ký chăm sóc MLD</title><style nonce="${nonce}">body{font:16px/1.6 system-ui;color:#183b47;margin:0;background:#f3f6fa}main{max-width:760px;margin:auto;padding:24px;background:white}h1{color:#2860eb}dt{font-weight:700;margin-top:16px}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}img{max-width:100%;max-height:440px;object-fit:contain}a{display:inline-block;padding:12px;border:1px solid #2860eb;border-radius:8px}section{margin-top:24px}</style></head><body><main><h1>Nhật ký chăm sóc</h1><p>MLD Việt Nam</p><dl>${sections(record).map(([label,value])=>`<dt>${escape(label)}</dt><dd>${escape(String(value))}</dd>`).join('')}</dl>${photos.map(([title,values])=>{const urls=safePhotos(values);return urls.length?`<section><h2>${escape(title)}</h2>${urls.map(src=>`<img src="${escape(src)}" alt="${escape(title)}" loading="lazy" referrerpolicy="no-referrer">`).join('')}</section>`:'';}).join('')}<p><a href="${escape(pdfPath)}">Tải nhật ký PDF</a></p></main></body></html>`;
}
export async function journalPdf(record:Row){
  const pdf=new PDFDocument({size:'A4',margin:42,info:{Title:'Nhật ký chăm sóc MLD',Author:'MLD Việt Nam'}}),chunks:Buffer[]=[];
  const done=new Promise<Buffer>((resolve,reject)=>{pdf.on('data',chunk=>chunks.push(chunk));pdf.on('end',()=>resolve(Buffer.concat(chunks)));pdf.on('error',reject);});
  pdf.registerFont('NotoSans',join(__dirname,'../assets/fonts/NotoSans-Regular.ttf')).font('NotoSans');
  pdf.fontSize(20).fillColor('#2860eb').text('Nhật ký chăm sóc');pdf.fontSize(11).fillColor('#183b47').text('MLD Việt Nam').moveDown();
  for(const [label,value] of sections(record)){pdf.fontSize(11).text(String(label));pdf.fontSize(12).text(String(value)).moveDown(.6);}
  for(const [label,value] of [['Ảnh trước chăm sóc',record.before_photos],['Ảnh sau chăm sóc',record.after_photos],['Chữ ký xác nhận',record.customer_signature_url?[record.customer_signature_url]:[]]]){
    const photos=safePhotos(value);if(!photos.length)continue;pdf.fontSize(11).text(String(label));for(const url of photos)pdf.fontSize(9).text(url,{link:url,underline:true}).moveDown(.3);
  }
  pdf.end();return done;
}
