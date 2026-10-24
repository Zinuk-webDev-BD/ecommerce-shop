const cron = require("node-cron");
const Order = require("../models/Order");
const Product = require("../models/Product");

// an online order is cancelled if it is still unpaid after this many minutes
const EXPIRE_MINUTES = Number(process.env.ORDER_EXPIRE_MINUTES) || 30;

// unpaid means the customer never finished the online payment
const UNPAID = ["pending", "failed"];

// find old unpaid online orders, cancel them and give the stock back
const cancelUnpaidOrders = async () => {
  const limit = new Date(Date.now() - EXPIRE_MINUTES * 60 * 1000);

  const oldOrders = await Order.find({
    paymentMethod: "sslcommerz",
    paymentStatus: { $in: UNPAID },
    orderStatus: "pending",
    createdAt: { $lt: limit },
  }).select("_id");

  let cancelled = 0;

  for (const { _id } of oldOrders) {
    // the conditions are checked again inside the update, so an order that was
    // paid or cancelled a moment ago is skipped and stock is never returned twice
    const order = await Order.findOneAndUpdate(
      {
        _id,
        orderStatus: "pending",
        paymentStatus: { $in: UNPAID },
      },
      { $set: { orderStatus: "cancelled" } },
      { new: true }
    );

    if (!order) continue;

    await Promise.all(
      order.items.map((item) =>
        Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        )
      )
    );

    cancelled++;
  }

  return cancelled;
};

// start the job, it runs every 10 minutes (CRON_SCHEDULE in .env can change it)
const startOrderCleanupJob = () => {
  const custom = process.env.CRON_SCHEDULE;
  const schedule = custom && cron.validate(custom) ? custom : "*/10 * * * *";

  cron.schedule(schedule, async () => {
    try {
      const count = await cancelUnpaidOrders();
      if (count > 0) {
        console.log(`Cron: cancelled ${count} unpaid order(s)`);
      }
    } catch (error) {
      console.log("Cron error:", error.message);
    }
  });

  console.log(
    `Cron job started: unpaid online orders older than ${EXPIRE_MINUTES} minutes are cancelled (schedule: ${schedule})`
  );
};

module.exports = { startOrderCleanupJob, cancelUnpaidOrders };