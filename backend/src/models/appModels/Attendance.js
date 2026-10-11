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
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'Student',
    required: true,
    autopopulate: true,
  },
  schoolClass: {
    type: mongoose.Schema.ObjectId,
    ref: 'SchoolClass',
    required: true,
    autopopulate: true,
  },
  section: {
    type: mongoose.Schema.ObjectId,
    ref: 'Section',
    autopopulate: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Excused'],
    default: 'Present',
  },
  markedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },
  remarks: {
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

schema.index({ student: 1, date: 1 }, { unique: true });
schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Attendance', schema);
