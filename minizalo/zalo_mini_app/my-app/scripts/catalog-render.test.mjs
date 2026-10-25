import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

// Isolate images and native bridge imports; render the real catalog/course components.
const result = await build({
  stdin: {contents: `import React from 'react';
    import {renderToStaticMarkup} from 'react-dom/server.browser';
    import {AcademyCourseDetail} from './src/components/AcademyViews';
    import {HomeCatalog} from './src/components/GroupBHome';
    export const renderCourse = course => renderToStaticMarkup(React.createElement(AcademyCourseDetail, {course}));
    export const renderCatalog = props => renderToStaticMarkup(React.createElement(HomeCatalog, props));`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader:'tsx'},
  bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',
  plugins:[{name:'isolated-media',setup(builder){
    builder.onResolve({filter:/GroupBExtensions$/},()=>({path:'media',namespace:'fixture'}));
    builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const EntityImage=()=>null;export const BranchHours=()=>null;',loader:'js'}));
  }}],
});
const {renderCourse,renderCatalog}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

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
