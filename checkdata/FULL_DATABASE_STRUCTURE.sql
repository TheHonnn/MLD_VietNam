-- ==============================================================================
-- MLD VIỆT NAM - DATABASE SCHEMA DEFINITION SCRIPT (PRODUCTION GRADE)
-- Hệ thống Y tế, Dưỡng sinh Spa & Học viện Đào tạo Nghề
-- Tương thích 100% Thiết kế Figma ("Medical Healthcare Mobile App" - ctH76PAiMBTQLJE0BxNjOI)
-- Database Engine: PostgreSQL 15+ (Hỗ trợ Supabase & AWS RDS)
-- ==============================================================================

-- 1. BẬT EXTENSION POSTGRESQL CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Sinh UUID v4 an toàn
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Hàm băm bảo mật và mã hóa
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Tìm kiếm gần đúng tiếng Việt không dấu (Trigram)

-- ==============================================================================
-- 2. ĐỊNH NGHĨA CÁC KIỂU ENUM DỮ LIỆU
-- ==============================================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'CUSTOMER', 'STUDENT', 'TECHNICIAN', 'INSTRUCTOR', 
            'CASHIER', 'RECEPTIONIST', 'BRANCH_MANAGER', 'ADMIN'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purpose_interest') THEN
        CREATE TYPE purpose_interest AS ENUM ('BEAUTY_SPA', 'ACADEMY', 'BOTH');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_tier') THEN
        CREATE TYPE member_tier AS ENUM ('STANDARD', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_type') THEN
        CREATE TYPE room_type AS ENUM (
            'VIP_ROOM', 'MASSAGE_ROOM', 'HEAD_SPA_ROOM', 
            'SKINCARE_ROOM', 'ACADEMY_CLASSROOM', 'PRACTICE_LAB'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_status') THEN
        CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'HOLD', 'BOOKED', 'BLOCKED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 
            'COMPLETED', 'CANCELLED', 'NO_SHOW'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_status') THEN
        CREATE TYPE package_status AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_level') THEN
        CREATE TYPE course_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_status') THEN
        CREATE TYPE batch_status AS ENUM (
            'UPCOMING', 'OPEN_FOR_ENROLLMENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_status') THEN
        CREATE TYPE enrollment_status AS ENUM (
            'CONSULTING', 'DEPOSITED', 'ENROLLED', 'STUDYING', 'GRADUATED', 'DROPPED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_type') THEN
        CREATE TYPE lesson_type AS ENUM ('VIDEO', 'READING_DOC', 'PRACTICE_GUIDE', 'QUIZ');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'UNPAID', 'PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'FAILED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM (
            'CASH_AT_SPA', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 
            'MEMBERSHIP_WALLET', 'SPLIT_PAYMENT'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_status') THEN
        CREATE TYPE voucher_status AS ENUM ('AVAILABLE', 'USED', 'EXPIRED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM ('PENDING', 'PROCESSING', 'RESOLVED', 'CLOSED');
    END IF;
END $$;

-- 3. HÀM CẬP NHẬT THỜI GIAN TỰ ĐỘNG
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. PHÂN HỆ 1: TÀI KHOẢN, PHÂN QUYỀN & THIẾT LẬP (USERS & SETTINGS)
-- ==============================================================================

-- Bảng 1: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    gender VARCHAR(10) DEFAULT 'OTHER' CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    date_of_birth DATE,
    address TEXT,
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    purpose purpose_interest NOT NULL DEFAULT 'BEAUTY_SPA',
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    membership_tier member_tier NOT NULL DEFAULT 'STANDARD',
    reward_points INT NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
    total_spent NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_spent >= 0),
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referred_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    fcm_device_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Bảng 2: user_settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    appointment_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    promotion_notify BOOLEAN NOT NULL DEFAULT TRUE,
    system_notify BOOLEAN NOT NULL DEFAULT TRUE,
    language VARCHAR(10) NOT NULL DEFAULT 'vi' CHECK (language IN ('vi', 'en')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. PHÂN HỆ 2: CƠ SỞ CHI NHÁNH, PHÒNG TRỊ LIỆU & GIƯỜNG (BRANCHES & ROOMS)
-- ==============================================================================

-- Bảng 3: branches
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'TP. Hồ Chí Minh',
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    opening_time TIME NOT NULL DEFAULT '08:30:00',
    closing_time TIME NOT NULL DEFAULT '20:30:00',
    image_url TEXT NOT NULL,
    gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Bảng 4: branch_rooms
CREATE TABLE IF NOT EXISTS branch_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    room_type room_type NOT NULL DEFAULT 'MASSAGE_ROOM',
    bed_capacity INT NOT NULL DEFAULT 2 CHECK (bed_capacity >= 1),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. PHÂN HỆ 3: ĐỘI NGŨ CHUYÊN GIA, CA TRỰC & NGHỈ PHÉP (SPECIALISTS & SLOTS)
-- ==============================================================================

-- Bảng 5: technicians
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    title VARCHAR(100) NOT NULL DEFAULT 'Kỹ thuật viên cấp cao',
    avatar_url TEXT NOT NULL,
    experience_years INT NOT NULL DEFAULT 3 CHECK (experience_years >= 0),
    rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating_avg >= 1.0 AND rating_avg <= 5.0),
    review_count INT NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
    bio TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_technicians_updated_at
BEFORE UPDATE ON technicians
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Bảng 6: technician_shifts
CREATE TABLE IF NOT EXISTS technician_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    assigned_room_id UUID REFERENCES branch_rooms(id) ON DELETE SET NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 7: technician_slots (Có ràng buộc chống trùng lịch và khóa 10 phút)
CREATE TABLE IF NOT EXISTS technician_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status slot_status NOT NULL DEFAULT 'AVAILABLE',
    held_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    hold_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_technician_slot UNIQUE (technician_id, slot_date, start_time)
);

-- ==============================================================================
-- 7. PHÂN HỆ 4: DANH MỤC DỊCH VỤ SPA (SERVICES)
-- ==============================================================================

-- Bảng 8: service_categories
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    icon_url TEXT NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 9: services
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    discount_price NUMERIC(12, 2) CHECK (discount_price >= 0),
    image_url TEXT NOT NULL,
    gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ==============================================================================
-- 8. PHÂN HỆ 5: ĐẶT LỊCH, GIỮ CHỖ & VÉ HẸN CHECK-IN (BOOKINGS & ITEMS)
-- ==============================================================================

-- Bảng 10: coupons (Mã giảm giá chiến dịch)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    max_discount NUMERIC(12, 2),
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    usage_limit INT NOT NULL DEFAULT 1000,
    used_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 11: bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(30) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    assigned_room_id UUID REFERENCES branch_rooms(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status NOT NULL DEFAULT 'PENDING',
    payment_status payment_status NOT NULL DEFAULT 'UNPAID',
    payment_method payment_method NOT NULL DEFAULT 'CASH_AT_SPA',
    base_total NUMERIC(12, 2) NOT NULL,
    coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    points_used INT NOT NULL DEFAULT 0 CHECK (points_used >= 0),
    points_discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    final_price NUMERIC(12, 2) NOT NULL,
    booked_for_name VARCHAR(150),
    booked_for_phone VARCHAR(20),
    special_notes TEXT,
    qr_code_hash VARCHAR(255) UNIQUE NOT NULL,
    checked_in_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Bảng 12: booking_items (Chi tiết từng dịch vụ trong giỏ lịch hẹn Multi-Service)
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 9. PHÂN HỆ 6: GÓI LIỆU TRÌNH, NHẬT KÝ & CHĂM SÓC (TREATMENT & CARE)
-- ==============================================================================

-- Bảng 13: treatment_packages
CREATE TABLE IF NOT EXISTS treatment_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    total_sessions INT NOT NULL DEFAULT 5 CHECK (total_sessions >= 2),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    discount_price NUMERIC(12, 2) CHECK (discount_price >= 0),
    validity_months INT NOT NULL DEFAULT 6,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 14: user_packages
CREATE TABLE IF NOT EXISTS user_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES treatment_packages(id) ON DELETE CASCADE,
    total_sessions INT NOT NULL,
    completed_sessions INT NOT NULL DEFAULT 0,
    status package_status NOT NULL DEFAULT 'ACTIVE',
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Bảng 15: treatment_journal
CREATE TABLE IF NOT EXISTS treatment_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_package_id UUID REFERENCES user_packages(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    session_number INT NOT NULL DEFAULT 1 CHECK (session_number >= 1),
    session_date DATE NOT NULL,
    condition_before TEXT,
    condition_after TEXT,
    treatment_notes TEXT,
    before_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    after_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    specialist_advice TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 16: consultation_surveys (Khảo sát tiền dịch vụ D04)
CREATE TABLE IF NOT EXISTS consultation_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    focus_areas TEXT[] DEFAULT '{}',
    pressure_pref VARCHAR(20) DEFAULT 'MEDIUM' CHECK (pressure_pref IN ('LIGHT', 'MEDIUM', 'STRONG')),
    has_sensitive_skin BOOLEAN NOT NULL DEFAULT FALSE,
    has_oil_allergy BOOLEAN NOT NULL DEFAULT FALSE,
    allergy_details TEXT,
    medical_conditions TEXT[] DEFAULT '{}',
    special_requests TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 17: reviews (Đánh giá dịch vụ & KTV D05)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    comment TEXT,
    photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    branch_reply TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 18: home_care_guidelines (Cẩm nang chăm sóc tại nhà D06)
CREATE TABLE IF NOT EXISTS home_care_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    read_time_minutes INT NOT NULL DEFAULT 5,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT NOT NULL,
    author_name VARCHAR(150) NOT NULL DEFAULT 'Chuyên gia MLD',
    view_count INT NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 19: support_tickets & Bảng 20: support_faqs (D07)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'PENDING',
    admin_reply TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 10. PHÂN HỆ 7: HỘI VIÊN, TÍCH ĐIỂM, VOUCHER & GIỚI THIỆU (LOYALTY & PROMOTIONS)
-- ==============================================================================

-- Bảng 21: user_vouchers (Ví Voucher cá nhân F05)
CREATE TABLE IF NOT EXISTS user_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    status voucher_status NOT NULL DEFAULT 'AVAILABLE',
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMPTZ,
    used_in_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL
);

-- Bảng 22: point_transactions (Biến động điểm thưởng F04)
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_change INT NOT NULL,
    balance_after INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 23: referrals (Giới thiệu bạn bè F07)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referee_id UUID UNIQUE NOT NULL REFERENCES users(id),
    reward_points INT NOT NULL DEFAULT 100,
    reward_voucher_id UUID REFERENCES coupons(id),
    is_rewarded BOOLEAN NOT NULL DEFAULT FALSE,
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 11. PHÂN HỆ 8: HỌC VIỆN ĐÀO TẠO NGHỀ SPA & Y KHOA (ACADEMY LMS & OPERATIONS)
-- ==============================================================================

-- Bảng 24: course_categories
CREATE TABLE IF NOT EXISTS course_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    icon_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 25: instructors
CREATE TABLE IF NOT EXISTS instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    title VARCHAR(100) NOT NULL DEFAULT 'Master Trainer',
    avatar_url TEXT NOT NULL,
    experience_years INT NOT NULL DEFAULT 8,
    bio TEXT NOT NULL,
    achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 26: courses
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
    primary_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    title VARCHAR(250) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT NOT NULL,
    level course_level NOT NULL DEFAULT 'BEGINNER',
    total_hours INT NOT NULL DEFAULT 144,
    theory_hours INT NOT NULL DEFAULT 48,
    practice_hours INT NOT NULL DEFAULT 96,
    total_lessons INT NOT NULL DEFAULT 20,
    tuition_fee NUMERIC(12, 2) NOT NULL DEFAULT 9000000.00,
    deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 2000000.00,
    learning_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
    certificate_title VARCHAR(200) NOT NULL DEFAULT 'Chứng chỉ Kỹ thuật viên Spa MLD',
    image_url TEXT NOT NULL,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Bảng 27: course_chapters (Các chương học của khóa)
CREATE TABLE IF NOT EXISTS course_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_order INT NOT NULL DEFAULT 1,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 28: course_lessons (Chi tiết bài giảng Video & Tài liệu PDF E08, E09)
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES course_chapters(id) ON DELETE CASCADE,
    lesson_order INT NOT NULL DEFAULT 1,
    title VARCHAR(200) NOT NULL,
    lesson_type lesson_type NOT NULL DEFAULT 'VIDEO',
    duration_minutes INT NOT NULL DEFAULT 18,
    video_url TEXT,
    content_text TEXT,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    learning_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_free_preview BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 29: course_batches (Lớp học theo đợt khai giảng)
CREATE TABLE IF NOT EXISTS course_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    schedule_text VARCHAR(200) NOT NULL,
    max_students INT NOT NULL DEFAULT 15,
    enrolled_count INT NOT NULL DEFAULT 0,
    status batch_status NOT NULL DEFAULT 'OPEN_FOR_ENROLLMENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 30: course_enrollments (Hồ sơ học viên đăng ký)
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES course_batches(id) ON DELETE SET NULL,
    status enrollment_status NOT NULL DEFAULT 'CONSULTING',
    tuition_total NUMERIC(12, 2) NOT NULL DEFAULT 9000000.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    completed_lessons_count INT NOT NULL DEFAULT 0,
    progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 31: user_lesson_progress (Tiến trình xem bài học và ghi chú)
CREATE TABLE IF NOT EXISTS user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    watched_seconds INT NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    student_notes TEXT,
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_enrollment_lesson UNIQUE (enrollment_id, lesson_id)
);

-- Bảng 32: course_quizzes (Bài kiểm tra trắc nghiệm E10)
CREATE TABLE IF NOT EXISTS course_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    total_questions INT NOT NULL DEFAULT 20,
    time_limit_minutes INT NOT NULL DEFAULT 30,
    passing_score NUMERIC(4, 2) NOT NULL DEFAULT 8.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 33: quiz_questions (Ngân hàng câu hỏi trắc nghiệm)
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option VARCHAR(5) NOT NULL,
    explanation TEXT
);

-- Bảng 34: quiz_submissions (Bài thi đã nộp của học viên E10)
CREATE TABLE IF NOT EXISTS quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    score NUMERIC(4, 2) NOT NULL,
    correct_count INT NOT NULL,
    submitted_answers JSONB NOT NULL,
    instructor_feedback TEXT,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 35: batch_schedules (Thời khóa biểu từng buổi học thực hành lâm sàng)
CREATE TABLE IF NOT EXISTS batch_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES course_batches(id) ON DELETE CASCADE,
    assigned_room_id UUID REFERENCES branch_rooms(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic VARCHAR(250) NOT NULL,
    is_practice_lab BOOLEAN NOT NULL DEFAULT FALSE
);

-- Bảng 36: student_attendance (Sổ điểm danh học viên)
CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES batch_schedules(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'PRESENT',
    check_in_time TIMESTAMPTZ,
    notes TEXT,
    CONSTRAINT uq_attendance UNIQUE (schedule_id, enrollment_id)
);

-- Bảng 37: student_academic_records (Bảng điểm 4 chiều & Chứng chỉ tốt nghiệp E12)
CREATE TABLE IF NOT EXISTS student_academic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID UNIQUE NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    theory_score NUMERIC(4, 2) NOT NULL CHECK (theory_score >= 0 AND theory_score <= 10),
    practical_score NUMERIC(4, 2) NOT NULL CHECK (practical_score >= 0 AND practical_score <= 10),
    attended_sessions INT NOT NULL DEFAULT 18,
    total_batch_sessions INT NOT NULL DEFAULT 20,
    attendance_rate NUMERIC(5, 2) NOT NULL DEFAULT 90.00,
    feedback_theory TEXT,
    feedback_practical TEXT,
    feedback_attendance TEXT,
    feedback_attitude TEXT,
    is_graduated BOOLEAN NOT NULL DEFAULT FALSE,
    graduation_date DATE,
    certificate_code VARCHAR(50) UNIQUE,
    certificate_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 12. PHÂN HỆ 9: THU NGÂN POS, HÓA ĐƠN & BÁO CÁO DOANH THU (CASHIER & FINANCIALS)
-- ==============================================================================

-- Bảng 38: invoices (Hóa đơn thu ngân POS W07, F06, W12)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_code VARCHAR(50) UNIQUE NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    user_package_id UUID REFERENCES user_packages(id) ON DELETE SET NULL,
    enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE SET NULL,
    subtotal NUMERIC(14, 2) NOT NULL,
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    points_redeemed_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'CASH_AT_SPA',
    payment_status payment_status NOT NULL DEFAULT 'PAID',
    gateway_transaction_id VARCHAR(100),
    receipt_pdf_url TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 39: invoice_items (Chi tiết từng món trên hóa đơn)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_name VARCHAR(250) NOT NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'SERVICE',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    unit_price NUMERIC(12, 2) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL
);

