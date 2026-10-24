import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import jwt from 'jsonwebtoken';
import {staffFixture} from '../test/fixtures/staff.mjs';
import {chromium,webkit} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';
const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await staffFixture(),{id,db}=f,secret='isolated-workflow-audit-secret';
    const tokens=[jwt.sign({},secret,{subject:id(90),jwtid:id(801),expiresIn:'8h'}),jwt.sign({},secret,{subject:id(90),jwtid:id(802),expiresIn:'8h'}),jwt.sign({},secret,{subject:id(91),jwtid:id(803),expiresIn:'8h'})];
    const raw=async(index,path,method='GET')=>{const response=await fetch(f.base+'/api'+path,{method,headers:{Authorization:'Bearer '+tokens[index],'User-Agent':index===1?'Zalo Android':'Zalo iPhone'}});return {status:response.status,...await response.json()};};
    const page=await browser.newPage({viewport,userAgent:'Mozilla/5.0 iPhone Zalo'}),errors=[];let owner=0,revokeCalls=0,clientModuleURL='';
    page.on('pageerror',error=>errors.push(error.message));
    page.setDefaultTimeout(15000);
    try{
      await raw(0,'/auth/me');await raw(1,'/auth/me');
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());
        const local=url.origin===new URL(process.env.PREVIEW_URL||'http://127.0.0.1:5180/').origin;
        if(local&&['/api/client.ts','/src/api/client.ts'].includes(url.pathname))clientModuleURL=req.url();
        if(local||!url.pathname.startsWith('/api/'))return route.fallback();
        if(req.method()==='POST'&&url.pathname.includes('/auth/sessions/'))revokeCalls++;
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:{Authorization:'Bearer '+tokens[owner],'Content-Type':'application/json'},body:req.postData()||undefined});
        await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5180/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
      const consent=page.locator('.zalo-consent-screen');await consent.getByRole('button',{name:'Đổi tài khoản / dùng máy khác',exact:true}).click();
      await consent.getByRole('button',{name:'Đóng Mini App để đổi Zalo',exact:true}).waitFor();
      // The SDK permission decision is simulated; all app API reads and session mutations still use the isolated backend.
      await page.evaluate(async url=>{const {apiClient}=await import(url);apiClient.loginWithZalo=async()=>({error:'Fixture permission denied'});},clientModuleURL);
      await consent.getByRole('button',{name:'Đăng nhập lại với Zalo',exact:true}).click();await consent.getByRole('alert').filter({hasText:'Fixture permission denied'}).waitFor();
      await page.evaluate(async url=>{const {apiClient}=await import(url);apiClient.loginWithZalo=async()=>new Promise(resolve=>window.fixtureFinishLogin=resolve);},clientModuleURL);
      await consent.getByRole('button',{name:'Tiếp tục với Zalo',exact:true}).click();await consent.getByRole('button',{name:'Hủy kết nối',exact:true}).click();
      await page.evaluate(()=>window.fixtureFinishLogin({error:'Late cancelled result'}));assert.equal(await consent.getByText('Late cancelled result').count(),0);
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/account-consent-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      const a=(await page.evaluate(async url=>(await import(url)).apiClient.getCurrentUser(),clientModuleURL)).user;
      await page.evaluate(async({user,token,url})=>{const {apiClient}=await import(url);apiClient.loginWithZalo=async()=>({user,token});},{user:a,token:tokens[0],url:clientModuleURL});
      await consent.getByRole('button',{name:'Đăng nhập và quản lý phiên',exact:true}).click();
      const manager=page.locator('.account-sessions');await manager.locator('.account-session').nth(1).waitFor();
      assert.equal(await manager.getByText('Phiên hiện tại',{exact:true}).count(),1);
      await manager.getByRole('button',{name:'Đăng xuất các phiên khác',exact:true}).click();
      await manager.getByRole('alertdialog').getByRole('button',{name:'Hủy',exact:true}).click();assert.equal(revokeCalls,0);
      await manager.getByRole('button',{name:'Đăng xuất các phiên khác',exact:true}).click();
      await manager.getByRole('button',{name:'Xác nhận đăng xuất',exact:true}).evaluate(button=>{button.click();button.click();});
      await manager.getByRole('status').filter({hasText:'Đã đăng xuất phiên được chọn.'}).waitFor();
      await page.waitForFunction(()=>document.querySelectorAll('.account-sessions .account-session').length===1);
      assert.equal(revokeCalls,1);assert.equal((await raw(1,'/auth/me')).status,401);assert.equal((await raw(0,'/auth/me')).status,200);
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/account-sessions-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      await manager.getByRole('button',{name:'Đăng xuất phiên',exact:true}).click();await manager.getByRole('button',{name:'Xác nhận đăng xuất',exact:true}).click();
      await consent.getByRole('heading',{name:'Kết nối tài khoản Zalo',exact:true}).waitFor();assert.equal((await raw(0,'/auth/me')).status,401);
      owner=2;const b=(await page.evaluate(async url=>(await import(url)).apiClient.getCurrentUser(),clientModuleURL)).user;
      await page.evaluate(async({user,token,url})=>{const {apiClient}=await import(url);apiClient.loginWithZalo=async()=>({user,token});},{user:b,token:tokens[2],url:clientModuleURL});
      await consent.getByRole('button',{name:'Tiếp tục với Zalo',exact:true}).click();
      await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.getByRole('navigation',{name:'Tiện ích nhanh'}).getByRole('button',{name:'Lịch hẹn',exact:true}).click();
      await page.locator('.appointments-list').waitFor();assert.equal(await page.locator('.appointment-list-card').count(),0);
      await page.locator('.app-bottom-nav').getByRole('button',{name:'Cá nhân',exact:true}).click();
      await page.getByText('Cài đặt tài khoản & Bảo mật',{exact:true}).click();
      await page.getByRole('button',{name:'Tài khoản & thiết bị',exact:true}).click();
      await manager.locator('.account-owner').filter({hasText:'Other branch receptionist'}).waitFor();
      await manager.getByTitle('Đóng quản lý phiên',{exact:true}).click();
      await page.getByRole('heading',{name:'Cài đặt tài khoản',exact:true}).waitFor();
      assert.deepEqual(errors,[]);
      assert.equal(await page.locator('.mini-app-shell').evaluate(el=>el.scrollWidth>el.clientWidth+2),false);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,2);
      console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',viewport,consentOptions:true,denialAndCancel:true,remoteRevocation:true,noDoubleClick:true,accountSwitchNoOldAppointments:true,profileSessionsAndBack:true,noPageErrors:true,sdkPermissionSimulated:true}));
    }catch(error){
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/account-error-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      console.error(JSON.stringify({viewport,errors,body:(await page.locator('body').innerText()).slice(-2800)}));throw error;
    }finally{await page.close();await f.close();}
  }
}finally{await browser.close();}
