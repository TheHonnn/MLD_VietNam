import {Prisma} from '@prisma/client';

export type PortalAudience={staff:boolean;member:boolean;actorId:string|null;role:string};
// Read optional Admin columns through JSON so older databases remain readable.
const doc=Prisma.sql`to_jsonb(c)`;
const course=Prisma.sql`NULLIF(${doc}->>'course_id','')`;
export const approvedDocumentEnrollment=(scope:PortalAudience)=>Prisma.sql`SELECT ce.id FROM course_enrollments ce
  JOIN courses course ON course.id=ce.course_id AND course.is_active
  JOIN course_categories category ON category.id=course.category_id AND category.is_active
  LEFT JOIN miniapp_course_access access ON access.enrollment_id=ce.id
  WHERE ce.student_id=${scope.actorId}::uuid AND ce.status IN ('ENROLLED','STUDYING','GRADUATED')
    AND COALESCE(NULLIF(to_jsonb(ce)->>'approval_status',''),'APPROVED')='APPROVED'
    AND (${course} IS NULL OR ce.course_id::text=${course})
    AND NOT COALESCE(access.is_suspended,false) AND (access.expires_at IS NULL OR access.expires_at>clock_timestamp())`;
export function portalDocumentPolicy(scope:PortalAudience){
  const enrolled=Prisma.sql`EXISTS(${approvedDocumentEnrollment(scope)})`;
  const admin=['ADMIN','SUPER_ADMIN'].includes(scope.role)&&scope.staff;
  const access=Prisma.sql`UPPER(COALESCE(NULLIF(${doc}->>'access_level',''),'STAFF_ONLY'))`;
  const restricted=Prisma.sql`${access} NOT IN ('PUBLIC','FREE_TRIAL')`;
  const roles=Prisma.sql`CASE WHEN jsonb_typeof(${doc}->'allowed_roles')='array' THEN ${doc}->'allowed_roles' ELSE NULL END`;
  const roleAllowed=Prisma.sql`(${roles} IS NULL OR ${roles} ? ${scope.role} OR (${enrolled} AND ${roles} ? 'STUDENT'))`;
  const readable=Prisma.sql`(UPPER(c.kind)<>'DOCUMENT' OR ${admin} OR (
    (NOT (${restricted}) OR (${roleAllowed} AND (${course} IS NULL OR ${enrolled})))
    AND (${access}<>'COURSE_ENROLLED' OR ${enrolled})))`;
  const paid=Prisma.sql`EXISTS(SELECT 1 FROM course_enrollments ce WHERE ce.id IN (${approvedDocumentEnrollment(scope)})
    AND (to_jsonb(ce)->>'payment_status'='PAID' OR ce.amount_paid>=COALESCE(NULLIF(to_jsonb(ce)->>'final_tuition','')::numeric,ce.tuition_total)))`;
  const downloadable=Prisma.sql`((UPPER(c.kind)<>'DOCUMENT' OR COALESCE((${doc}->>'allow_download')::boolean,false))
    AND (NOT (${restricted}) OR ${course} IS NULL OR NOT COALESCE((${doc}->>'require_full_payment')::boolean,true) OR ${paid} OR ${admin}))`;
  return {readable,downloadable,enrolled,access};
}
