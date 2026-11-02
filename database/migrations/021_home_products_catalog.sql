CREATE TABLE IF NOT EXISTS public.home_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Dụng cụ tập luyện', 'Băng ép', 'Chăm sóc da', 'Tài liệu')),
    price_min NUMERIC(12, 0) NOT NULL CHECK (price_min >= 0),
    price_max NUMERIC(12, 0) NOT NULL CHECK (price_max >= price_min),
    unit VARCHAR(100) NOT NULL,
    details TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_home_products_catalog_order
    ON public.home_products (sort_order, name);

ALTER TABLE public.home_products ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_products TO authenticated;

DROP POLICY IF EXISTS "Staff read home_products" ON public.home_products;
DROP POLICY IF EXISTS "Staff manage home_products" ON public.home_products;

CREATE POLICY "Staff read home_products"
    ON public.home_products FOR SELECT TO authenticated
    USING (public.is_staff());

CREATE POLICY "Staff manage home_products"
    ON public.home_products FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

INSERT INTO public.home_products (name, category, price_min, price_max, unit, details, sort_order)
VALUES
    ('Vòng cao su kháng lực', 'Dụng cụ tập luyện', 150000, 150000, '2 chiếc', ARRAY[]::TEXT[], 10),
    ('Tạ tay 1.5kg', 'Dụng cụ tập luyện', 150000, 150000, '1 đôi', ARRAY[]::TEXT[], 20),
    ('Combo 3 cuốn: Cẩm nang phù bạch huyết + Hướng dẫn dinh dưỡng + Tập luyện cho phù bạch huyết', 'Tài liệu', 200000, 200000, '1 combo', ARRAY[]::TEXT[], 30),
    ('Găng nén ngón tay - cổ tay', 'Băng ép', 1600000, 1800000, '1 chiếc', ARRAY['Medi - xuất xứ: Đức', 'Anita - xuất xứ: Đức', 'Venosan - xuất xứ: Thụy Sĩ'], 40),
    ('Găng nén cẳng tay - bắp tay', 'Băng ép', 1100000, 1300000, '1 chiếc', ARRAY['Medi - xuất xứ: Đức', 'Anita - xuất xứ: Đức', 'Venosan - xuất xứ: Thụy Sĩ'], 50),
    ('Kem dưỡng ẩm dành cho da nhạy cảm 400ml', 'Chăm sóc da', 300000, 300000, '1 chai', ARRAY[]::TEXT[], 60),
    ('Kem chống nắng dành cho da nhạy cảm 100ml', 'Chăm sóc da', 595000, 595000, '1 tuýp', ARRAY[]::TEXT[], 70),
    ('Sữa tắm dành cho da nhạy cảm 400ml', 'Chăm sóc da', 260000, 260000, '1 chai', ARRAY[]::TEXT[], 80)
ON CONFLICT (name) DO NOTHING;
