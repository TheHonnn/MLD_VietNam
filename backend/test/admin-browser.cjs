// Browser checks use an isolated in-memory database, never the production connection.
require('reflect-metadata');
const { PGlite } = require('@electric-sql/pglite');
const { Test } = require('@nestjs/testing');
const { ConfigModule } = require('@nestjs/config');
const { ValidationPipe } = require('@nestjs/common');
const { chromium } = require('@playwright/test');
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
const output = path.resolve(__dirname, '../../.local-archive/admin-review');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const pg = new PGlite();
  let app, browser;
  try {
    await pg.exec(
      fs
        .readFileSync(
          path.resolve(__dirname, '../../database/schema.sql'),
          'utf8',
        )
        .replace(/^CREATE EXTENSION[^\n]*$/gm, '')
        .replace(/^CREATE INDEX[^\n]*gin_trgm_ops[^\n]*$/gm, ''),
    );
    await pg.query(
      "INSERT INTO users(phone,full_name,role,referral_code,password_hash) VALUES('0900000099','Kiểm thử giao diện','SUPER_ADMIN','BROWSERTEST',$1)",
      [await bcrypt.hash('Browser-test-only-123', 10)],
    );
    const branch=(await pg.query("INSERT INTO branches(name,code,phone,address,district,latitude,longitude,image_url) VALUES('Test branch','TESTBR','0900000011','Test','Test',10,106,'https://example.invalid/branch.png') RETURNING id")).rows[0];
    await pg.query("INSERT INTO staff_profiles(user_id,branch_id,employee_code,position) SELECT id,$1,'TESTEMP','Test position' FROM users WHERE phone='0900000099'",[branch.id]);
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
            }),
          ],
        }),
        AdminModule,
      ],
    })
      .overrideProvider(AdminDatabase)
      .useValue({ connection: { ...client, connect } })
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
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(/^http:\/\/(?:localhost|127\.0\.0\.1):3000\/api\/v1\//, async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace(/^http:\/\/(?:localhost|127\.0\.0\.1):3000/, target),
      });
      await route.fulfill({ response });
    });
    await page.goto('http://127.0.0.1:5173/');
    await page
      .getByRole('heading', { name: 'Đăng nhập', exact: true })
      .waitFor();
    await page.screenshot({ path: path.join(output, 'login-desktop.png') });
    await page.getByLabel('Tài khoản', { exact: true }).fill('0900000099');
    await page
      .getByLabel('Mật khẩu', { exact: true })
      .fill('Browser-test-only-123');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Tổng quan vận hành', exact: true })
      .waitFor();
    await page.screenshot({ path: path.join(output, 'dashboard-desktop.png') });
    const legacyLinks = [['Tổng quan','/'],['Chi nhánh','/branches'],['Khách hàng','/customers'],['Lịch kỹ thuật viên','/staff-schedule'],['Liệu trình','/medical-records'],['Thu ngân','/cashier-pos'],['Tuyển sinh','/academy-enrollment'],['Giảng viên','/instructors'],['Học viên','/attendance'],['Vận hành đào tạo','/curriculum'],['Báo cáo doanh thu','/reports']];
    for(const [name,href] of legacyLinks) assert.equal(await page.getByRole('navigation').getByRole('link',{name,exact:true}).getAttribute('href'),href);
    const sidebar=page.locator('aside');
    assert.equal(await sidebar.getByText('QUẢN TRỊ BỔ SUNG',{exact:true}).count(),0);
    await sidebar.getByRole('button',{name:'Mở Chi nhánh',exact:true}).click();
    await sidebar.getByRole('link',{name:'Phòng dịch vụ',exact:true}).waitFor();
    assert.equal(await sidebar.getByRole('link',{name:'Phòng dịch vụ',exact:true}).getAttribute('href'),'/manage/branch_rooms');
    await sidebar.getByRole('button',{name:'Thu gọn Chi nhánh',exact:true}).click();
    const resourceLinks=await sidebar.locator('a[href^="/manage/"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
    assert.equal(new Set(resourceLinks).size,Object.keys(ADMIN_RESOURCES).length,'Every resource assigned to a business menu');
    while(await sidebar.getByRole('button',{name:/^Mở /}).count())await sidebar.getByRole('button',{name:/^Mở /}).first().click();
    const header=page.locator('main').locator('..').locator('header').first();
    const beforeTop=await header.evaluate(node=>node.getBoundingClientRect().top);
    const beforeMainScroll=await page.locator('main').evaluate(node=>node.scrollTop);
    await sidebar.hover();await page.mouse.wheel(0,1200);await page.waitForTimeout(250);
    assert.ok(await sidebar.evaluate(node=>node.scrollTop>0),'Sidebar scrolls independently');
    assert.equal(await header.evaluate(node=>node.getBoundingClientRect().top),beforeTop,'Header remains fixed');
    assert.equal(await page.locator('main').evaluate(node=>node.scrollTop),beforeMainScroll,'Menu scroll does not move content');
    assert.equal(await page.evaluate(()=>window.scrollY),0,'Document does not scroll with sidebar');
    await page.goto('http://127.0.0.1:5173/manage/staff_profiles');
    await page.getByRole('columnheader',{name:'Họ và tên',exact:true}).waitFor();
    await page.getByRole('button',{name:'Kiểm thử giao diện',exact:true}).waitFor();
    await page.screenshot({path:path.join(output,'staff-name-desktop.png')});
    await page.goto('http://127.0.0.1:5173/curriculum');
    await page.getByRole('link',{name:'Thêm video',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('dialog').getByLabel(/^Loại bài học/).inputValue(),'VIDEO');
    await page.getByRole('dialog').getByLabel(/^Video \(URL\)/).waitFor();
    await page.screenshot({path:path.join(output,'video-form-desktop.png')});
    await page.getByRole('button',{name:'Đóng',exact:true}).last().click();
    await page.getByRole('link',{name:'Thêm bài trắc nghiệm',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button',{name:'Đóng',exact:true}).last().click();
    await page.getByRole('link',{name:'Thêm câu hỏi',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('dialog').getByLabel('Đáp án A',{exact:true}).fill('First answer');
    await page.getByRole('dialog').getByLabel('Đáp án B',{exact:true}).fill('Second answer');
    await page.getByRole('dialog').getByLabel(/^Đáp án đúng/).selectOption('B');
    await page.screenshot({path:path.join(output,'quiz-form-desktop.png')});
    let checked = 0;
    for (const [name, resource] of Object.entries(ADMIN_RESOURCES)) {
      await page.goto('http://127.0.0.1:5173/manage/' + name);
      await page
        .getByRole('heading', { name: resource.title, exact: true })
        .waitFor();
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
        await page
          .getByRole('heading', { name: 'Thêm mới', exact: true })
          .waitFor();
        assert.ok(
          await page.getByRole('dialog').locator('label').count(),
          name + ' form',
        );
        await page
          .getByRole('button', { name: 'Đóng', exact: true })
          .last()
          .click();
      }
      checked++;
    }
    await page.goto('http://127.0.0.1:5173/manage/service_categories');
    await page.locator('.admin-pagination').waitFor();
    await page.getByRole('button', { name: 'Thêm mới', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Tên/).fill('Bản ghi kiểm thử');
    await dialog.getByLabel(/^Mã/).fill('BROWSER-CATEGORY');
    await dialog
      .getByLabel(/^Biểu tượng/)
      .fill('https://example.invalid/icon.png');
    await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await page
      .getByRole('button', { name: 'Bản ghi kiểm thử', exact: true })
      .waitFor();
    await page.getByTitle('Chỉnh sửa', { exact: true }).click();
    await page.getByRole('dialog').getByLabel(/^Tên/).fill('Đã chỉnh sửa');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await page
      .getByRole('button', { name: 'Đã chỉnh sửa', exact: true })
      .waitFor();
    await page.screenshot({ path: path.join(output, 'catalog-desktop.png') });
    await page.getByTitle('Xóa', { exact: true }).click();
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
    console.log(
      JSON.stringify({
        resourcesChecked: checked,
        actualCrud: 'passed',
        legacyMenuUnchanged: 'passed',
        pageErrors: errors,
        screenshots: output,
      }),
    );
  } finally {
    await browser?.close();
    await app?.close();
    await pg.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
