import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from '../../../backend/.relay-local/browser-check/node_modules/playwright/index.mjs';

const fixtureSdk=`const f=window.authFixture={reads:0,writes:0,removes:0,phones:0,deny:false,delay:false};
export const nativeStorage={getItem(){f.reads++;throw new DOMException('Storage denied','SecurityError');},setItem(){f.writes++;throw new DOMException('Storage denied','SecurityError');},removeItem(){f.removes++;throw new DOMException('Storage denied','SecurityError');}};
export const getPhoneNumber=()=>{f.phones++;return f.deny?Promise.reject(new DOMException('Permission denied','NotAllowedError')):f.delay?new Promise(resolve=>{f.finishPhone=resolve;}):Promise.resolve({token:'isolated-phone'});};
export const getAccessToken=()=>Promise.resolve('isolated-access');export const getUserInfo=()=>Promise.resolve({userInfo:{}});`;
const output=await build({entryPoints:[fileURLToPath(new URL('../src/api/client.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('https://fixture.invalid/api')},plugins:[{name:'isolated-native-bridge',setup(builder){builder.onResolve({filter:/^zmp-sdk$/},()=>({path:'zmp-sdk',namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:fixtureSdk,loader:'js'}));}}]});
const folder=new URL('../node_modules/.cache/mld-auth-tests/',import.meta.url);await mkdir(folder,{recursive:true});
const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const page=await browser.newPage({viewport,userAgent:'Mozilla/5.0 (iPhone) Zalo'}),errors=[];let requests=0,reason='Staff booking access is required';
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/api/client.ts*',route=>route.fulfill({status:200,contentType:'text/javascript',body:output.outputFiles[0].text}));
      await page.route('https://fixture.invalid/api/**',async route=>{
        const request=route.request(),path=new URL(request.url()).pathname;let data={},status=200,message='OK';
        if(path==='/api/auth/zalo'){requests++;assert.equal(request.postDataJSON().audience,'staff');status=403;message=reason;}
        else if(path==='/api/app-metadata')data={serviceCategories:[],courseCategories:[],instructors:[],membershipTiers:[],faqs:[],loyaltySettings:null};
        else{
          const field={'/api/services':'services','/api/doctors':'doctors','/api/branches':'branches','/api/courses':'courses','/api/care-guidelines':'guidelines','/api/support-faqs':'faqs','/api/search/popular':'popularSearches'}[path];
          if(field)data={[field]:[]};else{status=401;message='Shared account authentication is required';}
        }
        await route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,statusCode:status,message,data})});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5182/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
      const consent=page.locator('.zalo-consent-screen');await consent.getByRole('button',{name:'Tiếp tục với Zalo',exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>window.authFixture.phones),0);
      await consent.getByRole('button',{name:'Tiếp tục với Zalo',exact:true}).evaluate(button=>{button.click();button.click();});
      await consent.locator('[data-auth-issue="STAFF_ACCESS_REQUIRED"]').waitFor();assert.equal(requests,1);
      assert.deepEqual(await page.evaluate(()=>[window.authFixture.reads,window.authFixture.writes,window.authFixture.removes]),[1,0,0]);
      assert.equal(await consent.getByText('Mã hỗ trợ: STAFF_ACCESS_REQUIRED',{exact:true}).count(),1);
      await page.screenshot({path:fileURLToPath(new URL(`consent-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,folder))});
      await consent.getByRole('button',{name:'Đổi tài khoản / dùng máy khác',exact:true}).click();
      reason='Active staff profile and branch are required';await consent.getByRole('button',{name:'Đăng nhập lại với Zalo',exact:true}).click();
      await consent.locator('[data-auth-issue="STAFF_PROFILE_INACTIVE"]').waitFor();assert.equal(requests,2);
      await page.evaluate(()=>{window.authFixture.deny=true;});await consent.getByRole('button',{name:'Tiếp tục với Zalo',exact:true}).click();
      await consent.getByRole('alert').filter({hasText:'Permission denied'}).waitFor();assert.equal(await consent.locator('[data-auth-issue]').count(),0);assert.equal(requests,2);
      await page.evaluate(()=>{window.authFixture.deny=false;window.authFixture.delay=true;});await consent.getByRole('button',{name:'Tiếp tục với Zalo',exact:true}).click();
      await consent.getByRole('button',{name:'Hủy kết nối',exact:true}).click();await page.evaluate(()=>window.authFixture.finishPhone({token:'late-result'}));
      await consent.getByRole('button',{name:'Tiếp tục với Zalo',exact:true}).waitFor();await page.waitForTimeout(100);assert.equal(requests,2);
      assert.equal(await page.evaluate(()=>window.authFixture.reads),1);assert.deepEqual(errors,[]);
      assert.equal(await consent.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
      console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',viewport,staff403Preserved:true,inactiveProfileDistinct:true,storageCallsBounded:true,denialAndCancel:true,noDoubleClick:true,nativeBridgeSimulated:true,noBackendOrDatabaseChanges:true}));
    }finally{await page.close();}
  }
}finally{await browser.close();}
