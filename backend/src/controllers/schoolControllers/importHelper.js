const XLSX = require('xlsx');

// Canonical definitions and documentation for each import type
const IMPORT_SCHEMAS = {
  students: {
    title: 'Student Admissions & Demographics',
    canonicalFields: [
      { key: 'admissionNumber', label: 'Admission Number', required: true, description: 'Unique school admission number (e.g. ADM-2026-001)' },
      { key: 'studentId', label: 'Student ID', required: false, description: 'Optional institutional student ID' },
      { key: 'firstName', label: 'First Name', required: true, description: 'Student given name' },
      { key: 'lastName', label: 'Last Name', required: true, description: 'Student surname / family name' },
      { key: 'dateOfBirth', label: 'Date of Birth', required: false, description: 'Birth date in YYYY-MM-DD format' },
      { key: 'gender', label: 'Gender', required: false, description: 'Male, Female, or Other' },
      { key: 'className', label: 'Class / Grade', required: true, description: 'Class name or code (e.g. Grade 10 or G10)' },
      { key: 'sectionName', label: 'Section', required: false, description: 'Section name or code (e.g. Section A or 10-A)' },
      { key: 'academicYear', label: 'Academic Year', required: false, description: 'e.g. 2026-2027 (defaults to 2026-2027)' },
      { key: 'rollNumber', label: 'Roll Number', required: false, description: 'Class roll number' },
      { key: 'studentMobile', label: 'Student Phone', required: false, description: 'Contact phone number' },
      { key: 'studentEmail', label: 'Student Email', required: false, description: 'Student personal email' },
      { key: 'bloodGroup', label: 'Blood Group', required: false, description: 'e.g. O+, A+, B+, AB-, etc.' },
      { key: 'emergencyContact', label: 'Emergency Contact', required: false, description: 'Name and phone of emergency contact' },
      { key: 'medicalNotes', label: 'Medical Notes', required: false, description: 'Allergies, conditions, or dietary alerts' },
      { key: 'parentName', label: 'Parent / Guardian Name', required: false, description: 'Father, mother, or guardian full name' },
      { key: 'parentMobile', label: 'Parent Phone', required: false, description: 'Parent contact phone' },
      { key: 'parentEmail', label: 'Parent Email', required: false, description: 'Parent contact email (used for parent portal account)' },
      { key: 'parentRelationship', label: 'Parent Relationship', required: false, description: 'Father, Mother, or Guardian' },
      { key: 'address', label: 'Full Address', required: false, description: 'Residential street address and city' },
      { key: 'nationality', label: 'Nationality', required: false, description: 'e.g. Citizen, Indian, American, etc.' },
      { key: 'photographUrl', label: 'Photograph URL', required: false, description: 'Optional relative or full URL to photo' },
    ],
    samples: [
      {
        admissionNumber: 'ADM-2026-101',
        studentId: 'STU-101',
        firstName: 'Aarav',
        lastName: 'Sharma',
        dateOfBirth: '2010-05-15',
        gender: 'Male',
        className: 'Grade 10',
        sectionName: 'Section A',
        academicYear: '2026-2027',
        rollNumber: '1',
        studentMobile: '9876543210',
        studentEmail: 'aarav.sharma@school.edu',
        bloodGroup: 'O+',
        emergencyContact: '9876543211 (Father)',
        medicalNotes: 'No known allergies',
        parentName: 'Ramesh Sharma',
        parentMobile: '9876543211',
        parentEmail: 'ramesh.sharma@example.com',
        parentRelationship: 'Father',
        address: 'Flat 402, Lotus Tower, Jaipur',
        nationality: 'Indian',
      },
      {
        admissionNumber: 'ADM-2026-102',
        studentId: 'STU-102',
        firstName: 'Ananya',
        lastName: 'Verma',
        dateOfBirth: '2010-09-22',
        gender: 'Female',
        className: 'Grade 10',
        sectionName: 'Section A',
        academicYear: '2026-2027',
        rollNumber: '2',
        studentMobile: '9876543220',
        studentEmail: 'ananya.v@school.edu',
        bloodGroup: 'B+',
        emergencyContact: '9876543221 (Mother)',
        medicalNotes: 'Mild asthma in winter',
        parentName: 'Sunita Verma',
        parentMobile: '9876543221',
        parentEmail: 'sunita.verma@example.com',
        parentRelationship: 'Mother',
        address: '15 Green Glen Park, Jaipur',
        nationality: 'Indian',
      },
    ],
  },

  teachers: {
    title: 'Faculty & Staff Directory',
    canonicalFields: [
      { key: 'employeeId', label: 'Employee ID', required: true, description: 'Unique staff identifier (e.g. EMP-T101)' },
      { key: 'firstName', label: 'First Name', required: true, description: 'Given name' },
      { key: 'lastName', label: 'Last Name', required: true, description: 'Surname' },
      { key: 'email', label: 'Official Email', required: true, description: 'Unique institutional email address' },
      { key: 'mobile', label: 'Mobile Phone', required: false, description: 'Phone number' },
      { key: 'gender', label: 'Gender', required: false, description: 'Male, Female, or Other' },
      { key: 'qualification', label: 'Qualification', required: false, description: 'Academic degrees (e.g. M.Sc, B.Ed, Ph.D)' },
      { key: 'specialization', label: 'Specialization', required: false, description: 'Subject domain (e.g. Mathematics & Physics)' },
      { key: 'joiningDate', label: 'Joining Date', required: false, description: 'Date joined in YYYY-MM-DD' },
      { key: 'assignedClassCodes', label: 'Assigned Classes', required: false, description: 'Comma-separated class names or codes' },
      { key: 'assignedSectionCodes', label: 'Assigned Sections', required: false, description: 'Comma-separated section names or codes' },
      { key: 'assignedSubjectCodes', label: 'Assigned Subject Codes', required: false, description: 'Comma-separated subject codes (e.g. MTH-101, PHY-102)' },
      { key: 'salary', label: 'Salary', required: false, description: 'Monthly or annual remuneration' },
      { key: 'status', label: 'Status', required: false, description: 'active, inactive, or on_leave' },
    ],
    samples: [
      {
        employeeId: 'EMP-T101',
        firstName: 'Sunita',
        lastName: 'Rao',
        email: 'sunita.rao@school.edu',
        mobile: '9829012345',
        gender: 'Female',
        qualification: 'M.Sc, B.Ed Physics',
        specialization: 'Physics, Applied Science',
        joiningDate: '2022-06-01',
        assignedClassCodes: 'Grade 10, Grade 9',
        assignedSectionCodes: 'Section A',
        assignedSubjectCodes: 'PHY-102',
        salary: 62000,
        status: 'active',
      },
      {
        employeeId: 'EMP-T102',
        firstName: 'Vikram',
        lastName: 'Malhotra',
        email: 'vikram.m@school.edu',
        mobile: '9829012399',
        gender: 'Male',
        qualification: 'M.A., M.Phil English Literature',
        specialization: 'English & Creative Writing',
        joiningDate: '2023-01-15',
        assignedClassCodes: 'Grade 10',
        assignedSectionCodes: 'Section A, Section B',
        assignedSubjectCodes: 'ENG-101',
        salary: 58000,
        status: 'active',
      },
    ],
  },

  parents: {
    title: 'Parents & Guardians Linkage',
    canonicalFields: [
      { key: 'fullName', label: 'Full Name', required: true, description: 'Parent / Guardian full legal name' },
      { key: 'email', label: 'Email Address', required: true, description: 'Unique parent login email' },
      { key: 'mobile', label: 'Mobile Phone', required: false, description: 'Primary phone' },
      { key: 'relationship', label: 'Relationship', required: false, description: 'Father, Mother, or Guardian' },
      { key: 'studentAdmissionNumbers', label: 'Student Admission Numbers', required: true, description: 'Comma-separated student admission numbers linked to this parent (e.g. ADM-2026-101, ADM-2026-102)' },
      { key: 'address', label: 'Address', required: false, description: 'Residential address' },
    ],
    samples: [
      {
        fullName: 'Ramesh Sharma',
        email: 'ramesh.sharma@example.com',
        mobile: '9876543211',
        relationship: 'Father',
        studentAdmissionNumbers: 'ADM-2026-101',
        address: 'Flat 402, Lotus Tower, Jaipur',
      },
      {
        fullName: 'Sunita Verma',
        email: 'sunita.verma@example.com',
        mobile: '9876543221',
        relationship: 'Mother',
        studentAdmissionNumbers: 'ADM-2026-102',
        address: '15 Green Glen Park, Jaipur',
      },
    ],
  },

  classes_sections: {
    title: 'School Classes & Sections',
    canonicalFields: [
      { key: 'className', label: 'Class Name', required: true, description: 'e.g. Grade 11 or Grade 12' },
      { key: 'classCode', label: 'Class Code', required: false, description: 'Short code e.g. G11 or CLS-11' },
      { key: 'grade', label: 'Numeric Grade', required: false, description: 'e.g. 11' },
      { key: 'sectionName', label: 'Section Name', required: true, description: 'e.g. Section A or Section B' },
      { key: 'sectionCode', label: 'Section Code', required: false, description: 'e.g. 11-A or 11-B' },
      { key: 'roomNumber', label: 'Room Number', required: false, description: 'e.g. Room 401' },
      { key: 'capacity', label: 'Student Capacity', required: false, description: 'Default is 35-40' },
    ],
    samples: [
      {
        className: 'Grade 11',
        classCode: 'G11',
        grade: 11,
        sectionName: 'Section A',
        sectionCode: '11-A',
        roomNumber: 'Room 401',
        capacity: 35,
      },
      {
        className: 'Grade 11',
        classCode: 'G11',
        grade: 11,
        sectionName: 'Section B',
        sectionCode: '11-B',
        roomNumber: 'Room 402',
        capacity: 35,
      },
    ],
  },

  subjects: {
    title: 'Curriculum Subjects',
    canonicalFields: [
      { key: 'subjectName', label: 'Subject Name', required: true, description: 'e.g. Chemistry or Organic Chemistry' },
      { key: 'subjectCode', label: 'Subject Code', required: true, description: 'Unique code e.g. CHM-101' },
      { key: 'className', label: 'Class / Grade', required: true, description: 'Associated class name or code (e.g. Grade 10)' },
      { key: 'type', label: 'Subject Type', required: false, description: 'Theory, Practical, or Elective (default Theory)' },
      { key: 'credits', label: 'Credits', required: false, description: 'Academic credit weight (default 3)' },
      { key: 'teacherEmployeeId', label: 'Instructor Employee ID', required: false, description: 'Assigned teacher employee ID or email' },
    ],
    samples: [
      {
        subjectName: 'Advanced Physics',
        subjectCode: 'PHY-102',
        className: 'Grade 10',
        type: 'Theory',
        credits: 4,
        teacherEmployeeId: 'EMP-T101',
      },
      {
        subjectName: 'English Literature',
        subjectCode: 'ENG-101',
        className: 'Grade 10',
        type: 'Theory',
        credits: 3,
        teacherEmployeeId: 'EMP-T102',
      },
    ],
  },

  assignments: {
    title: 'Teacher-Class-Subject Allocation & Class Teachers',
    canonicalFields: [
      { key: 'academicYear', label: 'Academic Year', required: false, description: 'e.g. 2026-2027' },
      { key: 'classCode', label: 'Class Name / Code', required: true, description: 'Class e.g. Grade 10' },
      { key: 'sectionCode', label: 'Section Name / Code', required: true, description: 'Section e.g. Section A' },
      { key: 'subjectCode', label: 'Subject Code', required: true, description: 'Subject code e.g. PHY-102' },
      { key: 'teacherEmployeeId', label: 'Teacher Employee ID / Email', required: true, description: 'Staff ID or email' },
      { key: 'isClassTeacher', label: 'Is Class Teacher', required: false, description: 'Yes / No / true / false' },
      { key: 'roomNumber', label: 'Room Number', required: false, description: 'Assigned classroom' },
    ],
    samples: [
      {
        academicYear: '2026-2027',
        classCode: 'Grade 10',
        sectionCode: 'Section A',
        subjectCode: 'PHY-102',
        teacherEmployeeId: 'EMP-T101',
        isClassTeacher: 'Yes',
        roomNumber: 'Room 301',
      },
      {
        academicYear: '2026-2027',
        classCode: 'Grade 10',
        sectionCode: 'Section A',
        subjectCode: 'ENG-101',
        teacherEmployeeId: 'EMP-T102',
        isClassTeacher: 'No',
        roomNumber: 'Room 301',
      },
    ],
  },

  enrollments: {
    title: 'Student Academic Enrollments',
    canonicalFields: [
      { key: 'admissionNumber', label: 'Admission Number', required: true, description: 'Student admission number' },
      { key: 'academicYear', label: 'Academic Year', required: true, description: 'e.g. 2026-2027' },
      { key: 'className', label: 'Class Name / Code', required: true, description: 'Target class' },
      { key: 'sectionName', label: 'Section Name / Code', required: false, description: 'Target section' },
      { key: 'rollNumber', label: 'Roll Number', required: false, description: 'Class roll number' },
    ],
    samples: [
      {
        admissionNumber: 'ADM-2026-101',
        academicYear: '2026-2027',
        className: 'Grade 10',
        sectionName: 'Section A',
        rollNumber: '1',
      },
      {
        admissionNumber: 'ADM-2026-102',
        academicYear: '2026-2027',
        className: 'Grade 10',
        sectionName: 'Section A',
        rollNumber: '2',
      },
    ],
  },

  fee_structures: {
    title: 'Fee Structures & Schedules',
    canonicalFields: [
      { key: 'title', label: 'Fee Title', required: true, description: 'Fee name e.g. Term 1 Tuition Fee' },
      { key: 'className', label: 'Class Name / Code', required: true, description: 'Class applicable for' },
      { key: 'amount', label: 'Total Amount', required: true, description: 'Gross fee amount in currency' },
      { key: 'concessionAmount', label: 'Concession / Scholarship', required: false, description: 'Approved discount' },
      { key: 'feeType', label: 'Fee Category', required: false, description: 'Tuition, Admission, Exam, Transport, Library, Activity, or Other' },
      { key: 'academicYear', label: 'Academic Year', required: false, description: 'e.g. 2026-2027' },
      { key: 'dueDate', label: 'Due Date', required: false, description: 'YYYY-MM-DD' },
    ],
    samples: [
      {
        title: 'Quarter 1 Tuition & Lab Fee',
        className: 'Grade 10',
        amount: 18500,
        concessionAmount: 2500,
        feeType: 'Tuition',
        academicYear: '2026-2027',
        dueDate: '2026-11-30',
      },
      {
        title: 'Annual Sports & Activity Fee',
        className: 'Grade 10',
        amount: 3000,
        concessionAmount: 0,
        feeType: 'Activity',
        academicYear: '2026-2027',
        dueDate: '2026-12-15',
      },
    ],
  },
};

