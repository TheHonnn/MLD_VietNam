-- ==============================================================================
-- MEDICAL HEALTHCARE SYSTEM - DATABASE INITIALIZATION SCHEMA
-- Version: 1.0.0
-- Database: PostgreSQL 15+ (Compatible with Supabase)
-- ==============================================================================

-- 1. BẬT CÁC EXTENSION CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Tạo UUID ngẫu nhiên an toàn
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Mã hóa và hàm băm bảo mật
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Tìm kiếm gần đúng (Fuzzy/Trigram) tiếng Việt không dấu

-- 2. TẠO CÁC KIỂU DỮ LIỆU ENUM (CUSTOM ENUM TYPES)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
        CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_status') THEN
        CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'HOLD', 'BOOKED', 'BLOCKED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE appointment_status AS ENUM (
            'PENDING',        -- Chờ xác nhận / chờ thanh toán
            'CONFIRMED',      -- Đã xác nhận giữ chỗ
            'CHECKED_IN',     -- Đã đến phòng khám & quét mã QR check-in
            'IN_PROGRESS',    -- Đang trong phòng khám gặp bác sĩ
            'COMPLETED',      -- Đã hoàn thành ca khám & có kết quả
            'CANCELLED'       -- Lịch đã bị hủy
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'FAILED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('CASH_AT_CLINIC', 'VNPAY', 'MOMO', 'CREDIT_CARD');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT');
    END IF;
END $$;

