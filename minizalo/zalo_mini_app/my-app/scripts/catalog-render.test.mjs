import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

// Isolate images and native bridge imports; render the real catalog/course components.
const result = await build({
  stdin: {contents: `import React from 'react';
    import {renderToStaticMarkup} from 'react-dom/server.browser';
    import {AcademyCourseDetail, AcademyCatalog} from './src/components/AcademyViews';
    import {HomeCatalog} from './src/components/GroupBHome';
    export {trainingMetadata} from './src/utils/training-metadata';
    export {adaptCourse} from './src/api/adapters';
    export const renderCourse = course => renderToStaticMarkup(React.createElement(AcademyCourseDetail, {course}));
    export const renderAcademy = courses => renderToStaticMarkup(React.createElement(AcademyCatalog, {courses, branches:[], branchId:''}));
    export const renderCatalog = props => renderToStaticMarkup(React.createElement(HomeCatalog, props));`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader:'tsx'},
  bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',
  plugins:[{name:'isolated-media',setup(builder){
    builder.onResolve({filter:/GroupBExtensions$/},()=>({path:'media',namespace:'fixture'}));
    builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const EntityImage=()=>null;export const BranchHours=()=>null;',loader:'js'}));
  }}],
});
const {renderCourse,renderCatalog,renderAcademy,trainingMetadata,adaptCourse}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('course outline retains unassigned lessons without duplicating chapter lessons',()=>{
  const html=renderCourse({title:'Course from API',category:'',price:100,totalHours:3,lessonsCount:3,
    chapters:[{id:'chapter-1',title:'Existing chapter'}],
    lessons:[{id:'one',title:'Linked lesson',chapterId:'chapter-1',duration:'10 phút'},
      {id:'two',title:'Unassigned lesson',duration:'20 phút'},
      {id:'three',title:'Unresolved chapter lesson',chapterId:'chapter-other',duration:'30 phút'}]});
  for(const title of ['Linked lesson','Unassigned lesson','Unresolved chapter lesson']){
    assert.equal(html.split(title).length-1,1,title);
  }
  const empty=renderCourse({title:'Empty course',category:'',price:0,totalHours:0,lessonsCount:0,lessons:[]});
  assert.equal(empty.includes('aria-label="Danh sách bài học"'),false);
});

test('catalog derives categories from actual services when metadata is empty',()=>{
  const html=renderCatalog({services:[{id:'service-1',title:'Actual service',category:'Actual category',description:'',durationMinutes:60,price:100}],
    doctors:[],branches:[],metadata:{serviceCategories:[]}});
  assert.ok(html.includes('<option value="Actual category">Actual category</option>'));
});

test('mobile training metadata survives adaptation without fabricated audience or goals',()=>{
  for(const raw of [{target_audience:'Nhân viên y tế',target_need:'Bổ sung chuyên môn',course_group:'Đang làm nghề'},
    {targetAudience:'Nhân viên y tế',targetNeed:'Bổ sung chuyên môn',courseGroup:'Đang làm nghề'}]){
    const source={id:'course-1',title:'Khóa học thực',level:'ADVANCED',totalHours:12,tuitionFee:500,lessons:[],learningOutcomes:JSON.stringify(raw)};
    const course=adaptCourse(source);
    assert.equal(trainingMetadata(course).targetAudience,'Nhân viên y tế');
    assert.equal(trainingMetadata(course).targetNeed,'Bổ sung chuyên môn');
    assert.equal(trainingMetadata(course).courseGroup,'Đang làm nghề');
    assert.deepEqual(course.learningOutcomes,[]);
    const html=renderAcademy([course]);
    assert.ok(html.includes('<option>Nhân viên y tế</option>'));
    assert.ok(html.includes('<option>Bổ sung chuyên môn</option>'));
    assert.ok(renderCourse(course).includes('Đối tượng: Nhân viên y tế'));
  }
  assert.deepEqual(trainingMetadata({learningOutcomes:'invalid JSON'}),{targetAudience:'',targetNeed:'',courseGroup:'',learningOutcomes:[]});
  const goals=['Mục tiêu từ database',{title:'Thực hành'}];
  assert.deepEqual(trainingMetadata({learningOutcomes:goals}).learningOutcomes,goals);
});
