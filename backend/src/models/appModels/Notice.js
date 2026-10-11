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
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['Academic', 'Event', 'Examination', 'Holiday', 'Administrative', 'Urgent'],
    default: 'Academic',
  },
  targetAudience: {
    type: String,
    enum: ['All', 'Students', 'Teachers', 'Parents', 'Staff'],
    default: 'All',
  },
  schoolClass: {
    type: mongoose.Schema.ObjectId,
    ref: 'SchoolClass',
    autopopulate: true,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  publishDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  author: {
    type: String,
    default: 'Administration',
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

module.exports = mongoose.model('Notice', schema);
