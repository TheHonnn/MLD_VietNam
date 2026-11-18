CREATE TABLE IF NOT EXISTS public.payment_gateway_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code BIGINT UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'UNCONFIGURED',
    target_type VARCHAR(30) NOT NULL DEFAULT 'BOOKING',
    target_id UUID,
    reference_code VARCHAR(80),
    customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    status payment_status NOT NULL DEFAULT 'PENDING',
    qr_code TEXT,
    checkout_url TEXT,
    bank_bin VARCHAR(20),
    bank_account_no VARCHAR(50),
    bank_account_name VARCHAR(150),
    description VARCHAR(255),
    gateway_transaction_id VARCHAR(150),
    raw_webhook_payload JSONB,
    expires_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_intents_ref ON public.payment_gateway_intents(reference_code);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_intents_target ON public.payment_gateway_intents(target_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_intents_status ON public.payment_gateway_intents(status);

ALTER TABLE public.payment_gateway_intents ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_payment_gateway_intents_updated_at ON public.payment_gateway_intents;
CREATE TRIGGER trg_payment_gateway_intents_updated_at
BEFORE UPDATE ON public.payment_gateway_intents
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

NOTIFY pgrst, 'reload schema';
