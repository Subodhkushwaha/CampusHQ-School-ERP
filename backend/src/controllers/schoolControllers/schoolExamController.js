const mongoose = require('mongoose');

const bulkSaveMarks = async (req, res) => {
  try {
    const ExamResult = mongoose.model('ExamResult');
    const Exam = mongoose.model('Exam');
    const Subject = mongoose.model('Subject');
    const Student = mongoose.model('Student');

    const { exam, schoolClass, section, subject, records } = req.body;

    if (!exam || !schoolClass || !subject || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: exam, schoolClass, subject, and a non-empty records array.',
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(exam) ||
      !mongoose.Types.ObjectId.isValid(schoolClass) ||
      !mongoose.Types.ObjectId.isValid(subject) ||
      (section && !mongoose.Types.ObjectId.isValid(section))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ObjectId format for exam, schoolClass, subject, or section.',
      });
    }

    // Verify exam and subject exist
    const [existingExam, existingSubject] = await Promise.all([
      Exam.findOne({ _id: exam, removed: false }),
      Subject.findOne({ _id: subject, removed: false }),
    ]);

    if (!existingExam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }
    if (!existingSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    // Role verification: If teacher, verify assignment to subject or class
    if (req.admin?.role === 'teacher') {
      const Teacher = mongoose.model('Teacher');
      const teacher = await Teacher.findById(req.admin.teacherRef || req.admin._id);
      const isAssigned =
        teacher &&
        (teacher.assignedSubjects?.some((s) => s.toString() === subject.toString()) ||
          teacher.assignedClasses?.some((c) => c.toString() === schoolClass.toString()));
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not assigned to instruct this subject or class.',
        });
      }
    }

    // Validate student membership in class (and section if provided)
    const studentIds = records.map((r) => r.student).filter(Boolean);
    for (const sId of studentIds) {
      if (!mongoose.Types.ObjectId.isValid(sId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid student ID format: ${sId}`,
        });
      }
    }

    const membershipQuery = {
      _id: { $in: studentIds },
      schoolClass,
      removed: false,
    };
    if (section) membershipQuery.section = section;

    const validStudents = await Student.find(membershipQuery).select('_id');
    const validStudentSet = new Set(validStudents.map((s) => s._id.toString()));
    const invalidStudents = studentIds.filter((id) => !validStudentSet.has(id.toString()));

    if (invalidStudents.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: ${invalidStudents.length} student(s) do not belong to the specified class/section.`,
        invalidStudentIds: invalidStudents,
      });
    }

    const saved = [];
    for (const item of records) {
      if (!item.student) continue;

      const maxMarks = Number(item.maxMarks) || 100;
      let marksObtained = Number(item.marksObtained);

      if (isNaN(marksObtained)) {
        marksObtained = 0;
      }

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
        const percent = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;
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
    const userRole = req.admin?.role;

    // IDOR protection: students and parents may only query their own / linked record
    if (userRole === 'student') {
      const allowedId = req.admin?.studentRef?.toString();
      if (req.params.studentId && req.params.studentId !== allowedId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only authorized to view your own report card.',
        });
      }
    } else if (userRole === 'parent') {
      const allowedId = req.admin?.parentStudentRef?.toString();
      if (req.params.studentId && req.params.studentId !== allowedId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only authorized to view your linked student report card.',
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
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    // Safely extract examId from query parameters
    const examId = req.query?.examId;
    if (examId && !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: 'Invalid exam ID format.' });
    }

    const query = { student: studentId, removed: false, isPublished: true };
    if (examId) query.exam = examId;

    const results = await ExamResult.find(query).populate('subject exam');

    let totalObtained = 0;
    let totalMax = 0;
    results.forEach((r) => {
      totalObtained += Number(r.marksObtained) || 0;
      totalMax += Number(r.maxMarks) || 0;
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
