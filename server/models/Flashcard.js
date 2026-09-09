const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema(
  {
    kit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kit',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    front: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    back: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    dueAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Flashcard', flashcardSchema);
