const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const db = require("./db");
const authRouter = require("./routes/auth");
const modulesRouter = require("./routes/modules");
const requireAuth = require("./middleware/require-auth");
const openApiSpec = require("./docs/openapi");

const app = express();

if (process.env.NODE_ENV === "production" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

const appLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim())
      : "*",
  }),
);
app.use(appLimiter);
app.use(express.json({ limit: "10kb" }));

app.use("/auth", authRouter);
app.use("/modules", requireAuth, modulesRouter);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get("/openapi.json", (_req, res) => {
  res.status(200).json(openApiSpec);
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "surakshit_backend",
  });
});

app.get("/db/now", async (_req, res, next) => {
  try {
    const result = await db.query("SELECT NOW() AS now");
    res.status(200).json({
      connected: true,
      time: result.rows[0].now,
    });
  } catch (error) {
    next(error);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    message: "Internal server error",
  });
});

module.exports = app;
