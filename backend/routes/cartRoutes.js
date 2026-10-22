const express = require("express");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// every cart route needs login
router.use(authMiddleware);

router.get("/", getCart);
router.post("/", addToCart);
router.delete("/", clearCart);
router.put("/:productId", updateCartItem);
router.delete("/:productId", removeCartItem);

module.exports = router;