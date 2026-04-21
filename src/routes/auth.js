const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const db = require("../db");

const router = express.Router();
const ALLOWED_PLANS = new Set(["FREE", "PREMIUM"]);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const configuredRounds = Number(process.env.BCRYPT_ROUNDS || 12);
const BCRYPT_ROUNDS =
  Number.isInteger(configuredRounds) &&
  configuredRounds >= 10 &&
  configuredRounds <= 14
    ? configuredRounds
    : 12;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Try again later." },
});

router.use(authLimiter);

function normalizeFullName(fullName) {
  return fullName.trim().replace(/\s+/g, " ");
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizePhone(phoneNumber) {
  return phoneNumber.trim().replace(/[\s-]/g, "");
}

function normalizePlan(plan) {
  if (typeof plan !== "string") {
    return "FREE";
  }

  const normalized = plan.trim().toUpperCase();
  return normalized.length > 0 ? normalized : "FREE";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phoneNumber) {
  return /^\+?[1-9]\d{7,14}$/.test(phoneNumber);
}

function isStrongPassword(password) {
  const hasMinLength = password.length >= 12 && password.length <= 128;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasNoSpaces = !/\s/.test(password);

  return (
    hasMinLength &&
    hasUpper &&
    hasLower &&
    hasDigit &&
    hasSpecial &&
    hasNoSpaces
  );
}

function getAgeFromDate(dateValue) {
  const now = new Date();
  const birth = new Date(dateValue);

  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

function validateRegisterPayload(payload) {
  const errors = [];

  if (typeof payload.fullname !== "string") {
    errors.push("fullname is required");
  }

  if (typeof payload.email !== "string") {
    errors.push("email is required");
  }

  if (typeof payload.phonenumber !== "string") {
    errors.push("phonenumber is required");
  }

  if (typeof payload.dateofbirth !== "string") {
    errors.push("dateofbirth is required and must be YYYY-MM-DD");
  }

  if (typeof payload.password !== "string") {
    errors.push("password is required");
  }

  if (payload.plan !== undefined && typeof payload.plan !== "string") {
    errors.push("plan must be a string");
  }

  if (errors.length > 0) {
    return errors;
  }

  const fullName = normalizeFullName(payload.fullname);
  const email = normalizeEmail(payload.email);
  const phoneNumber = normalizePhone(payload.phonenumber);
  const plan = normalizePlan(payload.plan);

  if (fullName.length < 2 || fullName.length > 120) {
    errors.push("fullname must be between 2 and 120 characters");
  }

  if (!isValidEmail(email)) {
    errors.push("email format is invalid");
  }

  if (!isValidPhone(phoneNumber)) {
    errors.push("phonenumber format is invalid");
  }

  const dateOfBirth = new Date(payload.dateofbirth);
  const isDateValid = !Number.isNaN(dateOfBirth.getTime());

  if (!isDateValid) {
    errors.push("dateofbirth must be a valid date in YYYY-MM-DD format");
  } else {
    const age = getAgeFromDate(payload.dateofbirth);
    if (age < 13 || age > 120) {
      errors.push("dateofbirth is invalid or age is out of allowed range");
    }
  }

  if (!isStrongPassword(payload.password)) {
    errors.push(
      "password must be 12-128 chars and include upper, lower, number, and special character without spaces",
    );
  }

  if (!ALLOWED_PLANS.has(plan)) {
    errors.push("plan must be either FREE or PREMIUM");
  }

  return errors;
}

function validateLoginPayload(payload) {
  const errors = [];

  if (typeof payload.email !== "string") {
    errors.push("email is required");
  }

  if (typeof payload.password !== "string") {
    errors.push("password is required");
  }

  if (errors.length > 0) {
    return errors;
  }

  const email = normalizeEmail(payload.email);

  if (!isValidEmail(email)) {
    errors.push("email format is invalid");
  }

  if (payload.password.length < 1 || payload.password.length > 128) {
    errors.push("password length is invalid");
  }

  return errors;
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "surakshit_backend",
      audience: "surakshit_client",
    },
  );
}

router.post("/register", async (req, res, next) => {
  try {
    const errors = validateRegisterPayload(req.body || {});

    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const fullName = normalizeFullName(req.body.fullname);
    const email = normalizeEmail(req.body.email);
    const phoneNumber = normalizePhone(req.body.phonenumber);
    const dateOfBirth = req.body.dateofbirth;
    const plan = normalizePlan(req.body.plan);
    const passwordHash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);

    const result = await db.query(
      `
        INSERT INTO users (fullname, email, phonenumber, dateofbirth, plan, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, fullname, email, phonenumber, dateofbirth, plan, created_at
      `,
      [fullName, email, phoneNumber, dateOfBirth, plan, passwordHash],
    );

    const createdUser = result.rows[0];
    const token = signAccessToken(createdUser);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: createdUser,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with this email or phone number already exists",
      });
    }

    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const errors = validateLoginPayload(req.body || {});

    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    const result = await db.query(
      `
        SELECT id, fullname, email, phonenumber, dateofbirth, plan, password_hash, created_at
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    const existingUser = result.rows[0];

    if (!existingUser) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password_hash,
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signAccessToken(existingUser);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: existingUser.id,
        fullname: existingUser.fullname,
        email: existingUser.email,
        phonenumber: existingUser.phonenumber,
        dateofbirth: existingUser.dateofbirth,
        plan: existingUser.plan,
        created_at: existingUser.created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
