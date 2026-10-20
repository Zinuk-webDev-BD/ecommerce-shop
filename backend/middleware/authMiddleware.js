const jwt = require("jsonwebtoken");
const User = require("../models/User");

//token verify korar jonno middleware, jekhane auth header theke token ber kora hocche, then token verify kora hocche, jodi valid hoy tahole user er id ber kora hocche and database theke user khuje ber kora hocche. jodi user na thake tahole 401 status code pathano hocche. jodi thake tahole req.user e user set kora hocche and next() call kora hocche, jate porer middleware or route handler e access kora jay.
const authMiddleware = async (req, res, next) => {
  try {
    // auth header theke token ber kora hocche, jodi token na thake tahole 401 status code pathano hocche
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "token is required" });
    }

    const token = authHeader.split(" ")[1];

    // token verify kora hocche, jodi invalid hoy tahole 401 status code pathano hocche. jodi valid hoy tahole decoded token theke user er id ber kora hocche.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //token theke user er id ber kore, database theke user khuje ber kora hocche. jodi user na thake tahole 401 status code pathano hocche. jodi thake tahole req.user e user set kora hocche and next() call kora hocche, jate porer middleware or route handler e access kora jay.
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "user not found" });
    }

    // jsonwebtoken er decoded token theke user er id ber kore, database theke user khuje ber kora hocche. jodi user na thake tahole 401 status code pathano hocche. jodi thake tahole req.user e user set kora hocche and next() call kora hocche, jate porer middleware or route handler e access kora jay.
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "invalid or expired token" });
  }
};

module.exports = authMiddleware;