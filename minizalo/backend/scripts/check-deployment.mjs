import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';

const config = parse(await readFile(new URL('../../zalo_mini_app/my-app/.env.production', import.meta.url)));
const base = new URL(config.VITE_API_BASE_URL);
if (base.protocol !== 'https:') throw new Error('Production API must use HTTPS');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const checks = [
  ['/health', null, []],
  ['/app-metadata', 'metadata', []],
  ['/support-faqs', 'faqs', ['id','question','answer']],
  ['/care-guidelines', 'guidelines', ['id','title','content']],
  ['/services', 'services', ['id', 'name', 'categoryId', 'price', 'imageUrl']],
  ['/doctors', 'doctors', ['id', 'fullName', 'branchId', 'specialties']],
  ['/branches', 'branches', ['id', 'name', 'address']],
  ['/courses', 'courses', ['id', 'title', 'tuitionFee', 'depositAmount']],
  ['/slots', 'validation', []],
  ['/slots/dates', 'validation', []],
  ['/auth/me', 'private', []],
  ['/bookings', 'private', []],
  ['/membership', 'private', []],
  ['/auth/settings', 'private', []],
  ['/transactions', 'private', []],
  ['/support-tickets', 'private', []],
  ['/consultation-surveys', 'private', []],
  ['/reviews/mine', 'private', []],
];
console.log(`Read-only production preflight: ${base.origin}${base.pathname}`);
const results = await Promise.all(checks.map(async ([path, key, fields]) => {
  try {
    const response = await fetch(`${base.href.replace(/\/$/, '')}${path}`, {
      headers: { Accept: 'application/json', Origin: 'https://h5.zdn.vn' },
      signal: AbortSignal.timeout(45000), redirect: 'error',
    });
    const body = await response.json();
    const failures = [];
    const envelope = typeof body.success === 'boolean' && typeof body.statusCode === 'number';
    if (!envelope) failures.push('Missing shared success/statusCode/data response contract');
    if (path === '/health' && body.data?.authFlow !== 'zalo-phone-registration') {
      failures.push('Backend is not the phone-only registration version; deploy all backend changes first');
    }
    if (path === '/health' && body.data?.contentContract !== 'shared-admin-v1') failures.push('Deploy the shared-admin content backend before this frontend');
    if (key === 'validation') {
      if (response.status !== 400) failures.push('Availability route is missing or incorrectly protected; deploy the matching Mini App backend');
    } else if (key === 'private') {
      if (response.status !== 401) failures.push('Private endpoint must reject anonymous requests with 401');
    } else {
      if (!response.ok || body.success !== true) failures.push('Expected successful canonical response');
      if (key === 'metadata') {
        if (!['serviceCategories','courseCategories','instructors','membershipTiers','faqs'].every(field=>Array.isArray(body.data?.[field]))) failures.push('Missing admin-managed metadata');
      } else if (key) {
        const records = body.data?.[key];
        if (!Array.isArray(records)) failures.push(`Missing data.${key} array`);
        else if (records.length) {
          const invalid = records.some(record => fields.some(field => !(field in record)) || !uuid.test(record.id));
          if (invalid) failures.push('Catalog fields or UUIDs differ from shared schema');
        }
      }
    }
    const cors = response.headers.get('access-control-allow-origin');
    if (cors !== '*' && cors !== 'https://h5.zdn.vn') failures.push('CORS does not allow the Mini App origin');
    return { path, status: response.status, pass: !failures.length, responseKeys: Object.keys(body), failures };
  } catch (error) {
    return { path, pass: false, failures: [`Request failed: ${error instanceof Error ? error.name : 'Unknown error'}`] };
  }
}));
results.forEach(result => console.log(JSON.stringify(result)));
const pass = results.every(result => result.pass);
console.log(pass ? 'Public API contract checks passed. Real Zalo login still requires runtime verification.' : 'NOT READY: do not deploy this frontend against the configured backend.');
process.exitCode = pass ? 0 : 1;
