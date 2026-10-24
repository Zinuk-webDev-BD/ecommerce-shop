const express = require("express");
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// this router is mounted at /api/v1, so the full paths are written here

// GET /api/v1/products/:productId/reviews (anyone)
router.get("/products/:productId/reviews", getProductReviews);

// POST /api/v1/products/:productId/reviews (login required)
router.post("/products/:productId/reviews", authMiddleware, createReview);

// PUT /api/v1/reviews/:id (owner)
router.put("/reviews/:id", authMiddleware, updateReview);

// DELETE /api/v1/reviews/:id (owner or admin)
router.delete("/reviews/:id", authMiddleware, deleteReview);

module.exports = router;