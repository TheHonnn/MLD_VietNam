import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../zalo_mini_app/my-app/src/api/adapters.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const adapters = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('catalog text filtering supports Vietnamese accents, case and whitespace without inventing matches', async () => {
  const source = await readFile(new URL('../../zalo_mini_app/my-app/src/utils/catalog.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const { searchText, vietnamToday } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  assert.equal(searchText('  CHĂM  SÓC ĐẦU  '), 'cham soc dau');
  assert.ok(searchText('Chi nhánh Quận 3').includes(searchText('quan 3')));
  assert.equal(searchText('Massage').includes(searchText('khóa học')), false);
  assert.match(vietnamToday(), /^\d{4}-\d{2}-\d{2}$/);
});

test('catalog adapters preserve admin data without invented ratings or fees', () => {
  const service = adapters.adaptService({ id:'service',name:'Admin title',price:'123000',discountPrice:null,
    imageUrl:'https://example.test/admin.jpg',shortDescription:'Admin text',ratingAvg:null,reviewCount:0 });
  assert.equal(service.title,'Admin title');
  assert.equal(service.price,123000);
  assert.equal(service.image,'https://example.test/admin.jpg');
  assert.equal(service.description,'Admin text');
  assert.equal(service.rating,null);
  assert.equal('indicatorsCount' in service,false);
  assert.equal('preparationNotes' in service,false);
  const changed = adapters.adaptService({ name:'Changed by admin',price:'999000',discountPrice:'750000',ratingAvg:'4.25',reviewCount:4 });
  assert.equal(changed.title,'Changed by admin');
  assert.equal(changed.price,750000);
  assert.equal(changed.originalPrice,999000);
  assert.equal(changed.rating,4.25);
  const doctor = adapters.adaptDoctor({ fullName:'Admin technician',specialties:[],ratingAvg:null,reviewCount:0 });
  assert.equal(doctor.rating,null);
  assert.equal('consultationFee' in doctor,false);
});

test('course adapter counts real lessons instead of a stored default and does not invent ratings', () => {
  const course = adapters.adaptCourse({ title:'Admin course',totalHours:72,totalLessons:20,tuitionFee:'5000000',
    depositAmount:'1000000',modulesCount:1,lessons:[{id:'lesson',durationMinutes:15,title:'Actual lesson'}] });
  assert.equal(course.lessonsCount,1);
  assert.equal(course.price,5000000);
  assert.equal(course.lessons[0].title,'Actual lesson');
  assert.equal('rating' in course,false);
});

test('missing gender stays unspecified and explicit Other remains distinct', () => {
  const account = { fullName:'Customer',role:'CUSTOMER',membershipTier:'GOLD',rewardPoints:350 };
  const unspecified = adapters.adaptUser({...account,gender:null});
  assert.equal(unspecified.gender,'');
  assert.equal(unspecified.tier,'Gold');
  assert.equal(unspecified.points,350);
  assert.equal(adapters.profileToCanonical({gender:''}).gender,null);
  assert.equal(adapters.profileToCanonical({gender:'Khác'}).gender,'OTHER');
});

test('care records do not fabricate clinical measurements or prescriptions', () => {
  const record = adapters.adaptRecord({id:'journal',customerId:'customer',treatmentNotes:'Admin treatment notes'});
  assert.equal(record.treatmentNotes,'Admin treatment notes');
  for (const field of ['labIndicators','prescription','vitalSigns']) assert.equal(field in record,false);
  const plan=adapters.adaptTreatmentPlan({totalSessions:5,completedSessions:1,status:'ACTIVE',sessions:[{sessionDate:'2026-10-16',technicianName:'Actual specialist'}]});
  assert.equal(plan.remainingSessions,4);
  assert.equal('status' in plan.sessions[0],false);
});

test('missing catalog descriptions stay blank and every real quiz retains its own questions', () => {
  assert.equal(adapters.adaptService({name:'Actual service',price:0}).description,'');
  const course=adapters.adaptCourse({title:'Actual course',totalHours:0,tuitionFee:0,quizzes:[
    {id:'q1',title:'First',passingScore:7,questions:[]},
    {id:'q2',title:'Second',passingScore:8,questions:[{id:'question',questionText:'Actual question',options:{B:'Two',A:'One'},correctOption:'A'}]},
  ]});
  assert.equal(course.description,'');
  assert.equal(course.quizzes.length,2);
  assert.equal(course.quizzes[1].passingScore,80);
  assert.deepEqual(course.quizzes[1].questions[0].optionKeys,['A','B']);
  assert.equal('correctOption' in course.quizzes[1].questions[0],false);
});
