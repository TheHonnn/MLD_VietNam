import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from '../../../backend/.relay-local/browser-check/node_modules/playwright/index.mjs';
const id=n=>`10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const tomorrow=new Date(Date.now()+86400000+7*3600000).toISOString().slice(0,10);
const engine=process.env.BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await(engine==='webkit'?webkit:chromium).launch({...engine==='chromium'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{},headless:true});
const folder=new URL('../node_modules/.cache/connected-app/',import.meta.url);await mkdir(folder,{recursive:true});
try{for(const viewport of [{width:320,height:640},{width:390,height:844}]){
  const page=await browser.newPage({viewport,userAgent:'Mozilla/5.0 (iPhone) Zalo'}),errors=[],unknown=[],writes=[],learningReads=[],navigations=[],devLogs=[];
  let account={id:id(1),fullName:'Tên cũ trong database',phone:'0900000001',email:'real@example.test',role:'CUSTOMER',avatarUrl:'',membershipTier:'STANDARD',rewardPoints:0,totalSpent:0,purpose:'BOTH'};
  let enrollments=[],bookings=[],failBooking=true,approved=false;
  const branch={id:id(3),name:'Chi nhánh từ Admin',address:'Địa chỉ từ Admin',city:'Hồ Chí Minh',openingTime:'08:00',closingTime:'20:00'};
  const service={id:id(5),name:'Dịch vụ thật',categoryId:id(6),categoryName:'Trị liệu',price:100000,durationMinutes:60,imageUrl:'',shortDescription:'Mô tả từ Admin',steps:[],benefits:[]};
  const outline={id:id(22),title:'Khóa học thật',categoryId:id(20),categoryName:'Đào tạo',tuitionFee:100000,totalHours:5,theoryHours:3,practiceHours:2,imageUrl:'',fullDescription:'Đề cương từ Admin',chapters:[{id:id(23),title:'Chương thật',courseId:id(22)}],lessons:[{id:id(24),title:'Bài học có khóa',chapterId:id(23),lessonType:'READING_DOC',durationMinutes:15,isFreePreview:false,learningGoals:['Mục tiêu bài học']}],quizzes:[],batches:[]};
  const shapeEnrollment=()=>({id:id(29),courseId:id(22),courseTitle:outline.title,studentId:id(1),studentName:account.fullName,tuitionTotal:100000,amountPaid:0,progressPercent:0,status:approved?'ENROLLED':'CONSULTING',enrolledAt:'2026-10-28T00:00:00Z',batchCode:'LOP-THAT',branchName:branch.name,totalLessons:1,completedLessonsCount:0});
  await page.addInitScript(()=>{window.connectedFixture={session:'',pdfs:[]};});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url());});
  page.on('console',message=>{if(message.text().includes('[vite]'))devLogs.push(message.text());});
  await page.route('**/node_modules/.vite/deps/zmp-sdk.js*',route=>route.fulfill({contentType:'application/javascript',body:`
    export const nativeStorage={getItem:()=>window.connectedFixture.session,setItem(_key,value){window.connectedFixture.session=value;},removeItem(){window.connectedFixture.session='';}};
    export const getAccessToken=async()=> 'verified-access';export const getPhoneNumber=async()=>({token:'verified-phone'});
    export const getUserInfo=async()=>({userInfo:{name:'Tên Zalo hiện tại',avatar:'https://fixture.invalid/zalo-avatar.png'}});
    export const getRouteParams=()=>({});export const getShareableLink=async()=> 'https://fixture.invalid/shared';export const openShareSheet=async()=>{};export const closeApp=async()=>{};
    export const scanQRCode=async()=>({content:''});export const openDocument=async data=>{window.connectedFixture.pdfs.push(data);};
    export const events={on(){},off(){}};export const EventName={OnAppPaused:'paused',OnAppResumed:'resumed'};
  `}));
  await page.route('https://fixture.invalid/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2h0AAAAASUVORK5CYII=','base64')}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname.slice('/api'.length);
    if(/\.(ts|tsx|js)$/.test(url.pathname)){await route.continue();return;}
    let data={},status=200,message='OK';
    if(path==='/services')data={services:[service]};
    else if(path==='/branches')data={branches:[branch]};
    else if(path==='/doctors')data={doctors:[{id:id(7),fullName:'Chuyên viên thật',branchId:branch.id,branchName:branch.name,specialties:['Trị liệu'],serviceIds:[service.id],reviewCount:0,avatarUrl:''}]};
    else if(path==='/courses')data={courses:[outline]};
    else if(path===`/courses/${outline.id}`)data={course:outline};
    else if(path==='/portal/banners')data={banners:[]};
    else if(path==='/app-metadata')data={serviceCategories:[{id:id(6),name:'Trị liệu',isActive:true}],courseCategories:[],instructors:[],membershipTiers:[],faqs:[]};
    else if(path==='/auth/zalo'){writes.push({path,body:req.postDataJSON()});data={token:'isolated-user-session',user:account};}
    else if(path==='/auth/me')data={user:account};
    else if(path==='/auth/profile'){const input=req.postDataJSON();writes.push({path,body:input});account={...account,fullName:input.fullName??account.fullName,avatarUrl:input.avatarUrl??account.avatarUrl};data={user:account};}
    else if(path==='/auth/settings')data={settings:{language:'vi',appointmentReminder:true,systemNotify:true,promotionNotify:true}};
    else if(path==='/membership')data={user:account,summary:{upcomingBookings:bookings.length,remainingTreatmentSessions:0,activeCourses:approved?1:0},vouchers:[]};
    else if(path==='/bookings'&&req.method()==='POST'){
      const input=req.postDataJSON();writes.push({path,body:input,key:req.headers()['idempotency-key']});
      if(failBooking){status=409;message='No treatment bed is available';}
      else{const saved={id:id(40),bookingCode:'BOOKING-ADMIN',customerId:account.id,branchId:branch.id,branchName:branch.name,bookingDate:input.date,startTime:'14:00',endTime:'15:00',bookedForName:input.bookedForName,bookedForPhone:input.bookedForPhone,specialNotes:input.specialNotes,baseTotal:100000,finalPrice:100000,discountAmount:0,pointsDiscount:0,status:'PENDING',items:[{serviceId:service.id,name:service.name,price:100000,durationMinutes:60}]};bookings=[saved];data={booking:saved};}
    }else if(path==='/bookings')data={bookings,nextCursor:null};
    else if(path==='/slots')data={slots:[{startTime:'14:00',endTime:'15:00'}],availabilityReason:'AVAILABLE'};
    else if(path==='/slots/dates')data={dates:[tomorrow]};
    else if(path==='/course-enrollments'&&req.method()==='POST'){writes.push({path,body:req.postDataJSON()});enrollments=[shapeEnrollment()];data={enrollment:enrollments[0]};status=201;}
    else if(path==='/course-enrollments')data={enrollments:enrollments.map(()=>shapeEnrollment())};
    else if(path===`/courses/${outline.id}/learning`){learningReads.push(url.searchParams.get('enrollmentId'));if(!approved){status=403;message='Enrollment is required';}else data={course:{...outline,lessons:[{...outline.lessons[0],contentText:'Nội dung chỉ có sau duyệt',attachments:[]}],schedules:[{id:id(35),sessionDate:tomorrow,startTime:'09:00',endTime:'10:00',topic:'Buổi học thật',roomName:'Phòng thật'}],quizSubmissions:[]}};}
    else if(path==='/notifications')data={notifications:[],unreadCount:0,totalCount:0,nextCursor:null};
    else if(path==='/portal/library'||path==='/portal/content')data={items:[{id:id(70),title:'PDF Admin đã duyệt',summary:'Tài liệu thật',authorName:'Admin',attachments:[{name:'Tài liệu.pdf',url:'https://files.test/admin.pdf'}]}],nextCursor:null};
    else if(path===`/portal/library/${id(70)}`||path===`/portal/content/${id(70)}`)data={item:{id:id(70),title:'PDF Admin đã duyệt',attachments:[{name:'Tài liệu.pdf',url:'https://files.test/admin.pdf'}]}};
    else if(path==='/records')data={records:[]};else if(path==='/treatment-plans')data={treatmentPlans:[],nextCursor:null};else if(path==='/transactions')data={invoices:[],pointTransactions:[],totalSpent:0};else if(path==='/search/history')data={history:[]};else if(path==='/search/popular')data={popularSearches:[]};else if(path==='/care-guidelines')data={guidelines:[]};else if(path==='/support-faqs')data={faqs:[]};else if(path==='/support-tickets')data={tickets:[],nextCursor:null};else if(path==='/consultation-surveys')data={surveys:[],nextCursor:null};else if(path==='/reviews/mine')data={reviews:[]};else{unknown.push(path);status=404;message='Fixture route not configured';}
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status<400,statusCode:status,message,data})});
  });
  try{
    await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5184/',{waitUntil:'domcontentloaded'});
    await page.getByRole('img',{name:'MLD Việt Nam',exact:true}).waitFor();
    await page.screenshot({path:fileURLToPath(new URL(`${engine}-${viewport.width}-home.png`,folder))});
    const nav=()=>page.getByRole('navigation',{name:'Điều hướng chính'});
    await nav().getByRole('button',{name:'Cá nhân',exact:true}).click();await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
    await page.getByRole('button',{name:'Tiếp tục với Zalo',exact:true}).click();await page.getByRole('heading',{name:'Khóa học của tôi',exact:true}).waitFor();
    assert.equal(await page.locator('.academy-enrollment').count(),0);assert.deepEqual(learningReads,[]);
    await page.locator('.academy-header').getByRole('button',{name:'Quay lại',exact:true}).click();await page.getByText('Tên Zalo hiện tại',{exact:true}).waitFor();
    assert.ok(writes.some(w=>w.path==='/auth/profile'&&w.body.fullName==='Tên Zalo hiện tại'&&w.body.avatarUrl==='https://fixture.invalid/zalo-avatar.png'));
    await page.screenshot({path:fileURLToPath(new URL(`${engine}-${viewport.width}-profile.png`,folder))});
    await page.getByRole('button',{name:'Lịch học',exact:true}).click();await page.getByRole('heading',{name:'Lịch học',exact:true}).waitFor();assert.deepEqual(learningReads,[]);
    await page.getByRole('button',{name:'Quay lại',exact:true}).click();await page.getByRole('button',{name:'Gói liệu trình',exact:true}).click();await page.getByRole('heading',{name:'Gói liệu trình của tôi',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Dịch vụ chăm sóc',exact:true}).count(),0);
    await page.goBack();await nav().getByRole('button',{name:'Đào tạo',exact:true}).click();await page.getByRole('button',{name:/Khóa học thật/}).first().click();
    await page.getByText('Chương thật',{exact:true}).first().click();await page.getByText('Bài học có khóa',{exact:true}).waitFor();assert.equal(await page.getByLabel('Bài học đang khóa').count(),1);assert.deepEqual(learningReads,[]);
    await page.screenshot({path:fileURLToPath(new URL(`${engine}-${viewport.width}-outline.png`,folder))});
    await page.locator('.academy-footer button').click();await page.getByLabel('Địa chỉ liên hệ',{exact:true}).fill('Địa chỉ học viên thật');await page.getByLabel('Cơ sở đào tạo',{exact:true}).selectOption(branch.id);await page.getByRole('button',{name:'Tiếp tục đăng ký',exact:true}).click();await page.getByRole('button',{name:'Gửi đăng ký học',exact:true}).click();await page.getByText('Chờ duyệt',{exact:true}).waitFor();assert.deepEqual(learningReads,[]);
    await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();await page.locator('.academy-enrollment').getByText('Chờ duyệt',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Tiếp tục học',exact:true}).count(),0);
    approved=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('button',{name:'Tiếp tục học',exact:true}).click();await page.locator('[data-lesson-id]').first().waitFor();assert.deepEqual(learningReads,[id(29)]);
    await nav().getByRole('button',{name:'Tài liệu',exact:true}).click();await page.getByRole('button',{name:/PDF Admin đã duyệt/}).click();await page.getByRole('link',{name:'Tài liệu.pdf',exact:true}).click();assert.equal((await page.evaluate(()=>window.connectedFixture.pdfs))[0].url,'https://files.test/admin.pdf');
    await nav().getByRole('button',{name:'Trang chủ',exact:true}).click();await page.getByRole('button',{name:'Đặt lịch',exact:true}).click();await page.getByLabel('Ngày đến',{exact:true}).fill(tomorrow);await page.getByRole('button',{name:'14:00 - 15:00',exact:true}).click();await page.getByRole('button',{name:'Xác nhận đặt lịch',exact:true}).click();await page.getByRole('alert').filter({hasText:'giường trị liệu'}).waitFor();assert.equal(bookings.length,0);
    failBooking=false;await page.getByRole('button',{name:'14:00 - 15:00',exact:true}).click();await page.getByRole('button',{name:'Xác nhận đặt lịch',exact:true}).click();await page.getByText('BOOKING-ADMIN',{exact:false}).first().waitFor();
    assert.equal(writes.filter(w=>w.path==='/bookings').at(-1).body.serviceId,service.id);assert.equal(bookings.length,1);
    bookings[0].status='CONFIRMED';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('Đã xác nhận',{exact:true}).first().waitFor();
    await page.screenshot({path:fileURLToPath(new URL(`${engine}-${viewport.width}.png`,folder))});
    assert.deepEqual(errors,[]);assert.deepEqual(unknown,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    console.log(JSON.stringify({engine,viewport,realRoot:true,zaloProfileSync:true,emptyPersonalScreens:true,approvalGatedLearning:true,adminPdf:true,bookingFailureNotSuccess:true,adminBookingRefresh:true,nativeAndDataSimulated:true}));
  }catch(error){console.error(JSON.stringify({errors,unknown,navigations,devLogs,writes,session:await page.evaluate(()=>window.connectedFixture.session),body:(await page.locator('body').innerText()).slice(0,2200)}));throw error;}finally{await page.close();}
}}finally{await browser.close();}
