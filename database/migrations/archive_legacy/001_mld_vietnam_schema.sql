-- ==============================================================================
-- MLD VIỆT NAM - HỆ SINH THÁI CHĂM SÓC SẮC ĐẸP, SPA DƯỠNG SINH & HỌC VIỆN ĐÀO TẠO
-- DATABASE INITIALIZATION SCHEMA (PRODUCTION READY)
-- Version: 3.0.0 (Clean Architecture & 100% Figma Standard)
-- Database: PostgreSQL 15+ (Compatible with Supabase)
-- ==============================================================================

-- 1. BẬT CÁC EXTENSION CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Tạo UUID an toàn
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Mã hóa và hàm băm mật khẩu
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Tìm kiếm gần đúng (Fuzzy Search) tiếng Việt

-- ==============================================================================
-- 2. CÁC KIỂU DỮ LIỆU ENUM (CUSTOM ENUM TYPES)
-- ==============================================================================
DO $$ BEGIN
    -- Vai trò người dùng trong hệ sinh thái MLD
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'CUSTOMER',      -- Khách hàng sử dụng dịch vụ Spa / Liệu trình làm đẹp
            'STUDENT',       -- Học viên tham gia các khóa đào tạo nghề Academy
            'TECHNICIAN',    -- Kỹ thuật viên / Chuyên viên trị liệu Spa
            'INSTRUCTOR',    -- Giảng viên / Master Trainer đào tạo nghề
            'STAFF',         -- Lễ tân / Nhân viên chăm sóc khách hàng tại cơ sở
            'ADMIN'          -- Quản trị viên hệ thống
        );
    END IF;

    -- Nhu cầu quan tâm của khách hàng (Được chọn tại Màn hình A06)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purpose_interest') THEN
        CREATE TYPE purpose_interest AS ENUM (
            'BEAUTY_SPA',    -- Chăm sóc sắc đẹp & Spa dưỡng sinh
            'ACADEMY',       -- Đào tạo nghề Spa & Y tế thẩm mỹ
            'BOTH'           -- Cả hai nhu cầu
        );
    END IF;

    -- Hạng thẻ hội viên MLD Loyalty
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_tier') THEN
        CREATE TYPE member_tier AS ENUM (
            'STANDARD',      -- Chuẩn (Hội viên mới kích hoạt)
            'SILVER',        -- Bạc
            'GOLD',          -- Vàng
            'PLATINUM',      -- Bạch Kim
            'DIAMOND'        -- Kim Cương
        );
    END IF;

    -- Trạng thái khung giờ làm việc của Kỹ thuật viên
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_status') THEN
        CREATE TYPE slot_status AS ENUM (
            'AVAILABLE',     -- Còn trống, sẵn sàng nhận khách
            'HOLD',          -- Đang tạm giữ trong 10 phút thanh toán
            'BOOKED',        -- Đã có khách đặt thành công
            'BLOCKED'        -- Nghỉ phép / Không hoạt động
        );
    END IF;

    -- Trạng thái lịch hẹn dịch vụ Spa
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'PENDING',        -- Chờ xác nhận / Chờ thanh toán
            'CONFIRMED',      -- Đã xác nhận giữ lịch
            'CHECKED_IN',     -- Đã đến Spa & quét mã QR check-in
            'IN_SERVICE',     -- Đang trong phòng làm dịch vụ cùng KTV
            'COMPLETED',      -- Đã hoàn thành dịch vụ & nghiệm thu
            'CANCELLED',      -- Khách hoặc Spa đã hủy lịch
            'NO_SHOW'         -- Khách không đến
        );
    END IF;

    -- Trạng thái gói liệu trình nhiều buổi
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_status') THEN
        CREATE TYPE package_status AS ENUM (
            'ACTIVE',         -- Đang sử dụng bình thường
            'COMPLETED',      -- Đã dùng hết số buổi
            'EXPIRED',        -- Hết thời hạn liệu trình
            'CANCELLED'       -- Đã hủy / Hoàn tiền
        );
    END IF;

    -- Cấp độ khóa học đào tạo nghề Academy
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_level') THEN
        CREATE TYPE course_level AS ENUM (
            'BEGINNER',       -- Cơ bản / Dành cho người mới bắt đầu học nghề
            'INTERMEDIATE',   -- Nâng cao tay nghề
            'ADVANCED',       -- Chuyên sâu / Cấp chứng chỉ nghề y tế thẩm mỹ
            'MASTER'          -- Chuyên gia / Đào tạo Quản lý & Vận hành Spa
        );
    END IF;

    -- Trạng thái lớp học đào tạo
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_status') THEN
        CREATE TYPE batch_status AS ENUM (
            'UPCOMING',              -- Sắp khai giảng
            'OPEN_FOR_ENROLLMENT',   -- Đang nhận đăng ký
            'IN_PROGRESS',           -- Đang trong kỳ học
            'COMPLETED'              -- Đã bế giảng & cấp chứng chỉ
        );
    END IF;

    -- Trạng thái đăng ký khóa học của học viên
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_status') THEN
        CREATE TYPE enrollment_status AS ENUM (
            'REGISTERED',     -- Đã đăng ký giữ chỗ
            'STUDYING',       -- Đang theo học
            'GRADUATED',      -- Đã tốt nghiệp & nhận chứng chỉ
            'DROPPED'         -- Tạm hoãn / Bảo lưu
        );
    END IF;

    -- Trạng thái thanh toán
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'UNPAID',         -- Chưa thanh toán
            'PENDING',        -- Đang xử lý giao dịch cổng thanh toán
            'PARTIAL',        -- Thanh toán một phần / Đặt cọc
            'PAID',           -- Đã thanh toán đầy đủ
            'REFUNDED',       -- Đã hoàn tiền
            'FAILED'          -- Giao dịch thất bại
        );
    END IF;

    -- Phương thức thanh toán
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM (
            'CASH_AT_SPA',          -- Tiền mặt tại quầy lễ tân
            'VNPAY',                -- Cổng VNPAY (QR / ATM)
            'MOMO',                 -- Ví điện tử MoMo
            'BANK_TRANSFER',        -- Chuyển khoản ngân hàng trực tiếp
            'MEMBERSHIP_WALLET'     -- Trừ ví điểm thưởng / Thẻ trả trước
        );
    END IF;
