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

const MAX_SECTION_CAPACITY = 120;

// Enforce 120-student class-section capacity on save
schema.pre('save', async function (next) {
  if (this.removed || this.status === 'inactive') {
    return next();
  }
  if (this.schoolClass && this.section) {
    if (
      this.isNew ||
      this.isModified('schoolClass') ||
      this.isModified('section') ||
      this.isModified('removed') ||
      this.isModified('status')
    ) {
      const existingCount = await this.constructor.countDocuments({
        schoolClass: this.schoolClass,
        section: this.section,
        removed: false,
        status: { $ne: 'inactive' },
        _id: { $ne: this._id },
      });
      if (existingCount >= MAX_SECTION_CAPACITY) {
        const err = new Error(
          `Class-section capacity limit of ${MAX_SECTION_CAPACITY} students exceeded. Currently enrolled: ${existingCount} active students.`
        );
        err.name = 'ValidationError';
        return next(err);
      }
    }
  }
  next();
});

// Enforce 120-student class-section capacity on findOneAndUpdate
schema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const targetClass = update.schoolClass || (update.$set && update.$set.schoolClass);
  const targetSection = update.section || (update.$set && update.$set.section);
  const targetRemoved = update.removed !== undefined ? update.removed : (update.$set && update.$set.removed);
  const targetStatus = update.status || (update.$set && update.$set.status);

  if (targetRemoved === true || targetStatus === 'inactive') {
    return next();
  }

  if (targetClass || targetSection) {
    const docToUpdate = await this.model.findOne(this.getQuery());
    if (!docToUpdate) return next();

    const effectiveClass = targetClass || docToUpdate.schoolClass;
    const effectiveSection = targetSection || docToUpdate.section;

    if (
      docToUpdate.schoolClass?.toString() === effectiveClass?.toString() &&
      docToUpdate.section?.toString() === effectiveSection?.toString() &&
      !docToUpdate.removed &&
      docToUpdate.status !== 'inactive'
    ) {
      return next();
    }

    if (effectiveClass && effectiveSection) {
      const count = await this.model.countDocuments({
        schoolClass: effectiveClass,
        section: effectiveSection,
        removed: false,
        status: { $ne: 'inactive' },
        _id: { $ne: docToUpdate._id },
      });
      if (count >= MAX_SECTION_CAPACITY) {
        const err = new Error(
          `Class-section capacity limit of ${MAX_SECTION_CAPACITY} students exceeded. Currently enrolled: ${count} active students.`
        );
        err.name = 'ValidationError';
        return next(err);
      }
    }
  }
  next();
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Student', schema);
