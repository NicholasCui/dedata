-- Drop triggers
DROP TRIGGER IF EXISTS update_check_ins_updated_at ON check_ins;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (cascade will drop dependent objects)
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS login_challenges CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";
