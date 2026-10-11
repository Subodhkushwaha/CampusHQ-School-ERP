const mongoose = require('mongoose');
const crypto = require('crypto');

const getStudentBalance = async (req, res) => {
  try {
    const Student = mongoose.model('Student');
    const FeeStructure = mongoose.model('FeeStructure');
    const FeePayment = mongoose.model('FeePayment');
    const userRole = req.admin?.role;

    // IDOR protection: students and parents may only query their own / linked record
    if (userRole === 'student') {
      const allowedId = req.admin?.studentRef?.toString();
      if (req.params.studentId && req.params.studentId !== allowedId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only authorized to view your own balance records.',
        });
      }
    } else if (userRole === 'parent') {
      const allowedId = req.admin?.parentStudentRef?.toString();
      if (req.params.studentId && req.params.studentId !== allowedId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only authorized to view your linked student balance records.',
        });
      }
    }

    const studentId = req.params.studentId || req.admin?.studentRef || req.admin?.parentStudentRef;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Student ID format.',
      });
    }

    const student = await Student.findOne({ _id: studentId, removed: false }).populate(
      'schoolClass section'
    );
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
    const totalConcessions =
      feeStructures.reduce((acc, curr) => acc + (curr.concessionAmount || 0), 0) +
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

    const students = await Student.find({ removed: false, status: 'active' }).populate(
      'schoolClass section'
    );
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
    const FeeStructure = mongoose.model('FeeStructure');
    const Student = mongoose.model('Student');

    const {
      student,
      feeStructure,
      amountPaid,
      paymentMethod,
      transactionReference,
      concessionApplied,
      remarks,
    } = req.body;

    if (!student || !feeStructure || amountPaid === undefined || amountPaid === null) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields: student, feeStructure, and amountPaid.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(student) ||
      !mongoose.Types.ObjectId.isValid(feeStructure)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ObjectId format for student or feeStructure.',
      });
    }

    const numAmount = Number(amountPaid);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Payment amount must be a positive number greater than zero.',
      });
    }

    // Verify student and feeStructure exist
    const [existingStudent, existingFeeStructure] = await Promise.all([
      Student.findOne({ _id: student, removed: false }),
      FeeStructure.findOne({ _id: feeStructure, removed: false }),
    ]);

    if (!existingStudent) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }
    if (!existingFeeStructure) {
      return res.status(404).json({ success: false, message: 'Fee structure not found.' });
    }

    const validConcession = Math.max(0, Number(concessionApplied) || 0);

    // Server-enforced payment status: prevent manipulation
    const expectedFeeAmount = existingFeeStructure.amount || 0;
    const isFullSettlement = numAmount + validConcession >= expectedFeeAmount;
    const calculatedStatus = isFullSettlement ? 'Paid' : 'Partial';

    // Generate collision-resistant unique receipt number
    const count = await FeePayment.countDocuments();
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const receiptNumber = `RCP-2026-${String(count + 1).padStart(4, '0')}-${randomSuffix}`;

    const newPayment = await new FeePayment({
      receiptNumber,
      student,
      feeStructure,
      amountPaid: numAmount,
      concessionApplied: validConcession,
      paymentMethod: paymentMethod || 'Cash',
      transactionReference:
        transactionReference || `TXN-${Date.now().toString().slice(-6)}-${randomSuffix}`,
      remarks: remarks || '',
      collectedBy: req.admin?._id,
      status: calculatedStatus,
      paymentDate: new Date(),
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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID format.' });
    }

    const payment = await FeePayment.findOne({ _id: id, removed: false });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Fee payment not found.' });
    }

    if (payment.status === 'Refunded') {
      return res.status(400).json({ success: false, message: 'Payment has already been refunded.' });
    }

    payment.status = 'Refunded';
    payment.refundDate = new Date();
    payment.refundReason = refundReason || 'Refund authorized by Accounts.';
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

    if (schoolClass && !mongoose.Types.ObjectId.isValid(schoolClass)) {
      return res.status(400).json({ success: false, message: 'Invalid schoolClass ID format.' });
    }

    const query = { removed: false, status: { $in: ['Paid', 'Partial'] } };
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) {
        const sDate = new Date(startDate);
        if (isNaN(sDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid startDate format.' });
        query.paymentDate.$gte = sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        if (isNaN(eDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid endDate format.' });
        query.paymentDate.$lte = eDate;
      }
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
