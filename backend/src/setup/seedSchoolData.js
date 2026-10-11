require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { generate: uniqueId } = require('shortid');
const mongoose = require('mongoose');
const connectDB = require('../connectDB');

async function seedSchool() {
  await connectDB();
  console.log('Seeding School ERP data...');

  const Admin = require('../models/coreModels/Admin');
  const AdminPassword = require('../models/coreModels/AdminPassword');
  const SchoolClass = require('../models/appModels/SchoolClass');
  const Section = require('../models/appModels/Section');
  const Subject = require('../models/appModels/Subject');
  const Teacher = require('../models/appModels/Teacher');
  const Student = require('../models/appModels/Student');
  const Attendance = require('../models/appModels/Attendance');
  const Exam = require('../models/appModels/Exam');
  const ExamResult = require('../models/appModels/ExamResult');
  const FeeStructure = require('../models/appModels/FeeStructure');
  const FeePayment = require('../models/appModels/FeePayment');
  const Notice = require('../models/appModels/Notice');
  const Timetable = require('../models/appModels/Timetable');

  // Helper to create or get Admin user
  async function createRoleUser(email, password, name, surname, role, extraFields = {}) {
    let user = await Admin.findOne({ email });
    if (!user) {
      user = await new Admin({
        email,
        name,
        surname,
        role,
        enabled: true,
        ...extraFields,
      }).save();

      const newPass = new AdminPassword();
      const salt = uniqueId();
      const hash = newPass.generateHash(salt, password);
      await new AdminPassword({
        password: hash,
        emailVerified: true,
        salt,
        user: user._id,
      }).save();
      console.log(`Created user: ${email} (${role})`);
    } else {
      user.role = role;
      Object.assign(user, extraFields);
      await user.save();
    }
    return user;
  }

  // 1. Classes
  let class10 = await SchoolClass.findOne({ name: 'Grade 10' });
  if (!class10) {
    class10 = await new SchoolClass({
      name: 'Grade 10',
      grade: 10,
      description: 'Senior Secondary Grade 10',
      capacity: 40,
    }).save();
    console.log('Created Class: Grade 10');
  }

  let class9 = await SchoolClass.findOne({ name: 'Grade 9' });
  if (!class9) {
    class9 = await new SchoolClass({
      name: 'Grade 9',
      grade: 9,
      description: 'Secondary Grade 9',
      capacity: 35,
    }).save();
    console.log('Created Class: Grade 9');
  }

  // 2. Sections
  let sec10A = await Section.findOne({ name: 'Section A', schoolClass: class10._id });
  if (!sec10A) {
    sec10A = await new Section({
      name: 'Section A',
      schoolClass: class10._id,
      roomNumber: 'Room 301',
      capacity: 35,
    }).save();
    console.log('Created Section 10-A');
  }

  let sec10B = await Section.findOne({ name: 'Section B', schoolClass: class10._id });
  if (!sec10B) {
    sec10B = await new Section({
      name: 'Section B',
      schoolClass: class10._id,
      roomNumber: 'Room 302',
      capacity: 35,
    }).save();
  }

  // 3. Teachers
  let teacherSarah = await Teacher.findOne({ email: 'sarah.jenkins@school.edu' });
  if (!teacherSarah) {
    teacherSarah = await new Teacher({
      name: 'Sarah',
      surname: 'Jenkins',
      email: 'sarah.jenkins@school.edu',
      phone: '+1 555-0192',
      gender: 'Female',
      qualification: 'Ph.D. in Pure Mathematics',
      specialization: 'Advanced Mathematics & Calculus',
      assignedClasses: [class10._id, class9._id],
      assignedSections: [sec10A._id, sec10B._id],
      salary: 5800,
    }).save();
    console.log('Created Teacher Sarah Jenkins');
  }

  let teacherRobert = await Teacher.findOne({ email: 'robert.davis@school.edu' });
  if (!teacherRobert) {
    teacherRobert = await new Teacher({
      name: 'Robert',
      surname: 'Davis',
      email: 'robert.davis@school.edu',
      phone: '+1 555-0144',
      gender: 'Male',
      qualification: 'M.Sc. Physics & Robotics',
      specialization: 'Science & Experimental Physics',
      assignedClasses: [class10._id],
      assignedSections: [sec10A._id],
      salary: 5400,
    }).save();
  }

  // Assign class teacher
  class10.classTeacher = teacherSarah._id;
  await class10.save();

  // 4. Subjects
  let subMath = await Subject.findOne({ code: 'MTH-101' });
  if (!subMath) {
    subMath = await new Subject({
      name: 'Mathematics',
      code: 'MTH-101',
      schoolClass: class10._id,
      teacher: teacherSarah._id,
      type: 'Theory',
      credits: 4,
    }).save();
  }

  let subSci = await Subject.findOne({ code: 'SCI-102' });
  if (!subSci) {
    subSci = await new Subject({
      name: 'Science & Physics',
      code: 'SCI-102',
      schoolClass: class10._id,
      teacher: teacherRobert._id,
      type: 'Theory',
      credits: 4,
    }).save();
  }

  let subCS = await Subject.findOne({ code: 'CS-103' });
  if (!subCS) {
    subCS = await new Subject({
      name: 'Computer Science',
      code: 'CS-103',
      schoolClass: class10._id,
      teacher: teacherSarah._id,
      type: 'Practical',
      credits: 3,
    }).save();
  }

  // 5. Students
  let studentAlex = await Student.findOne({ admissionNumber: 'ADM-2026-001' });
  if (!studentAlex) {
    studentAlex = await new Student({
      name: 'Alex',
      surname: 'Morgan',
      admissionNumber: 'ADM-2026-001',
      rollNumber: '101',
      schoolClass: class10._id,
      section: sec10A._id,
      gender: 'Male',
      dob: new Date('2010-04-12'),
      email: 'student@school.edu',
      phone: '+1 555-7821',
      guardianName: 'David Morgan',
      guardianRelation: 'Father',
      guardianPhone: '+1 555-7820',
      guardianEmail: 'parent@school.edu',
      address: '742 Evergreen Terrace, Springfield',
      bloodGroup: 'O+',
      status: 'active',
    }).save();
    console.log('Created Student Alex Morgan');
  }

  let studentSophia = await Student.findOne({ admissionNumber: 'ADM-2026-002' });
  if (!studentSophia) {
    studentSophia = await new Student({
      name: 'Sophia',
      surname: 'Patel',
      admissionNumber: 'ADM-2026-002',
      rollNumber: '102',
      schoolClass: class10._id,
      section: sec10A._id,
      gender: 'Female',
      dob: new Date('2010-08-25'),
      email: 'sophia.p@school.edu',
      phone: '+1 555-3392',
      guardianName: 'Aarav Patel',
      guardianRelation: 'Father',
      guardianPhone: '+1 555-3390',
      guardianEmail: 'aarav.patel@gmail.com',
      address: '12 Blossom Boulevard',
      bloodGroup: 'A+',
      status: 'active',
    }).save();
  }

  let studentLiam = await Student.findOne({ admissionNumber: 'ADM-2026-003' });
  if (!studentLiam) {
    studentLiam = await new Student({
      name: 'Liam',
      surname: 'Chen',
      admissionNumber: 'ADM-2026-003',
      rollNumber: '103',
      schoolClass: class10._id,
      section: sec10A._id,
      gender: 'Male',
      dob: new Date('2010-11-03'),
      email: 'liam.chen@school.edu',
      phone: '+1 555-4921',
      guardianName: 'Grace Chen',
      guardianRelation: 'Mother',
      guardianPhone: '+1 555-4920',
      guardianEmail: 'grace.chen@gmail.com',
      address: '45 Oak Ridge Drive',
      bloodGroup: 'B+',
      status: 'active',
    }).save();
  }

  // 6. Role User Accounts for Easy Testing
  await createRoleUser('admin@admin.com', 'admin123', 'System', 'Admin', 'owner');
  await createRoleUser('principal@school.edu', 'principal123', 'Dr. Arthur', 'Pendleton', 'principal');
  await createRoleUser('teacher@school.edu', 'teacher123', 'Sarah', 'Jenkins', 'teacher', {
    teacherRef: teacherSarah._id,
  });
  await createRoleUser('accountant@school.edu', 'accountant123', 'Marcus', 'Sterling', 'accountant');
  await createRoleUser('student@school.edu', 'student123', 'Alex', 'Morgan', 'student', {
    studentRef: studentAlex._id,
  });
  await createRoleUser('parent@school.edu', 'parent123', 'David', 'Morgan', 'parent', {
    parentStudentRef: studentAlex._id,
  });
  await createRoleUser('receptionist@school.edu', 'receptionist123', 'Emily', 'Watson', 'receptionist');

  // 7. Attendance Records
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingAtt = await Attendance.findOne({ student: studentAlex._id, date: today });
  if (!existingAtt) {
    await Attendance.insertMany([
      {
        student: studentAlex._id,
        schoolClass: class10._id,
        section: sec10A._id,
        date: today,
        status: 'Present',
        remarks: 'On time',
      },
      {
        student: studentSophia._id,
        schoolClass: class10._id,
        section: sec10A._id,
        date: today,
        status: 'Present',
        remarks: 'On time',
      },
      {
        student: studentLiam._id,
        schoolClass: class10._id,
        section: sec10A._id,
        date: today,
        status: 'Late',
        remarks: 'Arrived 10 mins late',
      },
    ]);
    console.log('Seeded Attendance for today');
  }

  // 8. Exam & Results
  let midTerm = await Exam.findOne({ name: 'Mid-Term Examination 2026' });
  if (!midTerm) {
    midTerm = await new Exam({
      name: 'Mid-Term Examination 2026',
      academicYear: '2026-2027',
      schoolClass: class10._id,
      startDate: new Date('2026-10-15'),
      endDate: new Date('2026-10-25'),
      isPublished: true,
      description: 'Mid-term comprehensive assessments for secondary classes.',
    }).save();
    console.log('Created Exam: Mid-Term Examination 2026');
  }

  const existingResult = await ExamResult.findOne({ exam: midTerm._id, student: studentAlex._id });
  if (!existingResult) {
    await ExamResult.insertMany([
      {
        exam: midTerm._id,
        student: studentAlex._id,
        subject: subMath._id,
        schoolClass: class10._id,
        section: sec10A._id,
        marksObtained: 94,
        maxMarks: 100,
        grade: 'A+',
        remarks: 'Excellent problem solving skills',
        teacher: teacherSarah._id,
        isPublished: true,
      },
      {
        exam: midTerm._id,
        student: studentAlex._id,
        subject: subSci._id,
        schoolClass: class10._id,
        section: sec10A._id,
        marksObtained: 88,
        maxMarks: 100,
        grade: 'A',
        remarks: 'Very good grasp of concepts',
        teacher: teacherRobert._id,
        isPublished: true,
      },
      {
        exam: midTerm._id,
        student: studentAlex._id,
        subject: subCS._id,
        schoolClass: class10._id,
        section: sec10A._id,
        marksObtained: 96,
        maxMarks: 100,
        grade: 'A+',
        remarks: 'Outstanding coding project',
        teacher: teacherSarah._id,
        isPublished: true,
      },
    ]);
    console.log('Seeded Exam Results for Alex Morgan');
  }

  // 9. Fee Structures & Payments
  let feeTuition = await FeeStructure.findOne({ title: 'Grade 10 Annual Tuition Fee' });
  if (!feeTuition) {
    feeTuition = await new FeeStructure({
      title: 'Grade 10 Annual Tuition Fee',
      schoolClass: class10._id,
      academicYear: '2026-2027',
      amount: 3200,
      dueDate: new Date('2026-11-15'),
      feeType: 'Tuition',
      description: 'Covers core curriculum instruction, academic facilities, and library access.',
    }).save();
    console.log('Created Fee Structure');
  }

  let feeLab = await FeeStructure.findOne({ title: 'Term 1 STEM Lab Fee' });
  if (!feeLab) {
    feeLab = await new FeeStructure({
      title: 'Term 1 STEM Lab Fee',
      schoolClass: class10._id,
      academicYear: '2026-2027',
      amount: 450,
      dueDate: new Date('2026-10-30'),
      feeType: 'Activity',
      description: 'Science, robotics, and computing equipment usage.',
    }).save();
  }

  const existingPayment = await FeePayment.findOne({ student: studentAlex._id });
  if (!existingPayment) {
    await new FeePayment({
      receiptNumber: 'RCP-2026-0001',
      student: studentAlex._id,
      feeStructure: feeTuition._id,
      amountPaid: 3200,
      paymentDate: new Date('2026-09-10'),
      paymentMethod: 'Online Portal',
      transactionReference: 'TXN-884920194',
      status: 'Paid',
      remarks: 'Annual tuition paid in full via portal.',
    }).save();
    console.log('Seeded Fee Payment RCP-2026-0001');
  }

  // 10. Notices
  const noticeCount = await Notice.countDocuments();
  if (noticeCount === 0) {
    await Notice.insertMany([
      {
        title: 'Mid-Term Examination Schedule Announced',
        content:
          'The mid-term examination timetable for Grades 9 and 10 has been published. All students are advised to check their respective subject halls and timing.',
        category: 'Examination',
        targetAudience: 'All',
        isPinned: true,
        publishDate: new Date(),
        author: 'Principal Office',
      },
      {
        title: 'Annual STEM & Robotics Exhibition 2026',
        content:
          'Submissions for the Annual STEM Fair are now open. Interested students should submit their project proposals to Prof. Robert Davis by Friday.',
        category: 'Event',
        targetAudience: 'Students',
        isPinned: false,
        publishDate: new Date(),
        author: 'Science Department',
      },
      {
        title: 'Upcoming Parent-Teacher Conference',
        content:
          'Parent-Teacher interactive meetings are scheduled for next Friday from 2:00 PM to 6:00 PM. Please reserve your slot via the parent portal.',
        category: 'Academic',
        targetAudience: 'Parents',
        isPinned: true,
        publishDate: new Date(),
        author: 'Academic Dean',
      },
      {
        title: 'Term Faculty Coordination Meeting',
        content:
          'All teachers and department heads are requested to attend the term coordination meeting in the Main Conference Hall at 3:30 PM tomorrow.',
        category: 'Administrative',
        targetAudience: 'Teachers',
        isPinned: false,
        publishDate: new Date(),
        author: 'Administration',
      },
    ]);
    console.log('Seeded Notices');
  }

  // 11. Timetable
  const ttCount = await Timetable.countDocuments();
  if (ttCount === 0) {
    await Timetable.insertMany([
      {
        schoolClass: class10._id,
        section: sec10A._id,
        dayOfWeek: 'Monday',
        periodNumber: 1,
        startTime: '08:30 AM',
        endTime: '09:20 AM',
        subject: subMath._id,
        teacher: teacherSarah._id,
        roomNumber: 'Room 301',
      },
      {
        schoolClass: class10._id,
        section: sec10A._id,
        dayOfWeek: 'Monday',
        periodNumber: 2,
        startTime: '09:25 AM',
        endTime: '10:15 AM',
        subject: subSci._id,
        teacher: teacherRobert._id,
        roomNumber: 'Lab 2',
      },
      {
        schoolClass: class10._id,
        section: sec10A._id,
        dayOfWeek: 'Monday',
        periodNumber: 3,
        startTime: '10:30 AM',
        endTime: '11:20 AM',
        subject: subCS._id,
        teacher: teacherSarah._id,
        roomNumber: 'Computer Lab 1',
      },
    ]);
    console.log('Seeded Timetable');
  }

  console.log('🎉 School ERP Seeding Complete!');
  process.exit(0);
}

seedSchool().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
