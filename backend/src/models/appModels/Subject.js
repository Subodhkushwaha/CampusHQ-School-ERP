const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  },
  schoolClass: {
    type: mongoose.Schema.ObjectId,
    ref: 'SchoolClass',
    required: true,
    autopopulate: true,
  },
  teacher: {
    type: mongoose.Schema.ObjectId,
    ref: 'Teacher',
    autopopulate: true,
  },
  type: {
    type: String,
    enum: ['Theory', 'Practical', 'Elective'],
    default: 'Theory',
  },
  credits: {
    type: Number,
    default: 3,
  },
  description: {
    type: String,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Subject', schema);
