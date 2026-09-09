const mongoose = require('mongoose');

const kitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    industry: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    role: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: '',
    },
    requirements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Requirement',
    }],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Kit', kitSchema);
