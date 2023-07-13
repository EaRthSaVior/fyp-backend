const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const validateToken = asyncHandler(async (req, res, next) => {
  let token;
  let authHeader = req.headers.Authorization || req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const { id, email } = decoded.user;
      req.user = decoded.user;

      const user = await User.findById(id);
      if (!user || user.email !== email) {
        res.status(401);
        throw new Error("User is not authorized or token is invalid");
      }

      next();
    } catch (err) {
      res.status(401);
      throw new Error("User is not authorized or token is invalid");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("User is not authorized or token is missing");
  }
});

module.exports = validateToken;
