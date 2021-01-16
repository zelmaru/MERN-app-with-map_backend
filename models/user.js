const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 5 },
  image: { type: String },
  places: [{ type: mongoose.Types.ObjectId, ref: "Place" }], // were req.
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
