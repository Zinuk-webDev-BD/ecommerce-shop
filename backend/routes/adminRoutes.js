const express = require("express");
const { getStats } = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// GET /api/v1/admin/stats (admin only)
router.get("/stats", authMiddleware, adminMiddleware, getStats);

module.exports = router;