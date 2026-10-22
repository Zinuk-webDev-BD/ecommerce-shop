const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const cloudinary = require("../configuration/cloudinaryConfig");
const uploadToCloudinary = require("../helpers/uploadToCloudinary");

// create a product with images (admin only)
const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    if (!name || !name.trim() || price === undefined || !category) {
      return res.status(400).json({ message: "name, price and category are required" });
    }
    if (isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ message: "price must be a positive number" });
    }
    if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0)) {
      return res.status(400).json({ message: "stock must be 0 or more" });
    }
    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({ message: "invalid category id" });
    }
    if (!(await Category.exists({ _id: category }))) {
      return res.status(404).json({ message: "category not found" });
    }

    // upload all images to cloudinary at the same time
    const files = req.files || [];
    const uploaded = await Promise.all(
      files.map((file) => uploadToCloudinary(file.buffer, "ecommerce-shop/products"))
    );
    const images = uploaded.map((img) => ({ url: img.secure_url, publicId: img.public_id }));

    const product = await Product.create({
      name: name.trim(),
      description,
      price: Number(price),
      stock: stock !== undefined ? Number(stock) : 0,
      category,
      images,
    });

    res.status(201).json({ message: "product created", product });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// get one product (anyone can see)
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid product id" });
    }

    const product = await Product.findById(id).populate("category", "name");
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "product not found" });
    }

    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// update product fields, only sent fields change (admin only)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid product id" });
    }

    const allowed = ["name", "description", "price", "stock", "category", "isActive"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "send at least one field to update" });
    }
    if (updates.price !== undefined && (isNaN(Number(updates.price)) || Number(updates.price) < 0)) {
      return res.status(400).json({ message: "price must be a positive number" });
    }
    if (updates.stock !== undefined && (isNaN(Number(updates.stock)) || Number(updates.stock) < 0)) {
      return res.status(400).json({ message: "stock must be 0 or more" });
    }
    if (updates.category !== undefined) {
      if (!mongoose.isValidObjectId(updates.category) || !(await Category.exists({ _id: updates.category }))) {
        return res.status(404).json({ message: "category not found" });
      }
    }

    const product = await Product.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ message: "product not found" });
    }

    res.status(200).json({ message: "product updated", product });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// delete a product and its images (admin only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid product id" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "product not found" });
    }

    // remove the images from cloudinary first
    await Promise.all(product.images.map((img) => cloudinary.uploader.destroy(img.publicId)));
    await product.deleteOne();

    res.status(200).json({ message: "product deleted" });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

module.exports = { createProduct, getProduct, updateProduct, deleteProduct };