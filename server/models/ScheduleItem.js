const mongoose = require('mongoose');

const scheduleItemSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 180,
      validate: {
        validator: Number.isInteger,
        message: 'durationMinutes must be an integer',
      },
    },
    type: {
      type: String,
      enum: ['review', 'practice', 'mock', 'deep-dive'],
      default: 'practice',
    },
    mustDo: {
      type: Boolean,
      default: true,
    },
    niceToDo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ScheduleItem', scheduleItemSchema);
