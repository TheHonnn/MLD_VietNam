-- ==============================================================================
-- MLD VIỆT NAM - SEED DATA: GIƯỜNG TRỊ LIỆU VẬT LÝ CHO CÁC CHI NHÁNH & PHÒNG
-- Tương thích với bảng branch_beds trong 004_phase1_beds_shifts_pos.sql
-- ==============================================================================

-- 1. GIƯỜNG TẠI CHI NHÁNH 1 (Cơ sở Nam Kỳ Khởi Nghĩa: aaaaaaaa-0001-0001-0001-000000000001)

-- Phòng VIP 01 - Hoa Sen (2 giường VIP)
INSERT INTO branch_beds (id, branch_id, room_id, bed_code, name, status, is_active, notes)
VALUES
    ('22222222-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000001', 'G-VIP-01', 'Giường VIP 01 - Thủy Tiên', 'AVAILABLE', TRUE, 'Giường đệm chỉnh điện y khoa cao cấp'),
    ('22222222-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000001', 'G-VIP-02', 'Giường VIP 02 - Hoàng Yến', 'AVAILABLE', TRUE, 'Giường đệm chỉnh điện y khoa cao cấp')
ON CONFLICT (branch_id, bed_code) DO NOTHING;

-- Phòng Massage Body 02 (4 giường Body trị liệu)
INSERT INTO branch_beds (id, branch_id, room_id, bed_code, name, status, is_active, notes)
VALUES
    ('22222222-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000002', 'G-BODY-01', 'Giường Trị Liệu Body 01', 'AVAILABLE', TRUE, 'Giường trị liệu thoát bạch huyết'),
    ('22222222-0001-0001-0001-000000000004', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000002', 'G-BODY-02', 'Giường Trị Liệu Body 02', 'AVAILABLE', TRUE, 'Giường trị liệu thoát bạch huyết'),
    ('22222222-0001-0001-0001-000000000005', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000002', 'G-BODY-03', 'Giường Trị Liệu Body 03', 'AVAILABLE', TRUE, 'Giường trị liệu thoát bạch huyết'),
    ('22222222-0001-0001-0001-000000000006', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000002', 'G-BODY-04', 'Giường Trị Liệu Body 04', 'AVAILABLE', TRUE, 'Giường trị liệu thoát bạch huyết')
ON CONFLICT (branch_id, bed_code) DO NOTHING;

-- Phòng Gội Đầu Dưỡng Sinh 03 (4 giường gội đầu)
INSERT INTO branch_beds (id, branch_id, room_id, bed_code, name, status, is_active, notes)
VALUES
    ('22222222-0001-0001-0001-000000000007', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000003', 'G-HEAD-01', 'Giường Gội Dưỡng Sinh 01', 'AVAILABLE', TRUE, 'Bồn gội dưỡng sinh vòm nước ấm'),
    ('22222222-0001-0001-0001-000000000008', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000003', 'G-HEAD-02', 'Giường Gội Dưỡng Sinh 02', 'AVAILABLE', TRUE, 'Bồn gội dưỡng sinh vòm nước ấm'),
    ('22222222-0001-0001-0001-000000000009', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000003', 'G-HEAD-03', 'Giường Gội Dưỡng Sinh 03', 'AVAILABLE', TRUE, 'Bồn gội dưỡng sinh vòm nước ấm'),
    ('22222222-0001-0001-0001-000000000010', 'aaaaaaaa-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000003', 'G-HEAD-04', 'Giường Gội Dưỡng Sinh 04', 'AVAILABLE', TRUE, 'Bồn gội dưỡng sinh vòm nước ấm')
ON CONFLICT (branch_id, bed_code) DO NOTHING;

-- 2. GIƯỜNG TẠI CHI NHÁNH 2 (Cơ sở Nguyễn Thị Minh Khai: aaaaaaaa-0001-0001-0001-000000000002)

-- Phòng Thực Hành Lâm Sàng Lab 01 (6 giường thực hành)
INSERT INTO branch_beds (id, branch_id, room_id, bed_code, name, status, is_active, notes)
VALUES
    ('22222222-0001-0001-0001-000000000011', 'aaaaaaaa-0001-0001-0001-000000000002', '11111111-0001-0001-0001-000000000004', 'G-LAB-01', 'Giường Thực Hành Lab 01', 'AVAILABLE', TRUE, 'Trang bị máy đo phù bạch huyết'),
    ('22222222-0001-0001-0001-000000000012', 'aaaaaaaa-0001-0001-0001-000000000002', '11111111-0001-0001-0001-000000000004', 'G-LAB-02', 'Giường Thực Hành Lab 02', 'AVAILABLE', TRUE, 'Trang bị máy đo phù bạch huyết'),
    ('22222222-0001-0001-0001-000000000013', 'aaaaaaaa-0001-0001-0001-000000000002', '11111111-0001-0001-0001-000000000004', 'G-LAB-03', 'Giường Thực Hành Lab 03', 'AVAILABLE', TRUE, 'Trang bị máy đo phù bạch huyết'),
    ('22222222-0001-0001-0001-000000000014', 'aaaaaaaa-0001-0001-0001-000000000002', '11111111-0001-0001-0001-000000000004', 'G-LAB-04', 'Giường Thực Hành Lab 04', 'AVAILABLE', TRUE, 'Trang bị máy đo phù bạch huyết'),
    ('22222222-0001-0001-0001-000000000015', 'aaaaaaaa-0001-0001-0001-000000000002', '11111111-0001-0001-0001-000000000004', 'G-LAB-05', 'Giường Thực Hành Lab 05', 'AVAILABLE', TRUE, 'Trang bị máy đo phù bạch huyết'),
    ('22222222-0001-0001-0001-000000000016', 'aaaaaaaa-0001-0001-0001-000000000002', '11111111-0001-0001-0001-000000000004', 'G-LAB-06', 'Giường Thực Hành Lab 06', 'AVAILABLE', TRUE, 'Trang bị máy đo phù bạch huyết')
ON CONFLICT (branch_id, bed_code) DO NOTHING;
