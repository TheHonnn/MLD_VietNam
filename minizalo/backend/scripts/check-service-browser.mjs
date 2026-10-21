import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:5177';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 1366, height: 900 }]) {
    const page = await browser.newPage({ viewport });
    page.on('requestfailed', request => { if (request.url().includes('unsplash')) console.log(JSON.stringify({ imageFailure: request.failure() })); });
    await page.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.sharedServiceText = text; } }, configurable: true });
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'B\u1ecf qua', exact: true }).click();
    await page.locator('.home-branch select:not([disabled])').waitFor({ timeout: 45000 });
    const response = await page.request.get('http://127.0.0.1:5107/api/services');
    const services = (await response.json()).data.services;
    const title = await page.locator('.home-feature h2').innerText();
    const service = services.find(item => item.name === title);
    assert.ok(service);
    await page.locator('.home-feature-photo').click();
    const detail = page.locator('.service-detail');
    await detail.waitFor();
    assert.equal(await detail.locator('h1').innerText(), service.name);
    const price = `${Number(service.discountPrice ?? service.price).toLocaleString('vi-VN')}\u0111`;
    assert.equal(await detail.locator('.service-detail-price strong').innerText(), price);
    assert.equal(await detail.locator('.service-detail-footer-summary strong').innerText(), price);
    assert.equal(await detail.locator('.service-detail-price span').innerText(), `${service.durationMinutes} ph\u00fat`);
    const image = detail.locator('img.service-detail-photo');
    if (await image.count()) {
      assert.equal(await image.getAttribute('src'), service.imageUrl);
      await image.evaluate(element => element.complete ? undefined : new Promise(resolve => { element.addEventListener('load', resolve, { once: true }); element.addEventListener('error', resolve, { once: true }); }));
    }
    const photoRendered = await image.count() ? await image.evaluate(element => element.naturalWidth > 0) : false;
    assert.equal(photoRendered, true, 'Actual service image must render');
    await page.screenshot({ path: fileURLToPath(new URL(`../.relay-local/service-detail-${viewport.width}.png`, import.meta.url)) });
    await detail.getByRole('button', { name: 'Chia s\u1ebb d\u1ecbch v\u1ee5', exact: true }).click();
    await detail.locator('[role=status]').waitFor();
    assert.equal(new URL(await page.evaluate(() => window.sharedServiceText)).searchParams.get('serviceId'),service.id);
    const geometry = await detail.evaluate(element => {
      const box = selector => element.querySelector(selector).getBoundingClientRect();
      const media = box('.service-detail-media'), back = box('.service-detail-back');
      const tools = box('.service-detail-tools'), heading = box('h1');
      return { overflow: element.scrollWidth > element.clientWidth, overlay: back.top >= media.top && tools.right <= media.right, titleBelow: heading.top >= media.bottom };
    });
    assert.deepEqual(geometry, { overflow: false, overlay: true, titleBelow: true });
    const footer = detail.locator('.service-detail-footer');
    const before = await footer.boundingBox();
    await detail.locator('main').evaluate(element => { element.scrollTop = element.scrollHeight; });
    const after = await footer.boundingBox();
    assert.equal(before.y, after.y);
    await detail.locator('.service-detail-book').click();
    await page.getByRole('dialog', { name: '\u0110\u0103ng nh\u1eadp', exact: true }).waitFor();
    await page.getByRole('button', { name: '\u0110\u00f3ng', exact: true }).click();
    await page.locator('.home-feature-photo').click();
    await page.keyboard.press('Escape');
    await detail.waitFor({ state: 'hidden' });
    console.log(JSON.stringify({ viewport, actualCatalog: true, overlayControls: true, fixedFooter: true, share: true, bookingRequiresLogin: true }));
    await page.close();
  }
} finally {
  await browser.close();
}
