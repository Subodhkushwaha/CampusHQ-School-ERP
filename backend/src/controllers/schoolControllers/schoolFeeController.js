const mongoose = require('mongoose');

const getStudentBalance = async (req, res) => {
  try {
    const Student = mongoose.model('Student');
    const FeeStructure = mongoose.model('FeeStructure');
    const FeePayment = mongoose.model('FeePayment');
    const studentId = req.params.studentId || req.admin?.studentRef;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required.',
      });
    }

    const student = await Student.findOne({ _id: studentId, removed: false });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const studentClassId = student.schoolClass?._id || student.schoolClass;

    // Find class-wise and student-specific fee structures
    const feeStructures = await FeeStructure.find({
      $or: [
        { student: studentId },
        { schoolClass: studentClassId },
        { schoolClass: null, student: null },
      ],
      removed: false,
    });

    // Find verified payments made by this student (exclude Refunded & Failed)
    const payments = await FeePayment.find({
      student: studentId,
      removed: false,
      status: { $in: ['Paid', 'Partial'] },
    }).sort({ paymentDate: -1 });

    const totalFees = feeStructures.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalConcessions = feeStructures.reduce((acc, curr) => acc + (curr.concessionAmount || 0), 0) +
      payments.reduce((acc, curr) => acc + (curr.concessionApplied || 0), 0);
    const totalPaid = payments.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
    const netFees = Math.max(0, totalFees - totalConcessions);
    const balance = Math.max(0, netFees - totalPaid);

    return res.status(200).json({
      success: true,
      result: {
        student,
        totalFees,
        totalConcessions,
        netFees,
        totalPaid,
        balance,
        feeStructures,
        payments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDefaulters = async (req, res) => {
  try {
    const Student = mongoose.model('Student');
    const FeeStructure = mongoose.model('FeeStructure');
    const FeePayment = mongoose.model('FeePayment');

    const students = await Student.find({ removed: false, status: 'active' });
    const allStructures = await FeeStructure.find({ removed: false });
    const allPayments = await FeePayment.find({
      removed: false,
      status: { $in: ['Paid', 'Partial'] },
    });

    const defaulters = [];
    for (const student of students) {
      const studentClassId = student.schoolClass?._id?.toString() || student.schoolClass?.toString();
      const studentFees = allStructures
        .filter((s) => {
          const sClassId = s.schoolClass?._id?.toString() || s.schoolClass?.toString();
          const sStudentId = s.student?._id?.toString() || s.student?.toString();
          if (sStudentId) return sStudentId === student._id.toString();
          return !sClassId || sClassId === studentClassId;
        })
        .reduce((sum, s) => sum + (s.amount || 0) - (s.concessionAmount || 0), 0);

      const studentPaid = allPayments
        .filter((p) => (p.student?._id?.toString() || p.student?.toString()) === student._id.toString())
        .reduce((sum, p) => sum + (p.amountPaid || 0) + (p.concessionApplied || 0), 0);

      const balance = Math.max(0, studentFees - studentPaid);
      if (balance > 0) {
        defaulters.push({
          student,
          totalFees: Math.max(0, studentFees),
          totalPaid: studentPaid,
          balance,
        });
      }
    }

    return res.status(200).json({
      success: true,
      result: defaulters,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const recordFeePayment = async (req, res) => {
  try {
    const FeePayment = mongoose.model('FeePayment');
    const {
      student,
      feeStructure,
      amountPaid,
      paymentMethod,
      transactionReference,
      concessionApplied,
      status = 'Paid',
      remarks,
    } = req.body;

    if (!student || !feeStructure || amountPaid === undefined || amountPaid === null) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields: student, feeStructure, or amountPaid.',
      });
    }

    const count = await FeePayment.countDocuments();
    const receiptNumber = `RCP-2026-${String(count + 1).padStart(4, '0')}`;

    const newPayment = await new FeePayment({
      receiptNumber,
      student,
      feeStructure,
      amountPaid: Number(amountPaid),
      concessionApplied: Number(concessionApplied) || 0,
      paymentMethod: paymentMethod || 'Online Portal',
      transactionReference: transactionReference || `TXN-${Date.now().toString().slice(-8)}`,
      remarks,
      collectedBy: req.admin?._id,
      status: status || 'Paid',
    }).save();

    return res.status(200).json({
      success: true,
      message: 'Payment recorded successfully.',
      result: newPayment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const refundFeePayment = async (req, res) => {
  try {
    const FeePayment = mongoose.model('FeePayment');
    const { id } = req.params;
    const { refundReason } = req.body;

    const payment = await FeePayment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Fee payment not found.' });
    }

    if (payment.status === 'Refunded') {
      return res.status(400).json({ success: false, message: 'Payment has already been refunded.' });
    }

    payment.status = 'Refunded';
    payment.refundDate = new Date();
    payment.refundReason = refundReason || 'Requested refund approved by Accounts.';
    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Payment successfully refunded.',
      result: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCollectionReport = async (req, res) => {
  try {
    const FeePayment = mongoose.model('FeePayment');
    const { startDate, endDate, schoolClass } = req.query;

    const query = { removed: false, status: { $in: ['Paid', 'Partial'] } };
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    let payments = await FeePayment.find(query).populate('student feeStructure');

    if (schoolClass) {
      payments = payments.filter((p) => {
        const sClass = p.student?.schoolClass?._id?.toString() || p.student?.schoolClass?.toString();
        return sClass === schoolClass;
      });
    }

    const totalCollected = payments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
    const totalConcessions = payments.reduce((acc, p) => acc + (p.concessionApplied || 0), 0);

    const methodBreakdown = {};
    payments.forEach((p) => {
      const m = p.paymentMethod || 'Other';
      methodBreakdown[m] = (methodBreakdown[m] || 0) + (p.amountPaid || 0);
    });

    return res.status(200).json({
      success: true,
      result: {
        totalCollected,
        totalConcessions,
        transactionCount: payments.length,
        methodBreakdown,
        payments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getStudentBalance,
  getDefaulters,
  recordFeePayment,
  refundFeePayment,
  getCollectionReport,
};
