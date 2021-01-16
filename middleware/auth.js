const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error.js");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1]; // get the token = the 2nd element (Authorization: "Bearer TOKEN")
    if (!token) {
      throw new Error("Authentification failed!");
    }
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    return next(new HttpError("Authentication failed!", 403));
  }
};
