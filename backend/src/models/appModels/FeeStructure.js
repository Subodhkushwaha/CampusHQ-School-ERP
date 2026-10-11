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
  schoolClass: {
    type: mongoose.Schema.ObjectId,
    ref: 'SchoolClass',
    autopopulate: true,
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'Student',
    autopopulate: true,
  },
  installmentNumber: {
    type: Number,
    default: 1,
  },
  totalInstallments: {
    type: Number,
    default: 1,
  },
  concessionAmount: {
    type: Number,
    default: 0,
  },
  academicYear: {
    type: String,
    default: '2026-2027',
  },
  amount: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
  },
  feeType: {
    type: String,
    enum: ['Tuition', 'Admission', 'Exam', 'Transport', 'Library', 'Activity', 'Other'],
    default: 'Tuition',
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

module.exports = mongoose.model('FeeStructure', schema);
