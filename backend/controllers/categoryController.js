const mongoose = require("mongoose");
const Category = require("../models/Category");

// make a url friendly slug from the name (Men Shoes -> men-shoes)
const makeSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// admin: create a category
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const slug = makeSlug(name);
    if (!slug) {
      return res
        .status(400)
        .json({ message: "name must have english letters or numbers" });
    }

    const exists = await Category.findOne({ slug });
    if (exists) {
      return res.status(409).json({ message: "category already exists" });
    }

    const category = await Category.create({ name, slug, description });

    res.status(201).json({ message: "category created", category });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// public: get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// public: get one category by id
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid category id" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "category not found" });
    }

    res.status(200).json({ category });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// admin: update a category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid category id" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "category not found" });
    }

    if (name) {
      const slug = makeSlug(name);
      if (!slug) {
        return res
          .status(400)
          .json({ message: "name must have english letters or numbers" });
      }

      // another category must not already use this name
      const duplicate = await Category.findOne({ slug, _id: { $ne: id } });
      if (duplicate) {
        return res.status(409).json({ message: "category already exists" });
      }

      category.name = name;
      category.slug = slug;
    }

    if (description !== undefined) {
      category.description = description;
    }

    await category.save();

    res.status(200).json({ message: "category updated", category });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

// admin: delete a category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid category id" });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: "category not found" });
    }

    res.status(200).json({ message: "category deleted" });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};