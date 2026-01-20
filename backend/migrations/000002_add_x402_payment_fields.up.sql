-- Add x402 payment fields to check_ins table
ALTER TABLE check_ins
    ADD COLUMN IF NOT EXISTS order_id VARCHAR(128) UNIQUE,
    ADD COLUMN IF NOT EXISTS payment_address VARCHAR(256),
    ADD COLUMN IF NOT EXISTS price_amount VARCHAR(64),
    ADD COLUMN IF NOT EXISTS blockchain_name VARCHAR(64),
    ADD COLUMN IF NOT EXISTS token_symbol VARCHAR(32),
    ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(256),
    ADD COLUMN IF NOT EXISTS issue_tx_hash VARCHAR(128),
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Update status enum to include new statuses
ALTER TABLE check_ins
    DROP CONSTRAINT IF EXISTS check_ins_status_check;

ALTER TABLE check_ins
    ADD CONSTRAINT check_ins_status_check
    CHECK (status IN (
        'pending_payment',
        'payment_failed',
        'payment_success',
        'external_failed',
        'issuing',
        'success',
        'issue_failed'
    ));

-- Rename tx_hash to avoid confusion with new fields
ALTER TABLE check_ins
    RENAME COLUMN tx_hash TO old_tx_hash;

-- Create index on order_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_check_ins_order_id ON check_ins (order_id);

-- Create index for pending_payment status queries
CREATE INDEX IF NOT EXISTS idx_check_ins_pending_payment ON check_ins (user_id, status)
    WHERE status = 'pending_payment';

-- Create index for payment_success status (for worker)
CREATE INDEX IF NOT EXISTS idx_check_ins_payment_success ON check_ins (status, created_at)
    WHERE status = 'payment_success';

-- Rename total_tokens to total_rewards in users table
ALTER TABLE users
    RENAME COLUMN total_tokens TO total_rewards;

-- Update index name for consistency
DROP INDEX IF EXISTS idx_users_total_tokens;
CREATE INDEX idx_users_total_rewards ON users (total_rewards DESC);

-- Update comments
COMMENT ON TABLE check_ins IS 'Daily check-in records with x402 payment integration and token issuance';
COMMENT ON COLUMN check_ins.status IS 'Check-in status: pending_payment → payment_success → issuing → success (or payment_failed/issue_failed on errors)';
COMMENT ON COLUMN check_ins.order_id IS 'x402 order ID for payment tracking';
COMMENT ON COLUMN check_ins.payment_address IS 'Payment address from x402 challenge';
COMMENT ON COLUMN check_ins.price_amount IS 'Payment amount required (e.g., "1.0" USDT)';
COMMENT ON COLUMN check_ins.blockchain_name IS 'Blockchain network name (e.g., "Polygon")';
COMMENT ON COLUMN check_ins.token_symbol IS 'Payment token symbol (e.g., "USDT")';
COMMENT ON COLUMN check_ins.payment_expires_at IS 'Payment challenge expiration time';
COMMENT ON COLUMN check_ins.payment_tx_hash IS 'User payment transaction hash (on payment blockchain)';
COMMENT ON COLUMN check_ins.issue_tx_hash IS 'Token issuance transaction hash (on our blockchain)';
COMMENT ON COLUMN check_ins.retry_count IS 'Number of token issuance retry attempts';
COMMENT ON COLUMN users.total_rewards IS 'Total reward tokens earned by user (high precision decimal)';
