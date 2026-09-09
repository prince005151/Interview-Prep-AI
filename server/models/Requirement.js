const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema(
  {
    requirementId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    mustHave: {
      type: Boolean,
      required: true,
      default: true,
    },
    niceToHave: {
      type: Boolean,
      required: true,
      default: false,
    },
    weight: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Requirement', requirementSchema);
