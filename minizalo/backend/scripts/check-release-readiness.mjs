import {Prisma} from '@prisma/client';
import {prisma} from '../dist/lib/prisma.js';
import {createStore,validateSharedSchema} from '../dist/store.js';
try{
  const store=createStore(prisma);await validateSharedSchema(store);
  const [counts]=await store.query(Prisma.sql`SELECT
    (SELECT count(*)::int FROM services s JOIN service_categories c ON c.id=s.category_id WHERE s.is_active AND c.is_active) AS active_services,
    (SELECT count(*)::int FROM services s JOIN service_categories c ON c.id=s.category_id WHERE s.is_active AND c.is_active AND EXISTS(
      SELECT 1 FROM miniapp_technician_services ms JOIN technicians t ON t.id=ms.technician_id JOIN branches b ON b.id=t.branch_id WHERE ms.service_id=s.id AND ms.is_active AND t.is_active AND b.is_active)) AS assigned_services,
    (SELECT count(*)::int FROM technician_slots ts JOIN technicians t ON t.id=ts.technician_id JOIN branches b ON b.id=ts.branch_id WHERE ts.status='AVAILABLE' AND t.is_active AND b.is_active AND t.branch_id=ts.branch_id
      AND ts.start_time>=b.opening_time AND ts.end_time<=b.closing_time AND (ts.slot_date+ts.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'>clock_timestamp()
      AND EXISTS(SELECT 1 FROM miniapp_technician_services ms JOIN services s ON s.id=ms.service_id WHERE ms.technician_id=t.id AND ms.is_active AND s.is_active)) AS future_qualified_slots,
    (SELECT count(*)::int FROM course_lessons) AS lessons,(SELECT count(*)::int FROM quiz_questions) AS quiz_questions,
    (SELECT count(*)::int FROM batch_schedules) AS class_schedules,(SELECT count(*)::int FROM home_care_guidelines WHERE is_published) AS published_care_guides,
    (SELECT count(*)::int FROM support_faqs WHERE is_active) AS active_faqs`);
  const requiredData=[];
  if(counts.assigned_services<counts.active_services)requiredData.push('Configure actual technician-service assignments.');
  if(!counts.future_qualified_slots)requiredData.push('Enter actual future technician availability.');
  if(!counts.lessons||!counts.quiz_questions||!counts.class_schedules)requiredData.push('Enter actual learning content, quiz questions and class schedules.');
  console.log(JSON.stringify({readOnly:true,counts,requiredData,nativeDeviceAcceptanceRequired:true,paymentIntegrationDeferred:true},null,2));
}catch{console.error('Readiness check failed. Verify schema and private database access.');process.exitCode=1;}
finally{await prisma.$disconnect();}
