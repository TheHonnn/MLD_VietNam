-- ==============================================================================
-- MLD HEALTHCARE & SPA - ENTERPRISE EXTENSION MIGRATION
-- Bổ sung 4 phân hệ cốt lõi: Audit Trail, Hoa hồng KTV, Định mức tiêu hao kho
-- ==============================================================================

-- 1. BẢNG AUDIT_LOGS (Nhật ký kiểm toán hệ thống & Chống gian lận)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(64) NOT NULL,
    action VARCHAR(16) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    record_id UUID NOT NULL,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45) DEFAULT '127.0.0.1',
    user_agent TEXT DEFAULT 'MLD Admin Web Portal',
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- Trigger Function tự động ghi vết thay đổi CSDL
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        action,
        record_id,
        performed_by,
        old_data,
        new_data,
        description
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        'Hệ thống tự động ghi vết biến động dữ liệu ' || TG_TABLE_NAME
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. BẢNG STAFF_COMMISSIONS (Động cơ tính hoa hồng và lương thưởng KTV)
CREATE TABLE IF NOT EXISTS staff_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    commission_type VARCHAR(32) NOT NULL DEFAULT 'SERVICE_DIRECT', -- 'SERVICE_DIRECT', 'PACKAGE_UPSELL', 'CSAT_BONUS'
    base_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    commission_amount NUMERIC(14, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED', -- 'PENDING', 'APPROVED', 'PAID'
    cycle_month VARCHAR(7) NOT NULL, -- '2026-10'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_commissions_staff_cycle ON staff_commissions(staff_id, cycle_month);
CREATE INDEX IF NOT EXISTS idx_commissions_branch ON staff_commissions(branch_id, cycle_month);

-- 3. BẢNG SERVICE_MATERIALS (Định mức tiêu hao nguyên vật liệu BOM)
CREATE TABLE IF NOT EXISTS service_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    material_name VARCHAR(150) NOT NULL,
    dosage_per_session NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'ml', -- 'ml', 'gram', 'cái', 'gói'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_materials ON service_materials(service_id);

-- 4. BẢNG INVENTORY_CONSUMPTION_LOGS (Nhật ký trừ kho tiêu hao chi nhánh theo ca)
CREATE TABLE IF NOT EXISTS inventory_consumption_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    material_name VARCHAR(150) NOT NULL,
    quantity_deducted NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consumption_branch ON inventory_consumption_logs(branch_id, logged_at DESC);
