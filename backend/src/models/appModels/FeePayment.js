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
  receiptNumber: {
    type: String,
    required: true,
    trim: true,
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'Student',
    required: true,
    autopopulate: true,
  },
  feeStructure: {
    type: mongoose.Schema.ObjectId,
    ref: 'FeeStructure',
    required: true,
    autopopulate: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Credit Card', 'Bank Transfer', 'Online Portal', 'Cheque'],
    default: 'Online Portal',
  },
  transactionReference: {
    type: String,
    trim: true,
  },
  concessionApplied: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Paid', 'Partial', 'Refunded', 'Failed'],
    default: 'Paid',
  },
  refundReason: {
    type: String,
  },
  refundDate: {
    type: Date,
  },
  remarks: {
    type: String,
  },
  collectedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
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

module.exports = mongoose.model('FeePayment', schema);