-- Bảng 40: notifications (Thông báo đẩy D08, F01)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 41: audit_logs (Nhật ký kiểm toán hệ thống chuẩn y tế số)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 13. CHỈ MỤC TỐI ƯU HIỆU NĂNG CAO (PERFORMANCE INDEXES)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role_tier ON users(role, membership_tier);
CREATE INDEX IF NOT EXISTS idx_services_category_active ON services(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_name_trgm ON services USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_technician_slots_lookup ON technician_slots(technician_id, slot_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON bookings(customer_id, status, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_date ON bookings(branch_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_qr_code ON bookings(qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_paid ON invoices(branch_id, paid_at, payment_status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress ON user_lesson_progress(enrollment_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- ==============================================================================
-- 14. TRIGGER TỰ ĐỘNG TÍCH LŨY DOANH THU & NÂNG HẠNG HỘI VIÊN
-- ==============================================================================
CREATE OR REPLACE FUNCTION process_invoice_paid_membership()
RETURNS TRIGGER AS $$
DECLARE
    v_total_spent NUMERIC(14, 2);
    v_new_tier member_tier;
BEGIN
    IF (NEW.payment_status = 'PAID' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'PAID')) THEN
        -- Cộng dồn chi tiêu cho khách hàng
        UPDATE users
        SET total_spent = total_spent + NEW.total_amount
        WHERE id = NEW.customer_id
        RETURNING total_spent INTO v_total_spent;

        -- Xác định hạng thẻ dựa trên tổng chi tiêu
        IF v_total_spent >= 60000000.00 THEN
            v_new_tier := 'DIAMOND';
        ELSIF v_total_spent >= 30000000.00 THEN
            v_new_tier := 'PLATINUM';
        ELSIF v_total_spent >= 15000000.00 THEN
            v_new_tier := 'GOLD';
        ELSIF v_total_spent >= 5000000.00 THEN
            v_new_tier := 'SILVER';
        ELSE
            v_new_tier := 'STANDARD';
        END IF;

        -- Cập nhật hạng thẻ mới
        UPDATE users
        SET membership_tier = v_new_tier
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_paid_membership ON invoices;
CREATE TRIGGER trg_invoice_paid_membership
AFTER INSERT OR UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION process_invoice_paid_membership();

