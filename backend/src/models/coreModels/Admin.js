const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: false,
  },

  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
  },
  name: { type: String, required: true },
  surname: { type: String },
  photo: {
    type: String,
    trim: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    default: 'owner',
    enum: ['owner', 'admin', 'principal', 'teacher', 'accountant', 'receptionist', 'student', 'parent'],
  },
  phone: {
    type: String,
  },
  teacherRef: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
  },
  studentRef: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
  },
  parentStudentRef: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
  },
  parentStudentRefs: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
  ],
});

module.exports = mongoose.model('Admin', adminSchema);
