const mongoose = require('mongoose');

// Define the schema for the Distractor subdocument
const distractorSchema = new mongoose.Schema({
  distractor: {
    type: String
  }
});

// Define the schema for the Question subdocument
const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, "Please add the question"],
  },

  answer: {
    type: String,
    required: [true, "Please add the answer"],
  },
  distractors: [distractorSchema],
});
// Define the schema for the List subdocument
const listSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  title: {
    type: String,
    required: [true, "Please add the title"],

  },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  star: { type: Boolean, default: false },
  type: { type: String, required: [true, "Please add the type"] },
  language: { type: String, required: [true, "Please add the langauge"] },
  questions: [questionSchema],
  public: { type: Boolean, default: true },
},
  {
    timestamps: true,
  });

module.exports = mongoose.model('List', listSchema);