END $$;

-- 3. HÀM TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. BẢNG NGƯỜI DÙNG & TÀI KHOẢN HỘI VIÊN (USERS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,             -- SĐT đăng nhập OTP (A03, A04)
    email VARCHAR(255) UNIQUE,                     -- Email cá nhân (A05)
    password_hash VARCHAR(255),                    -- Mã hash bảo mật nếu có mật khẩu
    full_name VARCHAR(150),                        -- Họ và tên khách hàng (A05)
    avatar_url TEXT,                               -- Ảnh đại diện khách hàng (A05)
    gender VARCHAR(10) DEFAULT 'OTHER',            -- 'FEMALE', 'MALE', 'OTHER' (A05)
    date_of_birth DATE,                            -- Ngày sinh (A05 - dùng tặng quà sinh nhật)
    address TEXT,                                  -- Địa chỉ cư trú
    
    -- Mục đích trải nghiệm (A06)
    purpose purpose_interest DEFAULT 'BEAUTY_SPA',
    
    -- Phân quyền hệ thống
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    
    -- Chương trình Hội viên & Điểm thưởng MLD Loyalty (Group F)
    membership_tier member_tier DEFAULT 'STANDARD',
    reward_points INT DEFAULT 0,                   -- Điểm thưởng hiện có
    total_spent NUMERIC(12, 2) DEFAULT 0.00,       -- Tổng chi tiêu tích lũy
    referral_code VARCHAR(20) UNIQUE,              -- Mã giới thiệu cá nhân (F07)
    referred_by UUID REFERENCES users(id),         -- Được giới thiệu bởi ai
    
    -- Thiết bị & Trạng thái hoạt động
    is_active BOOLEAN DEFAULT TRUE,
    fcm_device_token TEXT,                         -- Token thông báo đẩy Firebase FCM
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. BẢNG CHI NHÁNH CƠ SỞ SPA MLD (BRANCHES) - Nhóm B & Web Admin
-- ==============================================================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,                    -- Tên cơ sở (VD: 'MLD Beauty & Spa — Quận 3')
    phone VARCHAR(20) NOT NULL,                    -- Hotline cơ sở
    address TEXT NOT NULL,                         -- Địa chỉ cụ thể
    district VARCHAR(100),                         -- Quận / Huyện
    city VARCHAR(100) DEFAULT 'TP. Hồ Chí Minh',   -- Thành phố
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    opening_time TIME DEFAULT '08:30:00',
    closing_time TIME DEFAULT '20:30:00',
    image_url TEXT,                                -- Ảnh đại diện cơ sở
    gallery_urls JSONB DEFAULT '[]'::jsonb,        -- Bộ sưu tập ảnh phòng Spa
    amenities JSONB DEFAULT '["Phòng VIP", "Máy soi da chuyên sâu", "Bãi đỗ ô tô", "Trà thảo mộc"]'::jsonb,
    total_rooms INT DEFAULT 8,                     -- Số phòng dịch vụ
    total_beds INT DEFAULT 16,                     -- Số giường trị liệu
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. BẢNG KỸ THUẬT VIÊN / CHUYÊN VIÊN SPA (TECHNICIANS) - Nhóm B & C
-- ==============================================================================
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    title VARCHAR(100) DEFAULT 'Kỹ thuật viên chuyên nghiệp', -- 'Chuyên viên Trị liệu Cấp cao'
    avatar_url TEXT,
    experience_years INT DEFAULT 3,
    rating_avg NUMERIC(3, 2) DEFAULT 5.00,
    review_count INT DEFAULT 0,
    specialties JSONB DEFAULT '["Chăm sóc da", "Massage dưỡng sinh"]'::jsonb,
    bio TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_technicians_updated_at
BEFORE UPDATE ON technicians
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. BẢNG DANH MỤC DỊCH VỤ SPA (SERVICE_CATEGORIES) - Nhóm B
-- ==============================================================================
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,             -- 'Chăm sóc da & Trị liệu', 'Gội đầu dưỡng sinh'
    code VARCHAR(50) NOT NULL UNIQUE,              -- 'SKINCARE', 'HEAD_SPA', 'BODY_MASSAGE'
    icon_url TEXT NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_service_categories_updated_at
BEFORE UPDATE ON service_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 8. BẢNG DỊCH VỤ SPA & LÀM ĐẸP (SERVICES) - Nhóm B & C
-- ==============================================================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE,
    short_description TEXT,
    full_description TEXT,
    duration_minutes INT NOT NULL DEFAULT 60,      -- 60 phút, 90 phút, 120 phút
    price NUMERIC(12, 2) NOT NULL,                 -- Đơn giá niêm yết
    discount_price NUMERIC(12, 2),                 -- Giá ưu đãi nếu có
    image_url TEXT NOT NULL,
    gallery_urls JSONB DEFAULT '[]'::jsonb,
    steps JSONB DEFAULT '[]'::jsonb,               -- Quy trình các bước thực hiện
    benefits JSONB DEFAULT '[]'::jsonb,            -- Lợi ích sau khi làm
    is_featured BOOLEAN DEFAULT FALSE,             -- Hiển thị nổi bật ở Trang chủ B01
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 9. BẢNG KHUNG GIỜ LÀM VIỆC CỦA KỸ THUẬT VIÊN (TECHNICIAN_SLOTS) - Nhóm C
-- ==============================================================================
CREATE TABLE IF NOT EXISTS technician_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status slot_status NOT NULL DEFAULT 'AVAILABLE',
    held_by_user_id UUID REFERENCES users(id),    -- Giữ chỗ trong 10 phút thanh toán
    hold_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_tech_slot UNIQUE (technician_id, slot_date, start_time)
);

