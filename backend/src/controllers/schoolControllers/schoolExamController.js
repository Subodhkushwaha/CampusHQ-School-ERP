const mongoose = require('mongoose');

const bulkSaveMarks = async (req, res) => {
  try {
    const ExamResult = mongoose.model('ExamResult');
    const { exam, schoolClass, section, subject, records } = req.body;

    if (!exam || !schoolClass || !subject || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: exam, schoolClass, subject, records.',
      });
    }

    // Role verification: If teacher, verify assignment to subject
    if (req.admin?.role === 'teacher') {
      const Teacher = mongoose.model('Teacher');
      const teacher = await Teacher.findById(req.admin.teacherRef || req.admin._id);
      const isAssigned = teacher && (
        teacher.assignedSubjects?.some((s) => s.toString() === subject.toString()) ||
        teacher.assignedClasses?.some((c) => c.toString() === schoolClass.toString())
      );
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not assigned to instruct this subject.',
        });
      }
    }

    const saved = [];
    for (const item of records) {
      if (!item.student) continue;

      const maxMarks = Number(item.maxMarks) || 100;
      let marksObtained = Number(item.marksObtained) || 0;

      // Validate bounds
      if (marksObtained < 0 || marksObtained > maxMarks) {
        return res.status(400).json({
          success: false,
          message: `Validation Error: Marks obtained (${marksObtained}) cannot exceed maximum marks (${maxMarks}) or be negative.`,
        });
      }

      let grade = 'F';
      const isAbsent = Boolean(item.isAbsent);

      if (isAbsent) {
        marksObtained = 0;
        grade = 'AB';
      } else {
        const percent = (marksObtained / maxMarks) * 100;
        if (percent >= 90) grade = 'A+';
        else if (percent >= 80) grade = 'A';
        else if (percent >= 70) grade = 'B';
        else if (percent >= 60) grade = 'C';
        else if (percent >= 50) grade = 'D';
      }

      const updated = await ExamResult.findOneAndUpdate(
        {
          exam,
          student: item.student,
          subject,
        },
        {
          exam,
          student: item.student,
          subject,
          schoolClass,
          section: section || undefined,
          marksObtained,
          maxMarks,
          grade: item.grade || grade,
          isAbsent: isAbsent,
          remarks: item.remarks || '',
          teacher: req.admin?.teacherRef || req.admin?._id,
          isPublished: true,
          removed: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      saved.push(updated);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully saved marks for ${saved.length} students.`,
      result: saved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getStudentReportCard = async (req, res) => {
  try {
    const ExamResult = mongoose.model('ExamResult');
    const Student = mongoose.model('Student');
    const studentId = req.params.studentId || req.admin?.studentRef;
    const { examId } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required.',
      });
    }

    const student = await Student.findOne({ _id: studentId, removed: false });
    const query = { student: studentId, removed: false, isPublished: true };
    if (examId) query.exam = examId;

    const results = await ExamResult.find(query).populate('subject exam');

    let totalObtained = 0;
    let totalMax = 0;
    results.forEach((r) => {
      totalObtained += r.marksObtained;
      totalMax += r.maxMarks;
    });

    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
    let overallGrade = 'F';
    if (percentage >= 90) overallGrade = 'A+';
    else if (percentage >= 80) overallGrade = 'A';
    else if (percentage >= 70) overallGrade = 'B';
    else if (percentage >= 60) overallGrade = 'C';
    else if (percentage >= 50) overallGrade = 'D';

    return res.status(200).json({
      success: true,
      result: {
        student,
        totalObtained,
        totalMax,
        percentage,
        overallGrade,
        subjectsCount: results.length,
        results,
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
  bulkSaveMarks,
  getStudentReportCard,
};
