import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { createApp } from '../../dist/server.js';
import {migrateFixture} from './migrations.mjs';

// Test-only records, always in memory. Never connect this fixture to a shared DB.
export async function workflowFixture() {
  const db = new PGlite();
  const schema = await readFile(new URL('../../../../database/schema.sql', import.meta.url), 'utf8');
  await db.exec(schema.split(/\r?\n/).filter(line => !line.startsWith('CREATE EXTENSION') && !line.includes('gin_trgm_ops')).join('\n'));
  await migrateFixture(db);
  const id = n => `10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
  await db.exec(`
    INSERT INTO users(id,phone,full_name,referral_code) VALUES('${id(1)}','0900000001','Workflow customer','WF1'),('${id(2)}','0900000002','Other customer','WF2');
    INSERT INTO branches(id,name,code,phone,address,district,latitude,longitude,image_url) VALUES('${id(3)}','Workflow branch','WF','0900000003','Workflow address','District',10,106,'');
    INSERT INTO service_categories(id,name,code,icon_url) VALUES('${id(4)}','Workflow care','WF','');
    INSERT INTO services(id,category_id,name,slug,short_description,full_description,price,duration_minutes,image_url,steps,benefits) VALUES
      ('${id(5)}','${id(4)}','Workflow service','wf-service','Short description','Full treatment description',100000,60,'','[{"title":"Assessment","desc":"Check the actual condition"},{"title":"Care","desc":"Perform configured care"}]','["Configured benefit"]'),
      ('${id(6)}','${id(4)}','Additional service','wf-extra','Short description','Extra description',50000,30,'','[]','[]');
    INSERT INTO technicians(id,branch_id,full_name,avatar_url) VALUES('${id(7)}','${id(3)}','Workflow specialist','');
    INSERT INTO branch_rooms(id,branch_id,name) VALUES('${id(8)}','${id(3)}','Workflow room');
    INSERT INTO treatment_packages(id,name,service_id,total_sessions,price,description,image_url) VALUES('${id(9)}','Workflow package','${id(5)}',5,400000,'Actual package description','');
    INSERT INTO user_packages(id,customer_id,package_id,total_sessions,completed_sessions,expires_at) VALUES('${id(10)}','${id(1)}','${id(9)}',4,1,'2099-12-31');
    INSERT INTO bookings(id,booking_code,customer_id,branch_id,technician_id,booking_date,start_time,end_time,status,base_total,final_price,qr_code_hash) VALUES
      ('${id(11)}','WF-COMPLETED','${id(1)}','${id(3)}','${id(7)}','2020-01-01','10:00','11:00','COMPLETED',100000,100000,'WF-QR-COMPLETED'),
      ('${id(13)}','WF-FUTURE','${id(1)}','${id(3)}','${id(7)}','2099-01-10','10:00','11:30','CONFIRMED',125000,125000,'WF-QR-FUTURE');
    INSERT INTO booking_items(booking_id,service_id,technician_id,price,duration_minutes) VALUES
      ('${id(11)}','${id(5)}','${id(7)}',100000,60),('${id(13)}','${id(5)}','${id(7)}',100000,60),('${id(13)}','${id(6)}','${id(7)}',25000,30);
    INSERT INTO technician_slots(id,technician_id,branch_id,slot_date,start_time,end_time,status) VALUES
      ('${id(16)}','${id(7)}','${id(3)}','2099-01-12','08:00','09:00','AVAILABLE'),
      ('${id(17)}','${id(7)}','${id(3)}','2099-01-12','10:00','12:00','AVAILABLE'),
      ('${id(18)}','${id(7)}','${id(3)}','2099-01-10','10:00','11:30','BOOKED');
    INSERT INTO treatment_journal(id,user_package_id,booking_id,customer_id,technician_id,assigned_room_id,session_number,session_date,condition_before,condition_after,treatment_notes,specialist_advice,customer_signature_url) VALUES
      ('${id(12)}','${id(10)}','${id(11)}','${id(1)}','${id(7)}','${id(8)}',1,'2020-01-01','Before condition','After condition','Actual care notes','Actual specialist advice','https://example.test/signature.png');
    INSERT INTO course_categories(id,name,code,icon_url) VALUES('${id(20)}','Workflow academy','WF','');
    INSERT INTO instructors(id,full_name,avatar_url,bio) VALUES('${id(21)}','Workflow instructor','','Actual instructor biography');
    INSERT INTO courses(id,category_id,primary_instructor_id,title,code,short_description,full_description,image_url) VALUES('${id(22)}','${id(20)}','${id(21)}','Workflow course','WF','Course summary','Full course description','');
    INSERT INTO course_chapters(id,course_id,title) VALUES('${id(23)}','${id(22)}','Workflow chapter');
    INSERT INTO course_lessons(id,chapter_id,title,lesson_type,content_text) VALUES
      ('${id(24)}','${id(23)}','Practice lesson','PRACTICE_GUIDE','Actual practice instructions'),
      ('${id(25)}','${id(23)}','Reading lesson','READING_DOC','Actual reading material'),
      ('${id(31)}','${id(23)}','Quiz lesson','QUIZ','');
    INSERT INTO course_quizzes(id,course_id,title,passing_score) VALUES('${id(26)}','${id(22)}','Workflow quiz',7);
    INSERT INTO quiz_questions(id,quiz_id,question_number,question_text,options,correct_option) VALUES
      ('${id(27)}','${id(26)}',1,'First question','{"A":"First option","B":"Second option"}','A'),
      ('${id(28)}','${id(26)}',2,'Second question','["Option one","Option two"]','B');
    INSERT INTO course_batches(id,course_id,branch_id,batch_code,instructor_id,start_date,end_date,schedule_text) VALUES
      ('${id(30)}','${id(22)}','${id(3)}','WF-CLASS','${id(21)}','2099-01-01','2099-02-01','Actual class schedule'),
      ('${id(33)}','${id(22)}','${id(3)}','WF-OTHER-CLASS','${id(21)}','2099-03-01','2099-04-01','Other actual schedule');
    INSERT INTO course_enrollments(id,student_id,course_id,batch_id,status) VALUES
      ('${id(29)}','${id(1)}','${id(22)}','${id(30)}','STUDYING'),
      ('${id(32)}','${id(1)}','${id(22)}','${id(33)}','STUDYING');
  `);
  await db.exec('INSERT INTO miniapp_technician_services(technician_id,service_id) SELECT t.id,s.id FROM technicians t CROSS JOIN services s');
  const store = client => ({ query: async q => (await client.query(q.text,q.values.map(value => Prisma.Decimal.isDecimal(value) ? value.toString() : value))).rows,
    transaction: run => client.transaction(tx => run(store(tx))) });
  const secret = 'isolated-workflow-audit-secret';
  const server = createApp(store(db),{jwtSecret:secret}).listen(0,'127.0.0.1');
  await once(server,'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = (owner=1) => ({'Content-Type':'application/json',Authorization:`Bearer ${jwt.sign({sub:id(owner)},secret)}`});
  const request = async (path,{method='GET',body,owner=1,anonymous=false}={}) => {
    if(method==='POST' && /\/quiz\/submit$/.test(path) && !Object.hasOwn(body || {},'attemptId')) {
      const started=await request(path.replace('/submit','/start'),{method:'POST',body:{quizId:body?.quizId,enrollmentId:body?.enrollmentId},owner,anonymous});
      if(started.status!==200) return started;
      body={...body,attemptId:started.data.attempt.id};
    }
    const response = await fetch(base+'/api'+path,{method,headers:anonymous?{'Content-Type':'application/json'}:headers(owner),body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,...await response.json()};
  };
  return {db,id,base,headers,request,close:async()=>{await new Promise(resolve=>server.close(resolve));await db.close();}};
}
