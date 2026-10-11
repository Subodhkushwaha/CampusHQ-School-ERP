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
  academicYear: {
    type: String,
    default: '2026-2027',
  },
  schoolClass: {
    type: mongoose.Schema.ObjectId,
    ref: 'SchoolClass',
    autopopulate: true,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  isPublished: {
    type: Boolean,
    default: false,
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

module.exports = mongoose.model('Exam', schema);
