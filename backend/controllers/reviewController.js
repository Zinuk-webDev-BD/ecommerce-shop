const mongoose = require("mongoose");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");

// calculate the average rating and review count again and save them in the product
const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$product",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const average = stats.length ? Math.round(stats[0].average * 10) / 10 : 0;
  const count = stats.length ? stats[0].count : 0;

  await Product.findByIdAndUpdate(productId, {
    $set: { ratingAverage: average, ratingCount: count },
  });
};

// check rating (1 to 5, whole number) and comment (max 500 characters)
const checkRatingInput = (rating, comment) => {
  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return "rating must be a whole number from 1 to 5";
  }
  if (comment !== undefined && (typeof comment !== "string" || comment.length > 500)) {
    return "comment must be text, 500 characters at most";
  }
  return null;
};

// anyone: reviews of one product with the average rating
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "invalid product id" });
    }

    const product = await Product.findById(productId).select(
      "name isActive ratingAverage ratingCount"
    );
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "product not found" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId })
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments({ product: productId }),
    ]);

    res.status(200).json({
      product: product.name,
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      reviews,
    });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// logged in user: review a product that was delivered to me
const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "invalid product id" });
    }
    if (rating === undefined) {
      return res.status(400).json({ message: "rating is required" });
    }
    const inputError = checkRatingInput(rating, comment);
    if (inputError) {
      return res.status(400).json({ message: inputError });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "product not found" });
    }

    // only people who really received this product can review it
    const bought = await Order.exists({
      user: req.user._id,
      orderStatus: "delivered",
      "items.product": productId,
    });
    if (!bought) {
      return res
        .status(403)
        .json({ message: "you can review only products that were delivered to you" });
    }

    let review;
    try {
      review = await Review.create({
        user: req.user._id,
        product: productId,
        rating,
        comment: comment || "",
      });
    } catch (error) {
      // 11000 = the unique index says this user already reviewed this product
      if (error.code === 11000) {
        return res
          .status(409)
          .json({ message: "you already reviewed this product" });
      }
      throw error;
    }

    await updateProductRating(productId);

    res.status(201).json({ message: "review added", review });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// owner: change my own review
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid review id" });
    }
    if (rating === undefined && comment === undefined) {
      return res
        .status(400)
        .json({ message: "send rating or comment to update" });
    }
    const inputError = checkRatingInput(rating, comment);
    if (inputError) {
      return res.status(400).json({ message: inputError });
    }

    const review = await Review.findOne({ _id: id, user: req.user._id });
    if (!review) {
      return res.status(404).json({ message: "review not found" });
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    await review.save();

    await updateProductRating(review.product);

    res.status(200).json({ message: "review updated", review });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// owner or admin: delete a review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid review id" });
    }

    const review = await Review.findById(id);

    // same message for "not found" and "not yours"
    const isOwner = review && review.user.toString() === req.user._id.toString();
    if (!review || (!isOwner && req.user.role !== "admin")) {
      return res.status(404).json({ message: "review not found" });
    }

    await review.deleteOne();
    await updateProductRating(review.product);

    res.status(200).json({ message: "review deleted" });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
};