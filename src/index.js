const path = require("path");
const dotenv = require("dotenv");

const NODE_ENV = process.env.NODE_ENV || "development";
dotenv.config({ path: path.resolve(process.cwd(), `.env.${NODE_ENV}`) });
dotenv.config();

const app = require("./app");
const db = require("./db");
const { initializeDatabase } = require("./db-init");

const PORT = Number(process.env.PORT || 3000);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

async function start() {
  try {
    await db.query("SELECT 1");
    await initializeDatabase();
    console.log("PostgreSQL connection successful");
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(
      `Server is running on ${process.env.SERVER_URL || `http://localhost:${PORT}`}`,
    );
  });
}

start();
