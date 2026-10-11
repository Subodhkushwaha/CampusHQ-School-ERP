const mongoose = require('mongoose');

const bulkMarkAttendance = async (req, res) => {
  try {
    const Attendance = mongoose.model('Attendance');
    const { schoolClass, section, date, records } = req.body;

    if (!schoolClass || !section || !date || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: schoolClass, section, date, records.',
      });
    }

    // Role verification: If teacher, verify assignment to class/section
    if (req.admin?.role === 'teacher') {
      const Teacher = mongoose.model('Teacher');
      const teacher = await Teacher.findById(req.admin.teacherRef || req.admin._id);
      const isAssigned = teacher && (
        teacher.assignedClasses?.some((c) => c.toString() === schoolClass.toString()) ||
        teacher.assignedSections?.some((s) => s.toString() === section.toString())
      );
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not assigned to instruct this class or section.',
        });
      }
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const savedRecords = [];
    for (const item of records) {
      if (!item.student) continue;

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
          status: item.status || 'Present',
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

    const records = await Attendance.find({
      student: studentId,
      removed: false,
    }).sort({ date: -1 });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'Present').length;
    const absentDays = records.filter((r) => r.status === 'Absent').length;
    const lateDays = records.filter((r) => r.status === 'Late').length;
    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

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
    const { schoolClass, section, startDate, endDate } = req.query;

    const query = { removed: false };
    if (schoolClass) query.schoolClass = schoolClass;
    if (section) query.section = section;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(query).sort({ date: -1 });
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
