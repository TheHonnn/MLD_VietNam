import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }, { width: 1366, height: 900 }]) {
    const page = await browser.newPage({ viewport });
    await page.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5177', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'B\u1ecf qua', exact: true }).click();
    await page.locator('.home-branch select:not([disabled])').waitFor({ timeout: 45000 });
    await page.locator('.app-bottom-nav').getByRole('button', { name: 'D\u1ecbch v\u1ee5', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'H\u1ec7 th\u1ed1ng chi nh\u00e1nh', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'T\u00ecm ki\u1ebfm t\u1ea5t c\u1ea3', exact: true }).click();
    const categories = page.getByRole('group', { name: 'Lo\u1ea1i k\u1ebft qu\u1ea3', exact: true });
    assert.equal(await categories.getByRole('button').count(), 5);
    const optionsBox = await categories.boundingBox();
    const clearBox = await page.getByRole('button', { name: 'X\u00f3a t\u00ecm ki\u1ebfm', exact: true }).boundingBox();
    assert.ok(clearBox.y >= optionsBox.y + optionsBox.height);
    await page.screenshot({ path: fileURLToPath(new URL(`../.relay-local/search-navigation-${viewport.width}.png`, import.meta.url)) });
    await categories.getByRole('button', { name: 'Chi nh\u00e1nh', exact: true }).click();
    await page.locator('#branch-directory-heading').waitFor();
    const response = await page.request.get('http://127.0.0.1:5107/api/branches');
    const branches = (await response.json()).data.branches;
    assert.equal(await page.locator('.branch-card').count(), branches.length);
    for (const branch of branches) assert.ok((await page.locator('.branch-results').innerText()).includes(branch.name));
    const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u0111\u0110]/g, 'd').toLowerCase();
    const query = fold(branches[0].name);
    await page.getByRole('textbox', { name: 'T\u00ecm chi nh\u00e1nh', exact: true }).fill(query);
    assert.equal(await page.locator('.branch-card').count(), branches.filter(branch => fold(`${branch.name} ${branch.address} ${branch.city}`).includes(query)).length);
    await page.getByRole('textbox', { name: 'T\u00ecm chi nh\u00e1nh', exact: true }).fill('');
    if (branches[0].city) {
      await page.getByRole('combobox', { name: 'T\u1ec9nh / th\u00e0nh ph\u1ed1', exact: true }).selectOption(branches[0].city);
      assert.equal(await page.locator('.branch-card').count(), branches.filter(branch => branch.city === branches[0].city).length);
      await page.getByRole('combobox', { name: 'T\u1ec9nh / th\u00e0nh ph\u1ed1', exact: true }).selectOption('');
    }
    await page.locator('.branch-card').first().click();
    await page.locator('.branch-detail').waitFor();
    const title = await page.locator('.branch-detail h1').innerText();
    assert.ok(branches.some(branch => branch.name === title));
    await page.locator('.branch-detail .branch-back').click();
    await page.locator('#branch-directory-heading').waitFor();
    await page.locator('.branch-heading-row .branch-back').click();
    await page.getByRole('heading', { name: 'D\u1ecbch v\u1ee5 ch\u0103m s\u00f3c', exact: true }).waitFor();
    console.log(JSON.stringify({ viewport, searchCategoriesNavigate: true, clearBelowCategories: true, actualBranches: branches.length, unaccentedFilters: true, detailAndReturn: true }));
    await page.close();
  }
} finally { await browser.close(); }
