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
  surname: {
    type: String,
    required: true,
    trim: true,
  },
  employeeId: {
    type: String,
    trim: true,
    uppercase: true,
    sparse: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  qualification: {
    type: String,
  },
  specialization: {
    type: String,
  },
  assignedClasses: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'SchoolClass',
    },
  ],
  assignedSections: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Section',
    },
  ],
  assignedSubjects: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Subject',
    },
  ],
  photo: {
    type: String,
  },
  joiningDate: {
    type: Date,
    default: Date.now,
  },
  salary: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active',
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

module.exports = mongoose.model('Teacher', schema);
