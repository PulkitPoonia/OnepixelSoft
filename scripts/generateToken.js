import jwt from 'jsonwebtoken';

const JWT_SECRET = "user-jwt-secret-change-me-in-production-123456789"; // Replace with your JWT_SECRET
const payload = {
  username: "pulkitpoonia07",
  user: true,
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
console.log("Generated Token:", token);