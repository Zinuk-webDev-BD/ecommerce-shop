const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// every order route needs login
router.use(authMiddleware);

// POST /api/v1/orders
router.post("/", createOrder);

// GET /api/v1/orders (admin only, all orders)
router.get("/", adminMiddleware, getAllOrders);

// GET /api/v1/orders/my (this must be before "/:id", otherwise "my" is read as an id)
router.get("/my", getMyOrders);

// GET /api/v1/orders/:id (owner or admin)
router.get("/:id", getOrderById);

// PUT /api/v1/orders/:id/cancel (owner, only pending orders)
router.put("/:id/cancel", cancelMyOrder);

// PUT /api/v1/orders/:id/status (admin only)
router.put("/:id/status", adminMiddleware, updateOrderStatus);

module.exports = router;