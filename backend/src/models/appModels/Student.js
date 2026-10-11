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
  admissionNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  studentId: {
    type: String,
    trim: true,
  },
  academicYear: {
    type: String,
    default: '2026-2027',
  },
  rollNumber: {
    type: String,
    trim: true,
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
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  dob: {
    type: Date,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  guardianName: {
    type: String,
    trim: true,
  },
  guardianRelation: {
    type: String,
    default: 'Parent',
  },
  guardianPhone: {
    type: String,
    trim: true,
  },
  guardianEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
  },
  bloodGroup: {
    type: String,
  },
  emergencyContact: {
    type: String,
  },
  medicalNotes: {
    type: String,
  },
  nationality: {
    type: String,
    default: 'Citizen',
  },
  photo: {
    type: String,
  },
  admissionDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'suspended'],
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

module.exports = mongoose.model('Student', schema);
