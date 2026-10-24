const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const cloudinary = require("../configuration/cloudinaryConfig");
const uploadToCloudinary = require("../helpers/uploadToCloudinary");
const { makeKey, getCache, setCache, clearCatalogCache } = require("../helpers/cache");

// how many seconds a product response stays in the cache
const CACHE_SECONDS = Number(process.env.CACHE_SECONDS) || 60;

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

    // the product list changed, so old cache must go
    await clearCatalogCache();

    res.status(201).json({ message: "product created", product });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// list products with search, filter, sort and pagination (anyone can see)
const getProducts = async (req, res) => {
  try {
    // same query gives the same cache key, if it is saved we answer from redis
    const cacheKey = await makeKey("list", req.query);
    const cached = await getCache(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const { search, category, minPrice, maxPrice, sort } = req.query;

    // page and limit, with safe defaults (limit max 50)
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    // only active products are shown to customers
    const filter = { isActive: true };

    if (search && search.trim()) {
      // escape special regex characters so the search is safe
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: safe, $options: "i" };
    }

    if (category) {
      if (!mongoose.isValidObjectId(category)) {
        return res.status(400).json({ message: "invalid category id" });
      }
      filter.category = category;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        if (isNaN(Number(minPrice))) {
          return res.status(400).json({ message: "minPrice must be a number" });
        }
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined) {
        if (isNaN(Number(maxPrice))) {
          return res.status(400).json({ message: "maxPrice must be a number" });
        }
        filter.price.$lte = Number(maxPrice);
      }
    }

    // sort options
    const sortOptions = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
    };
    const sortBy = sortOptions[sort] || sortOptions.newest;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name")
        .sort(sortBy)
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    const result = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: products.length,
      products,
    };

    // save for next time (only good responses are saved, errors never are)
    await setCache(cacheKey, result, CACHE_SECONDS);

    res.set("X-Cache", "MISS");
    res.status(200).json(result);
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

    const cacheKey = await makeKey("item", { id });
    const cached = await getCache(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cached);
    }

    const product = await Product.findById(id).populate("category", "name");
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "product not found" });
    }

    const result = { product };
    await setCache(cacheKey, result, CACHE_SECONDS);

    res.set("X-Cache", "MISS");
    res.status(200).json(result);
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

    // the product changed, so old cache must go
    await clearCatalogCache();

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

    // the product is gone, so old cache must go
    await clearCatalogCache();

    res.status(200).json({ message: "product deleted" });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

module.exports = { createProduct, getProducts, getProduct, updateProduct, deleteProduct };