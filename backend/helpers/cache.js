const crypto = require("crypto");
const { redisClient } = require("../configuration/redisConfig");

// this number changes when the catalog changes, so all old cache keys stop matching
const VERSION_KEY = "cache:catalog:version";

// cache is only a speed helper, so if redis is not ready we skip it and the api still works
const redisReady = () => redisClient.isReady;

// make a cache key from the name and the query (same query always gives the same key)
const makeKey = async (name, query) => {
  if (!redisReady()) return null;

  try {
    const version = (await redisClient.get(VERSION_KEY)) || "1";

    // sort the query so ?a=1&b=2 and ?b=2&a=1 use the same key
    const sorted = Object.keys(query || {})
      .sort()
      .map((key) => `${key}=${JSON.stringify(query[key])}`)
      .join("&");

    // hash keeps the key short even when the search text is long
    const hash = crypto.createHash("md5").update(sorted).digest("hex");

    return `cache:${name}:v${version}:${hash}`;
  } catch (error) {
    return null;
  }
};

// read from cache, returns null when nothing is saved
const getCache = async (key) => {
  if (!key || !redisReady()) return null;

  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

// save in cache for some seconds
const setCache = async (key, data, seconds) => {
  if (!key || !redisReady()) return;

  try {
    await redisClient.set(key, JSON.stringify(data), { EX: seconds });
  } catch (error) {
    // ignore, the response is already correct without cache
  }
};

// call this when a product or category changes, all old cache becomes useless at once
const clearCatalogCache = async () => {
  if (!redisReady()) return;

  try {
    await redisClient.incr(VERSION_KEY);
  } catch (error) {
    // ignore
  }
};

module.exports = { makeKey, getCache, setCache, clearCatalogCache };