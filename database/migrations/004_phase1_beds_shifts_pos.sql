-- ==============================================================================
-- MLD VIỆT NAM - MIGRATION 004: PHASE 1 CORE RESOURCES & POS
-- 1. Quản lý Giường Trị Liệu vật lý (branch_beds)
-- 2. Quản lý Ca Thu Ngân & Đối Soát Doanh Thu (cashier_shifts)
-- 3. Mở rộng bookings: bed_id, guest_count, parent_booking_id, booking_source, session_status
-- 4. Mở rộng invoices: shift_id, vat_rate, pre_tax_amount, printed_count
-- 5. Row Level Security (RLS) & Triggers
-- ==============================================================================

-- 1. TẠO CÁC ENUM TYPE CẦN THIẾT
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bed_status') THEN
        CREATE TYPE bed_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status') THEN
        CREATE TYPE shift_status AS ENUM ('OPEN', 'CLOSED', 'RECONCILED');
    END IF;
END $$;

-- 2. TẠO BẢNG branch_beds (Quản lý giường vật lý theo chi nhánh và phòng)
CREATE TABLE IF NOT EXISTS public.branch_beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.branch_rooms(id) ON DELETE CASCADE,
    bed_code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    status bed_status NOT NULL DEFAULT 'AVAILABLE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_beds_code UNIQUE (branch_id, bed_code)
);

CREATE INDEX IF NOT EXISTS idx_branch_beds_branch_room ON public.branch_beds(branch_id, room_id);
CREATE INDEX IF NOT EXISTS idx_branch_beds_status ON public.branch_beds(status) WHERE is_active = TRUE;

-- Trigger cập nhật updated_at cho branch_beds
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_branch_beds_updated_at') THEN
        CREATE TRIGGER trg_branch_beds_updated_at
        BEFORE UPDATE ON public.branch_beds
        FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;
END $$;

-- 3. TẠO BẢNG cashier_shifts (Quản lý ca làm việc thu ngân & đối soát doanh thu)
CREATE TABLE IF NOT EXISTS public.cashier_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES public.users(id),
    shift_code VARCHAR(50) UNIQUE NOT NULL,
    opening_cash NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    closing_cash NUMERIC(14, 2) DEFAULT 0.00,
    system_cash NUMERIC(14, 2) DEFAULT 0.00,
    card_sales NUMERIC(14, 2) DEFAULT 0.00,
    transfer_sales NUMERIC(14, 2) DEFAULT 0.00,
    total_sales NUMERIC(14, 2) DEFAULT 0.00,
    discrepancy_amount NUMERIC(14, 2) DEFAULT 0.00,
    status shift_status NOT NULL DEFAULT 'OPEN',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cashier_shifts_branch_status ON public.cashier_shifts(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_cashier ON public.cashier_shifts(cashier_id);

-- Trigger cập nhật updated_at cho cashier_shifts
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cashier_shifts_updated_at') THEN
        CREATE TRIGGER trg_cashier_shifts_updated_at
        BEFORE UPDATE ON public.cashier_shifts
        FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;
END $$;

-- 4. BỔ SUNG CÁC CỘT VÀO BẢNG bookings
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'parent_booking_id') THEN
        ALTER TABLE public.bookings ADD COLUMN parent_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'guest_count') THEN
        ALTER TABLE public.bookings ADD COLUMN guest_count INT NOT NULL DEFAULT 1 CHECK (guest_count >= 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'bed_id') THEN
        ALTER TABLE public.bookings ADD COLUMN bed_id UUID REFERENCES public.branch_beds(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'booking_source') THEN
        ALTER TABLE public.bookings ADD COLUMN booking_source VARCHAR(30) NOT NULL DEFAULT 'AUTO_OPTIMIZED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'session_status') THEN
        ALTER TABLE public.bookings ADD COLUMN session_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_bed_date ON public.bookings(bed_id, booking_date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_parent_booking ON public.bookings(parent_booking_id);

-- 5. BỔ SUNG CÁC CỘT VÀO BẢNG invoices
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'shift_id') THEN
        ALTER TABLE public.invoices ADD COLUMN shift_id UUID REFERENCES public.cashier_shifts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'vat_rate') THEN
        ALTER TABLE public.invoices ADD COLUMN vat_rate NUMERIC(4, 2) NOT NULL DEFAULT 8.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'pre_tax_amount') THEN
        ALTER TABLE public.invoices ADD COLUMN pre_tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'printed_count') THEN
        ALTER TABLE public.invoices ADD COLUMN printed_count INT NOT NULL DEFAULT 0 CHECK (printed_count >= 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_shift ON public.invoices(shift_id);

-- 6. THIẾT LẬP ROW LEVEL SECURITY (RLS)
ALTER TABLE public.branch_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;

-- Policy cho branch_beds: Cho phép đọc công khai (để khách và hệ thống kiểm tra giường trống)
DROP POLICY IF EXISTS "Public read branch_beds" ON public.branch_beds;
CREATE POLICY "Public read branch_beds"
ON public.branch_beds FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

-- Policy cho branch_beds: Cho phép Admin/Staff quản lý
DROP POLICY IF EXISTS "Staff manage branch_beds" ON public.branch_beds;
CREATE POLICY "Staff manage branch_beds"
ON public.branch_beds FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST')
    )
);

-- Policy cho cashier_shifts: Chỉ Staff/Admin được xem và thao tác ca thu ngân
DROP POLICY IF EXISTS "Staff manage cashier_shifts" ON public.cashier_shifts;
CREATE POLICY "Staff manage cashier_shifts"
ON public.cashier_shifts FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST')
    )
);
