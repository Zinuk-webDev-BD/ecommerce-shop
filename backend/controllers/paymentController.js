const mongoose = require("mongoose");
const SSLCommerzPayment = require("sslcommerz-lts");
const Order = require("../models/Order");

// make the sslcommerz client from .env keys
const getGateway = () =>
  new SSLCommerzPayment(
    process.env.SSLCZ_STORE_ID,
    process.env.SSLCZ_STORE_PASSWORD,
    process.env.SSLCZ_IS_LIVE === "true"
  );

// base url of our own api, sslcommerz sends the customer back here
const apiBase = () =>
  `${process.env.SERVER_URL || "http://localhost:8000"}${
    process.env.BASE_URL || "/api/v1"
  }`;

// start online payment for my order, returns the payment page link
const initPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: "invalid order id" });
    }
    if (!process.env.SSLCZ_STORE_ID || !process.env.SSLCZ_STORE_PASSWORD) {
      return res
        .status(500)
        .json({ message: "sslcommerz keys are missing in .env" });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ message: "order not found" });
    }
    if (order.paymentMethod !== "sslcommerz") {
      return res
        .status(400)
        .json({ message: "this order is not an online payment order" });
    }
    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "order is already paid" });
    }
      // the order was cancelled before the money came, do not mark it as paid
  if (order.orderStatus === "cancelled") {
    return {
      code: 409,
      message: "this order was already cancelled, the payment needs a refund",
      orderId: order._id,
    };
  }
    if (order.orderStatus === "cancelled") {
      return res.status(400).json({ message: "order is cancelled" });
    }

    // new transaction id for every try: order id (24 chars) + 4 random digits
    const tranId =
      order._id.toString() + Math.floor(1000 + Math.random() * 9000);
    const { name, phone, address, city } = order.shippingAddress;

    const data = {
      total_amount: order.totalPrice,
      currency: "BDT",
      tran_id: tranId,
      success_url: `${apiBase()}/payments/success`,
      fail_url: `${apiBase()}/payments/fail`,
      cancel_url: `${apiBase()}/payments/cancel`,
      ipn_url: `${apiBase()}/payments/ipn`,
      shipping_method: "Courier",
      product_name: "Ecommerce order",
      product_category: "General",
      product_profile: "general",
      cus_name: name,
      cus_email: req.user.email,
      cus_add1: address,
      cus_add2: address,
      cus_city: city,
      cus_state: city,
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: phone,
      cus_fax: phone,
      ship_name: name,
      ship_add1: address,
      ship_add2: address,
      ship_city: city,
      ship_state: city,
      ship_postcode: "1000",
      ship_country: "Bangladesh",
    };

    const response = await getGateway().init(data);

    if (!response || response.status !== "SUCCESS" || !response.GatewayPageURL) {
      return res.status(502).json({
        message: "could not start payment",
        reason: response ? response.failedreason : "no response",
      });
    }

    // save the transaction id, we find the order by it when sslcommerz calls back
    order.transactionId = tranId;
    await order.save();

    res.status(200).json({
      message: "open gatewayUrl in the browser to pay",
      gatewayUrl: response.GatewayPageURL,
      transactionId: tranId,
    });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// ask sslcommerz again if the payment is real, then mark the order as paid
const confirmPayment = async (body) => {
  const { tran_id, val_id } = body || {};

  if (!tran_id || !val_id) {
    return { code: 400, message: "tran_id and val_id are required" };
  }

  const order = await Order.findOne({ transactionId: tran_id });
  if (!order) {
    return { code: 404, message: "order not found for this transaction" };
  }
  if (order.paymentStatus === "paid") {
    return { code: 200, message: "payment already confirmed", orderId: order._id };
  }

  const validation = await getGateway().validate({ val_id });

  // status, transaction id and amount must all match, never trust the browser alone
  const okStatus =
    validation &&
    (validation.status === "VALID" || validation.status === "VALIDATED");
  const okTran = validation && validation.tran_id === tran_id;
  const okAmount =
    validation && Math.abs(Number(validation.amount) - order.totalPrice) < 0.01;

  if (!okStatus || !okTran || !okAmount) {
    return { code: 400, message: "payment could not be verified" };
  }

  // the condition makes sure we only mark it paid once
  await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "paid", paidAt: new Date() } }
  );

  return { code: 200, message: "payment successful", orderId: order._id };
};

// sslcommerz sends the customer here after a successful payment (also used for ipn)
const paymentSuccess = async (req, res) => {
  try {
    const result = await confirmPayment(req.body);
    res.status(result.code).json(result);
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// payment failed, the customer can try again with the init route
const paymentFail = async (req, res) => {
  try {
    const { tran_id } = req.body || {};
    if (tran_id) {
      await Order.findOneAndUpdate(
        { transactionId: tran_id, paymentStatus: "pending" },
        { $set: { paymentStatus: "failed" } }
      );
    }
    res.status(200).json({ message: "payment failed, you can try again" });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// the customer closed the payment page, nothing changes in the order
const paymentCancel = async (req, res) => {
  res.status(200).json({ message: "payment cancelled, you can try again" });
};

module.exports = { initPayment, paymentSuccess, paymentFail, paymentCancel };