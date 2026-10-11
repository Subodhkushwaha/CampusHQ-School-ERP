const mongoose = require('mongoose');

const getTeacherWorkload = async (req, res) => {
  try {
    const Teacher = mongoose.model('Teacher');
    const Timetable = mongoose.model('Timetable');
    const userRole = req.admin?.role;

    // IDOR protection: teachers may only view their own workload; students/parents unauthorized
    if (userRole === 'teacher') {
      const allowedId = req.admin?.teacherRef?.toString() || req.admin?._id?.toString();
      if (req.params.teacherId && req.params.teacherId !== allowedId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only authorized to view your own teaching workload.',
        });
      }
    } else if (['student', 'parent'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Role is not authorized to inspect teacher internal workloads.',
      });
    }

    const teacherId = req.params.teacherId || req.admin?.teacherRef;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID is required.',
      });
    }

    const teacher = await Teacher.findOne({ _id: teacherId, removed: false })
      .populate('assignedClasses assignedSections assignedSubjects');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher record not found.',
      });
    }

    // Find all timetable slots for this teacher
    const timetableSlots = await Timetable.find({
      teacher: teacherId,
      removed: false,
    }).populate('schoolClass section subject');

    const periodsPerWeek = timetableSlots.length;
    const estimatedTeachingHours = (periodsPerWeek * 50) / 60; // 50 mins per period

    return res.status(200).json({
      success: true,
      result: {
        teacher,
        periodsPerWeek,
        estimatedTeachingHours: Number(estimatedTeachingHours.toFixed(1)),
        assignedClassesCount: teacher.assignedClasses?.length || 0,
        assignedSubjectsCount: teacher.assignedSubjects?.length || 0,
        timetableSlots,
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
  getTeacherWorkload,
};
