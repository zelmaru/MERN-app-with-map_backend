const express = require("express");
const { check } = require("express-validator");

const placesControllers = require("../controllers/places-controller");
// const { registerUser } = require("../controllers/users-controller");
const fileUpload = require("../middleware/file-upload");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", placesControllers.getAllPlaces);

router.get("/place/:pid", placesControllers.getPlaceById);

router.get("/user/:uid", placesControllers.getPlacesByUserId);

router.use(auth);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.createPlace
);

router.patch(
  "/:pid",
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.updatePlaceById
);

router.delete("/:pid", placesControllers.deletePlaceById);

module.exports = router;
