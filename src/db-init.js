const db = require("./db");

async function initializeDatabase() {
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plans') THEN
        CREATE TYPE plans AS ENUM ('FREE', 'PREMIUM');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'locales') THEN
        CREATE TYPE locales AS ENUM ('en', 'np');
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
      pan_number VARCHAR(20),
      locale locales NOT NULL DEFAULT 'en',
      plan plans NOT NULL DEFAULT 'FREE',
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS plan plans NOT NULL DEFAULT 'FREE',
    ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS locale locales NOT NULL DEFAULT 'en'
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_pan_number_unique_idx
    ON users (pan_number)
    WHERE pan_number IS NOT NULL
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS modules (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      icon VARCHAR(80) NOT NULL,
      path VARCHAR(255),
      code VARCHAR(30) NOT NULL UNIQUE,
      parent_id BIGINT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    ALTER TABLE modules
    ADD COLUMN IF NOT EXISTS name VARCHAR(120) NOT NULL,
    ADD COLUMN IF NOT EXISTS icon VARCHAR(80) NOT NULL,
    ADD COLUMN IF NOT EXISTS path VARCHAR(255),
    ADD COLUMN IF NOT EXISTS code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS parent_id BIGINT,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS modules_code_unique_idx ON modules(code)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS modules_parent_id_idx ON modules(parent_id)
  `);

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'modules_parent_id_fkey'
      ) THEN
        ALTER TABLE modules
        ADD CONSTRAINT modules_parent_id_fkey
        FOREIGN KEY (parent_id)
        REFERENCES modules(id)
        ON DELETE CASCADE;
      END IF;
    END
    $$;
  `);

  await db.query(`
    ALTER TABLE modules
    ALTER COLUMN code SET NOT NULL
  `);
}

module.exports = { initializeDatabase };
