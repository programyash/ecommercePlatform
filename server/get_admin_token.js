const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign(
  { userId: "some-admin-user-id", role: "ADMIN" },
  process.env.JWT_SECRET || "fallback_secret",
  { expiresIn: '1d' }
);

console.log("Token:", token);
