-- ==============================================================================
-- MIGRATION 003: AUTHENTICATION ENHANCEMENT, EMAIL/PASSWORD & SESSION PERSISTENCE
-- Hệ sinh thái MLD Việt Nam
-- ==============================================================================

-- 1. Cập nhật bảng users: Cho phép phone NULL và thêm cờ xác thực
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Đảm bảo mỗi tài khoản phải có ít nhất 1 định danh (Số điện thoại hoặc Email)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_identity'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_users_identity 
            CHECK (phone IS NOT NULL OR email IS NOT NULL);
    END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Bảng auth_identities (Kiểm soát liên kết định danh người dùng: SĐT, Email, Mật khẩu, Social)
CREATE TABLE IF NOT EXISTS auth_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'PHONE_OTP', 'EMAIL_PASSWORD', 'GOOGLE', 'APPLE'
    identifier VARCHAR(255) NOT NULL, -- Số điện thoại hoặc địa chỉ email
    password_hash VARCHAR(255),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_provider_identifier UNIQUE (provider, identifier)
);

CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id ON auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_identifier ON auth_identities(identifier);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auth_identities_updated_at'
    ) THEN
        CREATE TRIGGER trg_auth_identities_updated_at
        BEFORE UPDATE ON auth_identities
        FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;
END $$;

-- 3. Bảng refresh_tokens (Quản lý phiên đăng nhập dài hạn, hỗ trợ thu hồi Token)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    jti VARCHAR(100) UNIQUE NOT NULL,
    device_info TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- 4. Bảng otp_verifications (Quản lý mã xác thực OTP đã được mã hóa/băm an toàn)
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL, -- Email hoặc Số điện thoại
    purpose VARCHAR(50) NOT NULL, -- 'REGISTER', 'RESET_PASSWORD', 'ACCOUNT_LINKING', 'LOGIN'
    otp_hash VARCHAR(255) NOT NULL, -- Bắt buộc băm SHA-256 hoặc Bcrypt, tuyệt đối không lưu plain text
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier_purpose ON otp_verifications(identifier, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_verifications(expires_at);

-- 5. Thiết lập Row Level Security (RLS) bảo vệ dữ liệu nhạy cảm
ALTER TABLE auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'auth_identities' AND policyname = 'users_read_own_identities'
    ) THEN
        CREATE POLICY users_read_own_identities ON auth_identities
            FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;


