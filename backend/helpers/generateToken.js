const jwt = require("jsonwebtoken");

// generateToken function ta user er id diye JWT token generate korar jonno use kora hocche, jekhane secret key and expiration time set kora hocche
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;