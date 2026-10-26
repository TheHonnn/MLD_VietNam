-- ==============================================================================
-- MLD VIỆT NAM - SEED DATA TOÀN DIỆN CHO TOÀN BỘ HỆ SINH THÁI
-- Tương thích 100% với Master Schema 53 bảng trong database/schema.sql
-- ==============================================================================

-- 1. CHI NHÁNH CƠ SỞ SPA MLD (BRANCHES)
INSERT INTO branches (id, name, code, phone, address, district, city, latitude, longitude, opening_time, closing_time, image_url, gallery_urls, amenities)
VALUES 
    (
        'aaaaaaaa-0001-0001-0001-000000000001',
        'MLD Beauty & Spa — Cơ sở Nam Kỳ Khởi Nghĩa',
        'MLD-Q3',
        '02839301234',
        'Số 186 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu',
        'Quận 3',
        'TP. Hồ Chí Minh',
        10.7845,
        106.6912,
        '08:30:00',
        '20:30:00',
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef',
        '["https://images.unsplash.com/photo-1540555700478-4be289fbecef", "https://images.unsplash.com/photo-1560750588-73207b1ef5b8"]'::jsonb,
        '["Phòng VIP riêng tư", "Máy soi da đa tầng 3D", "Bãi đỗ ô tô miễn phí", "Trà thảo mộc dưỡng nhan"]'::jsonb
    ),
    (
        'aaaaaaaa-0001-0001-0001-000000000002',
        'MLD Beauty & Spa — Cơ sở Nguyễn Thị Minh Khai',
        'MLD-Q1',
        '02838295678',
        'Số 45 Nguyễn Thị Minh Khai, Phường Bến Nghé',
        'Quận 1',
        'TP. Hồ Chí Minh',
        10.7812,
        106.7001,
        '08:30:00',
        '21:00:00',
        'https://images.unsplash.com/photo-1560750588-73207b1ef5b8',
        '["https://images.unsplash.com/photo-1560750588-73207b1ef5b8"]'::jsonb,
        '["Phòng Đào tạo thực hành Academy", "Không gian thiền dưỡng sinh", "Trang thiết bị chuẩn y khoa", "Khu tiếp đón cao cấp"]'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. PHÒNG TRỊ LIỆU & PHÒNG LAB ĐÀO TẠO (BRANCH_ROOMS)
INSERT INTO branch_rooms (id, branch_id, name, room_type, bed_capacity, is_available)
VALUES
    ('11111111-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', 'Phòng VIP 01 - Hoa Sen', 'VIP_ROOM', 2, TRUE),
    ('11111111-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', 'Phòng Massage Body 02', 'MASSAGE_ROOM', 4, TRUE),
    ('11111111-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001', 'Phòng Gội Đầu Dưỡng Sinh 03', 'HEAD_SPA_ROOM', 4, TRUE),
    ('11111111-0001-0001-0001-000000000004', 'aaaaaaaa-0001-0001-0001-000000000002', 'Phòng Thực Hành Lâm Sàng Lab 01', 'PRACTICE_LAB', 10, TRUE),
    ('11111111-0001-0001-0001-000000000005', 'aaaaaaaa-0001-0001-0001-000000000002', 'Phòng Học Lý Thuyết 02', 'ACADEMY_CLASSROOM', 15, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. TÀI KHOẢN MẪU (USERS)
-- Mật khẩu mặc định: 'Password@123'
INSERT INTO users (id, phone, email, full_name, avatar_url, gender, role, purpose, membership_tier, reward_points, total_spent, referral_code)
VALUES 
    (
        'bbbbbbbb-0001-0001-0001-000000000001',
        '0901000001',
        'admin@mldvietnam.vn',
        'Ban Quản Trị MLD Việt Nam',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
        'FEMALE',
        'SUPER_ADMIN',
        'BOTH',
        'DIAMOND',
        5000,
        100000000.00,
        'MLDADMIN'
    ),
    (
        'bbbbbbbb-0001-0001-0001-000000000002',
        '0901000002',
        'letan.q3@mldvietnam.vn',
        'Lễ Tân Hoàng Yến',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        'FEMALE',
        'RECEPTIONIST',
        'BEAUTY_SPA',
        'STANDARD',
        0,
        0.00,
        'YENQ3'
    ),
    (
        'bbbbbbbb-0001-0001-0001-000000000003',
        '0901000003',
        'ktv.lananh@mldvietnam.vn',
        'Chuyên viên Lan Anh',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956',
        'FEMALE',
        'TECHNICIAN',
        'BEAUTY_SPA',
        'GOLD',
        500,
        15000000.00,
        'LANANHSPA'
    ),
    (
        'bbbbbbbb-0001-0001-0001-000000000004',
        '0901000004',
        'giangvien.ngocthao@mldvietnam.vn',
        'Master Trainer Thảo Ngọc',
        'https://images.unsplash.com/photo-1594824813515-5e6fe7a5e848',
        'FEMALE',
        'INSTRUCTOR',
        'ACADEMY',
        'PLATINUM',
        2000,
        50000000.00,
        'MASTERTHAO'
    ),
    (
        'bbbbbbbb-0001-0001-0001-000000000005',
        '0987654321',
        'khachhang.myduyen@gmail.com',
        'Nguyễn Mỹ Duyên',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        'FEMALE',
        'CUSTOMER',
        'BOTH',
        'GOLD',
        350,
        18500000.00,
        'MYDUYEN99'
    )
ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 4. HỒ SƠ NHÂN SỰ TOÀN CƠ SỞ (STAFF_PROFILES)
INSERT INTO staff_profiles (id, user_id, branch_id, employee_code, department, position, base_salary, commission_rate)
VALUES
    ('99999999-0001-0001-0001-000000000001', 'bbbbbbbb-0001-0001-0001-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', 'NV-LT-001', 'RECEPTION', 'Trưởng nhóm Lễ tân', 10000000.00, 2.00),
    ('99999999-0001-0001-0001-000000000002', 'bbbbbbbb-0001-0001-0001-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001', 'NV-KTV-001', 'THERAPY_MASSAGE', 'Chuyên viên Trị liệu cấp cao', 12000000.00, 10.00)
ON CONFLICT (employee_code) DO NOTHING;

-- 5. KỸ THUẬT VIÊN SPA (TECHNICIANS)
INSERT INTO technicians (id, user_id, branch_id, staff_profile_id, full_name, title, avatar_url, experience_years, rating_avg, review_count, specialties, bio)
VALUES 
    (
        'cccccccc-0001-0001-0001-000000000001',
        'bbbbbbbb-0001-0001-0001-000000000003',
        'aaaaaaaa-0001-0001-0001-000000000001',
        '99999999-0001-0001-0001-000000000002',
        'Trần Lan Anh',
        'Chuyên viên Trị liệu Cấp cao',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956',
        5,
        4.95,
        186,
        '["Chăm sóc da chuyên sâu", "Massage nâng cơ mặt", "Gội đầu dưỡng sinh thảo dược"]'::jsonb,
        'Tốt nghiệp xuất sắc khóa đào tạo trị liệu thẩm mỹ quốc tế, hơn 5 năm kinh nghiệm chăm sóc da phục hồi và dưỡng sinh.'
    ),
    (
        'cccccccc-0001-0001-0001-000000000002',
        NULL,
        'aaaaaaaa-0001-0001-0001-000000000001',
        NULL,
        'Lê Quỳnh Nga',
        'Chuyên viên Chăm sóc da & Dưỡng sinh',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
        4,
        4.90,
        142,
        '["Trị liệu Cổ Vai Gáy", "Massage body đá nóng", "Thải độc da Oxy tươi"]'::jsonb,
        'Nhiệt tình, chu đáo, thao tác tay nghề nhẹ nhàng và chuẩn chỉ, được khách hàng đánh giá cao về thái độ phục vụ.'
    ),
    (
        'cccccccc-0001-0001-0001-000000000003',
        NULL,
        'aaaaaaaa-0001-0001-0001-000000000001',
        NULL,
        'Nguyễn Thu Hà',
        'Chuyên viên Chăm sóc Da & Phục hồi',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
        6,
        4.96,
        142,
        '["Chăm sóc da chuyên sâu", "Peel y khoa", "Điện di cấp ẩm"]'::jsonb,
        'Chuyên sâu về phục hồi hàng rào bảo vệ da, trị liệu mụn và trẻ hóa da chuẩn y khoa với hơn 6 năm kinh nghiệm.'
    ),
    (
        'cccccccc-0001-0001-0001-000000000004',
        NULL,
        'aaaaaaaa-0001-0001-0001-000000000001',
        NULL,
        'Trần Minh Phương',
        'Kỹ thuật viên Trị liệu & Bấm huyệt',
        'https://images.unsplash.com/photo-1594824813515-5e6fe7a5e848',
        7,
        4.98,
        215,
        '["Massage trị liệu cổ vai gáy", "Bấm huyệt dưỡng sinh", "Massage đá nóng"]'::jsonb,
        'Kỹ thuật viên tay nghề cao với kỹ thuật miết huyệt êm ái, giải tỏa đau mỏi vai gáy và căng thẳng thần kinh.'
    ),
    (
        'cccccccc-0001-0001-0001-000000000005',
        NULL,
        'aaaaaaaa-0001-0001-0001-000000000002',
        NULL,
        'Lê Hoài An',
        'Chuyên viên Dưỡng sinh Body & Thư giãn',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        4,
        4.90,
        98,
        '["Gội đầu dưỡng sinh thảo dược", "Massage thư giãn toàn thân", "Chăm sóc cơ thể"]'::jsonb,
        'Tận tâm chăm sóc từng chi tiết, chuyên phương pháp gội đầu thảo mộc đả thông kinh lạc vùng đầu và thư giãn body.'
    ),
    (
        'cccccccc-0001-0001-0001-000000000006',
        NULL,
        'aaaaaaaa-0001-0001-0001-000000000002',
        NULL,
        'Phạm Thảo Vy',
        'Kỹ thuật viên Trưởng — Chăm sóc Toàn thân',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956',
        8,
        4.99,
        260,
        '["Trị liệu đau mỏi cột sống", "Massage mô sâu", "Xông hơi thải độc"]'::jsonb,
        'Trưởng nhóm kỹ thuật viên với kinh nghiệm đào tạo thực hành và trị liệu chuyên sâu cho khách hàng VIP.'
    ),
    (
        'cccccccc-0001-0001-0001-000000000007',
        NULL,
        'aaaaaaaa-0001-0001-0001-000000000001',
        NULL,
        'Võ Hoàng Yến',
        'Chuyên viên Thải độc & Trị liệu Thảo dược',
        'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604',
        5,
        4.92,
        116,
        '["Đắp bùn khoáng thải độc", "Massage dưỡng sinh Đông Y", "Chăm sóc chân bấm huyệt"]'::jsonb,
        'Chuyên gia về các liệu pháp thải độc tự nhiên từ thảo dược quý, giúp khí huyết lưu thông và ngủ ngon sâu giấc.'
    )
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 6. DANH MỤC DỊCH VỤ SPA (SERVICE_CATEGORIES)
INSERT INTO service_categories (id, name, code, icon_url, description, display_order)
VALUES 
    (
        'dddddddd-0001-0001-0001-000000000001',
        'Chăm sóc da & Trị liệu',
        'SKINCARE',
        'https://cdn-icons-png.flaticon.com/512/3163/3163195.png',
        'Liệu trình chăm sóc chuyên sâu phục hồi, căng bóng và làm sáng da',
        1
    ),
    (
        'dddddddd-0001-0001-0001-000000000002',
        'Gội đầu Dưỡng sinh',
        'HEAD_SPA',
        'https://cdn-icons-png.flaticon.com/512/2622/2622075.png',
        'Gội đầu thảo dược kết hợp ấn huyệt đả thông kinh lạc vùng đầu, cổ vai gáy',
        2
    ),
    (
        'dddddddd-0001-0001-0001-000000000003',
        'Massage Body & Thư giãn',
        'BODY_MASSAGE',
        'https://cdn-icons-png.flaticon.com/512/2865/2865620.png',
        'Massage thư giãn toàn thân bằng tinh dầu thiên nhiên và đá muối khoáng',
        3
    ),
    (
        'dddddddd-0001-0001-0001-000000000004',
        'Thẩm mỹ Công nghệ cao',
        'HI_TECH_BEAUTY',
        'https://cdn-icons-png.flaticon.com/512/4371/4371510.png',
        'Nâng cơ trẻ hóa, cấy vi chất phục hồi và công nghệ làm đẹp tiên tiến',
        4
    )
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 7. DỊCH VỤ SPA CHI TIẾT (SERVICES)
INSERT INTO services (id, category_id, name, slug, short_description, full_description, duration_minutes, price, discount_price, image_url, steps, benefits, is_featured)
VALUES 
    (
        'eeeeeeee-0001-0001-0001-000000000001',
        'dddddddd-0001-0001-0001-000000000001',
        'Chăm sóc Da Mặt Chuyên Sâu Hydro-Care',
        'cham-soc-da-mat-hydro-care',
        'Làm sạch sâu đa tầng, cấp ẩm tầng sâu và phục hồi hàng rào bảo vệ da căng bóng.',
        'Quy trình phục hồi làn da dịu nhẹ chuẩn y khoa kết hợp máy đẩy tinh chất sóng siêu âm, giúp cải thiện tức thì làn da khô ráp, xỉn màu và thiếu sức sống.',
        75,
        650000.00,
        490000.00,
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881',
        '["Soi da phân tích 3D", "Tẩy trang thảo mộc", "Xông hơi & hút dầu thừa", "Điện di tinh chất HA", "Đắp mặt nạ sinh học Collagen", "Chiếu ánh sáng sinh học", "Massage đầu cổ thư giãn"]'::jsonb,
        '["Da ẩm mượt tức thì", "Mờ thâm sạm và sáng đều màu", "Thu nhỏ lỗ chân lông", "Tăng độ đàn hồi tự nhiên"]'::jsonb,
        TRUE
    ),
    (
        'eeeeeeee-0001-0001-0001-000000000002',
        'dddddddd-0001-0001-0001-000000000002',
        'Gội Đầu Dưỡng Sinh Thảo Dược Cổ Vai Gáy',
        'goi-dau-duong-sinh-thao-duoc',
        'Nấu thảo mộc tươi tự nhiên, bấm huyệt lưu thông khí huyết và giải tỏa áp lực.',
        'Kết hợp nước thảo mộc đun nấu từ bồ kết, sả, hà thủ ô cùng kỹ thuật day ấn 14 đường kinh lạc vùng đầu, giúp ngủ sâu giấc và giảm đau đầu nhanh chóng.',
        60,
        390000.00,
        299000.00,
        'https://images.unsplash.com/photo-1519823551278-64ac92734fb1',
        '["Khai mở huyệt đạo", "Gội nước thảo mộc lần 1", "Massage ấn huyệt vùng đầu", "Gội nước thảo dược lần 2", "Ủ xả dưỡng mượt tóc", "Trị liệu cổ vai gáy", "Sấy tạo kiểu & thưởng trà"]'::jsonb,
        '["Giảm đau đầu, mất ngủ", "Lưu thông khí huyết", "Tóc chắc khỏe óng mượt", "Thư giãn tinh thần tuyệt đối"]'::jsonb,
        TRUE
    ),
    (
        'eeeeeeee-0001-0001-0001-000000000003',
        'dddddddd-0001-0001-0001-000000000003',
        'Massage Trị Liệu Dưỡng Sinh Đông Y',
        'massage-tri-lieu-duong-sinh-dong-y',
        'Giải phóng co cơ, bấm huyệt sâu kinh lạc và phục hồi năng lượng thể chất.',
        'Sử dụng tinh dầu gừng ấm kết hợp đá nóng bazan tự nhiên chườm ấm dọc cột sống, đặc trị hội chứng mỏi vai gáy văn phòng và nhức mỏi lưng eo.',
        90,
        850000.00,
        680000.00,
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
        '["Ngâm chân thảo dược", "Khởi động làm ấm cơ thể", "Massage lưng với tinh dầu ấm", "Chườm đá nóng bazan", "Trị liệu chuyên sâu vai gáy", "Massage tay chân", "Thư giãn vùng đầu"]'::jsonb,
        '["Tan biến co cứng cơ", "Tăng cường tuần hoàn máu", "Giấc ngủ trọn vẹn", "Phục hồi thể lực nhanh chóng"]'::jsonb,
        TRUE
    )
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- 8. GÓI LIỆU TRÌNH ĐỊNH KỲ (TREATMENT_PACKAGES)
INSERT INTO treatment_packages (id, name, service_id, total_sessions, price, discount_price, validity_months, description, image_url)
VALUES 
    (
        'ffffffff-0001-0001-0001-000000000001',
        'Liệu Trình Phục Hồi & Trẻ Hóa Da 5 Buổi',
        'eeeeeeee-0001-0001-0001-000000000001',
        5,
        3250000.00,
        2290000.00,
        6,
        'Gói 5 buổi chăm sóc da chuyên sâu định kỳ 1 tuần/lần, tái cấu trúc hàng rào da căng bóng chuẩn Hàn Quốc.',
        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881'
    ),
    (
        'ffffffff-0001-0001-0001-000000000002',
        'Gói Dưỡng Sinh Đả Thông Kinh Lạc 10 Buổi',
        'eeeeeeee-0001-0001-0001-000000000003',
        10,
        8500000.00,
        5990000.00,
        12,
        'Liệu trình 10 buổi dưỡng sinh cổ vai gáy và toàn thân, duy trì thể trạng dẻo dai và tinh thần thư thái dài lâu.',
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874'
    )
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price;

-- 9. GIẢNG VIÊN ĐÀO TẠO ACADEMY (INSTRUCTORS)
INSERT INTO instructors (id, user_id, full_name, title, avatar_url, experience_years, bio, achievements)
VALUES 
    (
        '10101010-0001-0001-0001-000000000001',
        'bbbbbbbb-0001-0001-0001-000000000004',
        'Nguyễn Thảo Ngọc',
        'Master Trainer Thẩm mỹ & Dưỡng sinh',
        'https://images.unsplash.com/photo-1594824813515-5e6fe7a5e848',
        10,
        'Giám đốc Đào tạo MLD Academy, hơn 10 năm kinh nghiệm huấn luyện hơn 2,000 kỹ thuật viên và chủ spa khởi nghiệp thành công trên toàn quốc.',
        '["Chứng chỉ Quốc tế CIDESCO", "Giám khảo Hội thi Tay nghề Làm đẹp Quốc gia", "Tác giả giáo trình Dưỡng sinh chuẩn Y khoa MLD"]'::jsonb
    )
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 10. DANH MỤC KHÓA ĐÀO TẠO ACADEMY (COURSE_CATEGORIES)
ALTER TABLE course_categories ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO course_categories (id, name, code, icon_url, description, display_order)
VALUES 
    (
        '20202020-0001-0001-0001-000000000001',
        'Đào tạo Nghề Spa Chuyên Nghiệp',
        'SPA_PRO_ACADEMY',
        'https://cdn-icons-png.flaticon.com/512/3063/3063176.png',
        'Đào tạo từ căn bản đến nâng cao cho kỹ thuật viên và chủ spa tương lai',
        1
    ),
    (
        '20202020-0001-0001-0001-000000000002',
        'Đào tạo Gội đầu Dưỡng sinh Chuẩn Y khoa',
        'HEAD_SPA_ACADEMY',
        'https://cdn-icons-png.flaticon.com/512/2622/2622075.png',
        'Nắm vững phương pháp bấm huyệt, nấu thảo dược và liệu pháp kinh lạc',
        2
    )
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 11. KHÓA HỌC ACADEMY (COURSES)
INSERT INTO courses (id, category_id, primary_instructor_id, title, code, short_description, full_description, level, total_hours, theory_hours, practice_hours, total_lessons, tuition_fee, deposit_amount, certificate_title, image_url, is_featured)
VALUES 
    (
        '30303030-0001-0001-0001-000000000001',
        '20202020-0001-0001-0001-000000000001',
        '10101010-0001-0001-0001-000000000001',
        'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI MỚI BẮT ĐẦU - Level 0',
        'MLD-LV0',
        'Lý thuyết nền tảng Master Lymphatic Therapy Level 0. Hiểu sâu về dòng chảy hệ bạch huyết.',
        'Lý thuyết nền tảng Master Lymphatic Therapy Level 0. Hiểu sâu về dòng chảy hệ bạch huyết, cấu trúc mao mạch và nguyên lý kích hoạt tự chữa lành của cơ thể.',
        'BEGINNER',
        24,
        12,
        12,
        6,
        599000.00,
        200000.00,
        'Chứng nhận MLD Nền Tảng - Level 0',
        'assets/images/DaoTao/Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu 599.000.jpg',
        TRUE
    ),
    (
        '30303030-0001-0001-0001-000000000003',
        '20202020-0001-0001-0001-000000000001',
        '10101010-0001-0001-0001-000000000001',
        'Workshop: HƯỚNG DẪN PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT UNG THƯ VÚ',
        'WS-PHU-TAY',
        'Hướng dẫn thực hành các kỹ thuật tự dẫn lưu nhẹ nhàng và tư thế sinh hoạt tránh ứ trệ dịch sau phẫu thuật.',
        'Chuyên đề lâm sàng trang bị kiến thức tự bảo vệ và phòng ngừa biến chứng phù tay (lymphoedema) cho bệnh nhân và người chăm sóc sau điều trị hoặc phẫu thuật vú.',
        'BEGINNER',
        8,
        4,
        4,
        2,
        350000.00,
        100000.00,
        'Giấy chứng nhận Tham gia Workshop MLD',
        'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú 350.000.jpg',
        FALSE
    ),
    (
        '30303030-0001-0001-0001-000000000004',
        '20202020-0001-0001-0001-000000000001',
        '10101010-0001-0001-0001-000000000001',
        'Workshop: HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ',
        'WS-CHE-DO-AN',
        'Nguyên lý tương tác dinh dưỡng kháng viêm và dòng chảy tuần hoàn bạch huyết.',
        'Workshop dinh dưỡng trị liệu: Nguyên lý tương tác giữa dinh dưỡng kháng viêm và dòng chảy hệ tuần hoàn bạch huyết, chế độ ăn lành mạnh bảo vệ tuyến vú.',
        'BEGINNER',
        8,
        4,
        4,
        2,
        350000.00,
        100000.00,
        'Giấy chứng nhận Tham gia Workshop MLD Dinh Dưỡng',
        'assets/images/DaoTao/HƯỚNG DẪN XÂY DỰNG CHẾ ĐỘ ĂN PHÒNG NGỪA BỆNH LÝ TUYẾN VÚ 350.000.jpg',
        FALSE
    ),
    (
        '30303030-0001-0001-0001-000000000005',
        '20202020-0001-0001-0001-000000000001',
        '10101010-0001-0001-0001-000000000001',
        'Workshop: HƯỚNG DẪN VẬN ĐỘNG PHÒNG NGỪA PHÙ TAY SAU PHẪU THUẬT TUYẾN VÚ',
        'WS-VAN-DONG',
        'Bài tập vận động nhẹ nhàng kích hoạt bơm cơ mao mạch vùng ngực và cánh tay.',
        'Bài tập vận động nhẹ nhàng kích hoạt bơm cơ mao mạch vùng ngực và cánh tay, duy trì tầm vận động khớp và chống phù nề sau mổ.',
        'BEGINNER',
        8,
        4,
        4,
        2,
        350000.00,
        100000.00,
        'Giấy chứng nhận Tham gia Workshop Vận Động MLD',
        'assets/images/DaoTao/Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật tuyến vú 350.000.jpg',
        FALSE
    ),
    (
        '30303030-0001-0001-0001-000000000009',
        '20202020-0001-0001-0001-000000000002',
        '10101010-0001-0001-0001-000000000001',
        'Khoá học Chuyên đề: CHĂM SÓC MẸ SAU SINH',
        'MLD-PRO-POSTPARTUM',
        'Kỹ thuật dẫn lưu bạch huyết chuyên sâu dành riêng cho mẹ sau sinh, hỗ trợ hồi phục nhanh chóng.',
        'Kỹ thuật dẫn lưu bạch huyết chuyên sâu dành riêng cho mẹ sau sinh: hỗ trợ hồi phục cơ thể nhanh chóng, giảm phù nề chi dưới, thông tắc tia sữa và săn chắc phục hồi vóc dáng an toàn.',
        'INTERMEDIATE',
        48,
        16,
        32,
        8,
        10000000.00,
        2000000.00,
        'Chứng nhận Chuyên đề MLD Chăm Sóc Mẹ Sau Sinh',
        'assets/images/DaoTao/Khoá học Chuyên đề CHĂM SÓC MẸ SAU SINH 10.000.000.jpg',
        TRUE
    ),
    (
        '30303030-0001-0001-0001-000000000002',
        '20202020-0001-0001-0001-000000000002',
        '10101010-0001-0001-0001-000000000001',
        'DẪN LƯU BẠCH HUYẾT CƠ BẢN CHO NGƯỜI LÀM NGHỀ - Level 1',
        'MLD-PRO-BAS',
        'Chuẩn hóa kỹ thuật dẫn lưu bạch huyết thủ công Vodder quốc tế với áp lực 30-40 mmHg.',
        'Chuẩn hóa kỹ thuật dẫn lưu bạch huyết thủ công Vodder quốc tế với áp lực 30-40 mmHg. Đào tạo cầm tay chỉ việc, ứng dụng ngay vào cơ sở chăm sóc sức khỏe.',
        'INTERMEDIATE',
        72,
        24,
        48,
        12,
        15000000.00,
        3000000.00,
        'Chứng chỉ Hành nghề Dẫn lưu Bạch huyết - Level 1',
        'assets/images/DaoTao/Dẫn lưu bạch huyết cơ bản cho người làm nghề 15.000.000.jpg',
        TRUE
    ),
    (
        '30303030-0001-0001-0001-000000000006',
        '20202020-0001-0001-0001-000000000002',
        '10101010-0001-0001-0001-000000000001',
        'DẪN LƯU BẠCH HUYẾT NÂNG CAO CHO NGƯỜI LÀM NGHỀ - Level 2',
        'MLD-PRO-ADV',
        'Kỹ thuật can thiệp sâu các trường hợp phù bạch huyết phức tạp, điều trị phục hồi sau phẫu thuật.',
        'Kỹ thuật can thiệp sâu các trường hợp phù bạch huyết phức tạp, điều trị phục hồi sau phẫu thuật thẩm mỹ và tạo hình, nạo vét hạch hoặc xạ trị.',
        'ADVANCED',
        96,
        32,
        64,
        16,
        25000000.00,
        5000000.00,
        'Chứng chỉ MLD Nâng cao - Level 2',
        'assets/images/DaoTao/Dẫn lưu bạch huyết nâng cao cho người làm nghề 25.000.000.jpg',
        FALSE
    ),
    (
        '30303030-0001-0001-0001-000000000010',
        '20202020-0001-0001-0001-000000000002',
        '10101010-0001-0001-0001-000000000001',
        'DẪN LƯU BẠCH HUYẾT CHUYÊN SÂU CHO NGƯỜI LÀM NGHỀ - Level 3',
        'MLD-PRO-INTENSIVE',
        'Kỹ thuật can thiệp lâm sàng chuyên sâu, xử lý các ca phù bạch huyết nguyên phát và thứ phát mức độ nặng.',
        'Kỹ thuật can thiệp lâm sàng chuyên sâu, xử lý các ca phù bạch huyết nguyên phát và thứ phát mức độ nặng, xây dựng phác đồ cá nhân hóa chuẩn quốc tế.',
        'ADVANCED',
        120,
        40,
        80,
        20,
        35000000.00,
        7000000.00,
        'Chứng chỉ Chuyên gia MLD Lâm Sàng - Level 3',
        'assets/images/DaoTao/Dẫn lưu bạch huyết chuyên sâu cho người làm nghề.jpg',
        TRUE
    ),
    (
        '30303030-0001-0001-0001-000000000007',
        '20202020-0001-0001-0001-000000000002',
        '10101010-0001-0001-0001-000000000001',
        'GIẢM PHÙ BẰNG DẪN LƯU BẠCH HUYẾT VÀ BĂNG ÉP CDT',
        'MLD-CDT-SPEC',
        'Liệu pháp phức hợp giảm ứ trệ dịch (CDT): phối hợp kỹ thuật xoa bóp dẫn lưu Vodder và băng ép nhiều lớp.',
        'Liệu pháp phức hợp giảm ứ trệ dịch (CDT): phối hợp kỹ thuật xoa bóp dẫn lưu Vodder và nghệ thuật băng ép nhiều lớp phân tầng áp lực chuẩn y học.',
        'ADVANCED',
        120,
        40,
        80,
        20,
        30000000.00,
        6000000.00,
        'Chứng chỉ Chuyên gia Băng ép Phức hợp CDT',
        'assets/images/DaoTao/Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT 30.000.000.webp',
        FALSE
    ),
    (
        '30303030-0001-0001-0001-000000000011',
        '20202020-0001-0001-0001-000000000002',
        '10101010-0001-0001-0001-000000000001',
        'Chương trình: PHÁT TRIỂN GIẢNG VIÊN VÀ HỌC THUẬT',
        'MLD-TRAIN-THE-TRAINER',
        'Bồi dưỡng năng lực sư phạm, phương pháp biên soạn giáo trình và chuẩn hóa kỹ năng giảng dạy lâm sàng.',
        'Chương trình bồi dưỡng năng lực sư phạm, phương pháp biên soạn giáo trình và chuẩn hóa kỹ năng sư phạm lâm sàng dành cho các chuyên gia MLD hướng tới vai trò giảng viên.',
        'MASTER',
        140,
        50,
        90,
        24,
        35000000.00,
        7000000.00,
        'Chứng nhận Giảng viên Đào tạo MLD Quốc Tế',
        'assets/images/DaoTao/Chương trình phát triển giảng viên và học thuật 35.000.000.jpg',
        FALSE
    ),
    (
        '30303030-0001-0001-0001-000000000008',
        '20202020-0001-0001-0001-000000000002',
        '10101010-0001-0001-0001-000000000001',
        'LYMPHATIC WELLNESS SIGNATURE PROGRAM',
        'MLD-SIGNATURE',
        'Chuyển giao độc quyền mô hình Lymphatic Wellness chuẩn quốc tế cho chủ Spa & Clinic.',
        'Chương trình chuyển giao công nghệ cao cấp nhất của MLD Việt Nam: thiết lập quy trình vận hành Spa trị liệu chuyên nghiệp, đào tạo toàn bộ nhân sự và chứng nhận nhượng quyền thương hiệu.',
        'MASTER',
        200,
        60,
        140,
        30,
        350000000.00,
        50000000.00,
        'Chứng nhận Chuyển giao Thương hiệu Lymphatic Signature',
        'assets/images/DaoTao/LYMPHATIC WELLNESS SIGNATURE PROGRAM 350.000.000.jpg',
        TRUE
    )
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    code = EXCLUDED.code,
    tuition_fee = EXCLUDED.tuition_fee,
    deposit_amount = EXCLUDED.deposit_amount,
    image_url = EXCLUDED.image_url,
    short_description = EXCLUDED.short_description,
    full_description = EXCLUDED.full_description;

-- 12. MẪU PHÔI CHỨNG CHỈ (CERTIFICATE_TEMPLATES)
INSERT INTO certificate_templates (id, name, code, background_image_url, title_text, signer_name, signer_title)
VALUES
    ('88888888-0001-0001-0001-000000000001', 'Phôi Chứng chỉ Nghề Spa Chuyên Nghiệp MLD', 'TMPL-SPA-PRO', 'https://cdn.mld.vn/certs/background_spa.png', 'CHỨNG CHỈ TỐT NGHIỆP', 'ThS. Nguyễn Thu Hà', 'Hiệu trưởng Học viện MLD Vietnam')
ON CONFLICT (code) DO NOTHING;

-- 13. MÃ KHUYẾN MÃI / VOUCHER (COUPONS)
INSERT INTO coupons (id, code, title, description, discount_percent, discount_amount, max_discount, min_order_amount, valid_from, valid_to, usage_limit)
VALUES 
    (
        '44444444-0001-0001-0001-000000000001',
        'MLDCHAOXIN',
        'Tặng 100.000đ cho khách hàng mới',
        'Áp dụng cho mọi dịch vụ Spa hoặc Gói liệu trình đầu tiên',
        0.00,
        100000.00,
        100000.00,
        300000.00,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '180 days',
        1000
    ),
    (
        '44444444-0001-0001-0001-000000000002',
        'SPADAY20',
        'Ưu đãi 20% Dịch vụ Chăm sóc Da & Dưỡng sinh',
        'Giảm tối đa 150.000đ áp dụng từ thứ 2 đến thứ 5',
        20.00,
        0.00,
        150000.00,
        400000.00,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '90 days',
        500
    )
ON CONFLICT (code) DO NOTHING;

-- 14. QUY CÁCH NHẬN VOUCHER TỰ ĐỘNG (VOUCHER_DISTRIBUTION_RULES)
INSERT INTO voucher_distribution_rules (id, coupon_id, trigger_event, is_auto_grant, notify_user, valid_days_after_claim, description)
VALUES
    ('55555555-0001-0001-0001-000000000001', '44444444-0001-0001-0001-000000000001', 'ON_SIGNUP', TRUE, TRUE, 30, 'Tự động tặng voucher 100k vào ví khi người dùng hoàn tất đăng ký tài khoản mới (A05)'),
    ('55555555-0001-0001-0001-000000000002', '44444444-0001-0001-0001-000000000002', 'ON_TIER_UPGRADE', TRUE, TRUE, 60, 'Tự động tặng voucher 20% khi thăng hạng lên Silver/Gold')
ON CONFLICT (id) DO NOTHING;
