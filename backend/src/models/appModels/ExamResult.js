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
  exam: {
    type: mongoose.Schema.ObjectId,
    ref: 'Exam',
    required: true,
    autopopulate: true,
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'Student',
    required: true,
    autopopulate: true,
  },
  subject: {
    type: mongoose.Schema.ObjectId,
    ref: 'Subject',
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
  marksObtained: {
    type: Number,
    required: true,
    default: 0,
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 100,
  },
  grade: {
    type: String,
    trim: true,
  },
  isAbsent: {
    type: Boolean,
    default: false,
  },
  remarks: {
    type: String,
  },
  teacher: {
    type: mongoose.Schema.ObjectId,
    ref: 'Teacher',
  },
  isPublished: {
    type: Boolean,
    default: true,
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

schema.index({ exam: 1, student: 1, subject: 1 }, { unique: true });
schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('ExamResult', schema);
