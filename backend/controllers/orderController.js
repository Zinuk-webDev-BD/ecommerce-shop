const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");

// give back the stock that was already taken (used when checkout fails)
const restoreStock = async (reserved) => {
  await Promise.all(
    reserved.map((r) =>
      Product.updateOne({ _id: r.product }, { $inc: { stock: r.quantity } })
    )
  );
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
    if (paymentMethod !== "cod") {
      return res
        .status(400)
        .json({ message: "only cash on delivery (cod) is available now" });
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

module.exports = { createOrder };