const express = require('express');
const mongoose = require('mongoose');
const { catchErrors } = require('@/handlers/errorHandlers');
const { permit } = require('@/middlewares/rbacMiddleware');
const { singleStorageUpload } = require('@/middlewares/uploadMiddleware');

const schoolStatsController = require('@/controllers/schoolControllers/schoolStatsController');
const schoolAttendanceController = require('@/controllers/schoolControllers/schoolAttendanceController');
const schoolExamController = require('@/controllers/schoolControllers/schoolExamController');
const schoolFeeController = require('@/controllers/schoolControllers/schoolFeeController');
const schoolNoticeController = require('@/controllers/schoolControllers/schoolNoticeController');
const schoolTeacherController = require('@/controllers/schoolControllers/schoolTeacherController');

const router = express.Router();

// School Analytics & Stats
router.route('/school/stats').get(catchErrors(schoolStatsController.getSchoolStats));

// Student Photo Upload
router.route('/student/upload-photo/:id').post(
  permit('admin', 'principal'),
  singleStorageUpload({ entity: 'student', fieldName: 'photo', fileType: 'image' }),
  catchErrors(async (req, res) => {
    const Student = mongoose.model('Student');
    const { id } = req.params;
    const photoPath = req.upload?.filePath || req.body.photo;

    if (!photoPath) {
      return res.status(400).json({ success: false, message: 'No photo uploaded.' });
    }

    const student = await Student.findByIdAndUpdate(
      id,
      { photo: photoPath },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Student photograph updated successfully.',
      result: student,
    });
  })
);

router.route('/student/upload-photo').post(
  permit('admin', 'principal'),
  singleStorageUpload({ entity: 'student', fieldName: 'photo', fileType: 'image' }),
  catchErrors(async (req, res) => {
    const photoPath = req.upload?.filePath || req.body.photo;
    return res.status(200).json({
      success: true,
      message: 'Photograph uploaded successfully.',
      result: { photo: photoPath },
    });
  })
);

// Attendance endpoints
router
  .route('/attendance/bulk-mark')
  .post(permit('admin', 'principal', 'teacher'), catchErrors(schoolAttendanceController.bulkMarkAttendance));

router
  .route('/attendance/student/:studentId?')
  .get(catchErrors(schoolAttendanceController.getStudentAttendance));

router
  .route('/attendance/class-report')
  .get(catchErrors(schoolAttendanceController.getClassAttendanceReport));

// Exam & Marks endpoints
router
  .route('/examresult/bulk-save')
  .post(permit('admin', 'principal', 'teacher'), catchErrors(schoolExamController.bulkSaveMarks));

router
  .route('/examresult/report-card/:studentId?')
  .get(catchErrors(schoolExamController.getStudentReportCard));

// Fees endpoints
router
  .route('/feepayment/student-balance/:studentId?')
  .get(catchErrors(schoolFeeController.getStudentBalance));

router
  .route('/feepayment/defaulters')
  .get(permit('admin', 'principal', 'accountant'), catchErrors(schoolFeeController.getDefaulters));

router
  .route('/feepayment/record')
  .post(permit('admin', 'principal', 'accountant'), catchErrors(schoolFeeController.recordFeePayment));

router
  .route('/feepayment/refund/:id')
  .post(permit('admin', 'principal', 'accountant'), catchErrors(schoolFeeController.refundFeePayment));

router
  .route('/feepayment/collection-report')
  .get(permit('admin', 'principal', 'accountant'), catchErrors(schoolFeeController.getCollectionReport));

// Teacher Workload & Schedule
router
  .route('/teacher/workload/:teacherId?')
  .get(catchErrors(schoolTeacherController.getTeacherWorkload));

// Notices feed
router.route('/notice/feed').get(catchErrors(schoolNoticeController.getNoticeFeed));

// ==========================================
// BULK IMPORT & DATA RECONCILIATION CENTER
// ==========================================
const multer = require('multer');
const schoolImportController = require('@/controllers/schoolControllers/schoolImportController');
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Download blank template with canonical columns and descriptions
router
  .route('/import/template/:type')
  .get(permit('admin', 'principal'), catchErrors(schoolImportController.downloadTemplate));

// Upload & parse spreadsheet into memory
router
  .route('/import/parse')
  .post(
    permit('admin', 'principal'),
    uploadMemory.single('file'),
    catchErrors(schoolImportController.parseSpreadsheet)
  );

// Validate batch without database modification
router
  .route('/import/validate')
  .post(permit('admin', 'principal'), catchErrors(schoolImportController.validateBatch));

// Reconcile relational entities and detect conflicts
router
  .route('/import/reconcile')
  .post(permit('admin', 'principal'), catchErrors(schoolImportController.reconcileBatch));

// Commit imported records & provision user accounts
router
  .route('/import/commit')
  .post(permit('admin', 'principal'), catchErrors(schoolImportController.commitImport));

// Import audit history & reports
router
  .route('/import/jobs')
  .get(permit('admin', 'principal'), catchErrors(schoolImportController.getImportJobs));

router
  .route('/import/job/:jobId')
  .get(permit('admin', 'principal'), catchErrors(schoolImportController.getImportJob));

router
  .route('/import/job/:jobId/export')
  .get(permit('admin', 'principal'), catchErrors(schoolImportController.exportJobReport));

module.exports = router;
