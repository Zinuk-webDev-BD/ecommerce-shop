const express = require("express");
const router = express.Router();
const {
  register,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", authMiddleware, changePassword);
router.get("/me", authMiddleware, getMe);

// test route: only admin can open this
router.get("/admin-check", authMiddleware, adminMiddleware, (req, res) => {
  res.status(200).json({ message: "welcome admin", name: req.user.name });
});

module.exports = router;