import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from '../../../backend/.relay-local/browser-check/node_modules/playwright/index.mjs';

// Native bridge and HTTP fixtures only; never writes to a shared database.
const id=n=>`10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
const folder=new URL('../node_modules/.cache/mobile-parity/',import.meta.url);await mkdir(folder,{recursive:true});
const preview=process.env.PREVIEW_URL||'http://127.0.0.1:5184';
const moduleText=await(await fetch(preview+'/app.ts')).text();
const reactUrl=moduleText.match(/from "([^"]*\/react\.js[^\"]*)"/)[1],reactDomUrl=moduleText.match(/from "([^"]*\/react-dom_client\.js[^\"]*)"/)[1];
const html=`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{margin:0}button{min-height:44px}main{max-width:500px;margin:auto;padding:12px}canvas{max-width:100%}</style><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="test"></div><script type="module">
import React from '${reactUrl}';
import ReactDOM from '${reactDomUrl}';const {createRoot}=ReactDOM;
import '/css/tailwind.scss';import '/css/app.scss';
import {AttendanceDesk,AttendanceScanner} from '/components/Attendance.tsx';
import {GroupFProfile} from '/components/GroupFProfile.tsx';
import {useLocale} from '/i18n/index.ts';
const user={id:'${id(1)}',name:'Tên thật giữ nguyên',phone:'0900000001',role:'patient',staffAccess:false,points:0,totalSpent:0,tier:'STANDARD',dob:'',gender:'',email:'',address:'',avatar:''};
function TestApp(){useLocale();const [mode,setMode]=React.useState('attendance');const [saved,setSaved]=React.useState(0);return React.createElement('main',{className:'mini-app-shell'},React.createElement('button',{onClick:()=>setMode(mode==='attendance'?'profile':'attendance'),'data-testid':'mode'},'Switch test screen'),mode==='attendance'?React.createElement(React.Fragment,null,React.createElement(AttendanceDesk),React.createElement(AttendanceScanner,{courseId:'${id(22)}',enrollmentId:'${id(29)}',onSaved:()=>setSaved(x=>x+1)}),React.createElement('output',null,saved)):React.createElement(GroupFProfile,{user,vouchers:[],summary:{upcomingBookings:0,remainingTreatmentSessions:0,activeCourses:0},metadata:{referral:{code:'REAL-REF-CODE',terms:'Nội dung thật từ database'}},onUserUpdated(){},onOpenAppointments(){},onOpenPackages(){},onOpenAcademy(){},onOpenCourseCatalog(){},onOpenOnboarding(){},onVouchersUpdated(){}}));}
createRoot(document.getElementById('test')).render(React.createElement(TestApp));
</script></body></html>`;
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const page=await browser.newPage({viewport,userAgent:'Mozilla/5.0 (iPhone) Zalo'}),errors=[],diagnostics=[],writes=[];
    let language='vi',failCheckIn=true;
    page.on('pageerror',error=>errors.push(error.message));
    // Keep transport diagnostics for failures; this fixture intentionally returns HTTP 400 once.
    page.on('console',message=>{if(message.type()==='error')diagnostics.push(message.text());});
    page.on('requestfailed',request=>diagnostics.push(new URL(request.url()).pathname+': '+request.failure()?.errorText));
    await page.addInitScript(()=>{window.parityFixture={scans:0,content:'MLD-ATTENDANCE:isolated-fixture',shares:[]};});
    await page.route('**/mobile-parity-check',route=>route.fulfill({contentType:'text/html',body:html}));
    await page.route('**/node_modules/.vite/deps/zmp-sdk.js*',route=>route.fulfill({contentType:'application/javascript',body:`
      export const nativeStorage={getItem:()=> 'fixture-session',setItem(){},removeItem(){}};
      export const getAccessToken=async()=> 'fixture-access';export const getPhoneNumber=async()=>({token:'fixture-phone'});export const getUserInfo=async()=>({userInfo:{}});
      export const scanQRCode=async()=>{window.parityFixture.scans++;return {content:window.parityFixture.content};};
      export const openShareSheet=async request=>{window.parityFixture.shares.push(request);};export const events={on(){},off(){}};export const EventName={};
    `}));
    await page.route('**/api/**',async route=>{
      const request=route.request(),url=new URL(request.url()),path=url.pathname;
      if(!/\/api\/(staff\/class-schedules|courses\/[^/]+\/attendance|auth\/settings|membership|transactions)/.test(path)){await route.continue();return;}
      let data={},status=200,message='OK';
      if(path.endsWith('/staff/class-schedules'))data={schedules:[{id:id(150),topic:'Chủ đề thật của lớp',courseTitle:'Khóa học từ database',batchCode:'CLASS-1',branchName:'Cơ sở lớp học',sessionDate:'2026-10-27',startTime:'09:00',endTime:'12:00',attendanceOpen:true}]};
      else if(path.endsWith('/attendance-code'))data={content:'MLD-ATTENDANCE:isolated-fixture',expiresAt:new Date(Date.now()+120000).toISOString()};
      else if(path.endsWith('/attendance')){writes.push(request.postDataJSON());if(failCheckIn){status=400;message='Attendance QR code has expired or is invalid';}else data={attendance:{id:id(160),status:'PRESENT',enrollmentId:id(29)}};}
      else if(path.endsWith('/auth/settings')){if(request.method()==='PUT'){language=request.postDataJSON().language;writes.push(request.postDataJSON());}data={settings:{language,appointmentReminder:true,promotionNotify:true,systemNotify:true,biometricEnabled:false}};}
      else if(path.endsWith('/membership'))data={user:{id:id(1),referralCode:'REAL-REF-CODE'},summary:{},referrals:[],vouchers:[]};
      else if(path.endsWith('/transactions'))data={invoices:[],pointTransactions:[],totalSpent:0};
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status<400,statusCode:status,message,data})});
    });
    try{
      await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:5184')+'/mobile-parity-check');
      await page.getByRole('button',{name:'Điểm danh lớp học',exact:true}).click({timeout:10000}).catch(async error=>{console.error(JSON.stringify({errors,body:await page.locator('body').innerText()}));throw error;});
      await page.getByRole('button',{name:'Hiển thị mã QR điểm danh'}).click();await page.locator('canvas,img').first().waitFor();
      await page.getByRole('button',{name:'Quét QR điểm danh',exact:true}).click();
      await page.getByText('Mã QR đã hết hạn hoặc không hợp lệ. Hãy quét mã mới tại lớp.',{exact:true}).waitFor();
      assert.equal(await page.locator('output').textContent(),'0');
      failCheckIn=false;await page.getByRole('button',{name:'Quét QR điểm danh',exact:true}).click();
      await page.getByText('Đã lưu điểm danh.',{exact:true}).waitFor();assert.equal(await page.locator('output').textContent(),'1');
      assert.deepEqual(writes[0],{enrollmentId:id(29),content:'MLD-ATTENDANCE:isolated-fixture'});
      await page.getByTestId('mode').click();await page.getByText('Tên thật giữ nguyên',{exact:true}).first().waitFor();
      await page.getByText('Giới thiệu bạn bè',{exact:true}).click();
      await page.getByRole('button',{name:'Chia sẻ mã',exact:true}).click();
      assert.equal((await page.evaluate(()=>window.parityFixture.shares))[0].data.text.includes('REAL-REF-CODE'),true);
      await page.locator('[role="dialog"][aria-label="Giới thiệu bạn bè"] button').first().click();
      await page.getByText('Cài đặt tài khoản & Bảo mật',{exact:true}).click();
      await page.getByLabel('Ngôn ngữ giao diện',{exact:true}).selectOption('en');
      await page.getByText('Display language',{exact:true}).waitFor();assert.equal(language,'en');assert.ok(writes.some(body=>body.language==='en'));
      await page.getByLabel('Display language',{exact:true}).selectOption('vi');await page.getByText('Ngôn ngữ giao diện',{exact:true}).waitFor();
      await page.screenshot({path:fileURLToPath(new URL(`${useWebKit?'webkit':'chromium'}-${viewport.width}.png`,folder))});
      assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',viewport,qrErrorsRecover:true,attendancePayload:true,referralSharing:true,languagePersisted:true,nativeAndDataSimulated:true}));
    }catch(error){console.error(JSON.stringify({errors,diagnostics,body:(await page.locator('body').innerText()).slice(0,1800)}));throw error;}
    finally{await page.close();}
  }
}finally{await browser.close();}
