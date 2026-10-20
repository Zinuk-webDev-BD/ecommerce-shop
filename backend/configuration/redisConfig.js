const { createClient } = require("redis");

// redis client, we will use it for OTP and cache
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.log("Redis error:", err.message));

const redisConfig = async () => {
  await redisClient.connect();
  console.log("Redis connected");
};

module.exports = { redisClient, redisConfig };