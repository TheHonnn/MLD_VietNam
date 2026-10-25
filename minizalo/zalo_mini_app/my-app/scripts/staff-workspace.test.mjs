import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

async function bundled(path,plugins=[]){
  const result=await build({entryPoints:[fileURLToPath(new URL(path,import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('https://fixture.invalid/api')},plugins});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}

test('staff appointment search finds the actual customer, group contact, code and formatted phone',async()=>{
  const {matchesBookingSearch}=await bundled('../src/utils/booking-search.ts');
  const booking={code:'SPA-AB12',userName:'Nguyễn Thị Hương',customerName:'Trần Văn Nam',userPhone:'0900 123 456',customerPhone:'+84 911 111 111',serviceTitle:'Trị liệu chuyên sâu',items:[{serviceTitle:'Chăm sóc da'}]};
  for(const query of ['','nguyen thi huong','trần văn nam','SPA-ab12','0900123456','+84 900 123 456','0911111111','cham soc da'])assert.equal(matchesBookingSearch(booking,query),true,query);
  for(const query of ['Khách không tồn tại','0900999999','name0900123456'])assert.equal(matchesBookingSearch(booking,query),false,query);
});

test('staff warmup does not fetch personal loyalty, payments or clinical records; unavailable dashboard stays an error',async()=>{
  const originalWindow=globalThis.window;
  const paths=[];
  const writes=[];
  globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async (input,options)=>{
    const path=new URL(input).pathname.slice(4);paths.push(path);
    if(options?.method==='PATCH')writes.push(JSON.parse(options.body));
    const data=path==='/auth/settings'?{settings:null}:path==='/search/history'?{history:[]}:path==='/course-enrollments'?{enrollments:[]}:{};
    const status=path==='/staff/dashboard'?404:200;
    return Response.json({success:status===200,statusCode:status,message:status===200?'OK':'Endpoint not available',data},{status});
  }};
  try{
    const {apiClient}=await bundled('../src/api/client.ts',[{name:'isolated-zalo',setup(builder){
      builder.onResolve({filter:/^zmp-sdk$/},()=>({path:'sdk',namespace:'fixture'}));
      builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const nativeStorage={getItem:()=> 'isolated-token',setItem(){},removeItem(){}};export const getAccessToken=()=>Promise.resolve('isolated');export const getPhoneNumber=()=>Promise.resolve({token:'isolated'});export const getUserInfo=()=>Promise.resolve({});`,loader:'js'}));
    }}]);
    await apiClient.preloadPrivateData(true);
    assert.deepEqual(paths.sort(),['/auth/settings','/course-enrollments','/search/history']);
    const result=await apiClient.getStaffDashboard();assert.equal(result.status,404);assert.ok(result.error);assert.equal(result.summary,undefined);
    const details={conditionBefore:'Trước trị liệu',conditionAfter:'Sau trị liệu',specialistAdvice:'Lời dặn'};
    await apiClient.updateStaffSession('10000000-0000-0000-0000-000000000011','COMPLETED','Nội dung ca',details);
    assert.deepEqual(writes,[{status:'COMPLETED',treatmentNotes:'Nội dung ca',...details}]);
  }finally{globalThis.window=originalWindow;}
});
