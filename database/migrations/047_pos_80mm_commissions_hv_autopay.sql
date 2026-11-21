ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS package_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (package_commission_rate >= 0 AND package_commission_rate <= 100),
  ADD COLUMN IF NOT EXISTS product_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (product_commission_rate >= 0 AND product_commission_rate <= 100);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS commission_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pending_meta JSONB;

CREATE INDEX IF NOT EXISTS idx_invoices_gateway_tx
  ON public.invoices(gateway_transaction_id)
  WHERE gateway_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_commission_staff
  ON public.invoices(commission_staff_id)
  WHERE commission_staff_id IS NOT NULL;

CREATE OR REPLACE FUNCTION process_invoice_paid_complete()
RETURNS TRIGGER AS $$
DECLARE
    v_earn_amount NUMERIC(12, 2);
    v_is_loyalty_active BOOLEAN;
    v_points_earned INT;
    v_current_points INT;
BEGIN
    IF (NEW.payment_status = 'PAID' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'PAID')) THEN
        UPDATE users
        SET total_spent = total_spent + NEW.total_amount
        WHERE id = NEW.customer_id;

        SELECT earn_amount_per_point, is_active
        INTO v_earn_amount, v_is_loyalty_active
        FROM loyalty_point_settings
        WHERE id = 1
        LIMIT 1;

        IF (COALESCE(v_is_loyalty_active, FALSE) AND COALESCE(v_earn_amount, 0) > 0) THEN
            v_points_earned := FLOOR(NEW.total_amount / v_earn_amount);
        ELSE
            v_points_earned := 0;
        END IF;

        IF v_points_earned > 0 THEN
            UPDATE users
            SET reward_points = reward_points + v_points_earned
            WHERE id = NEW.customer_id
            RETURNING reward_points INTO v_current_points;

            INSERT INTO point_transactions (
                user_id, points_change, balance_after, action_type, description, reference_id
            ) VALUES (
                NEW.customer_id,
                v_points_earned,
                v_current_points,
                'BOOKING_EARN',
                'Tích điểm từ hóa đơn ' || NEW.invoice_code,
                NEW.id
            );
        END IF;
    ELSIF (NEW.payment_status = 'REFUNDED' AND OLD.payment_status = 'PAID') THEN
        UPDATE users
        SET total_spent = GREATEST(0.00, total_spent - COALESCE(NEW.refund_amount, NEW.total_amount))
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
