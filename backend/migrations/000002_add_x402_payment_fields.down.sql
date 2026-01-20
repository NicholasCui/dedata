-- Rollback: Remove x402 payment fields from check_ins table
ALTER TABLE check_ins
    DROP COLUMN IF EXISTS order_id,
    DROP COLUMN IF EXISTS payment_address,
    DROP COLUMN IF EXISTS price_amount,
    DROP COLUMN IF EXISTS blockchain_name,
    DROP COLUMN IF EXISTS token_symbol,
    DROP COLUMN IF EXISTS payment_expires_at,
    DROP COLUMN IF EXISTS payment_tx_hash,
    DROP COLUMN IF EXISTS issue_tx_hash,
    DROP COLUMN IF EXISTS retry_count;

-- Restore old tx_hash column name
ALTER TABLE check_ins
    RENAME COLUMN old_tx_hash TO tx_hash;

-- Restore old status enum
ALTER TABLE check_ins
    DROP CONSTRAINT IF EXISTS check_ins_status_check;

ALTER TABLE check_ins
    ADD CONSTRAINT check_ins_status_check
    CHECK (status IN ('external_failed', 'issuing', 'success', 'issue_failed'));

-- Drop new indexes
DROP INDEX IF EXISTS idx_check_ins_order_id;
DROP INDEX IF EXISTS idx_check_ins_pending_payment;
DROP INDEX IF EXISTS idx_check_ins_payment_success;

-- Rename total_rewards back to total_tokens in users table
ALTER TABLE users
    RENAME COLUMN total_rewards TO total_tokens;

-- Restore old index name
DROP INDEX IF EXISTS idx_users_total_rewards;
CREATE INDEX idx_users_total_tokens ON users (total_tokens DESC);
