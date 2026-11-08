// Browser checks use an isolated in-memory database, never the production connection.
require('reflect-metadata');
const { PGlite } = require('@electric-sql/pglite');
const { Test } = require('@nestjs/testing');
const { ConfigModule } = require('@nestjs/config');
const { ValidationPipe } = require('@nestjs/common');
const { chromium } = require('@playwright/test');
const { DatabaseModule } = require('../dist/database/database.module');
const { SupabaseService } = require('../dist/database/supabase.service');
const { RedisService } = require('../dist/database/redis.service');
const { EmailService } = require('../dist/modules/auth/services/email.service');
const { SmsService } = require('../dist/modules/auth/services/sms.service');
const { AdminModule } = require('../dist/modules/admin/admin.module');
const { AdminDatabase } = require('../dist/modules/admin/admin.database');
const { ADMIN_RESOURCES } = require('../dist/modules/admin/admin.resources');
const {
  TransformInterceptor,
} = require('../dist/common/interceptors/transform.interceptor');
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  bcrypt = require('bcrypt');
const { pathToFileURL } = require('node:url');
const output = path.resolve(
  process.env.ADMIN_BROWSER_OUTPUT_DIR ||
    path.resolve(__dirname, '../../.local-archive/admin-review'),
);
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const pg = new PGlite();
  const previousCwd = process.cwd();
  let app, browser, page, frontend;
  const requests = [];
  try {
    process.chdir(path.resolve(__dirname, '../../web-admin'));
    const { createServer } = await import(pathToFileURL(path.resolve(__dirname, '../../web-admin/node_modules/vite/dist/node/index.js')).href);
    frontend = await createServer({
      root: path.resolve(__dirname, '../../web-admin'),
      define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://127.0.0.1:3000/api/v1') },
      server: { host: '127.0.0.1', port: 0, strictPort: false, watch: { ignored: ['**/dist/**'] } },
    });
    await frontend.listen();
    const frontendUrl = `http://127.0.0.1:${frontend.httpServer.address().port}`;
    await require('../../database/testing/admin-schema.cjs').loadAdminSchema(pg);
    const browserAdmin = (await pg.query(
      "INSERT INTO users(phone,full_name,email,role,referral_code,password_hash) VALUES('0900000099','Kiểm thử giao diện','browser-test@mld.local','SUPER_ADMIN','BROWSERTEST',$1) RETURNING id",
      [await bcrypt.hash('Browser-test-only-123', 10)],
    )).rows[0];
    const branch=(await pg.query("INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES('Test branch','TESTBR','0900000011','Test','Test',10,106,'https://example.invalid/branch.png') RETURNING id")).rows[0];
    await pg.query("INSERT INTO staff_profiles(user_id,branch_id,employee_code,position) SELECT id,$1,'TESTEMP','Test position' FROM users WHERE phone='0900000099'",[branch.id]);
    const category = (await pg.query("INSERT INTO course_categories(name,code,description,icon_url) VALUES('Test category','BROWSER-COURSE-CAT','Test','https://example.invalid/course.png') RETURNING id")).rows[0];
    const course = (await pg.query("INSERT INTO courses(category_id,title,code,short_description,full_description,image_url) VALUES($1,'Test course','BROWSER-COURSE','Test','Test','https://example.invalid/course.png') RETURNING *", [category.id])).rows[0];
    await pg.query("INSERT INTO course_batches(course_id,branch_id,batch_code,start_date,end_date,schedule_text) VALUES($1,$2,'BROWSER-BATCH','2026-11-08','2026-12-08','Test schedule')", [course.id,branch.id]);
    const client = {
      query: async (sql, values) => {
        const r = await pg.query(sql, values);
        return { ...r, rowCount: r.rows.length || r.affectedRows || 0 };
      },
      release: () => {},
    };
    let available = Promise.resolve();
    const connect = async () => {
      let release;
      const next = new Promise(resolve => { release = resolve; });
      const previous = available;
      available = next;
      await previous;
      return { query: client.query, release };
    };
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'browser-test-only-isolated-jwt-secret-12345',
              ADMIN_LOCAL_NO_AUTH: 'true',
              NODE_ENV: 'test',
              CORS_ORIGIN: frontendUrl,
            }),
          ],
        }),
        DatabaseModule,
        AdminModule,
      ],
    })
      .overrideProvider(AdminDatabase)
      .useValue({ connection: { ...client, connect } })
      .overrideProvider(SupabaseService)
      .useValue({ adminClient: { auth: { getUser: async () => ({ data: { user: null }, error: null }) } } })
      .overrideProvider(RedisService)
      .useValue({})
      .overrideProvider(EmailService)
      .useValue({})
      .overrideProvider(SmsService)
      .useValue({})
      .compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.listen(0, '127.0.0.1');
    const target = await app.getUrl();
    browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
    });
    page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('request', request => { if (request.url().includes('/api/') || request.url().includes('/rest/')) requests.push({ url: request.url(), method: request.method() }); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/*', async (route) => {
      const requestUrl = new URL(route.request().url());
      if (['127.0.0.1', 'localhost'].includes(requestUrl.hostname)) {
        return route.continue();
      }
      if (requestUrl.hostname.endsWith('.supabase.co')) {
        if (requestUrl.pathname.endsWith('/auth/v1/token')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              access_token: 'isolated-browser-test-token',
              token_type: 'bearer',
              expires_in: 3600,
              refresh_token: 'isolated-browser-test-refresh-token',
              user: {
                id: browserAdmin.id,
                aud: 'authenticated',
                role: 'authenticated',
                email: 'browser-test@mld.local',
                app_metadata: { provider: 'email', providers: ['email'] },
                user_metadata: {},
                created_at: new Date().toISOString(),
              },
            }),
          });
        }
        if (requestUrl.pathname === '/rest/v1/users') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: browserAdmin.id,
              full_name: 'Kiểm thử giao diện',
              email: 'browser-test@mld.local',
              phone: '0900000099',
              role: 'SUPER_ADMIN',
              is_active: true,
              avatar_url: null,
            }),
          });
        }
        if (requestUrl.pathname === '/rest/v1/course_batches') {
          const result = await pg.query('SELECT b.*, row_to_json(c) AS courses, row_to_json(r) AS branches FROM course_batches b JOIN courses c ON c.id=b.course_id JOIN branches r ON r.id=b.branch_id');
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result.rows) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
      return route.abort();
    });
    await page.route(/^http:\/\/(?:localhost|127\.0\.0\.1):3000\/api\/v1\//, async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace(/^http:\/\/(?:localhost|127\.0\.0\.1):3000/, target),
      });
      requests.push({ path: new URL(route.request().url()).pathname, status: response.status(), body: (await response.text()).slice(0, 300) });
      await route.fulfill({ response });
    });
    await page.goto(frontendUrl + '/');
    await page.getByRole('heading', { name: 'Đăng nhập tài khoản', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'login-desktop.png') });
    await page.locator('input[autocomplete="username"]').fill('browser-test@mld.local');
    await page.locator('input[autocomplete="current-password"]').fill('Browser-test-only-123');
    await page.getByRole('button', { name: 'Đăng nhập hệ thống', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Tổng quan vận hành', exact: true })
      .waitFor();
    await page.screenshot({ path: path.join(output, 'dashboard-desktop.png') });
    const legacyLinks = [['Tổng quan','/'],['Chi nhánh & Phòng ốc','/branches'],['Khách hàng (CRM)','/customers'],['Nhân sự & Kỹ thuật viên','/staff-schedule'],['Quản lý Liệu trình','/medical-records'],['Thu ngân & Tiếp đón','/cashier-pos'],['Tuyển sinh & Ghi danh','/academy-enrollment'],['Đội ngũ Giảng viên','/instructors'],['Học viên & Lớp học','/attendance'],['Chương trình đào tạo','/curriculum'],['Giấy chứng nhận','/certificates'],['Báo cáo doanh thu','/reports']];
    for(const [name,href] of legacyLinks) assert.equal(await page.getByRole('navigation').getByRole('link',{name,exact:true}).getAttribute('href'),href);
    const sidebar=page.locator('aside');
    assert.equal(await sidebar.getByText('QUẢN TRỊ BỔ SUNG',{exact:true}).count(),0);
    await sidebar.getByRole('button',{name:'Mở Chi nhánh & Phòng ốc',exact:true}).click();
    await sidebar.getByRole('link',{name:'Phòng & Giường trị liệu',exact:true}).waitFor();
    assert.equal(await sidebar.getByRole('link',{name:'Phòng & Giường trị liệu',exact:true}).getAttribute('href'),'/branches?tab=rooms');
    await sidebar.getByRole('button',{name:'Thu gọn Chi nhánh & Phòng ốc',exact:true}).click();
    const resourceLinks=await sidebar.locator('a[href^="/manage/"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
    const linkedResources = new Set(resourceLinks.map((href) => href.replace('/manage/', '').split('?')[0]));
    const dedicatedRoutes = new Set(['branches', 'branch_rooms', 'users', 'consultation_surveys', 'instructors', 'student_attendance', 'services', 'treatment_packages', 'invoices', 'student_certificates', 'certificate_templates']);
    const unlinkedResources = Object.keys(ADMIN_RESOURCES).filter((name) => !linkedResources.has(name) && !dedicatedRoutes.has(name));
    assert.equal(unlinkedResources.length, 0, `Resources missing from business menus: ${unlinkedResources.join(', ')}`);
    while(await sidebar.getByRole('button',{name:/^Mở /}).count())await sidebar.getByRole('button',{name:/^Mở /}).first().click();
    const header=page.locator('main').locator('..').locator('header').first();
    const beforeTop=await header.evaluate(node=>node.getBoundingClientRect().top);
    const beforeMainScroll=await page.locator('main').evaluate(node=>node.scrollTop);
    await sidebar.hover();await page.mouse.wheel(0,1200);await page.waitForTimeout(250);
    assert.ok(await sidebar.evaluate(node=>node.scrollTop>0),'Sidebar scrolls independently');
    assert.equal(await header.evaluate(node=>node.getBoundingClientRect().top),beforeTop,'Header remains fixed');
    assert.equal(await page.locator('main').evaluate(node=>node.scrollTop),beforeMainScroll,'Menu scroll does not move content');
    assert.equal(await page.evaluate(()=>window.scrollY),0,'Document does not scroll with sidebar');
    await page.goto(frontendUrl + '/manage/staff_profiles');
    await page.getByRole('columnheader',{name:'Họ và tên',exact:true}).waitFor();
    await page.getByRole('button',{name:'Kiểm thử giao diện',exact:true}).waitFor();
    await page.screenshot({path:path.join(output,'staff-name-desktop.png')});
    await sidebar.getByRole('button',{name:'Mở Chương trình đào tạo',exact:true}).click();
    await sidebar.getByRole('link',{name:'Bài học & video',exact:true}).click();
    await page.getByRole('button',{name:'Thêm mới',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('heading',{name:'Thêm mới bài học vào chương trình đào tạo',exact:true}).waitFor();
    await page.screenshot({path:path.join(output,'video-form-desktop.png')});
    await page.getByRole('dialog').getByTitle('Đóng',{exact:true}).click();
    await sidebar.getByRole('link',{name:'Đề thi & Trắc nghiệm',exact:true}).click();
    await page.getByRole('button',{name:'Thêm mới',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('heading',{name:'Thêm mới bài kiểm tra trắc nghiệm',exact:true}).waitFor();
    await page.getByRole('button',{name:'Đóng',exact:true}).last().click();
    await sidebar.getByRole('link',{name:'Ngân hàng câu hỏi',exact:true}).click();
    await page.getByRole('button',{name:'Thêm mới',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('heading',{name:/Thêm mới câu hỏi #/}).waitFor();
    await page.screenshot({path:path.join(output,'quiz-form-desktop.png')});
    let checked = 0;
    const dedicatedPages = { branches: '/branches', branch_rooms: '/branches?tab=rooms', student_certificates: '/certificates?tab=list', certificate_templates: '/certificates?tab=template', services: '/services-catalog?tab=services', treatment_packages: '/services-catalog?tab=packages', invoices: '/cashier-pos?tab=receipts' };
    const selectedResources = process.env.ADMIN_BROWSER_RESOURCES?.split(',');
    const resourcesToCheck = Object.entries(ADMIN_RESOURCES).filter(([name]) => !selectedResources || selectedResources.includes(name));
    assert.ok(resourcesToCheck.length, 'At least one resource must be selected');
    for (const [name, resource] of resourcesToCheck) {
      console.log(`Checking admin resource: ${name}`);
      await page.goto(frontendUrl + '/manage/' + name);
      if (dedicatedPages[name]) {
        await page.waitForURL(frontendUrl + dedicatedPages[name]);
        await page.locator('main h1').waitFor();
        checked++;
        continue;
      }
      await page
        .getByRole('heading', { name: resource.title, exact: true })
        .waitFor();
      if (['course_enrollments', 'student_attendance', 'student_academic_records'].includes(name)) {
        await page.getByRole('combobox', { name: 'Chọn Lớp học', exact: true }).selectOption('__ALL__');
      }
      await page.locator('.admin-pagination').waitFor();
      assert.equal(
        await page.locator('[role=alert]').count(),
        0,
        name + ' error',
      );
      if (!resource.readonly) {
        await page
          .getByRole('button', { name: 'Thêm mới', exact: true })
          .click();
        await page.getByRole('dialog').waitFor();
        assert.ok(
          await page.getByRole('dialog').locator('label').count(),
          name + ' form',
        );
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
      }
      checked++;
    }
    await page.goto(frontendUrl + '/manage/service_categories');
    await page.locator('.admin-pagination').waitFor();
    await page.getByRole('button', { name: 'Thêm mới', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Tên/).fill('Bản ghi kiểm thử');
    await dialog.getByLabel(/^Mã/).fill('BROWSER-CATEGORY');
    await dialog
      .getByPlaceholder('Dán link ảnh icon (URL) hoặc nhấn Ctrl+V để dán ảnh icon...')
      .fill('https://example.invalid/icon.png');
    await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await page
      .getByRole('cell', { name: 'Bản ghi kiểm thử', exact: true })
      .waitFor();
    await page.getByTitle('Tùy chọn thao tác', { exact: true }).click();
    await page.getByRole('button', { name: 'Chỉnh sửa thông tin', exact: true }).click();
    await page.getByRole('dialog').getByLabel(/^Tên/).fill('Đã chỉnh sửa');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await page
      .getByRole('cell', { name: 'Đã chỉnh sửa', exact: true })
      .waitFor();
    await page.screenshot({ path: path.join(output, 'catalog-desktop.png') });
    await page.getByTitle('Tùy chọn thao tác', { exact: true }).click();
    await page.getByRole('button', { name: 'Xóa bản ghi này', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByText('Chưa có dữ liệu.', { exact: true }).waitFor();
    assert.equal(
      (await pg.query('SELECT count(*)::int n FROM service_categories')).rows[0]
        .n,
      0,
    );
    assert.equal(await page.locator('.admin-shell').count(),0,'No replacement admin shell');
    for(const [name,href] of legacyLinks) assert.equal(await page.getByRole('navigation').first().getByRole('link',{name,exact:true}).getAttribute('href'),href);
    assert.equal(errors.length, 0, errors.join('\n'));
    for (const [name] of resourcesToCheck.filter(([name]) => !dedicatedPages[name])) {
      assert.ok(requests.some(request => request.path === `/api/v1/admin/${name}` && request.status === 200), `${name}: real local API listing was checked`);
    }
    const result = {
        checkedAt: new Date().toISOString(),
        scope: selectedResources ? 'focused' : 'full',
        resourcesChecked: checked,
        dedicatedPageSmokeChecks: resourcesToCheck.map(([name]) => name).filter(name => dedicatedPages[name]),
        genericResourceChecks: resourcesToCheck.filter(([name]) => !dedicatedPages[name]).length,
        actualCrud: 'passed',
        legacyMenuUnchanged: 'passed',
        pageErrors: errors,
        screenshots: output,
    };
    fs.writeFileSync(path.join(output, selectedResources ? 'result-focused.json' : 'result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true, timeout: 5000 }).catch(() => {});
      const html = await page.content().catch(() => null);
      if (html) fs.writeFileSync(path.join(output, 'failure.html'), html);
      fs.writeFileSync(path.join(output, 'requests.json'), JSON.stringify(requests, null, 2));
    }
    throw error;
  } finally {
    await browser?.close();
    await frontend?.close();
    process.chdir(previousCwd);
    await app?.close();
    await pg.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
