-- ==============================================================================
-- MEDICAL HEALTHCARE SYSTEM - INITIAL SEED DATA
-- Version: 1.0.0
-- Database: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. CHUYÊN KHOA Y TẾ (SPECIALITIES)
INSERT INTO specialities (id, name, code, icon_url, description, display_order)
VALUES 
    ('11111111-1111-1111-1111-111111111101', 'Tim Mạch', 'CARDIOLOGY', 'https://cdn-icons-png.flaticon.com/512/865/865969.png', 'Chẩn đoán và điều trị các bệnh lý tim mạch, huyết áp', 1),
    ('11111111-1111-1111-1111-111111111102', 'Nhi Khoa', 'PEDIATRICS', 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png', 'Khám, tư vấn và điều trị toàn diện cho trẻ sơ sinh và trẻ nhỏ', 2),
    ('11111111-1111-1111-1111-111111111103', 'Răng Hàm Mặt', 'DENTAL', 'https://cdn-icons-png.flaticon.com/512/2865/2865620.png', 'Chăm sóc răng miệng, chỉnh nha và phẫu thuật nha khoa', 3),
    ('11111111-1111-1111-1111-111111111104', 'Da Liễu', 'DERMATOLOGY', 'https://cdn-icons-png.flaticon.com/512/4371/4371510.png', 'Điều trị các bệnh ngoài da, dị ứng và chăm sóc thẩm mỹ y khoa', 4),
    ('11111111-1111-1111-1111-111111111105', 'Mắt (Nhãn Khoa)', 'OPHTHALMOLOGY', 'https://cdn-icons-png.flaticon.com/512/3004/3004458.png', 'Khám thị lực, điều trị tật khúc xạ và các bệnh lý về mắt', 5),
    ('11111111-1111-1111-1111-111111111106', 'Thần Kinh', 'NEUROLOGY', 'https://cdn-icons-png.flaticon.com/512/2865/2865646.png', 'Khám và điều trị đau đầu mãn tính, rối loạn tiền đình, thần kinh', 6),
    ('11111111-1111-1111-1111-111111111107', 'Tai Mũi Họng', 'ENT', 'https://cdn-icons-png.flaticon.com/512/1041/1041893.png', 'Nội soi, điều trị viêm xoang, viêm họng, viêm tai giữa', 7),
    ('11111111-1111-1111-1111-111111111108', 'Sản Phụ Khoa', 'OBSTETRICS', 'https://cdn-icons-png.flaticon.com/512/3209/3209074.png', 'Quản lý thai kỳ, khám phụ khoa và tư vấn sức khỏe sinh sản', 8)
ON CONFLICT (code) DO NOTHING;

-- 2. CƠ SỞ / PHÒNG KHÁM (CLINICS)
INSERT INTO clinics (id, name, phone, address, city, latitude, longitude, opening_time, closing_time)
VALUES 
    ('22222222-2222-2222-2222-222222222201', 'Phòng khám Đa khoa Quốc tế Sài Gòn', '02838240777', 'Số 9-11-13-15 Trịnh Văn Cấn, P. Cầu Ông Lãnh, Quận 1', 'TP. Hồ Chí Minh', 10.7679, 106.6972, '07:30:00', '19:30:00'),
    ('22222222-2222-2222-2222-222222222202', 'Bệnh viện Đa khoa Quốc tế Vinmec Central Park', '02836221166', '208 Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh', 'TP. Hồ Chí Minh', 10.7925, 106.7214, '07:00:00', '21:00:00')
ON CONFLICT (id) DO NOTHING;

-- 3. TÀI KHOẢN MẪU (USERS)
-- Lưu ý: Mật khẩu mặc định là 'Password@123' (hash bằng bcrypt)
INSERT INTO users (id, phone, email, password_hash, full_name, avatar_url, gender, role)
VALUES 
    ('33333333-3333-3333-3333-333333333301', '0901000001', 'admin@medcare.vn', '$2b$10$wK1cE0lE8y6/1dEa.eA9E.sZc7U7GvBsh2Qz8hH.l5aP8B11s7a9S', 'Quản Trị Viên Hệ Thống', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', 'FEMALE', 'ADMIN'),
    ('33333333-3333-3333-3333-333333333302', '0901000002', 'letan01@medcare.vn', '$2b$10$wK1cE0lE8y6/1dEa.eA9E.sZc7U7GvBsh2Qz8hH.l5aP8B11s7a9S', 'Lễ Tân Nguyễn Thị Mai', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2', 'FEMALE', 'RECEPTIONIST'),
    ('33333333-3333-3333-3333-333333333303', '0901000003', 'bshung.timmach@medcare.vn', '$2b$10$wK1cE0lE8y6/1dEa.eA9E.sZc7U7GvBsh2Qz8hH.l5aP8B11s7a9S', 'PGS.TS Trần Văn Hùng', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d', 'MALE', 'DOCTOR'),
    ('33333333-3333-3333-3333-333333333304', '0901000004', 'bstrang.nhikhoa@medcare.vn', '$2b$10$wK1cE0lE8y6/1dEa.eA9E.sZc7U7GvBsh2Qz8hH.l5aP8B11s7a9S', 'ThS.BS Lê Thu Trang', 'https://images.unsplash.com/photo-1594824813515-5e6fe7a5e848', 'FEMALE', 'DOCTOR'),
    ('33333333-3333-3333-3333-333333333305', '0987654321', 'benhnhan.nam@gmail.com', '$2b$10$wK1cE0lE8y6/1dEa.eA9E.sZc7U7GvBsh2Qz8hH.l5aP8B11s7a9S', 'Nguyễn Văn Nam', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde', 'MALE', 'PATIENT')
ON CONFLICT (phone) DO NOTHING;

-- 4. HỒ SƠ BÁC SĨ (DOCTORS)
INSERT INTO doctors (id, user_id, speciality_id, clinic_id, title, license_number, consultation_fee, experience_years, patient_count, rating_avg, review_count, bio, room_number)
VALUES 
    (
        '44444444-4444-4444-4444-444444444401',
        '33333333-3333-3333-3333-333333333303',
        '11111111-1111-1111-1111-111111111101', -- Tim mạch
        '22222222-2222-2222-2222-222222222201',
        'PGS.TS.BS',
        'CCHN-008922/HCM',
        500000.00,
        22,
        3400,
        4.95,
        180,
        'Chuyên gia đầu ngành về can thiệp tim mạch, nguyên Trưởng khoa Tim mạch Bệnh viện Chợ Rẫy. Có hơn 20 năm kinh nghiệm điều trị tăng huyết áp, suy tim và bệnh mạch vành.',
        'Phòng 204 - Tầng 2'
    ),
    (
        '44444444-4444-4444-4444-444444444402',
        '33333333-3333-3333-3333-333333333304',
        '11111111-1111-1111-1111-111111111102', -- Nhi khoa
        '22222222-2222-2222-2222-222222222201',
        'ThS.BS',
        'CCHN-014562/HCM',
        350000.00,
        10,
        1850,
        4.88,
        95,
        'Tốt nghiệp Thạc sĩ Nhi khoa ĐH Y Dược TP.HCM. Bác sĩ tận tâm, chuyên khám và điều trị các bệnh lý hô hấp, tiêu hóa và tư vấn dinh dưỡng cho trẻ nhỏ.',
        'Phòng 102 - Tầng 1'
    )
ON CONFLICT (user_id) DO NOTHING;

-- 5. KHUNG GIỜ KHÁM MẪU (SLOTS) CHO NGÀY MAI
INSERT INTO doctor_slots (doctor_id, slot_date, start_time, end_time, status)
VALUES 
    ('44444444-4444-4444-4444-444444444401', CURRENT_DATE + INTERVAL '1 day', '08:00:00', '08:30:00', 'AVAILABLE'),
    ('44444444-4444-4444-4444-444444444401', CURRENT_DATE + INTERVAL '1 day', '08:30:00', '09:00:00', 'AVAILABLE'),
    ('44444444-4444-4444-4444-444444444401', CURRENT_DATE + INTERVAL '1 day', '09:00:00', '09:30:00', 'AVAILABLE'),
    ('44444444-4444-4444-4444-444444444401', CURRENT_DATE + INTERVAL '1 day', '09:30:00', '10:00:00', 'AVAILABLE'),
    ('44444444-4444-4444-4444-444444444402', CURRENT_DATE + INTERVAL '1 day', '13:30:00', '14:00:00', 'AVAILABLE'),
    ('44444444-4444-4444-4444-444444444402', CURRENT_DATE + INTERVAL '1 day', '14:00:00', '14:30:00', 'AVAILABLE'),
    ('44444444-4444-4444-4444-444444444402', CURRENT_DATE + INTERVAL '1 day', '14:30:00', '15:00:00', 'AVAILABLE')
ON CONFLICT (doctor_id, slot_date, start_time) DO NOTHING;

-- 6. MÃ GIẢM GIÁ (COUPONS)
INSERT INTO coupons (code, description, discount_percent, max_discount, valid_from, valid_to, usage_limit)
VALUES 
    ('HEALTHY20', 'Giảm 20% phí khám cho mọi chuyên khoa', 20.00, 100000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days', 500),
    ('CHAOBANMOI', 'Tặng 50.000đ cho lượt đặt khám đầu tiên', 0.00, 50000.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '180 days', 1000)
ON CONFLICT (code) DO NOTHING;

