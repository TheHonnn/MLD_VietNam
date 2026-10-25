import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from '../../../backend/.relay-local/browser-check/node_modules/playwright/index.mjs';

// Browser-only fixtures: all business requests are intercepted, never sent to a database.
const id=n=>`10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const employee={id:id(90),fullName:'Nhân viên kiểm thử',phone:'0900000090',role:'RECEPTIONIST',membershipTier:'STANDARD',rewardPoints:0,totalSpent:0,purpose:'BOTH'};
const branch={id:id(3),name:'Cơ sở kiểm thử',code:'TEST',address:'Địa chỉ kiểm thử',city:'Hồ Chí Minh',phone:'0900000003',isActive:true,openingTime:'08:00',closingTime:'20:00',galleryUrls:[],amenities:[]};
const customer={id:id(1),fullName:'Khách đã đặt lịch',phone:'0900000001'};
const sdk=`export const nativeStorage={getItem:()=> 'isolated-session',setItem(){},removeItem(){}};export const getAccessToken=()=>Promise.resolve('isolated-access');export const getPhoneNumber=()=>Promise.resolve({token:'isolated-phone'});export const getUserInfo=()=>Promise.resolve({});`;
const built=await build({entryPoints:[fileURLToPath(new URL('../src/api/client.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('https://fixture.invalid/api')},plugins:[{name:'isolated-zalo',setup(builder){builder.onResolve({filter:/^zmp-sdk$/},()=>({path:'sdk',namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:sdk,loader:'js'}));}}]});
const folder=new URL('../node_modules/.cache/mld-staff-workspace/',import.meta.url);await mkdir(folder,{recursive:true});
const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const page=await browser.newPage({viewport});
    const requests=[],errors=[],unknown=[];
    const clinicalWrites=[];
    let appointment={id:id(11),bookingCode:'SPA-TEST',customerId:customer.id,customerName:customer.fullName,bookedForName:customer.fullName,bookedForPhone:customer.phone,branchId:branch.id,branchName:branch.name,bookingDate:new Date(Date.now()+7*3600000).toISOString().slice(0,10),startTime:'08:00:00',endTime:'09:00:00',status:'IN_SERVICE',baseTotal:100000,discountAmount:0,pointsDiscount:0,paymentMethod:'CASH',paymentStatus:'UNPAID',finalPrice:100000,items:[{serviceId:id(5),serviceTitle:'Dịch vụ kiểm thử',durationMinutes:60,price:100000}]};
    await page.addInitScript(()=>{
      window.__staffTestRejections=[];
      window.addEventListener('unhandledrejection',event=>{
        const reason=event.reason;
        window.__staffTestRejections.push({type:typeof reason,message:reason?.message,code:reason?.code,api:reason?.api,detail:reason?.detail,keys:reason&&typeof reason==='object'?Object.keys(reason):[],text:String(reason)});
      });
    });
    page.on('pageerror',error=>errors.push({message:error.message,stack:error.stack}));
    await page.route('**/node_modules/.vite/deps/zmp-sdk.js*',route=>route.fulfill({contentType:'application/javascript',body:`${sdk}
      export const getRouteParams=()=>({});export const getShareableLink=async()=> 'https://fixture.invalid/shared';
      export const openShareSheet=async()=>{};export const closeApp=async()=>{};
      export const events={on(){},off(){}};export const EventName={OnAppPaused:'paused',OnAppResumed:'resumed'};`}));
    await page.route('**/api/client.ts*',route=>route.fulfill({contentType:'application/javascript',body:built.outputFiles[0].text}));
    await page.route('https://fixture.invalid/api/**',async route=>{
      const url=new URL(route.request().url()),path=url.pathname.slice('/api'.length);requests.push(path);
      let data;
      if(path==='/auth/me')data={user:employee};
      else if(path==='/health')data={status:'ok'};
      else if(path==='/app-metadata')data={serviceCategories:[],courseCategories:[],instructors:[],membershipTiers:[],faqs:[]};
      else if(path==='/services')data={services:[]};
      else if(path==='/doctors')data={doctors:[]};
      else if(path==='/branches')data={branches:[branch]};
      else if(path==='/courses')data={courses:[]};
      else if(path==='/care-guidelines')data={guidelines:[{id:id(70),title:'Cẩm nang đã xuất bản',summary:'Nội dung đọc từ API kiểm thử',content:'Chi tiết cẩm nang kiểm thử',isPublished:true},{id:id(71),title:'Cẩm nang chưa xuất bản',summary:'Không hiển thị',isPublished:false}]};
      else if(path==='/support-faqs')data={faqs:[]};
      else if(path==='/search/popular')data={popularSearches:[]};
      else if(path==='/search/history')data={history:[]};
      else if(path==='/course-enrollments')data={enrollments:[]};
      else if(path==='/bookings')data={bookings:[appointment],nextCursor:null};
      else if(path===`/staff/bookings/${appointment.id}/status`){clinicalWrites.push(route.request().postDataJSON());appointment={...appointment,status:'COMPLETED'};data={booking:appointment};}
      else if(path==='/notifications')data={notifications:[],unreadCount:0,totalCount:0,nextCursor:null};
      else if(path==='/auth/settings')data={settings:{biometricEnabled:false,appointmentReminder:true,promotionNotify:true,systemNotify:true,language:'vi'}};
      else if(path==='/staff/dashboard')data={scope:{actorId:employee.id,branchId:branch.id},profile:{employeeCode:'NV-TEST',position:'Lễ tân',branchId:branch.id,branchName:branch.name},summary:{todayBookings:2,pendingBookings:1,inServiceBookings:1,upcomingBookings:2,customers:1,activePackages:1}};
      else if(path==='/staff/customers/directory')data={customers:url.searchParams.get('search')==='không khớp'?[]:[customer],nextCursor:null};
      else if(path===`/staff/customers/${customer.id}/records`){
        const section=url.searchParams.get('section');
        data={customer,records:section==='packages'?[{id:id(10),title:'Liệu trình của khách',serviceId:id(5),serviceName:'Dịch vụ kiểm thử',serviceDescription:'Mô tả từ database kiểm thử',serviceSteps:[{title:'Bước đánh giá',description:'Thông tin đánh giá'}],status:'ACTIVE',totalSessions:5,completedSessions:1,reservedSessions:1,remainingSessions:3,expiresAt:'2099-12-31T00:00:00.000Z'}]:section==='treatments'?[{id:id(12),bookingId:appointment.id,sessionNumber:1,treatmentNotes:'Nội dung trị liệu đã ghi',conditionBefore:'Trước trị liệu',conditionAfter:'Sau trị liệu',specialistAdvice:'Lời dặn thực tế'}]:[],nextCursor:null};
      }
      else if(path==='/documents')data={documents:[],nextCursor:null};
      else if(path==='/shared-content')data={items:[],nextCursor:null};
      else {unknown.push(path);data={};}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,statusCode:200,message:'OK',data})});
    });
    try{
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5184/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
      const nav=page.locator('.app-bottom-nav');
      await page.locator('.home-information summary').filter({hasText:'Cẩm nang đã xuất bản'}).click();
      await page.getByText('Chi tiết cẩm nang kiểm thử',{exact:true}).waitFor();
      assert.equal(await page.getByText('Cẩm nang chưa xuất bản',{exact:true}).count(),0);
      assert.equal(await page.locator('.home-feature').count(),0);
      assert.equal(await page.getByText('Chăm sóc sức khỏe và đào tạo nghề Spa',{exact:true}).count(),0);
      await page.screenshot({path:fileURLToPath(new URL(`home-empty-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,folder))});
      await nav.getByRole('button',{name:'Cá nhân',exact:true}).click();
      const work=page.locator('.staff-workspace');await work.getByText('NV-TEST',{exact:true}).waitFor();
      assert.equal(await page.getByText('Xem thẻ hội viên',{exact:false}).count(),0);
      assert.equal(await page.getByText('Điểm tích lũy & Hạng hội viên',{exact:true}).count(),0);
      assert.equal(await work.getByRole('button',{name:'Liệu trình khách hàng',exact:true}).count(),1);
      await page.screenshot({path:fileURLToPath(new URL(`profile-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,folder))});
      await work.getByRole('button',{name:'Liệu trình khách hàng',exact:true}).click();
      await page.getByRole('button',{name:new RegExp(customer.fullName)}).click();
      assert.equal(await page.getByRole('tab',{name:'Liệu trình',exact:true}).getAttribute('aria-selected'),'true');
      await page.getByText('Liệu trình của khách',{exact:true}).waitFor();
      await page.locator('.customer-package-information summary').click();
      await page.getByText('Bước đánh giá',{exact:true}).waitFor();
      await page.getByRole('tab',{name:'Trị liệu',exact:true}).click();
      await page.getByText('Nội dung trị liệu đã ghi',{exact:true}).waitFor();
      await page.locator('.shared-records-header').getByRole('button',{name:'Quay lại'}).click();
      await page.getByRole('textbox',{name:'Tìm hồ sơ khách'}).fill('không khớp');
      await page.waitForTimeout(450);
      await page.getByRole('button',{name:new RegExp(customer.fullName)}).waitFor({state:'detached'});
      await page.locator('.shared-records-header').getByRole('button',{name:'Quay lại'}).click();
      await work.getByText('NV-TEST',{exact:true}).waitFor();
      await work.getByRole('button',{name:'Tài liệu',exact:true}).click();
      await page.getByRole('textbox',{name:'Tìm tài liệu'}).waitFor();
      await page.locator('.shared-records-header').getByRole('button',{name:'Quay lại'}).click();
      await work.getByText('NV-TEST',{exact:true}).waitFor();
      await work.getByRole('button',{name:'Lịch hẹn khách hàng',exact:true}).click();
      await page.getByRole('searchbox',{name:'Tìm lịch hẹn khách hàng'}).fill('khach da dat lich');
      await page.locator('.appointment-list-card').click();
      await page.getByRole('textbox',{name:'Ghi nhận ca trị liệu',exact:true}).fill('Nội dung kết ca');
      await page.getByRole('textbox',{name:'Tình trạng trước trị liệu',exact:true}).fill('Trước ca');
      await page.getByRole('textbox',{name:'Tình trạng sau trị liệu',exact:true}).fill('Sau ca');
      await page.getByRole('textbox',{name:'Lời dặn chăm sóc',exact:true}).fill('Lời dặn');
      await page.getByRole('button',{name:'Kết ca trị liệu',exact:true}).click();
      await page.getByText('Đã cập nhật ca trị liệu.',{exact:true}).waitFor();
      assert.deepEqual(clinicalWrites,[{status:'COMPLETED',treatmentNotes:'Nội dung kết ca',conditionBefore:'Trước ca',conditionAfter:'Sau ca',specialistAdvice:'Lời dặn'}]);
      assert.equal(requests.some(path=>['/membership','/transactions','/records','/treatment-plans'].includes(path)),false);
      assert.deepEqual(errors,[],JSON.stringify(await page.evaluate(()=>window.__staffTestRejections)));assert.deepEqual(unknown,[]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
      console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',viewport,staffProfile:true,scopedCustomers:true,packageAndJournalRouting:true,returnNavigation:true,noCustomerLoyaltyRequests:true,nativeAndDataSimulated:true}));
    }finally{await page.close();}
  }
}finally{await browser.close();}
