const mongoose = require("mongoose");

// connect to MongoDB
const dbConfig = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log("MongoDB error:", err.message));
};

module.exports = dbConfig;