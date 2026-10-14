-- ==============================================================================
-- MLD VIỆT NAM - DATABASE SCHEMA DEFINITION SCRIPT (PRODUCTION GRADE)
-- Hệ sinh thái Y tế, Dưỡng sinh Spa & Học viện Đào tạo Nghề
-- Tương thích 100% Thiết kế Figma & Cổng Quản trị Web Admin (CRUD toàn diện)
-- Database Engine: PostgreSQL 15+ (Hỗ trợ Supabase & AWS RDS)
-- Phiên bản: 4.0.0 (Admin CRUD & Business Engine Complete)
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
            'CASHIER', 'RECEPTIONIST', 'BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'
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
        CREATE TYPE package_status AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'PAUSED');
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

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_department') THEN
        CREATE TYPE staff_department AS ENUM (
            'RECEPTION', 'CASHIER', 'THERAPY_MASSAGE', 'SKINCARE', 
            'ACADEMY_TRAINING', 'CUSTOMER_SERVICE', 'ADMINISTRATION'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
        CREATE TYPE employment_type AS ENUM ('FULL_TIME', 'PART_TIME', 'PROBATION', 'INTERN');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
        CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'voucher_distribution_trigger') THEN
        CREATE TYPE voucher_distribution_trigger AS ENUM (
            'ON_SIGNUP', 'ON_BIRTHDAY', 'ON_TIER_UPGRADE', 'ON_FIRST_BOOKING', 
            'REFERRAL_INVITER', 'REFERRAL_INVITEE', 'MANUAL_BY_ADMIN', 'PUBLIC_CLAIM'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_status') THEN
        CREATE TYPE certificate_status AS ENUM ('DRAFT', 'ISSUED', 'REVOKED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tuition_trans_type') THEN
        CREATE TYPE tuition_trans_type AS ENUM (
            'DEPOSIT', 'FULL_PAYMENT', 'INSTALLMENT_1', 'INSTALLMENT_2', 
            'REMAINING_BALANCE', 'REFUND'
        );
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
-- 4. PHÂN HỆ 1: TÀI KHOẢN, PHÂN QUYỀN RBAC (AUTH & ROLES)
-- ==============================================================================

-- Bảng 1: users (Tài khoản người dùng toàn hệ thống)
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
    locked_reason TEXT,
    locked_at TIMESTAMPTZ,
    fcm_device_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Bảng 2: user_settings (Thiết lập app người dùng F08)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    appointment_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    promotion_notify BOOLEAN NOT NULL DEFAULT TRUE,
    system_notify BOOLEAN NOT NULL DEFAULT TRUE,
    language VARCHAR(10) NOT NULL DEFAULT 'vi' CHECK (language IN ('vi', 'en')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 3: roles (Vai trò quản trị hệ thống)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 4: permissions (Danh mục quyền hạn chi tiết)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 5: role_permissions (Gán quyền cho vai trò)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Bảng 6: user_roles (Gán vai trò cho người dùng theo chi nhánh)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    branch_id UUID, -- Sẽ được gắn khóa ngoại REFERENCES branches(id) sau khi bảng branches được khởi tạo
    granted_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_role_branch UNIQUE (user_id, role_id, branch_id)
);

-- ==============================================================================
-- 5. PHÂN HỆ 2: CƠ SỞ CHI NHÁNH & PHÒNG TRỊ LIỆU (BRANCHES & ROOMS)
-- ==============================================================================

-- Bảng 7: branches
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

-- Ràng buộc khóa ngoại cho bảng user_roles tới branches
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_roles_branch') THEN
        ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Bảng 8: branch_rooms (Phòng dịch vụ trị liệu & Phòng lab đào tạo)
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
-- 6. PHÂN HỆ 3: ĐỘI NGŨ NHÂN SỰ, KTV, CA TRỰC & NGHỈ PHÉP (STAFF & ROSTERS)
-- ==============================================================================

-- Bảng 9: staff_profiles (Hồ sơ nhân sự toàn cơ sở)
CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    department staff_department NOT NULL DEFAULT 'RECEPTION',
    position VARCHAR(100) NOT NULL,
    employment_type employment_type NOT NULL DEFAULT 'FULL_TIME',
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    resignation_date DATE,
    id_card_number VARCHAR(30),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_staff_profiles_updated_at
BEFORE UPDATE ON staff_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Bảng 10: technicians (Hồ sơ chuyên viên trị liệu Spa)
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    staff_profile_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
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

-- Bảng 11: technician_shifts (Phân ca trực và phân phòng làm việc W05)
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

-- Bảng 12: staff_leaves (Đơn xin nghỉ phép nhân viên)
CREATE TABLE IF NOT EXISTS staff_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL DEFAULT 'ANNUAL',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status leave_status NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 13: technician_slots (Lưới khung giờ nhận khách thời gian thực với khóa 10 phút)
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
-- 7. PHÂN HỆ 4: DANH MỤC DỊCH VỤ SPA (SERVICES CATALOG)
-- ==============================================================================

-- Bảng 14: service_categories
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

-- Bảng 15: services
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
-- 8. PHÂN HỆ 5: ĐẶT LỊCH, CHECK-IN, CHECK-OUT & ĐA DỊCH VỤ (BOOKINGS & ITEMS)
-- ==============================================================================

-- Bảng 16: coupons (Mã giảm giá chiến dịch)
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

-- Bảng 17: bookings (Bao gồm đầy đủ các trường quản lý Check-in / Check-out, phòng và giường)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(30) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    assigned_room_id UUID REFERENCES branch_rooms(id) ON DELETE SET NULL,
    assigned_bed_number VARCHAR(30),
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
    
    -- Quản lý Check-in / Check-out
    checked_in_at TIMESTAMPTZ,
    checked_in_by_id UUID REFERENCES users(id),
    service_started_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    checked_out_by_id UUID REFERENCES users(id),
    actual_duration_minutes INT,
    checkin_notes TEXT,
    has_medical_alert BOOLEAN NOT NULL DEFAULT FALSE, -- Cờ cảnh báo đỏ nếu khách có tiền sử dị ứng hoặc bệnh nền
    
    -- Hủy lịch
    cancellation_reason TEXT,
    cancelled_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Bảng 18: booking_items (Chi tiết từng dịch vụ trong giỏ Multi-Service)
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

-- Bảng 19: treatment_packages (Cấu hình gói liệu trình nhiều buổi)
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

-- Bảng 20: user_packages (Gói liệu trình khách sở hữu)
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

-- Bảng 21: treatment_journal (Sổ cập nhật tiến độ điều trị từng buổi)
CREATE TABLE IF NOT EXISTS treatment_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_package_id UUID REFERENCES user_packages(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    assigned_room_id UUID REFERENCES branch_rooms(id) ON DELETE SET NULL,
    session_number INT NOT NULL DEFAULT 1 CHECK (session_number >= 1),
    session_date DATE NOT NULL,
    condition_before TEXT,
    condition_after TEXT,
    treatment_notes TEXT,
    before_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    after_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    specialist_advice TEXT,
    customer_signature_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 22: consultation_surveys (Khảo sát tiền dịch vụ D04)
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

-- Bảng 23: reviews (Đánh giá dịch vụ & KTV D05)
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

-- Bảng 24: home_care_guidelines (Cẩm nang hướng dẫn tự chăm sóc tại nhà D06)
CREATE TABLE IF NOT EXISTS home_care_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    category VARCHAR(100) NOT NULL,
    read_time_minutes INT NOT NULL DEFAULT 5,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT NOT NULL,
    author_name VARCHAR(150) NOT NULL DEFAULT 'Chuyên gia MLD',
    view_count INT NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 25: support_tickets & Bảng 26: support_faqs (Hỗ trợ CSKH D07)
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
-- 10. PHÂN HỆ 7: HỘI VIÊN, TÍCH ĐIỂM & QUY CÁCH VOUCHER (LOYALTY RULES)
-- ==============================================================================

-- Bảng 27: membership_tier_rules (Cấu hình cơ chế thăng hạng & quyền lợi hội viên)
CREATE TABLE IF NOT EXISTS membership_tier_rules (
    tier member_tier PRIMARY KEY,
    min_accumulated_spent NUMERIC(14, 2) NOT NULL,
    point_earning_rate NUMERIC(5, 2) NOT NULL,
    discount_service_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    free_head_spa_sessions INT NOT NULL DEFAULT 0,
    birthday_voucher_id UUID REFERENCES coupons(id),
    priority_booking BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 28: loyalty_point_settings (Cấu hình tỷ lệ tích & sử dụng điểm thưởng)
CREATE TABLE IF NOT EXISTS loyalty_point_settings (
    id INT PRIMARY KEY DEFAULT 1,
    earn_amount_per_point NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    redeem_value_per_point NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
    max_redeem_percent_per_order NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
    point_expiry_months INT NOT NULL DEFAULT 12,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 29: voucher_distribution_rules (Quy cách nhận và kích hoạt voucher)
CREATE TABLE IF NOT EXISTS voucher_distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    trigger_event voucher_distribution_trigger NOT NULL,
    target_tier member_tier,
    is_auto_grant BOOLEAN NOT NULL DEFAULT TRUE,
    notify_user BOOLEAN NOT NULL DEFAULT TRUE,
    valid_days_after_claim INT NOT NULL DEFAULT 30,
    description VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 30: user_vouchers (Ví Voucher cá nhân F05)
CREATE TABLE IF NOT EXISTS user_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    source_trigger voucher_distribution_trigger NOT NULL DEFAULT 'PUBLIC_CLAIM',
    status voucher_status NOT NULL DEFAULT 'AVAILABLE',
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_in_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    used_in_invoice_id UUID
);

-- Bảng 31: point_transactions (Biến động điểm thưởng F04)
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

-- Bảng 32: referrals (Giới thiệu bạn bè nhận thưởng 2 chiều F07)
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
-- 11. PHÂN HỆ 8: HỌC VIỆN ĐÀO TẠO NGHÈ, ĐIỂM DANH, CHỨNG CHỈ (ACADEMY LMS)
-- ==============================================================================

-- Bảng 33: course_categories
CREATE TABLE IF NOT EXISTS course_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    icon_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 34: instructors (Hồ sơ giảng viên Master Trainer)
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

-- Bảng 35: courses (Khóa đào tạo chuyên môn)
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

-- Bảng 36: course_chapters (Các chương học của khóa)
CREATE TABLE IF NOT EXISTS course_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_order INT NOT NULL DEFAULT 1,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 37: course_lessons (Chi tiết bài học Video & Tài liệu PDF E08, E09)
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

-- Bảng 38: course_batches (Lớp học theo đợt khai giảng)
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

-- Bảng 39: course_enrollments (Hồ sơ học viên đăng ký)
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

-- Bảng 40: user_lesson_progress (Tiến trình xem bài học và ghi chú)
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

-- Bảng 41: course_quizzes (Bài kiểm tra trắc nghiệm E10)
CREATE TABLE IF NOT EXISTS course_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    total_questions INT NOT NULL DEFAULT 20,
    time_limit_minutes INT NOT NULL DEFAULT 30,
    passing_score NUMERIC(4, 2) NOT NULL DEFAULT 8.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 42: quiz_questions (Ngân hàng câu hỏi trắc nghiệm)
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option VARCHAR(5) NOT NULL,
    explanation TEXT
);

-- Bảng 43: quiz_submissions (Bài thi đã nộp của học viên E10)
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

-- Bảng 44: batch_schedules (Thời khóa biểu từng buổi học thực hành lâm sàng)
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

-- Bảng 45: student_attendance (Sổ điểm danh học viên)
CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES batch_schedules(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'PRESENT',
    check_in_time TIMESTAMPTZ,
    notes TEXT,
    marked_by_id UUID REFERENCES users(id),
    CONSTRAINT uq_attendance UNIQUE (schedule_id, enrollment_id)
);

-- Bảng 46: certificate_templates (Mẫu phôi chứng chỉ nghề)
CREATE TABLE IF NOT EXISTS certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    background_image_url TEXT NOT NULL,
    title_text VARCHAR(255) NOT NULL DEFAULT 'CHỨNG CHỈ TỐT NGHIỆP',
    signer_name VARCHAR(150) NOT NULL DEFAULT 'ThS. Nguyễn Thu Hà',
    signer_title VARCHAR(150) NOT NULL DEFAULT 'Hiệu trưởng Học viện MLD Vietnam',
    signature_image_url TEXT,
    seal_image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 47: student_certificates (Chứng chỉ điện tử cấp cho học viên kèm mã tra cứu QR)
CREATE TABLE IF NOT EXISTS student_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    template_id UUID REFERENCES certificate_templates(id),
    certificate_code VARCHAR(50) UNIQUE NOT NULL,
    qr_verification_code VARCHAR(255) UNIQUE NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    course_title VARCHAR(250) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    theory_score NUMERIC(4, 2) NOT NULL,
    practical_score NUMERIC(4, 2) NOT NULL,
    final_grade VARCHAR(50) NOT NULL DEFAULT 'GIỎI',
    certificate_pdf_url TEXT,
    status certificate_status NOT NULL DEFAULT 'ISSUED',
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 48: student_academic_records (Bảng điểm tổng hợp 4 chiều E12, W10)
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
    certificate_id UUID REFERENCES student_certificates(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 12. PHÂN HỆ 9: THU HỌC PHÍ, ĐẶT CỌC & THU NGÂN POS (FINANCIALS)
-- ==============================================================================

-- Bảng 49: tuition_transactions (Thu học phí, đặt cọc & trả góp học viên)
CREATE TABLE IF NOT EXISTS tuition_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    cashier_id UUID REFERENCES users(id),
    transaction_type tuition_trans_type NOT NULL DEFAULT 'DEPOSIT',
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL DEFAULT 'BANK_TRANSFER',
    payment_status payment_status NOT NULL DEFAULT 'PAID',
    receipt_number VARCHAR(50),
    receipt_pdf_url TEXT,
    due_date DATE,
    notes TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 50: invoices (Hóa đơn thu ngân POS W07, F06, W12)
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
    refund_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    refunded_by_id UUID REFERENCES users(id),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 51: invoice_items (Chi tiết từng món trên hóa đơn thu ngân)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_name VARCHAR(250) NOT NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'SERVICE',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    unit_price NUMERIC(12, 2) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL
);

-- Bảng 52: notifications (Thông báo đẩy D08, F01)
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

-- Bảng 53: audit_logs (Nhật ký kiểm toán an ninh hệ thống)
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
CREATE INDEX IF NOT EXISTS idx_bookings_checkin ON bookings(branch_id, status, checked_in_at);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_paid ON invoices(branch_id, paid_at, payment_status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress ON user_lesson_progress(enrollment_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_staff_branch_dept ON staff_profiles(branch_id, department, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_code ON staff_profiles(employee_code);
CREATE INDEX IF NOT EXISTS idx_cert_code ON student_certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_cert_qr ON student_certificates(qr_verification_code);
CREATE INDEX IF NOT EXISTS idx_tuition_enrollment ON tuition_transactions(enrollment_id, transaction_type);

-- ==============================================================================
-- 14. TRIGGER NÂNG CẤP: TỰ ĐỘNG THĂNG HẠNG VÀ TÍCH ĐIỂM DỰA TRÊN CẤU HÌNH RULES
-- ==============================================================================
CREATE OR REPLACE FUNCTION process_invoice_paid_complete()
RETURNS TRIGGER AS $$
DECLARE
    v_total_spent NUMERIC(14, 2);
    v_new_tier member_tier;
    v_earning_rate NUMERIC(5, 2);
    v_points_earned INT;
    v_current_points INT;
BEGIN
    IF (NEW.payment_status = 'PAID' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'PAID')) THEN
        -- 1. Cập nhật tổng chi tiêu
        UPDATE users
        SET total_spent = total_spent + NEW.total_amount
        WHERE id = NEW.customer_id
        RETURNING total_spent INTO v_total_spent;

        -- 2. Tra cứu hạng thẻ hợp lệ cao nhất từ bảng cấu hình membership_tier_rules
        SELECT tier, point_earning_rate INTO v_new_tier, v_earning_rate
        FROM membership_tier_rules
        WHERE min_accumulated_spent <= v_total_spent
        ORDER BY min_accumulated_spent DESC
        LIMIT 1;

        -- 3. Tính số điểm thưởng được nhận: (Tổng tiền * Tỷ lệ %) / 100
        -- Ví dụ: Đơn 1.000.000đ, hạng Gold (2%) -> 20.000đ giá trị -> 200 điểm
        v_points_earned := FLOOR((NEW.total_amount * (v_earning_rate / 100.0)) / 100.0);

        IF v_points_earned > 0 THEN
            UPDATE users
            SET reward_points = reward_points + v_points_earned
            WHERE id = NEW.customer_id
            RETURNING reward_points INTO v_current_points;

            -- Ghi nhận sổ cái biến động điểm point_transactions
            INSERT INTO point_transactions (
                user_id, points_change, balance_after, action_type, description, reference_id
            ) VALUES (
                NEW.customer_id,
                v_points_earned,
                v_current_points,
                'BOOKING_EARN',
                'Tích điểm từ hóa đơn ' || NEW.invoice_code || ' (' || v_new_tier || ' - ' || v_earning_rate || '%)',
                NEW.id
            );
        END IF;

        -- 4. Cập nhật hạng thẻ mới cho khách
        UPDATE users
        SET membership_tier = v_new_tier
        WHERE id = NEW.customer_id;
    ELSIF (NEW.payment_status = 'REFUNDED' AND OLD.payment_status = 'PAID') THEN
        -- Khấu trừ chi tiêu khi hoàn tiền
        UPDATE users
        SET total_spent = GREATEST(0.00, total_spent - COALESCE(NEW.refund_amount, NEW.total_amount))
        WHERE id = NEW.customer_id
        RETURNING total_spent INTO v_total_spent;

        -- Tính lại hạng thẻ phù hợp sau khi trừ tiền hoàn
        SELECT tier INTO v_new_tier
        FROM membership_tier_rules
        WHERE min_accumulated_spent <= v_total_spent
        ORDER BY min_accumulated_spent DESC
        LIMIT 1;

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
FOR EACH ROW EXECUTE FUNCTION process_invoice_paid_complete();

-- ==============================================================================
-- 15. SEED CẤU HÌNH BAN ĐẦU CHO HỆ THỐNG
-- ==============================================================================
INSERT INTO membership_tier_rules (tier, min_accumulated_spent, point_earning_rate, discount_service_percent, free_head_spa_sessions, priority_booking, description)
VALUES 
('STANDARD', 0.00, 1.00, 0.00, 0, FALSE, 'Hạng Chuẩn: Tích lũy 1% giá trị đơn hàng làm điểm thưởng.'),
('SILVER', 5000000.00, 1.50, 5.00, 0, FALSE, 'Hạng Bạc (Từ 5 triệu): Tích 1.5% điểm, giảm 5% dịch vụ lẻ.'),
('GOLD', 15000000.00, 2.00, 10.00, 1, TRUE, 'Hạng Vàng (Từ 15 triệu): Tích 2% điểm, giảm 10% dịch vụ, ưu tiên xếp lịch.'),
('PLATINUM', 30000000.00, 3.00, 15.00, 2, TRUE, 'Hạng Bạch Kim (Từ 30 triệu): Tích 3% điểm, giảm 15% dịch vụ, phòng VIP riêng.'),
('DIAMOND', 60000000.00, 5.00, 20.00, 4, TRUE, 'Hạng Kim Cương (Từ 60 triệu): Tích 5% điểm, giảm 20% dịch vụ, chuyên gia trưởng phục vụ.')
ON CONFLICT (tier) DO NOTHING;

INSERT INTO loyalty_point_settings (id, earn_amount_per_point, redeem_value_per_point, max_redeem_percent_per_order, point_expiry_months)
VALUES (1, 10000.00, 100.00, 30.00, 12)
ON CONFLICT (id) DO NOTHING;
