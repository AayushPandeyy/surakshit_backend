const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization token is required",
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authorization token is required",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: "surakshit_backend",
      audience: "surakshit_client",
    });

    if (payload.type === "refresh") {
      return res.status(401).json({
        message: "Refresh token is not allowed for this endpoint",
      });
    }

    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    return next();
  } catch (_error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

module.exports = requireAuth;
