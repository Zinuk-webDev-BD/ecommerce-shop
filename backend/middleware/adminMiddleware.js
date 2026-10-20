// only allow admin users (must run after authMiddleware)
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "admin access only" });
  }
  next();
};

module.exports = adminMiddleware;