import {Prisma} from '@prisma/client';

// The canonical level stays authoritative unless an operator explicitly overrides it.
export const courseAudienceSql=Prisma.sql`COALESCE((SELECT audience FROM miniapp_course_audiences WHERE course_id=c.id),
  CASE WHEN c.level='BEGINNER' THEN 'BEGINNER'
       WHEN c.level IN ('INTERMEDIATE','ADVANCED','MASTER') THEN 'PRACTITIONER' ELSE NULL END)`;
