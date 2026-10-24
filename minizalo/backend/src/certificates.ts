import {Prisma} from '@prisma/client';

// Issued records outlive learning access; private media and drafts are never returned.
export const certificateSelect=Prisma.sql`SELECT cert.id,cert.enrollment_id,cert.course_id,cert.student_name,cert.course_title,
  cert.certificate_code,to_char(cert.issue_date,'YYYY-MM-DD') AS issue_date,cert.final_grade,cert.status,cert.revocation_reason,cert.created_at,
  to_char(u.date_of_birth,'YYYY-MM-DD') AS student_date_of_birth,
  CASE WHEN cert.status='ISSUED' THEN cert.certificate_pdf_url ELSE NULL END AS certificate_pdf_url,
  CASE WHEN cert.status='ISSUED' THEN cert.qr_verification_code ELSE NULL END AS qr_verification_code
  FROM student_certificates cert JOIN users u ON u.id=cert.student_id
  JOIN course_enrollments ce ON ce.id=cert.enrollment_id AND ce.student_id=cert.student_id AND ce.course_id=cert.course_id`;
