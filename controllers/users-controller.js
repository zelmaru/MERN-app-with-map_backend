const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error.js");
const User = require("../models/user");

const getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find users.", 500)
    );
  }
  if (!users || users.length === 0) {
    return next(new HttpError("No users found", 404));
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const registerUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        "Invalid input: username must be included, e-mail must be a valid e-mail address, password must be at least 5 characters long",
        422
      )
    );
  }
  const { username, email, password } = req.body;

  let existingEmail;
  let existingUsername;
  try {
    existingEmail = await User.findOne({ email: email });
    existingUsername = await User.findOne({ username: username });
  } catch (err) {
    return next(
      new HttpError("Registration failed, please try again later.", 500)
    );
  }

  if (existingEmail) {
    return next(
      new HttpError(
        "This email is already in use. You can log in instead.",
        422
      )
    );
  }

  if (existingUsername) {
    return next(
      new HttpError("This username is already in use. Choose another one.", 422)
    );
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(
      new HttpError("Registration failed, please try again later.", 500)
    );
  }

  const newUser = new User({
    username,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  try {
    await newUser.save();
  } catch (err) {
    return next(
      new HttpError("Registration failed, please try again later.", 500)
    );
  }

  let token;
  try {
    token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("Registration failed, please try again later.", 500)
    );
  }

  res.status(201).json({
    userId: newUser.id,
    email: newUser.email,
    token: token,
  });
};

const logInUser = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(new HttpError("Login failed, please, try again later.", 500));
  }
  if (!existingUser) {
    return next(
      new HttpError("Invalid e-mail address, could not log in.", 403)
    );
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(
      new HttpError(
        "Could not log in, please check your data and try again",
        500
      )
    );
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid password, could not log in.", 403));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new HttpError("Registration failed, please try again later.", 500)
    );
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

exports.getAllUsers = getAllUsers;
exports.registerUser = registerUser;
exports.logInUser = logInUser;
