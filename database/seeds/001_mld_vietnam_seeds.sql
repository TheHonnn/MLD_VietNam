-- ==============================================================================
-- MLD VIỆT NAM - INITIAL SEED DATA (AUTHENTIC SPA & ACADEMY)
-- Version: 3.0.0
-- Database: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. CHI NHÁNH CƠ SỞ SPA MLD (BRANCHES)
INSERT INTO branches (id, name, phone, address, district, city, latitude, longitude, opening_time, closing_time, image_url, amenities, total_rooms, total_beds)
VALUES 
    (
        'aaaaaaaa-0001-0001-0001-000000000001',
        'MLD Beauty & Spa — Cơ sở Nam Kỳ Khởi Nghĩa',
        '02839301234',
        'Số 186 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu',
        'Quận 3',
        'TP. Hồ Chí Minh',
        10.7845,
        106.6912,
        '08:30:00',
        '20:30:00',
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef',
        '["Phòng VIP riêng tư", "Máy soi da đa tầng 3D", "Bãi đỗ ô tô miễn phí", "Trà thảo mộc dưỡng nhan"]'::jsonb,
        10,
        20
    ),
    (
        'aaaaaaaa-0001-0001-0001-000000000002',
        'MLD Beauty & Spa — Cơ sở Nguyễn Thị Minh Khai',
        '02838295678',
        'Số 45 Nguyễn Thị Minh Khai, Phường Bến Nghé',
        'Quận 1',
        'TP. Hồ Chí Minh',
        10.7812,
        106.7001,
        '08:30:00',
        '21:00:00',
        'https://images.unsplash.com/photo-1560750588-73207b1ef5b8',
        '["Phòng Đào tạo thực hành Academy", "Không gian thiền dưỡng sinh", "Trang thiết bị chuẩn y khoa", "Khu tiếp đón cao cấp"]'::jsonb,
        8,
        16
    )
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. TÀI KHOẢN MẪU (USERS)
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
        'ADMIN',
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
        'STAFF',
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
        12500000.00,
        'MYDUYEN99'
    )
ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 3. KỸ THUẬT VIÊN SPA (TECHNICIANS)
INSERT INTO technicians (id, user_id, branch_id, full_name, title, avatar_url, experience_years, rating_avg, review_count, specialties, bio)
VALUES 
    (
        'cccccccc-0001-0001-0001-000000000001',
        'bbbbbbbb-0001-0001-0001-000000000003',
        'aaaaaaaa-0001-0001-0001-000000000001',
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
        'Lê Quỳnh Nga',
        'Chuyên viên Chăm sóc da & Dưỡng sinh',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
        4,
        4.90,
        142,
        '["Trị liệu Cổ Vai Gáy", "Massage body đá nóng", "Thải độc da Oxy tươi"]'::jsonb,
        'Nhiệt tình, chu đáo, thao tác tay nghề nhẹ nhàng và chuẩn chỉ, được khách hàng đánh giá cao về thái độ phục vụ.'
    )
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 4. DANH MỤC DỊCH VỤ SPA (SERVICE_CATEGORIES)
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

-- 5. DỊCH VỤ SPA CHI TIẾT (SERVICES)
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

-- 6. GÓI LIỆU TRÌNH ĐỊNH KỲ (TREATMENT_PACKAGES)
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

-- 7. GIẢNG VIÊN ĐÀO TẠO ACADEMY (INSTRUCTORS)
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

-- 8. DANH MỤC KHÓA ĐÀO TẠO ACADEMY (COURSE_CATEGORIES)
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

-- 9. KHÓA HỌC ACADEMY (COURSES)
INSERT INTO courses (id, category_id, instructor_id, title, slug, short_description, full_description, level, total_hours, total_sessions, tuition_fee, discount_fee, certificate_title, image_url, is_hot)
VALUES 
    (
        '30303030-0001-0001-0001-000000000001',
        '20202020-0001-0001-0001-000000000001',
        '10101010-0001-0001-0001-000000000001',
        'Khóa Đào Tạo Kỹ Thuật Viên Spa Chuyên Nghiệp (Từ Cơ Bản Đến Nâng Cao)',
        'khoa-dao-tao-ktv-spa-chuyen-nghiep',
        'Cam kết vững tay nghề, thành thạo công nghệ chăm sóc da chuẩn y khoa và hỗ trợ việc làm 100%.',
        'Khóa học thực chiến với 80% thời lượng thực hành trên mẫu thật. Học viên nắm trọn kỹ năng soi da, phân tích phác đồ điều trị, kỹ thuật massage nâng cơ và vận hành máy móc thẩm mỹ hiện đại.',
        'BEGINNER',
        60,
        20,
        15000000.00,
        11900000.00,
        'Chứng Chỉ Kỹ Thuật Viên Spa Quốc Gia & MLD Academy',
        'https://images.unsplash.com/photo-1512290900672-1f416559d80d',
        TRUE
    ),
    (
        '30303030-0001-0001-0001-000000000002',
        '20202020-0001-0001-0001-000000000002',
        '10101010-0001-0001-0001-000000000001',
        'Khóa Nghề Gội Đầu Dưỡng Sinh & Bấm Huyệt Đả Thông Kinh Lạc',
        'khoa-nghe-goi-dau-duong-sinh-bam-huyet',
        'Khóa học cấp tốc giúp bạn tự tin mở tiệm hoặc làm việc tại các hệ thống spa cao cấp.',
        'Học viên được đào tạo chuyên sâu về 14 đường kinh lạc, phương pháp chế biến thảo mộc thiên nhiên, bài bấm huyệt chống đau nửa đầu vai gáy và kỹ năng tư vấn khách hàng chu đáo.',
        'BEGINNER',
        36,
        12,
        8500000.00,
        6800000.00,
        'Chứng Chỉ Chuyên Viên Dưỡng Sinh MLD Academy',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
        TRUE
    )
ON CONFLICT (slug) DO UPDATE SET tuition_fee = EXCLUDED.tuition_fee;

-- 10. MÃ KHUYẾN MÃI / VOUCHER (COUPONS)
INSERT INTO coupons (code, title, description, discount_percent, discount_amount, max_discount, min_order_amount, applicable_to, valid_from, valid_to, usage_limit)
VALUES 
    (
        'MLDCHAOXIN',
        'Tặng 100.000đ cho khách hàng mới',
        'Áp dụng cho mọi dịch vụ Spa hoặc Gói liệu trình đầu tiên',
        0.00,
        100000.00,
        100000.00,
        300000.00,
        'ALL',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '180 days',
        1000
    ),
    (
        'SPADAY20',
        'Ưu đãi 20% Dịch vụ Chăm sóc Da & Dưỡng sinh',
        'Giảm tối đa 150.000đ áp dụng từ thứ 2 đến thứ 5',
        20.00,
        0.00,
        150000.00,
        400000.00,
        'SPA_SERVICE',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '90 days',
        500
    ),
    (
        'ACADEMY500K',
        'Học bổng 500.000đ Đào tạo nghề MLD',
        'Tặng ngay 500k cho học viên đăng ký sớm bất kỳ khóa học nào',
        0.00,
        500000.00,
        500000.00,
        5000000.00,
        'COURSE',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '120 days',
        200
    )
ON CONFLICT (code) DO NOTHING;

