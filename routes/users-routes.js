const express = require("express");
const { check } = require("express-validator");

const usersController = require("../controllers/users-controller");
const fileUpload = require("../middleware/file-upload");

const router = express.Router();

router.get("/", usersController.getAllUsers);

router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("username").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 5 }),
  ],
  usersController.registerUser
);

router.post(
  "/login",
  check("email").normalizeEmail(),
  usersController.logInUser
);

module.exports = router;
