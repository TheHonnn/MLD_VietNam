-- ==============================================================================
-- MIGRATION 004: ĐỒNG BỘ DUY NHẤT CHI NHÁNH TRỤ SỞ MLD VIỆT NAM
-- Mục đích: Đồng bộ hóa toàn bộ hệ thống về 1 chi nhánh duy nhất, bảo toàn quan hệ khóa ngoại
-- ==============================================================================

-- 1. CẬP NHẬT THÔNG TIN CHI NHÁNH CHỦ LỰC (ID: aaaaaaaa-0001-0001-0001-000000000001)
UPDATE branches
SET 
    name = 'Trụ sở MLD Việt Nam (5 Master LV3) - Hotline: 096.7786.399',
    code = 'MLD-HQ',
    phone = '096.7786.399',
    address = 'Số 260, Ngõ 271 Bùi Xương Trạch, Khương Đình, Hà Nội, Phường Khương Đình, Thành phố Hà Nội',
    district = 'Quận 3',
    city = 'TP. Hồ Chí Minh',
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001';

-- 2. ĐÁNH DẤU CÁC CHI NHÁNH CŨ LÀ KHÔNG HOẠT ĐỘNG (is_active = FALSE)
-- Giúp ẩn khỏi dropdown/bộ lọc tìm kiếm nhưng BẢO TOÀN toàn bộ lịch sử đặt lịch và khóa ngoại
UPDATE branches
SET 
    is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE id != 'aaaaaaaa-0001-0001-0001-000000000001';

-- ==============================================================================
-- PHƯƠNG ÁN ROLLBACK (KHI CẦN HOÀN TÁC):
-- ==============================================================================
-- UPDATE branches SET is_active = TRUE WHERE id = 'aaaaaaaa-0001-0001-0001-000000000002';
-- UPDATE branches SET name = 'MLD Beauty & Spa — Cơ sở Nam Kỳ Khởi Nghĩa', code = 'MLD-Q3', phone = '02839301234' WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001';

