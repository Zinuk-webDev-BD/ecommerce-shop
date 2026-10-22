const express = require("express");
const {
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const uploadImages = require("../middleware/uploadMiddleware");

const router = express.Router();

// POST /api/v1/products (admin only, multipart form with images)
router.post("/", authMiddleware, adminMiddleware, uploadImages, createProduct);

// GET /api/v1/products/:id (anyone)
router.get("/:id", getProduct);

// PUT /api/v1/products/:id (admin only)
router.put("/:id", authMiddleware, adminMiddleware, updateProduct);

// DELETE /api/v1/products/:id (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

module.exports = router;