-- 3. HÀM TỰ ĐỘNG CẬP NHẬT UPDATED_AT (TRIGGER FUNCTION)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. BẢNG NGƯỜI DÙNG & TÀI KHOẢN (USERS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    gender gender_type DEFAULT 'OTHER',
    date_of_birth DATE,
    address TEXT,
    role user_role NOT NULL DEFAULT 'PATIENT',
    is_active BOOLEAN DEFAULT TRUE,
    fcm_device_token TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. BẢNG CHUYÊN KHOA Y TẾ (SPECIALITIES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS specialities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,             -- VD: 'CARDIOLOGY', 'PEDIATRICS'
    icon_url TEXT NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_specialities_updated_at
BEFORE UPDATE ON specialities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. BẢNG CƠ SỞ / PHÒNG KHÁM (CLINICS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'TP. Hồ Chí Minh',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    opening_time TIME DEFAULT '07:30:00',
    closing_time TIME DEFAULT '20:00:00',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_clinics_updated_at
BEFORE UPDATE ON clinics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. BẢNG THÔNG TIN BÁC SĨ (DOCTORS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    speciality_id UUID NOT NULL REFERENCES specialities(id),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    title VARCHAR(50) DEFAULT 'Bác sĩ',          -- VD: 'ThS.BS', 'BS.CKII', 'PGS.TS'
    license_number VARCHAR(100) UNIQUE,           -- Số chứng chỉ hành nghề y tế
    consultation_fee NUMERIC(12, 2) NOT NULL DEFAULT 300000.00,
    experience_years INT DEFAULT 5,
    patient_count INT DEFAULT 0,
    rating_avg NUMERIC(3, 2) DEFAULT 5.00,
    review_count INT DEFAULT 0,
    bio TEXT,                                     -- Quá trình công tác, đào tạo
    room_number VARCHAR(50),                      -- Phòng khám số mấy
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_doctors_updated_at
BEFORE UPDATE ON doctors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 8. BẢNG KHUNG GIỜ KHÁM CỦA BÁC SĨ (DOCTOR_SLOTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS doctor_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status slot_status NOT NULL DEFAULT 'AVAILABLE',
    held_by_user_id UUID REFERENCES users(id),    -- Lưu tạm người đang giữ slot trong 10 phút
    hold_expires_at TIMESTAMPTZ,                  -- Thời điểm hết hạn giữ slot (Redis/DB backup)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Chống trùng lặp khung giờ của cùng một bác sĩ
    CONSTRAINT uq_doctor_slot UNIQUE (doctor_id, slot_date, start_time)
);

CREATE TRIGGER trg_doctor_slots_updated_at
BEFORE UPDATE ON doctor_slots
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 9. BẢNG HỒ SƠ NGƯỜI THÂN TRONG GIA ĐÌNH (FAMILY_MEMBERS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,            -- 'Bố', 'Mẹ', 'Con cái', 'Vợ/Chồng', 'Khác'
    gender gender_type NOT NULL,
    date_of_birth DATE NOT NULL,
    blood_type VARCHAR(10),                       -- 'A', 'B', 'AB', 'O', 'Rh+'
    allergies TEXT,                               -- Dị ứng thuốc, thức ăn
    chronic_conditions TEXT,                      -- Bệnh mãn tính (tiểu đường, huyết áp...)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_family_members_updated_at
BEFORE UPDATE ON family_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 10. BẢNG KHUYẾN MÃI / MÃ GIẢM GIÁ (COUPONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,             -- VD: 'HEALTHY20', 'NEWUSER'
    description TEXT,
    discount_percent NUMERIC(5, 2) DEFAULT 0,     -- VD: 20.00 (%)
    discount_amount NUMERIC(12, 2) DEFAULT 0,     -- Giảm thẳng tiền nếu có
    max_discount NUMERIC(12, 2),                  -- Giới hạn mức giảm tối đa
    min_order_amount NUMERIC(12, 2) DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    usage_limit INT DEFAULT 1000,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 11. BẢNG LỊCH HẸN KHÁM (APPOINTMENTS) - TRỌNG TÂM NGHIỆP VỤ
-- ==============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_code VARCHAR(30) UNIQUE NOT NULL, -- VD: 'MED-20261014-88992'
    patient_id UUID NOT NULL REFERENCES users(id),
    family_member_id UUID REFERENCES family_members(id), -- NULL nếu bệnh nhân tự khám
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    slot_id UUID NOT NULL REFERENCES doctor_slots(id),
    appointment_date DATE NOT NULL,
    
    -- Trạng thái & Thanh toán
    status appointment_status NOT NULL DEFAULT 'PENDING',
    payment_status payment_status NOT NULL DEFAULT 'UNPAID',
    payment_method payment_method NOT NULL DEFAULT 'CASH_AT_CLINIC',
    
    -- Tiền tệ
    base_fee NUMERIC(12, 2) NOT NULL,
    coupon_id UUID REFERENCES coupons(id),
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    
    -- Thông tin khám & Triệu chứng
    reason_for_visit TEXT NOT NULL,               -- Lý do khám (tối thiểu 10 ký tự)
    symptoms_description TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,        -- Mảng URLs ảnh đơn thuốc cũ/kết quả xét nghiệm
    
    -- Check-in & Hủy lịch
    qr_code_hash VARCHAR(255) NOT NULL,           -- Chuỗi mã hóa để lễ tân quét check-in
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 12. BẢNG HỒ SƠ BỆNH ÁN ĐIỆN TỬ (MEDICAL_RECORDS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    patient_id UUID NOT NULL REFERENCES users(id),
    family_member_id UUID REFERENCES family_members(id),
    
    diagnosis_icd10 VARCHAR(100),                 -- Mã bệnh chuẩn quốc tế (VD: J00, I10)
    diagnosis_summary TEXT NOT NULL,              -- Kết luận chẩn đoán của bác sĩ
    clinical_notes TEXT,                          -- Diễn biến lâm sàng
    prescription JSONB DEFAULT '[]'::jsonb,       -- Danh sách thuốc [{drug_name, dosage, quantity, note}]
    lab_test_results JSONB DEFAULT '[]'::jsonb,   -- Danh sách kết quả X-quang, máu [{name, result_url}]
    doctor_advice TEXT,                           -- Dặn dò của bác sĩ
    follow_up_date DATE,                          -- Hẹn ngày tái khám
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_medical_records_updated_at
BEFORE UPDATE ON medical_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 13. BẢNG ĐÁNH GIÁ & NHẬN XÉT BÁC SĨ (DOCTOR_REVIEWS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id), -- 1 lịch khám chỉ đánh giá 1 lần
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],          -- ['Tận tâm', 'Đúng giờ', 'Tư vấn kỹ']
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 14. BẢNG THÔNG BÁO (NOTIFICATIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,                    -- 'APPOINTMENT_REMINDER', 'PROMOTION', 'SYSTEM'
    payload JSONB DEFAULT '{}'::jsonb,            -- Chứa appointment_id để deep link
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 15. BẢNG TRUY VẾT BẢO MẬT Y TẾ (AUDIT_LOGS - HIPAA COMPLIANCE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),           -- Ai thực hiện hành động
    actor_role user_role,
    action audit_action NOT NULL,
    target_table VARCHAR(50) NOT NULL,            -- 'medical_records', 'appointments'
    record_id UUID NOT NULL,                      -- ID của bản ghi bị tác động
    patient_id UUID REFERENCES users(id),         -- Bệnh nhân có thông tin bị truy cập
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 16. CHỈ MỤC TỐI ƯU HIỆU NĂNG TÌM KIẾM (INDEXES)
-- ==============================================================================

-- Trigram Index tìm kiếm gần đúng tiếng Việt không dấu
CREATE INDEX IF NOT EXISTS idx_doctors_search_trgm 
ON users USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_specialities_search_trgm 
ON specialities USING gin (name gin_trgm_ops);

-- B-Tree Indexes cho các bộ lọc thường dùng
CREATE INDEX IF NOT EXISTS idx_doctors_speciality_id ON doctors (speciality_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON doctors (clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_rating ON doctors (rating_avg DESC);

CREATE INDEX IF NOT EXISTS idx_slots_doctor_date ON doctor_slots (doctor_id, slot_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments (doctor_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_code ON appointments (appointment_code);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient ON audit_logs (patient_id, created_at DESC);

-- ==============================================================================
-- 17. TỰ ĐỘNG TÍNH TOÁN ĐIỂM SAO BÁC SĨ (TRIGGER RECALCULATE RATING)
-- ==============================================================================
CREATE OR REPLACE FUNCTION recalculate_doctor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE doctors
    SET 
        rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM doctor_reviews WHERE doctor_id = NEW.doctor_id), 5.0),
        review_count = (SELECT COUNT(*) FROM doctor_reviews WHERE doctor_id = NEW.doctor_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.doctor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doctor_reviews_ai
AFTER INSERT OR UPDATE ON doctor_reviews
FOR EACH ROW EXECUTE FUNCTION recalculate_doctor_rating();

