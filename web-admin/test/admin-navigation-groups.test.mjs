import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/admin/navigation.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {ADMIN_NAVIGATION_GROUPS,getResourceNavigation}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const all=ADMIN_NAVIGATION_GROUPS.flatMap(group=>group.tables).map(name=>({name,title:name,group:'Đào tạo',actions:[]}));
test('enrollment tabs stay within recruitment even when the backend groups all academy resources together',()=>{
 const tabs=getResourceNavigation('course_enrollments',all,'SUPER_ADMIN');
 assert.deepEqual(tabs.map(tab=>tab.id),['academy-enrollment','course_enrollments','tuition_transactions','enrollment_change_requests','enrollment_status_history','academy_enrollment_funnel']);
 assert.ok(!tabs.some(tab=>['courses','course_batches','student_attendance'].includes(tab.id)));
});
test('canonical navigation keeps the same order when API resource order changes',()=>{
 for(const group of ADMIN_NAVIGATION_GROUPS){
  const table=group.tables[0];
  assert.deepEqual(getResourceNavigation(table,all,'SUPER_ADMIN'),getResourceNavigation(table,[...all].reverse(),'SUPER_ADMIN'));
  assert.equal(new Set(group.items.map(tab=>tab.href)).size,group.items.length);
 }
});
test('restricted accounts only see permitted resource links and their related workstation',()=>{
 const resources=all.filter(resource=>resource.name==='course_enrollments');
 assert.deepEqual(getResourceNavigation('course_enrollments',resources,'RECEPTIONIST').map(tab=>tab.id),['academy-enrollment','course_enrollments']);
});
test('attendance and course settings are distinct navigation groups',()=>{
 assert.deepEqual(getResourceNavigation('batch_schedules',all,'SUPER_ADMIN').map(tab=>tab.id),['course_batches','course_batch_assistants','batch_schedules','student_attendance','student_academic_records']);
 assert.ok(!getResourceNavigation('courses',all,'SUPER_ADMIN').some(tab=>tab.id==='course_enrollments'));
});
test('support_tickets and support_faqs are removed from CRM navigation',()=>{
 const crmGroup = ADMIN_NAVIGATION_GROUPS.find(g => g.label === 'Khách hàng (CRM)');
 assert.ok(crmGroup);
 assert.deepEqual(crmGroup.tables, ['reviews']);
 assert.deepEqual(crmGroup.items.map(i => i.id), ['customers', 'reviews']);
});
