// middleware/auth.middleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn(
    "[auth.middleware] WARNING: JWT_SECRET is not set in environment variables."
  );
}

export function requireAuth(req, res, next) {
    console.log("🔥 requireAuth triggered. Headers:", req.headers);
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Not authorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
    };

    return next();
  } catch (err) {
    console.error("[requireAuth] JWT error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Optional: role-based guard without breaking anything
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}
