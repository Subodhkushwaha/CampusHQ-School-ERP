const mongoose = require('mongoose');

const getSchoolStats = async (req, res) => {
  try {
    const Student = mongoose.model('Student');
    const Teacher = mongoose.model('Teacher');
    const SchoolClass = mongoose.model('SchoolClass');
    const Section = mongoose.model('Section');
    const Attendance = mongoose.model('Attendance');
    const FeePayment = mongoose.model('FeePayment');
    const FeeStructure = mongoose.model('FeeStructure');
    const Notice = mongoose.model('Notice');
    const Exam = mongoose.model('Exam');

    const userRole = req.admin?.role || 'staff';
    const canViewFinancials = ['owner', 'admin', 'principal', 'accountant'].includes(userRole);

    const promises = [
      Student.countDocuments({ removed: false, status: 'active' }),
      Teacher.countDocuments({ removed: false, status: 'active' }),
      SchoolClass.countDocuments({ removed: false }),
      Section.countDocuments({ removed: false }),
      Notice.find({ removed: false, isPublished: true }).sort({ isPinned: -1, publishDate: -1 }).limit(5),
      Exam.find({ removed: false }).sort({ startDate: 1 }).limit(3),
    ];

    if (canViewFinancials) {
      promises.push(
        FeePayment.find({ removed: false, status: 'Paid' }),
        FeeStructure.find({ removed: false })
      );
    }

    const results = await Promise.all(promises);
    const studentCount = results[0];
    const teacherCount = results[1];
    const classCount = results[2];
    const sectionCount = results[3];
    const recentNotices = results[4];
    const upcomingExams = results[5];

    let totalCollected = null;
    let totalExpected = null;

    if (canViewFinancials) {
      const feePayments = results[6] || [];
      const feeStructures = results[7] || [];
      totalCollected = feePayments.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
      totalExpected = feeStructures.reduce((acc, curr) => acc + (curr.amount || 0) * (studentCount || 1), 0);
    }

    // Calculate today's attendance stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.find({
      removed: false,
      date: { $gte: today, $lt: tomorrow },
    });

    const presentCount = todayAttendance.filter((a) => a.status === 'Present').length;
    const absentCount = todayAttendance.filter((a) => a.status === 'Absent').length;
    const attendanceRate =
      todayAttendance.length > 0 ? Math.round((presentCount / todayAttendance.length) * 100) : 0;

    const statsData = {
      totalStudents: studentCount,
      totalTeachers: teacherCount,
      totalClasses: classCount,
      totalSections: sectionCount,
      attendanceToday: {
        marked: todayAttendance.length,
        present: presentCount,
        absent: absentCount,
        rate: attendanceRate,
      },
      recentNotices,
      upcomingExams,
    };

    if (canViewFinancials) {
      statsData.totalCollected = totalCollected;
      statsData.totalExpected = totalExpected;
    }

    return res.status(200).json({
      success: true,
      result: statsData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSchoolStats,
};
