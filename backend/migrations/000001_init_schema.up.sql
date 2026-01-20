-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    did VARCHAR(255) UNIQUE NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 1,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    profile_completed BOOLEAN DEFAULT FALSE,
    total_tokens DECIMAL(36, 18) DEFAULT 0,
    last_checkin_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- Create index on wallet_address (case-insensitive)
CREATE INDEX idx_users_wallet_address ON users (LOWER(wallet_address));
CREATE INDEX idx_users_did ON users (did);
CREATE INDEX idx_users_last_checkin_at ON users (last_checkin_at);
CREATE INDEX idx_users_total_tokens ON users (total_tokens DESC);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
                                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    email VARCHAR(255),
    telegram VARCHAR(100),
    bio TEXT,
    avatar TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                                                          );

-- Create index on user_id
CREATE INDEX idx_profiles_user_id ON profiles (user_id);

-- Login challenges table
CREATE TABLE IF NOT EXISTS login_challenges (
                                                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nonce VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- Create index on nonce and expiration
CREATE INDEX idx_login_challenges_nonce ON login_challenges (nonce);
CREATE INDEX idx_login_challenges_expires_at ON login_challenges (expires_at);
CREATE INDEX idx_login_challenges_wallet_address ON login_challenges (LOWER(wallet_address));

-- Check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
                                         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('external_failed', 'issuing', 'success', 'issue_failed')),
    token_amount DECIMAL(36, 18),
    tx_hash VARCHAR(66),
    failure_reason TEXT,
    issued_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                                                   );

-- Create indexes for check_ins
CREATE INDEX idx_check_ins_user_id ON check_ins (user_id);
CREATE INDEX idx_check_ins_status ON check_ins (status);
CREATE INDEX idx_check_ins_created_at ON check_ins (created_at DESC);
CREATE INDEX idx_check_ins_issued_at ON check_ins (issued_at DESC);
CREATE INDEX idx_check_ins_user_status ON check_ins (user_id, status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_check_ins_updated_at BEFORE UPDATE ON check_ins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with wallet addresses and DID';
COMMENT ON TABLE login_challenges IS 'Nonce-based login challenges for wallet authentication';
COMMENT ON TABLE check_ins IS 'Daily check-in records with 4-state machine: external_failed, issuing, success, issue_failed';

COMMENT ON COLUMN users.total_tokens IS 'Total tokens earned by user (high precision decimal)';
COMMENT ON COLUMN users.last_checkin_at IS 'Last successful check-in time for 24h cooldown';
COMMENT ON COLUMN check_ins.status IS 'Check-in status: external_failed (external API failed), issuing (waiting for token), success (token issued), issue_failed (token issue failed)';
COMMENT ON COLUMN check_ins.token_amount IS 'Amount of tokens issued (null if not yet issued)';
COMMENT ON COLUMN check_ins.tx_hash IS 'Blockchain transaction hash (null if not yet issued)';
COMMENT ON COLUMN check_ins.failure_reason IS 'Error message if status is external_failed or issue_failed';
COMMENT ON COLUMN check_ins.issued_at IS 'Timestamp when tokens were successfully issued';
