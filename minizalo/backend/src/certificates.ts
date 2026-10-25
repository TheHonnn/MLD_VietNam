import {Prisma} from '@prisma/client';
import {createHmac,timingSafeEqual} from 'node:crypto';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';

const signature=(record:Row,key:string)=>createHmac('sha256',key).update(`mld-certificate-verification-v1\0${record.id}\0${record.qr_verification_code}`).digest('base64url');
export function certificateVerification(record:Row,key:string){
  const today=new Date(Date.now()+7*3600_000).toISOString().slice(0,10);
  const path=record.status==='ISSUED'&&typeof record.issue_date==='string'&&record.issue_date<=today&&typeof record.qr_verification_code==='string'&&record.qr_verification_code.trim()
    ?`/verify/certificates/${record.id}.${signature(record,key)}`:null;
  return {...record,verification_path:path};
}

export async function verifyCertificate(store:Store,token:unknown,key:string){
  const match=typeof token==='string'?/^([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/i.exec(token):null;
  if(!match)throw new ApiError(404,'Certificate verification is unavailable');
  const [record]=await store.query(Prisma.sql`SELECT cert.id,cert.qr_verification_code,cert.certificate_code,cert.student_name,cert.course_title,
    cert.status,to_char(cert.issue_date,'YYYY-MM-DD') AS issue_date FROM student_certificates cert
    JOIN course_enrollments ce ON ce.id=cert.enrollment_id AND ce.student_id=cert.student_id AND ce.course_id=cert.course_id
    WHERE cert.id=${match[1]}::uuid AND cert.status IN ('ISSUED','REVOKED') AND cert.issue_date<=(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`);
  if(!record||!record.qr_verification_code?.trim()||!timingSafeEqual(Buffer.from(match[2]),Buffer.from(signature(record,key))))throw new ApiError(404,'Certificate verification is unavailable');
  return {certificate_code:record.certificate_code,student_name:record.student_name,course_title:record.course_title,issue_date:record.issue_date,status:record.status};
}

const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function certificateVerificationPage(record:Row|null,nonce:string){
  const issued=record?.status==='ISSUED';
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>Tra cứu giấy chứng nhận | MLD Việt Nam</title><style nonce="${nonce}">*{box-sizing:border-box}body{margin:0;background:#f0f8fa;color:#183b47;font:16px/1.6 system-ui,sans-serif;letter-spacing:0}main{max-width:680px;margin:auto;min-height:100vh;padding:max(24px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(32px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}header{border-bottom:1px solid #c8dde3;padding:12px 0;color:#087e9c;font-weight:700}h1{font-size:24px;line-height:1.35;margin:28px 0 16px;overflow-wrap:anywhere}.status{font-weight:700;color:${issued?'#166534':'#9f2424'}}dl{margin:24px 0}dl>div{padding:12px 0;border-bottom:1px solid #c8dde3}dt{color:#526a73;font-size:14px}dd{margin:4px 0 0;overflow-wrap:anywhere}footer{border-top:1px solid #c8dde3;padding-top:20px;font-size:14px}</style></head><body><main><header>MLD Việt Nam</header><h1>Tra cứu giấy chứng nhận</h1>${record?`<p class="status">${issued?'Đã cấp':'Đã thu hồi'}</p><dl>${[['Mã giấy chứng nhận',record.certificate_code],['Họ tên',record.student_name],['Chương trình đào tạo',record.course_title],['Ngày cấp',String(record.issue_date).split('-').reverse().join('/')]].map(([label,value])=>`<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><footer>${issued?'Thông tin đối chiếu từ bản ghi giấy chứng nhận của MLD Việt Nam.':'Giấy chứng nhận này đã được thu hồi.'}</footer>`:'<p class="status">Không xác minh được giấy chứng nhận.</p>'}</main></body></html>`;
}

// Issued records outlive learning access; private media and drafts are never returned.
export const certificateSelect=Prisma.sql`SELECT cert.id,cert.enrollment_id,cert.course_id,cert.student_name,cert.course_title,
  cert.certificate_code,to_char(cert.issue_date,'YYYY-MM-DD') AS issue_date,cert.final_grade,cert.status,cert.revocation_reason,cert.created_at,
  to_char(u.date_of_birth,'YYYY-MM-DD') AS student_date_of_birth,
  CASE WHEN cert.status='ISSUED' THEN cert.certificate_pdf_url ELSE NULL END AS certificate_pdf_url,
  CASE WHEN cert.status='ISSUED' THEN cert.qr_verification_code ELSE NULL END AS qr_verification_code
  FROM student_certificates cert JOIN users u ON u.id=cert.student_id
  JOIN course_enrollments ce ON ce.id=cert.enrollment_id AND ce.student_id=cert.student_id AND ce.course_id=cert.course_id`;
