const db = require("./db");

async function initializeDatabase() {
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plans') THEN
        CREATE TYPE plans AS ENUM ('FREE', 'PREMIUM');
      END IF;
    END
    $$;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      fullname VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      phonenumber VARCHAR(20) NOT NULL UNIQUE,
      dateofbirth DATE NOT NULL,
      plan plans NOT NULL DEFAULT 'FREE',
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS plan plans NOT NULL DEFAULT 'FREE'
  `);
}

module.exports = { initializeDatabase };
