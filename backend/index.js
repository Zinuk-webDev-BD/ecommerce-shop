const dns = require("dns");
// set DNS first so Atlas can connect
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { startOrderCleanupJob } = require("./jobs/cancelUnpaidOrders");
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./configuration/swaggerConfig");
const dbConfig = require("./configuration/dbConfig");
const { redisConfig } = require("./configuration/redisConfig");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

const PORT = process.env.PORT || 8000;
const BASE_URL = process.env.BASE_URL || "/api/v1";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// product routes
app.use(BASE_URL + "/products", productRoutes);
app.use(BASE_URL + "/cart", cartRoutes);
app.use(BASE_URL + "/orders", orderRoutes);
app.use(BASE_URL + "/payments", paymentRoutes);
app.use(BASE_URL, reviewRoutes);
app.use(BASE_URL + "/admin", adminRoutes);
// health check route
app.get("/", (req, res) => {
  res.json({ message: "Ecommerce shop API is running" });
});

// swagger docs page
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// auth routes
app.use(BASE_URL + "/auth", authRoutes);

// category routes
app.use(BASE_URL + "/categories", categoryRoutes);

// connect MongoDB and Redis first, then start the server
const startServer = async () => {
  dbConfig();
  await redisConfig();

  app.listen(PORT, () => {
    console.log("Server is running on: " + PORT);
    startOrderCleanupJob();
  });
};

startServer();