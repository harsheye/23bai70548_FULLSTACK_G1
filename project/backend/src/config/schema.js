const pool = require('./database');

const ensureColumn = async (tableName, columnName, definition) => {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );

  if (!result.rows.length) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
  }
};

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ensureColumn('users', 'role', `VARCHAR(32) NOT NULL DEFAULT 'user'`);
  await ensureColumn('users', 'is_blocked', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await ensureColumn('users', 'blocked_until', 'TIMESTAMP');
  await ensureColumn('users', 'blocked_reason', 'TEXT');
  await ensureColumn('users', 'storage_limit_bytes', `BIGINT NOT NULL DEFAULT ${1024 * 1024 * 1024}`);
  await ensureColumn('users', 'daily_transfer_limit_bytes', `BIGINT NOT NULL DEFAULT ${500 * 1024 * 1024}`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name VARCHAR(1024) NOT NULL,
      minio_key VARCHAR(1024) NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(255),
      is_public BOOLEAN DEFAULT FALSE,
      public_access_level VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shared_files (
      id SERIAL PRIMARY KEY,
      file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      access_level VARCHAR(50) DEFAULT 'view',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS file_access_requests (
      id SERIAL PRIMARY KEY,
      file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
      requester_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP
    );
  `);

  await ensureColumn('files', 'public_access_level', 'VARCHAR(50)');
  await ensureColumn('files', 'last_accessed_at', 'TIMESTAMP');
  await ensureColumn('files', 'last_viewed_at', 'TIMESTAMP');
  await ensureColumn('files', 'last_edited_at', 'TIMESTAMP');
  await ensureColumn('files', 'last_downloaded_at', 'TIMESTAMP');
  await ensureColumn('files', 'total_view_count', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('files', 'total_download_count', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('files', 'is_starred', 'BOOLEAN DEFAULT FALSE');
  await ensureColumn('files', 'share_token', 'VARCHAR(255)');
  await ensureColumn('files', 'public_share_token', 'VARCHAR(255)');

  await pool.query(`
    ALTER TABLE files
    ALTER COLUMN file_name TYPE VARCHAR(1024);
  `);

  await pool.query(`
    ALTER TABLE files
    ALTER COLUMN minio_key TYPE VARCHAR(1024);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ip_daily_usage (
      id SERIAL PRIMARY KEY,
      ip_address VARCHAR(128) NOT NULL,
      usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
      upload_bytes BIGINT NOT NULL DEFAULT 0,
      download_bytes BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_daily_usage (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
      upload_bytes BIGINT NOT NULL DEFAULT 0,
      download_bytes BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_action_logs (
      id SERIAL PRIMARY KEY,
      admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action_type VARCHAR(64) NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registration_otps (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      otp_code VARCHAR(12) NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMP NOT NULL,
      last_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(is_blocked, blocked_until);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_files_public ON files(is_public);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_files_starred ON files(is_starred);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_files_share_token_unique ON files(share_token);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_files_public_share_token_unique ON files(public_share_token)
    WHERE public_share_token IS NOT NULL;
  `);

  await pool.query(`
    ALTER TABLE shared_files
    ALTER COLUMN shared_with_user_id SET NOT NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_shared_files_file_id ON shared_files(file_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files(shared_with_user_id);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_files_unique_user_file
    ON shared_files(file_id, shared_with_user_id);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_daily_usage_unique
    ON ip_daily_usage(ip_address, usage_date);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_daily_usage_unique
    ON user_daily_usage(user_id, usage_date);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_file_access_requests_unique_pending
    ON file_access_requests(file_id, requester_user_id, status)
    WHERE status = 'pending';
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_file_access_requests_owner
    ON file_access_requests(owner_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_file_access_requests_requester
    ON file_access_requests(requester_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created
    ON admin_action_logs(created_at DESC);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_otps_email
    ON registration_otps(LOWER(email));
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_otps_username
    ON registration_otps(username);
  `);

  await pool.query(`
    UPDATE files
    SET share_token = md5(random()::text || clock_timestamp()::text || id::text)
    WHERE share_token IS NULL;
  `);

  await pool.query(`
    UPDATE files
    SET public_share_token = md5('public' || random()::text || clock_timestamp()::text || id::text)
    WHERE is_public = TRUE AND public_share_token IS NULL;
  `);

  await pool.query(`
    UPDATE users
    SET role = 'user'
    WHERE role IS NULL OR role = '';
  `);

  await pool.query(`
    UPDATE users
    SET storage_limit_bytes = ${1024 * 1024 * 1024}
    WHERE storage_limit_bytes IS NULL OR storage_limit_bytes <= 0;
  `);

  await pool.query(`
    UPDATE users
    SET daily_transfer_limit_bytes = ${500 * 1024 * 1024}
    WHERE daily_transfer_limit_bytes IS NULL OR daily_transfer_limit_bytes <= 0;
  `);

  await pool.query(`
    DELETE FROM registration_otps
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 day';
  `);

  await pool.query(`
    WITH first_user AS (
      SELECT id
      FROM users
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    )
    UPDATE users
    SET role = 'admin'
    WHERE id IN (SELECT id FROM first_user)
      AND NOT EXISTS (
        SELECT 1 FROM users WHERE role = 'admin'
      );
  `);
};

module.exports = ensureSchema;
