const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";
const hasConnectionString = Boolean(process.env.DATABASE_URL);

const pool = hasConnectionString
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === "false"
          ? false
          : isProduction
            ? { rejectUnauthorized: false }
            : false,
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || "postgres",
      password: String(process.env.DB_PASSWORD ?? ""),
      database: process.env.DB_NAME || "postgres",
    });

module.exports = pool;
