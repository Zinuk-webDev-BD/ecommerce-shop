const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const ALL_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

// a date as yyyy-mm-dd in Dhaka time
const dhakaDay = (date) =>
  date.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

// admin: numbers for the dashboard
const getStats = async (req, res) => {
  try {
    // products with this stock or less are shown as low stock (default 5)
    const lowStockLimit = Math.min(
      Math.max(parseInt(req.query.lowStock) || 5, 0),
      1000
    );

    const DAY = 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - 7 * DAY);

    // money counts only when the payment is paid and the order is not cancelled
    const moneyFilter = { paymentStatus: "paid", orderStatus: { $ne: "cancelled" } };

    const [
      totalUsers,
      totalProducts,
      statusCounts,
      revenueAgg,
      dailyAgg,
      topProducts,
      lowStockProducts,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Product.countDocuments({ isActive: true }),
      Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: moneyFilter },
        { $group: { _id: null, revenue: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...moneyFilter, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "Asia/Dhaka",
              },
            },
            revenue: { $sum: "$totalPrice" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $ne: "cancelled" } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.name" },
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
      ]),
      Product.find({ isActive: true, stock: { $lte: lowStockLimit } })
        .select("name stock")
        .sort({ stock: 1 })
        .limit(10),
    ]);

    // every status is shown, even when its count is 0
    const ordersByStatus = {};
    ALL_STATUSES.forEach((status) => (ordersByStatus[status] = 0));
    statusCounts.forEach((row) => (ordersByStatus[row._id] = row.count));
    const totalOrders = Object.values(ordersByStatus).reduce((a, b) => a + b, 0);

    // last 7 days, a day with no sale is shown with 0
    const dailyMap = {};
    dailyAgg.forEach((row) => (dailyMap[row._id] = row));
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const day = dhakaDay(new Date(Date.now() - i * DAY));
      last7Days.push({
        date: day,
        revenue: dailyMap[day] ? dailyMap[day].revenue : 0,
        orders: dailyMap[day] ? dailyMap[day].orders : 0,
      });
    }

    res.status(200).json({
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        ordersByStatus,
        totalRevenue: revenueAgg.length ? revenueAgg[0].revenue : 0,
        paidOrders: revenueAgg.length ? revenueAgg[0].orders : 0,
        last7Days,
        topProducts,
        lowStockLimit,
        lowStockProducts,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "server error", error: error.message });
  }
};

module.exports = { getStats };