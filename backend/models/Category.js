const mongoose = require("mongoose");

// category schema (example: Shoes, Phones)
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // slug is the url friendly name, it also stops duplicate categories
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);