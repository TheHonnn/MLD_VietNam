/**
 * ==============================================================================
 * MLD VIETNAM - VIETNAMESE SEARCH & FILTER UTILITY
 * Tối ưu hóa thuật toán tìm kiếm tiếng Việt:
 * 1. Không phân biệt hoa / thường
 * 2. Loại bỏ dấu tiếng Việt (Full Unicode diacritics & decomposed NFD + đ/Đ)
 * 3. Chuẩn hóa các từ viết tắt phổ biến:
 *    - Quận / Huyện: q1, q2, q3... <-> quận 1, quận 2, quận 3...
 *    - Tỉnh / Thành phố: tphcm, hcm <-> hồ chí minh; hn <-> hà nội; td <-> thủ đức
 * 4. Tìm kiếm đa từ (Token-based multi-keyword): Cho phép gõ nhiều từ khóa cách nhau
 *    bởi dấu cách theo thứ tự bất kỳ (ví dụ: "nam ky q3", "spa quan 3", "186 vo thi sau")
 * ==============================================================================
 */

/**
 * Loại bỏ dấu tiếng Việt và chuẩn hóa chuỗi
 */
export function normalizeVietnamese(text: string | number | null | undefined): string {
  if (text == null) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[\u02C6\u0306\u031B]/g, '')
    .trim();
}

/**
 * Làm sạch chuỗi, chuyển dấu câu thành khoảng trắng để tìm kiếm không bị cản trở bởi dấu chấm, phẩy, gạch ngang
 */
export function cleanSearchText(text: string | number | null | undefined): string {
  if (text == null) return '';
  return normalizeVietnamese(text)
    .replace(/[.,\-_/\\():;""''[\]{}|+=*&^%$#@!~`?<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mở rộng từ khóa viết tắt sang cụm từ đầy đủ và ngược lại
 */
export function expandAbbreviations(str: string): string {
  let result = str;

  // q1, q2, q3... <-> quan 1, quan 2, quan 3...
  result = result.replace(/\bquan\s*(\d+)\b/g, 'quan $1 q$1');
  result = result.replace(/\bq\s*(\d+)\b/g, 'quan $1 q$1');

  // tphcm, hcm <-> ho chi minh
  result = result.replace(/\b(tp\s*ho\s*chi\s*minh|ho\s*chi\s*minh|tphcm|hcm)\b/g, 'ho chi minh hcm tphcm');

  // ha noi <-> hn
  result = result.replace(/\b(ha\s*noi|hn)\b/g, 'ha noi hn');

  // thu duc <-> td
  result = result.replace(/\b(thu\s*duc|tp\s*thu\s*duc|td)\b/g, 'thu duc tp thu duc td');

  // ky thuat vien <-> ktv
  result = result.replace(/\b(ky\s*thuat\s*vien|ktv)\b/g, 'ky thuat vien ktv');

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Hàm kiểm tra so khớp tìm kiếm chính xác cao
 * @param target Giá trị hoặc mảng các trường cần tìm (vd: [b.name, b.code, b.address, b.district, b.city])
 * @param query Từ khóa người dùng nhập vào ô tìm kiếm
 */
export function matchSearch(
  target: (string | number | null | undefined) | (string | number | null | undefined)[],
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const rawQuery = query.trim();
  const rawTarget = Array.isArray(target)
    ? target.filter((v) => v != null).join(' ')
    : (target?.toString() || '');

  if (!rawTarget) return false;

  // 1. So khớp trực tiếp (Exact substring match)
  const lowerTarget = rawTarget.toLowerCase();
  const lowerQuery = rawQuery.toLowerCase();
  if (lowerTarget.includes(lowerQuery)) return true;

  // 2. So khớp không dấu (Unaccented match)
  const cleanedTarget = cleanSearchText(rawTarget);
  const cleanedQuery = cleanSearchText(rawQuery);
  if (!cleanedQuery) return true;
  if (cleanedTarget.includes(cleanedQuery)) return true;

  // 3. So khớp với mở rộng viết tắt (Expanded abbreviations match)
  const expandedTarget = expandAbbreviations(cleanedTarget);
  const expandedQuery = expandAbbreviations(cleanedQuery);
  if (expandedTarget.includes(cleanedQuery) || expandedTarget.includes(expandedQuery)) {
    return true;
  }

  // 4. So khớp từng từ đơn (Token-based multi-keyword matching)
  // Người dùng gõ "nam ky q3": cả "nam", "ky", "q3" đều phải xuất hiện trong dữ liệu
  const queryTokens = cleanedQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return true;

  return queryTokens.every((token) => {
    // Nếu token dạng "q3" -> cũng tìm "quan 3"
    const isQNumber = /^q\d+$/i.test(token);
    const expandedToken = isQNumber ? token.replace(/^q(\d+)$/i, 'quan $1') : token;

    return (
      cleanedTarget.includes(token) ||
      expandedTarget.includes(token) ||
      (isQNumber && (cleanedTarget.includes(expandedToken) || expandedTarget.includes(expandedToken)))
    );
  });
}

/**
 * Kiểm tra chuỗi có phải định dạng UUID (RFC 4122) hợp lệ không
 */
export function isUuid(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}
