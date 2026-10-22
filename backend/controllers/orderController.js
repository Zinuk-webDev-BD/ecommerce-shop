const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");

// give back the stock (used when checkout fails or an order is cancelled)
const restoreStock = async (items) => {
  await Promise.all(
    items.map((item) =>
      Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
    )
  );
};

// which status can change to which (delivered and cancelled are final)
const STATUS_FLOW = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

// page and limit with safe defaults (limit max 50)
const getPaging = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 50);
  return { page, limit };
};

// create an order from my cart (login required)
const createOrder = async (req, res) => {
  // products whose stock we already reduced, needed for rollback
  const reserved = [];

  try {
    const { name, phone, address, city } = req.body;
    const paymentMethod = req.body.paymentMethod || "cod";

    if (!name || !phone || !address || !city) {
      return res
        .status(400)
        .json({ message: "name, phone, address and city are required" });
    }
    if (!/^01\d{9}$/.test(phone.trim())) {
      return res
        .status(400)
        .json({ message: "phone must be like 01712345678" });
    }
       if (!["cod", "sslcommerz"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ message: "paymentMethod must be cod or sslcommerz" });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

    // ignore products that were deleted or hidden by admin
    const cartItems = cart
      ? cart.items.filter((item) => item.product && item.product.isActive)
      : [];

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "cart is empty" });
    }

    // reduce stock one product at a time, the condition stock >= quantity
    // makes sure two people can never buy the last item together
    for (const item of cartItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product._id, isActive: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );

      if (!updated) {
        await restoreStock(reserved);
        return res.status(400).json({
          message: `not enough stock for ${item.product.name}`,
        });
      }

      reserved.push({ product: item.product._id, quantity: item.quantity });
    }

    const orderItems = cartItems.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.images.length > 0 ? item.product.images[0].url : "",
    }));

    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
      },
      paymentMethod,
      totalPrice,
    });

    // order is saved, now empty the cart
    cart.items = [];
    await cart.save();

    res.status(201).json({ message: "order placed", order });
  } catch (error) {
    // something failed after stock was reduced, so give the stock back
    await restoreStock(reserved);
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// my order history, newest first
const getMyOrders = async (req, res) => {
  try {
    const { page, limit } = getPaging(req.query);
    const filter = { user: req.user._id };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// one order, only the owner or an admin can see it
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid order id" });
    }

    const order = await Order.findById(id).populate("user", "name email");

    // same message for "not found" and "not yours", so nobody can guess ids
    const isOwner = order && order.user._id.toString() === req.user._id.toString();
    if (!order || (!isOwner && req.user.role !== "admin")) {
      return res.status(404).json({ message: "order not found" });
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// cancel my own order, only while it is still pending
const cancelMyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid order id" });
    }

    // the status check is inside the update, so a double click cannot cancel twice
    const order = await Order.findOneAndUpdate(
      { _id: id, user: req.user._id, orderStatus: "pending" },
      { $set: { orderStatus: "cancelled" } },
      { new: true }
    );

    if (!order) {
      const exists = await Order.exists({ _id: id, user: req.user._id });
      if (!exists) {
        return res.status(404).json({ message: "order not found" });
      }
      return res
        .status(400)
        .json({ message: "only pending orders can be cancelled" });
    }

    await restoreStock(order.items);

    res.status(200).json({ message: "order cancelled", order });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// admin: all orders, can filter by status
const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const { page, limit } = getPaging(req.query);

    const filter = {};
    if (status) {
      if (!Object.keys(STATUS_FLOW).includes(status)) {
        return res.status(400).json({ message: "invalid status" });
      }
      filter.orderStatus = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// admin: change the order status step by step
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid order id" });
    }
    if (!status || !Object.keys(STATUS_FLOW).includes(status)) {
      return res.status(400).json({
        message: "status must be pending, processing, shipped, delivered or cancelled",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "order not found" });
    }

    if (!STATUS_FLOW[order.orderStatus].includes(status)) {
      return res.status(400).json({
        message: `cannot change status from ${order.orderStatus} to ${status}`,
      });
    }

    const update = { orderStatus: status };
    // cash on delivery is paid when the parcel is delivered
    if (status === "delivered" && order.paymentMethod === "cod") {
      update.paymentStatus = "paid";
    }

    // the old status is checked again inside the update (safe if two admins click together)
    const updated = await Order.findOneAndUpdate(
      { _id: id, orderStatus: order.orderStatus },
      { $set: update },
      { new: true }
    );
    if (!updated) {
      return res
        .status(409)
        .json({ message: "order status was changed by someone else, try again" });
    }

    if (status === "cancelled") {
      await restoreStock(updated.items);
    }

    res.status(200).json({ message: "order status updated", order: updated });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  getAllOrders,
  updateOrderStatus,
};