CREATE TRIGGER trg_technician_slots_updated_at
BEFORE UPDATE ON technician_slots
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 10. BẢNG MÃ GIẢM GIÁ / ƯU ĐÃI (COUPONS) - Nhóm C & F
-- ==============================================================================
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,             -- 'MLDCHAOXIN', 'SPADAY20'
    title VARCHAR(150) NOT NULL,
    description TEXT,
    discount_percent NUMERIC(5, 2) DEFAULT 0,     -- VD: 20.00 (%)
    discount_amount NUMERIC(12, 2) DEFAULT 0,     -- Giảm thẳng số tiền
    max_discount NUMERIC(12, 2),                  -- Mức giảm tối đa
    min_order_amount NUMERIC(12, 2) DEFAULT 0,
    applicable_to VARCHAR(50) DEFAULT 'ALL',      -- 'ALL', 'SPA_SERVICE', 'COURSE', 'PACKAGE'
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    usage_limit INT DEFAULT 1000,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 11. BẢNG ĐẶT LỊCH DỊCH VỤ SPA (BOOKINGS) - Trọng tâm Nhóm C
-- ==============================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(30) UNIQUE NOT NULL,     -- 'MLD-20261014-88991'
    customer_id UUID NOT NULL REFERENCES users(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    service_id UUID NOT NULL REFERENCES services(id),
    technician_id UUID REFERENCES technicians(id),-- Có thể chọn đích danh hoặc hệ thống phân bổ
    slot_id UUID REFERENCES technician_slots(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Trạng thái lịch & Thanh toán
    status booking_status NOT NULL DEFAULT 'PENDING',
    payment_status payment_status NOT NULL DEFAULT 'UNPAID',
    payment_method payment_method NOT NULL DEFAULT 'CASH_AT_SPA',
    
    -- Tài chính
    base_price NUMERIC(12, 2) NOT NULL,
    coupon_id UUID REFERENCES coupons(id),
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL,
    
    -- Ghi chú & Quét QR Check-in
    special_notes TEXT,                           -- Yêu cầu riêng (lực bấm, da nhạy cảm...)
    qr_code_hash VARCHAR(255) NOT NULL,           -- Chuỗi mã hóa QR cho lễ tân quét nhận diện
    checked_in_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 12. BẢNG GÓI LIỆU TRÌNH ĐỊNH KỲ (TREATMENT_PACKAGES) - Nhóm D
-- ==============================================================================
CREATE TABLE IF NOT EXISTS treatment_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,                    -- 'Liệu trình Trị mụn Chuyên sâu 5 buổi'
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    total_sessions INT NOT NULL DEFAULT 5,         -- Tổng số buổi
    price NUMERIC(12, 2) NOT NULL,                 -- Giá gói
    discount_price NUMERIC(12, 2),
    validity_months INT DEFAULT 6,                 -- Hạn dùng 6 tháng
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_treatment_packages_updated_at
BEFORE UPDATE ON treatment_packages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 13. BẢNG GÓI LIỆU TRÌNH KHÁCH ĐÃ MUA (USER_PACKAGES) - Nhóm D
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES treatment_packages(id) ON DELETE CASCADE,
    total_sessions INT NOT NULL,
    completed_sessions INT DEFAULT 0,
    status package_status NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_user_packages_updated_at
BEFORE UPDATE ON user_packages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 14. BẢNG NHẬT KÝ CHĂM SÓC LIỆU TRÌNH (TREATMENT_JOURNAL) - Nhóm D
-- ==============================================================================
CREATE TABLE IF NOT EXISTS treatment_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_package_id UUID REFERENCES user_packages(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    session_number INT NOT NULL DEFAULT 1,         -- Buổi số mấy trong liệu trình
    session_date DATE NOT NULL,
    skin_condition_before TEXT,                    -- Tình trạng làn da trước khi chăm sóc
    skin_condition_after TEXT,                     -- Kết quả và tiến triển sau buổi
    treatment_notes TEXT,                          -- Thao tác và mỹ phẩm sử dụng
    before_photos JSONB DEFAULT '[]'::jsonb,       -- Ảnh chụp da trước buổi
    after_photos JSONB DEFAULT '[]'::jsonb,        -- Ảnh chụp da sau buổi
    customer_feedback TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_treatment_journal_updated_at
BEFORE UPDATE ON treatment_journal
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 15. BẢNG DANH MỤC KHÓA HỌC ACADEMY (COURSE_CATEGORIES) - Nhóm E
-- ==============================================================================
CREATE TABLE IF NOT EXISTS course_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,             -- 'Đào tạo Chăm sóc da Chuyên nghiệp'
    code VARCHAR(50) NOT NULL UNIQUE,              -- 'SKIN_ACADEMY', 'HEAD_SPA_ACADEMY'
    icon_url TEXT NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_course_categories_updated_at
BEFORE UPDATE ON course_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 16. BẢNG GIẢNG VIÊN / CHUYÊN GIA ĐÀO TẠO (INSTRUCTORS) - Nhóm E
-- ==============================================================================
CREATE TABLE IF NOT EXISTS instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    title VARCHAR(100) DEFAULT 'Giảng viên chuyên môn', -- 'Master Trainer Chăm sóc da'
    avatar_url TEXT,
    experience_years INT DEFAULT 8,
    bio TEXT,
    achievements JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_instructors_updated_at
BEFORE UPDATE ON instructors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 17. BẢNG KHÓA HỌC ĐÀO TẠO NGHỀ (COURSES) - Nhóm E
-- ==============================================================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    title VARCHAR(250) NOT NULL,
    slug VARCHAR(250) UNIQUE,
    short_description TEXT,
    full_description TEXT,
    level course_level NOT NULL DEFAULT 'BEGINNER',
    total_hours INT NOT NULL DEFAULT 40,
    total_sessions INT NOT NULL DEFAULT 15,
    tuition_fee NUMERIC(12, 2) NOT NULL,           -- Học phí chính thức
    discount_fee NUMERIC(12, 2),                   -- Ưu đãi đăng ký sớm
    syllabus JSONB DEFAULT '[]'::jsonb,            -- Khung chương trình học từng buổi
    certificate_title VARCHAR(200) DEFAULT 'Chứng chỉ Chuyên môn MLD',
    image_url TEXT NOT NULL,
    is_hot BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 18. BẢNG LỚP HỌC / ĐỢT KHAI GIẢNG (COURSE_BATCHES) - Nhóm E
-- ==============================================================================
CREATE TABLE IF NOT EXISTS course_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    batch_code VARCHAR(50) NOT NULL UNIQUE,        -- 'MLD-K26-SPA01'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    schedule_info VARCHAR(200) NOT NULL,           -- 'Tối 2-4-6 (18:30 - 21:00)'
    max_students INT DEFAULT 12,
    enrolled_count INT DEFAULT 0,
    status batch_status NOT NULL DEFAULT 'OPEN_FOR_ENROLLMENT',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_course_batches_updated_at
BEFORE UPDATE ON course_batches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 19. BẢNG HỌC VIÊN ĐĂNG KÝ HỌC (COURSE_ENROLLMENTS) - Nhóm E
-- ==============================================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_code VARCHAR(30) UNIQUE NOT NULL,   -- 'ENR-202610-0012'
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES course_batches(id) ON DELETE SET NULL,
    tuition_paid NUMERIC(12, 2) NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'PAID',
    learning_progress_percent INT DEFAULT 0,
    status enrollment_status NOT NULL DEFAULT 'REGISTERED',
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_course_enrollments_updated_at
BEFORE UPDATE ON course_enrollments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 20. BẢNG BIẾN ĐỘNG ĐIỂM THƯỞNG HỘI VIÊN (POINT_TRANSACTIONS) - Nhóm F
-- ==============================================================================
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_change INT NOT NULL,                    -- +50 điểm hoặc -100 điểm
    balance_after INT NOT NULL,                    -- Số dư điểm sau giao dịch
    action_type VARCHAR(50) NOT NULL,              -- 'BOOKING_REWARD', 'REFERRAL_BONUS', 'REDEEM'
    description TEXT NOT NULL,
    reference_id UUID,                             -- ID của booking hoặc coupon liên quan
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 21. BẢNG ĐÁNH GIÁ & BÌNH LUẬN (REVIEWS) - Nhóm B & C
-- ==============================================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    reply_from_branch TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 22. BẢNG THÔNG BÁO HỆ THỐNG (NOTIFICATIONS) - Nhóm F
-- ==============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'SYSTEM',             -- 'BOOKING', 'ACADEMY', 'LOYALTY', 'PROMOTION'
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

