const express = require("express");
const {
  initPayment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
} = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/v1/payments/init/:orderId (login required, returns the payment link)
router.post("/init/:orderId", authMiddleware, initPayment);

// these four are called by sslcommerz, so they have no login
router.post("/success", paymentSuccess);
router.post("/ipn", paymentSuccess);
router.post("/fail", paymentFail);
router.post("/cancel", paymentCancel);

module.exports = router;