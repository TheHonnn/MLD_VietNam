const origin = 'https://admin.invalid';
const pages = new Set([
  '/', '/branches', '/customers', '/customer-detail', '/customers/detail', '/medical-records',
  '/treatment-management', '/staff-schedule', '/technician-schedule', '/services-catalog',
  '/cashier-pos', '/invoices', '/receipts', '/hoa-don', '/academy-enrollment', '/instructors',
  '/attendance', '/curriculum', '/reports', '/commissions', '/staff-commissions', '/zalo-zns',
  '/crm-zns', '/certificates', '/portal-content', '/home-products', '/settings', '/treatment-inventory',
]);

function internalLink(value) {
  if (typeof value !== 'string' || !/^\/(?![\/\\])/.test(value)) return null;
  const url = new URL(value, origin);
  if (url.origin !== origin || (!pages.has(url.pathname) && !/^\/manage\/[a-z_]+$/.test(url.pathname))) return null;
  return url;
}

function destination(path, fields) {
  const query = new URLSearchParams(Object.entries(fields).filter(([, value]) => value));
  return query.size ? `${path}?${query}` : path;
}

const field = value => typeof value === 'string' ? value.trim() : '';

export function notificationDestination(item) {
  const data = item.data ?? {};
  const url = internalLink(item.link) ?? internalLink(data.link) ?? internalLink(data.route);
  const text = [item.title, item.message].join(' ');
  const bookingCode = field(data.booking_code) || text.match(/\b(?:BK|LH|LT|POS)-[a-z0-9]+(?:-[a-z0-9]+)*/i)?.[0];
  const invoiceCode = field(data.invoice_code) || text.match(/\b(?:HD|INV|POS)-[a-z0-9]+(?:-[a-z0-9]+)*/i)?.[0];
  const enrollment = field(data.enrollment_id) || field(data.enrollmentId);
  const branchId = field(data.branch_id) || url?.searchParams.get('branchId');
  if (enrollment && (!url || url.pathname === '/academy-enrollment'))
    return destination('/academy-enrollment', { enrollmentId: enrollment });

  if ((item.type === 'PAYMENT' && !url) || url?.pathname === '/cashier-pos') {
    const invoice = field(data.invoice_id) || url?.searchParams.get('invoice') || invoiceCode;
    if (invoice) return destination('/cashier-pos', { tab: 'receipts', invoice, branchId, receipt: 'true' });
    const booking = field(data.booking_id) || url?.searchParams.get('booking') || bookingCode;
    if (booking) return destination('/staff-schedule', { booking, branchId });
    if (item.type === 'PAYMENT' && !url) return '/cashier-pos?tab=receipts';
  }
  if ((item.type === 'BOOKING' && !url) || ['/staff-schedule', '/technician-schedule'].includes(url?.pathname)) {
    const appId = field(data.booking_id) || url?.searchParams.get('appId');
    const booking = appId ? '' : url?.searchParams.get('booking') || bookingCode;
    const date = field(data.booking_date) || url?.searchParams.get('date') || text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
    if (appId || booking || date || branchId || item.type === 'BOOKING')
      return destination('/staff-schedule', { appId, booking, date, branchId });
  }
  if (url) return url.pathname + url.search + url.hash;
  return item.type === 'ACADEMY' ? '/academy-enrollment' : null;
}