// Protect against CSV / Excel formula injection (leading '=', '+', '-', '@', '\t', '\r')
function sanitizeFormulaInjection(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (['=', '+', '-', '@', '\t', '\r'].some((char) => trimmed.startsWith(char))) {
    return `'${value}`;
  }
  return value;
}

// Generate downloadable workbook buffer for a given schema type
function generateTemplateWorkbook(type, format = 'xlsx') {
  const schema = IMPORT_SCHEMAS[type];
  if (!schema) {
    throw new Error(`Unsupported import schema type: ${type}`);
  }

  // 1. Data Sheet with Canonical Headers & Sample Rows
  const headers = schema.canonicalFields.map((f) => f.key);
  const rows = schema.samples || [];

  const wsData = [headers];
  for (const item of rows) {
    const row = headers.map((k) => (item[k] !== undefined ? item[k] : ''));
    wsData.push(row);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 4, 15) }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Import_Template');

  // 2. Documentation Sheet explaining every field
  const docHeaders = ['Field Name', 'Required?', 'Description'];
  const docRows = [docHeaders];
  for (const f of schema.canonicalFields) {
    docRows.push([f.key, f.required ? 'YES (Mandatory)' : 'NO (Optional)', f.description]);
  }
  const wsDoc = XLSX.utils.aoa_to_sheet(docRows);
  wsDoc['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsDoc, 'Field_Instructions');

  if (format === 'csv') {
    return XLSX.utils.sheet_to_csv(ws);
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

// Parse uploaded buffer into array of objects safely
function parseSpreadsheetBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: false, cellText: false });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Spreadsheet has no readable sheets.');
  }
  const ws = wb.Sheets[firstSheetName];
  // Parse into raw JSON rows with header: 1 to examine header row first
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, dateNF: 'YYYY-MM-DD' });

  // Get detected column headers
  let headers = [];
  if (rawRows.length > 0) {
    headers = Object.keys(rawRows[0]).filter((h) => h && !h.startsWith('__EMPTY'));
  }

  return {
    sheetName: firstSheetName,
    headers,
    totalRows: rawRows.length,
    rows: rawRows,
  };
}

module.exports = {
  IMPORT_SCHEMAS,
  sanitizeFormulaInjection,
  generateTemplateWorkbook,
  parseSpreadsheetBuffer,
};
