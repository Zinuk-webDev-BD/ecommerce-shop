const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// read the cart with product details and calculate the total price
const buildCartResponse = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate(
    "items.product",
    "name price stock images isActive"
  );

  if (!cart) {
    return { items: [], totalItems: 0, totalPrice: 0 };
  }

  const items = [];
  let totalItems = 0;
  let totalPrice = 0;

  cart.items.forEach((item) => {
    const product = item.product;

    // skip products that were deleted or hidden by admin
    if (!product || !product.isActive) return;

    const subtotal = product.price * item.quantity;
    totalItems += item.quantity;
    totalPrice += subtotal;

    items.push({
      product: {
        _id: product._id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        image: product.images.length > 0 ? product.images[0].url : "",
      },
      quantity: item.quantity,
      subtotal,
      // false means stock became lower than the cart quantity
      inStock: product.stock >= item.quantity,
    });
  });

  return { items, totalItems, totalPrice };
};

// check productId and quantity from the request
const checkInput = (productId, quantity) => {
  if (!mongoose.isValidObjectId(productId)) {
    return "invalid product id";
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return "quantity must be a whole number, 1 or more";
  }
  return null;
};

// get my cart
const getCart = async (req, res) => {
  try {
    const cart = await buildCartResponse(req.user._id);
    res.status(200).json({ cart });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// add a product to cart (if it is already there, quantity increases)
const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);

    const inputError = checkInput(productId, quantity);
    if (inputError) {
      return res.status(400).json({ message: inputError });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "product not found" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existing = cart.items.find((item) => item.product.toString() === productId);
    const newQuantity = (existing ? existing.quantity : 0) + quantity;

    if (newQuantity > product.stock) {
      return res
        .status(400)
        .json({ message: `only ${product.stock} item(s) in stock` });
    }

    if (existing) {
      existing.quantity = newQuantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();

    const result = await buildCartResponse(req.user._id);
    res.status(200).json({ message: "added to cart", cart: result });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// set a new quantity for a product in the cart (higher or lower)
const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const quantity = Number(req.body.quantity);

    const inputError = checkInput(productId, quantity);
    if (inputError) {
      return res.status(400).json({ message: inputError });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    const item = cart
      ? cart.items.find((i) => i.product.toString() === productId)
      : null;
    if (!item) {
      return res.status(404).json({ message: "product is not in your cart" });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "product not found" });
    }

    if (quantity > product.stock) {
      return res
        .status(400)
        .json({ message: `only ${product.stock} item(s) in stock` });
    }

    item.quantity = quantity;
    await cart.save();

    const result = await buildCartResponse(req.user._id);
    res.status(200).json({ message: "cart updated", cart: result });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// remove one product from the cart
const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "invalid product id" });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    const found = cart
      ? cart.items.some((i) => i.product.toString() === productId)
      : false;
    if (!found) {
      return res.status(404).json({ message: "product is not in your cart" });
    }

    cart.items = cart.items.filter((i) => i.product.toString() !== productId);
    await cart.save();

    const result = await buildCartResponse(req.user._id);
    res.status(200).json({ message: "removed from cart", cart: result });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// remove everything from the cart
const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } });
    res.status(200).json({
      message: "cart cleared",
      cart: { items: [], totalItems: 0, totalPrice: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};