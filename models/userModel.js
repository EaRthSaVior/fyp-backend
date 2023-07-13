const mongoose = require("mongoose");
const List = require("./listModel");

const favoriteShema = new mongoose.Schema({
  list_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "List",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const recentSchema = new mongoose.Schema({
  list_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "List",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "30",
  },
});


const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Please add the user name"],
    },
    email: {
      type: String,
      required: [true, "Please add the user email address"],
      unique: [true, "Email address already taken"],
    },
    password: {
      type: String,
      required: [true, "Please add the user password"],
    },
    recent : [recentSchema],
    favorites: [favoriteShema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);