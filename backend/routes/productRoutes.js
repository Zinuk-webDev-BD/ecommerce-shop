const express = require("express");
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const uploadImages = require("../middleware/uploadMiddleware");

const router = express.Router();

// GET /api/v1/products (anyone, with search, filter, sort, pagination)
// this must be before "/:id", otherwise "/" will not match correctly
router.get("/", getProducts);

// POST /api/v1/products (admin only, multipart form with images)
router.post("/", authMiddleware, adminMiddleware, uploadImages, createProduct);

// GET /api/v1/products/:id (anyone)
router.get("/:id", getProduct);

// PUT /api/v1/products/:id (admin only)
router.put("/:id", authMiddleware, adminMiddleware, updateProduct);

// DELETE /api/v1/products/:id (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

module.exports = router;