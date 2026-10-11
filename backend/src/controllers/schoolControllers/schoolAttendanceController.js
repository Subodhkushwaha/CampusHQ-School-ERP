const mongoose = require('mongoose');

const ALLOWED_STATUSES = ['Present', 'Absent', 'Late', 'Excused', 'HalfDay'];

const bulkMarkAttendance = async (req, res) => {
  try {
    const Attendance = mongoose.model('Attendance');
    const Student = mongoose.model('Student');
    const { schoolClass, section, date, records } = req.body;

    if (!schoolClass || !section || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid required fields: schoolClass, section, date, and non-empty records array.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(schoolClass) ||
      !mongoose.Types.ObjectId.isValid(section)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schoolClass or section ID format.',
      });
    }

    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format provided for attendance.',
      });
    }

    attendanceDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (attendanceDate > today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot record attendance for future dates.',
      });
    }

    // Role verification: If teacher, verify assignment to class/section
    if (req.admin?.role === 'teacher') {
      const Teacher = mongoose.model('Teacher');
      const teacher = await Teacher.findById(req.admin.teacherRef || req.admin._id);
      const isAssigned =
        teacher &&
        (teacher.assignedClasses?.some((c) => c.toString() === schoolClass.toString()) ||
          teacher.assignedSections?.some((s) => s.toString() === section.toString()));
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not assigned to instruct this class or section.',
        });
      }
    }

    // Extract and validate student IDs
    const studentIds = records.map((r) => r.student).filter(Boolean);
    for (const sId of studentIds) {
      if (!mongoose.Types.ObjectId.isValid(sId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid student ID format: ${sId}`,
        });
      }
    }

    // Verify student membership in the specified class and section
    const validStudents = await Student.find({
      _id: { $in: studentIds },
      schoolClass: schoolClass,
      section: section,
      removed: false,
    }).select('_id');

    const validStudentSet = new Set(validStudents.map((s) => s._id.toString()));
    const invalidStudents = studentIds.filter((id) => !validStudentSet.has(id.toString()));

    if (invalidStudents.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: ${invalidStudents.length} student(s) do not belong to the specified class and section.`,
        invalidStudentIds: invalidStudents,
      });
    }

    const savedRecords = [];
    for (const item of records) {
      if (!item.student) continue;

      const status = item.status || 'Present';
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Validation Error: Invalid attendance status '${status}'. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}.`,
        });
      }

      const updated = await Attendance.findOneAndUpdate(
        {
          student: item.student,
          date: attendanceDate,
        },
        {
          student: item.student,
          schoolClass,
          section,
          date: attendanceDate,
          status,
          remarks: item.remarks || '',
          markedBy: req.admin?._id,
          removed: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedRecords.push(updated);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully marked attendance for ${savedRecords.length} students.`,
      result: savedRecords,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const Attendance = mongoose.model('Attendance');
    const userRole = req.admin?.role;

    // IDOR protection: students and parents may only query their own / linked record
    if (userRole === 'student') {
      const allowedId = req.admin?.studentRef?.toString();
      if (req.params.studentId && req.params.studentId !== allowedId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only authorized to view your own attendance records.',
        });
      }
    } else if (userRole === 'parent') {
      const allowedId = req.admin?.parentStudentRef?.toString();
      if (req.params.studentId && req.params.studentId !== allowedId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only authorized to view your linked student attendance records.',
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

    const records = await Attendance.find({
      student: studentId,
      removed: false,
    }).sort({ date: -1 });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'Present').length;
    const absentDays = records.filter((r) => r.status === 'Absent').length;
    const lateDays = records.filter((r) => r.status === 'Late').length;
    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return res.status(200).json({
      success: true,
      result: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        attendanceRate: rate,
        records,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getClassAttendanceReport = async (req, res) => {
  try {
    const Attendance = mongoose.model('Attendance');
    const userRole = req.admin?.role;

    // Disallow unauthorized roles
    if (['student', 'parent', 'receptionist'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Role is not authorized to retrieve class attendance reports.',
      });
    }

    const { schoolClass, section, startDate, endDate } = req.query;

    if (schoolClass && !mongoose.Types.ObjectId.isValid(schoolClass)) {
      return res.status(400).json({ success: false, message: 'Invalid schoolClass ID format.' });
    }
    if (section && !mongoose.Types.ObjectId.isValid(section)) {
      return res.status(400).json({ success: false, message: 'Invalid section ID format.' });
    }

    // Teacher isolation: verify teacher is assigned to requested class
    if (userRole === 'teacher') {
      const Teacher = mongoose.model('Teacher');
      const teacher = await Teacher.findById(req.admin.teacherRef || req.admin._id);
      if (!teacher) {
        return res.status(403).json({ success: false, message: 'Teacher profile not found.' });
      }
      if (schoolClass && !teacher.assignedClasses?.some((c) => c.toString() === schoolClass.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not assigned to instruct the requested class.',
        });
      }
    }

    const query = { removed: false };
    if (schoolClass) query.schoolClass = schoolClass;
    if (section) query.section = section;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const sDate = new Date(startDate);
        if (isNaN(sDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid startDate format.' });
        query.date.$gte = sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        if (isNaN(eDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid endDate format.' });
        query.date.$lte = eDate;
      }
    }

    const records = await Attendance.find(query).populate('student', 'firstName lastName admissionNumber rollNumber').sort({ date: -1 });
    return res.status(200).json({
      success: true,
      result: records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  bulkMarkAttendance,
  getStudentAttendance,
  getClassAttendanceReport,
};
