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
  jobId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  importType: {
    type: String,
    required: true,
    enum: [
      'students',
      'teachers',
      'parents',
      'classes_sections',
      'subjects',
      'assignments',
      'enrollments',
      'fee_structures',
    ],
  },
  fileName: {
    type: String,
    trim: true,
  },
  fileSize: {
    type: Number,
  },
  totalRows: {
    type: Number,
    default: 0,
  },
  validRows: {
    type: Number,
    default: 0,
  },
  invalidRows: {
    type: Number,
    default: 0,
  },
  createdCount: {
    type: Number,
    default: 0,
  },
  updatedCount: {
    type: Number,
    default: 0,
  },
  skippedCount: {
    type: Number,
    default: 0,
  },
  failedCount: {
    type: Number,
    default: 0,
  },
  accountsProvisioned: {
    type: Number,
    default: 0,
  },
  reconciledCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'validated', 'completed', 'partial', 'failed'],
    default: 'pending',
  },
  summary: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  errors: [
    {
      row: Number,
      field: String,
      value: mongoose.Schema.Types.Mixed,
      message: String,
      type: {
        type: String,
        default: 'error',
      },
    },
  ],
  reconciliationNotes: [
    {
      row: Number,
      entity: String,
      status: String,
      proposed: String,
      note: String,
    },
  ],
  performedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
  },
  performedByName: {
    type: String,
    trim: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
}, { suppressReservedKeysWarning: true });

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('ImportJob', schema);
