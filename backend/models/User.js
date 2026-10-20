const mongoose = require("mongoose");

// user er schema banano hocche
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // same email diye multiple account na khule, unique korte hocche
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // google/github diye login korle password na thakleo hobe, tai required false kora hocche
    },
    // email verify korar jonno, initially false thakbe, verify hole true hobe
    isVerified: {
      type: Boolean,
      default: false,
    },
    // user kothay theke login korche, local, google, github
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    // profile er fields, user pore add ba update korte parbe
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    // real time chat e user online ache kina dekhar jonno (pore kaje lagbe)
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    // premium subscribe korle true hobe, tokhon group create korte parbe
    isPremium: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // createdAt and updatedAt automatically add hobe
);

module.exports = mongoose.model("User", userSchema);