const fs = require("fs");

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error.js");
const getCoordsforAddress = require("../util/location.js");
const Place = require("../models/place.js");
const User = require("../models/user");

const getAllPlaces = async (req, res, next) => {
  let places;

  try {
    places = await Place.find({});
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find places.", 500)
    );
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;

  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find a place.", 500)
    );
  }
  if (!place) {
    return next(new HttpError("There is no place with the provided ID.", 404));
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not find places", 500)
    );
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid input, check your data.", 422));
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsforAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  });

  // check if creator ID exists
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Could not create a new place, please try again.", 500)
    );
  }

  if (!user) {
    return next(
      new HttpError("Could not find a user for the provided ID.", 404)
    );
  }
  // check if creating the place or storing its ID in the User document does not fail
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Creating a new place failed, please try again.", 500)
    );
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlaceById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid input, check your data.", 422));
  }

  const placeId = req.params.pid;
  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsforAddress(address);
  } catch (error) {
    return next(error);
  }

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not update a place.", 500)
    );
  }

  //  only the user who created a place can edit it
  if (place.creator.toString() !== req.userData.userId) {
    return next(
      new HttpError("You do not have permissions to edit this place.", 401)
    );
  }

  place.title = title;
  place.description = description;
  place.address = address;
  place.coordinates = coordinates;

  try {
    await place.save();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not update a place.", 500)
    );
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;

  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Something went wrong, could not delete a place.", 500)
    );
  }

  if (!place) {
    return next(new HttpError("Could not find a place with this ID.", 404));
  }

  //  only the user who created a place can delete it
  if (place.creator.id !== req.userData.userId) {
    return next(
      new HttpError("You do not have permissions to delete this place.", 401)
    );
  }

  // check if deleting the place or removing its ID from the User document does not fail
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    console.log(place);
    return next(
      new HttpError("Something went wrong, could not delete a place.", 500)
    );
  }

  const imgPath = place.image;

  fs.unlink(imgPath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Place successfully deleted." });
};

exports.getAllPlaces = getAllPlaces;
exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlaceById = updatePlaceById;
exports.deletePlaceById = deletePlaceById;
