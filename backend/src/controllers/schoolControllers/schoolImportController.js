const mongoose = require('mongoose');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { generate: uniqueId } = require('shortid');
const {
  IMPORT_SCHEMAS,
  sanitizeFormulaInjection,
  generateTemplateWorkbook,
  parseSpreadsheetBuffer,
} = require('./importHelper');

// Helper to generate a secure random password
function generateSecurePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let pass = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}

// Map spreadsheet header to best canonical match
function matchHeaderToCanonical(header, canonicalFields) {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const f of canonicalFields) {
    const fClean = f.key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const labelClean = f.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean === fClean || clean === labelClean) {
      return f.key;
    }
  }
  // Common aliases
  const aliasMap = {
    fname: 'firstName',
    firstname: 'firstName',
    givenname: 'firstName',
    lname: 'lastName',
    lastname: 'lastName',
    surname: 'lastName',
    admno: 'admissionNumber',
    admissionno: 'admissionNumber',
    admnumber: 'admissionNumber',
    stuid: 'studentId',
    dob: 'dateOfBirth',
    birthdate: 'dateOfBirth',
    class: 'className',
    grade: 'className',
    classcode: 'className',
    classname: 'className',
    schoolclass: 'className',
    classid: 'className',
    standard: 'className',
    section: 'sectionName',
    sec: 'sectionName',
    sectioncode: 'sectionName',
    sectionname: 'sectionName',
    sectionid: 'sectionName',
    phone: 'studentMobile',
    mobile: 'studentMobile',
    cell: 'studentMobile',
    mail: 'studentEmail',
    email: 'studentEmail',
    parentemail: 'parentEmail',
    parentphone: 'parentMobile',
    empid: 'employeeId',
    staffid: 'employeeId',
    teacherid: 'employeeId',
  };
  if (aliasMap[clean]) {
    const target = aliasMap[clean];
    if (canonicalFields.some((f) => f.key === target)) {
      return target;
    }
  }
  return null;
}

// 1. Download Template
const downloadTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';

    if (!IMPORT_SCHEMAS[type]) {
      return res.status(400).json({
        success: false,
        message: `Invalid import template type: '${type}'. Supported types: ${Object.keys(IMPORT_SCHEMAS).join(', ')}`,
      });
    }

    const fileContent = generateTemplateWorkbook(type, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
      return res.status(200).send(fileContent);
    } else {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.xlsx"`);
      return res.status(200).send(fileContent);
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Parse Uploaded Spreadsheet
const parseSpreadsheet = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No spreadsheet file provided. Please upload a .xlsx, .xls, or .csv file.',
      });
    }

    const { type } = req.body;
    if (!IMPORT_SCHEMAS[type]) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing import type: '${type}'.`,
      });
    }

    const parsed = parseSpreadsheetBuffer(req.file.buffer);

    if (parsed.totalRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded spreadsheet is empty or has no data rows.',
      });
    }

    if (parsed.totalRows > 5000) {
      return res.status(400).json({
        success: false,
        message: `File contains ${parsed.totalRows} rows, exceeding the safe batch limit of 5,000 rows. Please split into smaller batches.`,
      });
    }

    const canonicalFields = IMPORT_SCHEMAS[type].canonicalFields;
    const suggestedMapping = {};
    for (const h of parsed.headers) {
      const match = matchHeaderToCanonical(h, canonicalFields);
      if (match) {
        suggestedMapping[h] = match;
      }
    }

    return res.status(200).json({
      success: true,
      result: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        sheetName: parsed.sheetName,
        headers: parsed.headers,
        totalRows: parsed.totalRows,
        rows: parsed.rows,
        suggestedMapping,
        canonicalFields,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper to normalize a raw row using columnMapping
function mapRow(rawRow, columnMapping) {
  const normalized = {};
  for (const [sheetCol, canonKey] of Object.entries(columnMapping || {})) {
    if (canonKey && rawRow[sheetCol] !== undefined) {
      let val = rawRow[sheetCol];
      if (typeof val === 'string') val = val.trim();
      normalized[canonKey] = val;
    }
  }
  return normalized;
}

// 3. Validate Batch
const validateBatch = async (req, res) => {
  try {
    const { importType, rows, columnMapping } = req.body;
    if (!IMPORT_SCHEMAS[importType]) {
      return res.status(400).json({ success: false, message: 'Invalid import type.' });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows to validate.' });
    }
    if (rows.length > 5000) {
      return res.status(400).json({
        success: false,
        message: `Batch contains ${rows.length} records, exceeding the maximum allowed batch limit of 5,000 records.`,
      });
    }

    const schema = IMPORT_SCHEMAS[importType];
    const requiredFields = schema.canonicalFields.filter((f) => f.required).map((f) => f.key);

    const issues = [];

    // Track uniqueness within the uploaded batch
    const seenBatchKeys = new Set();

    // Fetch existing records for reference checking
    const Student = mongoose.model('Student');
    const Teacher = mongoose.model('Teacher');
    const SchoolClass = mongoose.model('SchoolClass');
    const Section = mongoose.model('Section');
    const Subject = mongoose.model('Subject');

    const [existingStudents, existingTeachers, existingClasses, existingSections, existingSubjects] =
      await Promise.all([
        Student.find({ removed: false }).select('admissionNumber studentId email schoolClass section status'),
        Teacher.find({ removed: false }).select('employeeId email'),
        SchoolClass.find({ removed: false }).select('name code _id'),
        Section.find({ removed: false }).select('name code schoolClass _id'),
        Subject.find({ removed: false }).select('code name schoolClass _id'),
      ]);

    const existingStudentMap = new Map();
    existingStudents.forEach((s) => {
      if (s.admissionNumber) {
        existingStudentMap.set(s.admissionNumber.toUpperCase(), s);
      }
    });

    const existingAdmissionNumbers = new Set(
      existingStudents.map((s) => (s.admissionNumber ? s.admissionNumber.toUpperCase() : ''))
    );
    const existingEmployeeIds = new Set(
      existingTeachers.map((t) => (t.employeeId ? t.employeeId.toUpperCase() : ''))
    );
    const existingTeacherEmails = new Set(
      existingTeachers.map((t) => (t.email ? t.email.toLowerCase() : ''))
    );

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const rowSummaries = [];
    const destMap = new Map();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const row = mapRow(rows[i], columnMapping);
      const rowIssues = [];
      let isUpdate = false;

      // 1. Mandatory field checks
      for (const field of requiredFields) {
        if (!row[field] || String(row[field]).trim() === '') {
          rowIssues.push({
            row: rowNum,
            field,
            value: row[field] || '',
            message: `Required field '${field}' is missing or blank.`,
            type: 'error',
          });
        }
      }

      // 2. Specific type validations
      if (importType === 'students') {
        const adm = row.admissionNumber ? String(row.admissionNumber).trim().toUpperCase() : null;
        if (adm) {
          if (seenBatchKeys.has(`STUDENT:${adm}`)) {
            rowIssues.push({
              row: rowNum,
              field: 'admissionNumber',
              value: adm,
              message: `Duplicate admission number '${adm}' found multiple times in this upload.`,
              type: 'error',
            });
          } else {
            seenBatchKeys.add(`STUDENT:${adm}`);
          }

          if (existingAdmissionNumbers.has(adm)) {
            isUpdate = true;
            rowIssues.push({
              row: rowNum,
              field: 'admissionNumber',
              value: adm,
              message: `Admission number '${adm}' matches an existing student record in the database. It will be updated.`,
              type: 'warning',
            });
          }
        }

        if (row.studentEmail && !emailRegex.test(row.studentEmail)) {
          rowIssues.push({
            row: rowNum,
            field: 'studentEmail',
            value: row.studentEmail,
            message: 'Invalid student email address format.',
            type: 'error',
          });
        }

        if (row.parentEmail && !emailRegex.test(row.parentEmail)) {
          rowIssues.push({
            row: rowNum,
            field: 'parentEmail',
            value: row.parentEmail,
            message: 'Invalid parent email address format.',
            type: 'error',
          });
        }

        if (row.gender && !['Male', 'Female', 'Other'].includes(row.gender)) {
          rowIssues.push({
            row: rowNum,
            field: 'gender',
            value: row.gender,
            message: `Gender '${row.gender}' is invalid. Allowed: Male, Female, Other.`,
            type: 'error',
          });
        }

        // Flexible class & section resolution (support names, codes, and ObjectIds)
        const rawClass = row.className || row.schoolClass || row.classId;
        const rawSec = row.sectionName || row.section || row.sectionId;
        if (rawClass) row.className = rawClass;
        if (rawSec) row.sectionName = rawSec;

        let matchedClass = null;
        if (row.className) {
          const cStr = String(row.className).trim().toLowerCase();
          matchedClass = existingClasses.find(
            (c) =>
              (c._id && c._id.toString() === String(row.className).trim()) ||
              c.name.toLowerCase() === cStr ||
              (c.code && c.code.toLowerCase() === cStr)
          );
          if (!matchedClass) {
            rowIssues.push({
              row: rowNum,
              field: 'className',
              value: row.className,
              message: `Class '${row.className}' was not found in the school class registry. A new class will be created upon commit.`,
              type: 'warning',
            });
          }
        }

        let matchedSec = null;
        if (row.sectionName) {
          const sStr = String(row.sectionName).trim().toLowerCase();
          if (matchedClass) {
            matchedSec = existingSections.find(
              (s) =>
                (s.schoolClass?._id?.toString() === matchedClass._id.toString() ||
                  s.schoolClass?.toString() === matchedClass._id.toString()) &&
                ((s._id && s._id.toString() === String(row.sectionName).trim()) ||
                  s.name.toLowerCase() === sStr ||
                  (s.code && s.code.toLowerCase() === sStr))
            );
          }

          if (!matchedSec) {
            // Check if section exists under a different class
            const crossSection = existingSections.find(
              (s) =>
                (s._id && s._id.toString() === String(row.sectionName).trim()) ||
                s.name.toLowerCase() === sStr ||
                (s.code && s.code.toLowerCase() === sStr)
            );
            if (crossSection && matchedClass) {
              rowIssues.push({
                row: rowNum,
                field: 'sectionName',
                value: row.sectionName,
                message: `Section '${row.sectionName}' belongs to class '${crossSection.schoolClass?.name || 'another class'}', not '${matchedClass.name}'.`,
                type: 'error',
              });
            } else if (!crossSection) {
              rowIssues.push({
                row: rowNum,
                field: 'sectionName',
                value: row.sectionName,
                message: `Section '${row.sectionName}' was not found in class '${matchedClass ? matchedClass.name : row.className}'. A new section will be created upon commit.`,
                type: 'warning',
              });
            }
          }
        }

        // Track destination for 120-student capacity validation
        const destClassKey = matchedClass ? matchedClass._id.toString() : String(row.className || 'UNKNOWN').trim().toLowerCase();
        const destSecKey = matchedSec ? matchedSec._id.toString() : String(row.sectionName || 'DEFAULT').trim().toLowerCase();
        const destKey = `${destClassKey}:${destSecKey}`;

        if (!destMap.has(destKey)) {
          destMap.set(destKey, {
            classId: matchedClass ? matchedClass._id.toString() : null,
            sectionId: matchedSec ? matchedSec._id.toString() : null,
            className: matchedClass ? matchedClass.name : row.className,
            sectionName: matchedSec ? matchedSec.name : row.sectionName,
            rows: [],
          });
        }

        const existingStu = adm ? existingStudentMap.get(adm) : null;
        const isSameSection =
          existingStu &&
          matchedClass &&
          matchedSec &&
          (existingStu.schoolClass?._id?.toString() === matchedClass._id.toString() ||
            existingStu.schoolClass?.toString() === matchedClass._id.toString()) &&
          (existingStu.section?._id?.toString() === matchedSec._id.toString() ||
            existingStu.section?.toString() === matchedSec._id.toString());

        destMap.get(destKey).rows.push({
          rowNum,
          adm,
          isSameSection: !!isSameSection,
          rowIssues,
        });

      } else if (importType === 'teachers') {
        const empId = row.employeeId ? String(row.employeeId).trim().toUpperCase() : null;
        const email = row.email ? String(row.email).trim().toLowerCase() : null;

        if (empId) {
          if (seenBatchKeys.has(`TEACHER_EMP:${empId}`)) {
            rowIssues.push({
              row: rowNum,
              field: 'employeeId',
              value: empId,
              message: `Duplicate employee ID '${empId}' in upload.`,
              type: 'error',
            });
          } else {
            seenBatchKeys.add(`TEACHER_EMP:${empId}`);
          }
          if (existingEmployeeIds.has(empId)) {
            isUpdate = true;
          }
        }

        if (email) {
          if (!emailRegex.test(email)) {
            rowIssues.push({
              row: rowNum,
              field: 'email',
              value: email,
              message: 'Invalid email address format.',
              type: 'error',
            });
          }
          if (seenBatchKeys.has(`TEACHER_EMAIL:${email}`)) {
            rowIssues.push({
              row: rowNum,
              field: 'email',
              value: email,
              message: `Duplicate email '${email}' in upload.`,
              type: 'error',
            });
          } else {
            seenBatchKeys.add(`TEACHER_EMAIL:${email}`);
          }
          if (existingTeacherEmails.has(email)) {
            isUpdate = true;
            rowIssues.push({
              row: rowNum,
              field: 'email',
              value: email,
              message: `Teacher with email '${email}' already exists and will be updated.`,
              type: 'warning',
            });
          }
        }
      } else if (importType === 'fee_structures') {
        if (row.amount !== undefined && (isNaN(Number(row.amount)) || Number(row.amount) < 0)) {
          rowIssues.push({
            row: rowNum,
            field: 'amount',
            value: row.amount,
            message: 'Fee amount must be a positive number.',
            type: 'error',
          });
        }
      }

      rowSummaries.push({
        rowNumber: rowNum,
        data: row,
        isUpdate,
        issues: rowIssues,
      });
    }

    // 3. Enforce maximum 120 students per class-section
    if (importType === 'students') {
      for (const [, destInfo] of destMap.entries()) {
        let currentlyEnrolled = 0;
        if (destInfo.classId && destInfo.sectionId) {
          currentlyEnrolled = existingStudents.filter(
            (s) =>
              s.status !== 'inactive' &&
              (s.schoolClass?._id?.toString() === destInfo.classId ||
                s.schoolClass?.toString() === destInfo.classId) &&
              (s.section?._id?.toString() === destInfo.sectionId ||
                s.section?.toString() === destInfo.sectionId)
          ).length;
        }

        const seenAdmsInDest = new Set();
        let netIncoming = 0;
        const overCapacityRows = [];

        for (const r of destInfo.rows) {
          if (!r.isSameSection) {
            const key = r.adm || `ROW_${r.rowNum}`;
            if (!seenAdmsInDest.has(key)) {
              seenAdmsInDest.add(key);
              netIncoming++;
              if (currentlyEnrolled + netIncoming > 120) {
                overCapacityRows.push(r);
              }
            }
          }
        }

        if (currentlyEnrolled + netIncoming > 120) {
          for (const overRow of overCapacityRows) {
            const capacityIssue = {
              row: overRow.rowNum,
              field: 'sectionName',
              value: destInfo.sectionName || 'Section',
              message: `Capacity limit exceeded: Maximum allowed capacity is 120 students per class-section. Class '${destInfo.className || 'Class'}', Section '${destInfo.sectionName || 'Section'}' currently has ${currentlyEnrolled} active student(s), plus ${netIncoming} incoming new enrollment(s) = projected total ${currentlyEnrolled + netIncoming} (exceeds limit of 120).`,
              type: 'error',
            };
            overRow.rowIssues.push(capacityIssue);
          }
        }
      }
    }

    // Tally validation summary
    let validCount = 0;
    let warningCount = 0;
    let invalidCount = 0;
    let newCount = 0;
    let updateCount = 0;

    for (const rSummary of rowSummaries) {
      const hasError = rSummary.issues.some((iss) => iss.type === 'error');
      const hasWarning = rSummary.issues.some((iss) => iss.type === 'warning');

      rSummary.status = hasError ? 'invalid' : hasWarning ? 'warning' : 'valid';

      if (hasError) {
        invalidCount++;
      } else if (hasWarning) {
        warningCount++;
        validCount++;
        if (rSummary.isUpdate) updateCount++;
        else newCount++;
      } else {
        validCount++;
        if (rSummary.isUpdate) updateCount++;
        else newCount++;
      }

      issues.push(...rSummary.issues);
    }

    return res.status(200).json({
      success: true,
      result: {
        summary: {
          totalRows: rows.length,
          validRows: validCount,
          warningRows: warningCount,
          invalidRows: invalidCount,
          newRecords: newCount,
          updateRecords: updateCount,
          issuesCount: issues.length,
        },
        issues,
        rowSummaries,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Reconcile Relationships
const reconcileBatch = async (req, res) => {
  try {
    const { importType, rows, columnMapping } = req.body;
    if (!IMPORT_SCHEMAS[importType]) {
      return res.status(400).json({ success: false, message: 'Invalid import type.' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows to reconcile.' });
    }
    if (rows.length > 5000) {
      return res.status(400).json({
        success: false,
        message: `Batch contains ${rows.length} records, exceeding the maximum allowed batch limit of 5,000 records.`,
      });
    }

    const SchoolClass = mongoose.model('SchoolClass');
    const Section = mongoose.model('Section');
    const Subject = mongoose.model('Subject');
    const Teacher = mongoose.model('Teacher');
    const Student = mongoose.model('Student');

    const [allClasses, allSections, allSubjects, allTeachers, allStudents] = await Promise.all([
      SchoolClass.find({ removed: false }).populate('classTeacher'),
      Section.find({ removed: false }).populate('classTeacher'),
      Subject.find({ removed: false }).populate('teacher schoolClass'),
      Teacher.find({ removed: false }),
      Student.find({ removed: false }),
    ]);

    const reconciliationList = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const row = mapRow(rows[i], columnMapping);

      if (importType === 'students' || importType === 'enrollments') {
        const className = row.className || row.classCode || row.schoolClass || row.classId;
        const sectionName = row.sectionName || row.sectionCode || row.section || row.sectionId;
        const adm = row.admissionNumber;

        let matchedClass = null;
        let matchedSection = null;
        let status = 'matched';
        let proposed = '';
        let note = '';
        let suggestedAction = 'Proceed with admission and class enrollment.';

        if (className) {
          const cStr = String(className).trim().toLowerCase();
          matchedClass = allClasses.find(
            (c) =>
              (c._id && c._id.toString() === String(className).trim()) ||
              c.name.toLowerCase() === cStr ||
              (c.code && c.code.toLowerCase() === cStr)
          );
          if (!matchedClass) {
            status = 'unresolved';
            note = `Target class '${className}' does not exist.`;
            suggestedAction = 'Create class first or map to an existing class.';
          }
        }

        if (matchedClass && sectionName) {
          const sStr = String(sectionName).trim().toLowerCase();
          matchedSection = allSections.find(
            (s) =>
              (s.schoolClass?._id?.toString() === matchedClass._id.toString() ||
                s.schoolClass?.toString() === matchedClass._id.toString()) &&
              ((s._id && s._id.toString() === String(sectionName).trim()) ||
                s.name.toLowerCase() === sStr ||
                (s.code && s.code.toLowerCase() === sStr))
          );
          if (!matchedSection) {
            // Check if section exists under a different class!
            const crossSection = allSections.find(
              (s) =>
                (s._id && s._id.toString() === String(sectionName).trim()) ||
                s.name.toLowerCase() === sStr ||
                (s.code && s.code.toLowerCase() === sStr)
            );
            if (crossSection) {
              status = 'conflict';
              note = `Section '${sectionName}' belongs to class '${crossSection.schoolClass?.name || 'another class'}', not '${matchedClass.name}'.`;
              suggestedAction = 'Assign to a valid section belonging to this class.';
            } else {
              status = 'warning';
              note = `Section '${sectionName}' not found in class '${matchedClass.name}'. System will auto-create section upon commit.`;
              suggestedAction = 'Confirm auto-creation of section.';
            }
          }
        }

        proposed = matchedClass
          ? `Class: ${matchedClass.name}${matchedSection ? ' / ' + matchedSection.name : ''}`
          : 'None';

        reconciliationList.push({
          rowNumber: rowNum,
          identifier: adm || `Row #${rowNum}`,
          entity: 'Student Enrollment',
          matchedRecord: matchedClass ? matchedClass.name : 'Not Found',
          proposedRelationship: proposed,
          status,
          note,
          suggestedAction,
        });
      } else if (importType === 'assignments') {
        const { classCode, sectionCode, subjectCode, teacherEmployeeId, isClassTeacher } = row;
        let status = 'matched';
        let note = '';
        let suggestedAction = 'Allocate timetable and teaching load.';

        const matchedTeacher = allTeachers.find(
          (t) =>
            (t.employeeId && t.employeeId.toUpperCase() === String(teacherEmployeeId).toUpperCase()) ||
            t.email.toLowerCase() === String(teacherEmployeeId).toLowerCase()
        );

        if (!matchedTeacher) {
          status = 'unresolved';
          note = `Teacher with ID/Email '${teacherEmployeeId}' does not exist.`;
          suggestedAction = 'Import teacher profile first.';
        }

        const matchedClass = allClasses.find(
          (c) =>
            c.name.toLowerCase() === String(classCode).toLowerCase() ||
            (c.code && c.code.toLowerCase() === String(classCode).toLowerCase())
        );

        let matchedSection = null;
        if (matchedClass) {
          matchedSection = allSections.find(
            (s) =>
              s.schoolClass?._id?.toString() === matchedClass._id.toString() &&
              (s.name.toLowerCase() === String(sectionCode).toLowerCase() ||
                (s.code && s.code.toLowerCase() === String(sectionCode).toLowerCase()))
          );
        }

        // Check class teacher conflict
        const isCT = String(isClassTeacher).toLowerCase() === 'yes' || isClassTeacher === true || isClassTeacher === 'true';
        if (isCT && matchedSection && matchedSection.classTeacher) {
          if (matchedSection.classTeacher._id.toString() !== matchedTeacher?._id?.toString()) {
            status = 'conflict';
            note = `Section '${matchedSection.name}' already has class teacher '${matchedSection.classTeacher.name} ${matchedSection.classTeacher.surname}'. Proposed teacher: '${matchedTeacher?.name}'.`;
            suggestedAction = 'Choose whether to replace existing class teacher or cancel CT flag.';
          }
        }

        reconciliationList.push({
          rowNumber: rowNum,
          identifier: `${teacherEmployeeId} -> ${subjectCode}`,
          entity: 'Teacher-Class Allocation',
          matchedRecord: matchedTeacher ? `${matchedTeacher.name} ${matchedTeacher.surname}` : 'Unresolved',
          proposedRelationship: `${classCode} - ${sectionCode} (${subjectCode})`,
          status,
          note,
          suggestedAction,
        });
      } else if (importType === 'parents') {
        const { fullName, email, studentAdmissionNumbers } = row;
        const tokens = String(studentAdmissionNumbers || '')
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean);

        const matchedKids = allStudents.filter((s) =>
          tokens.includes(s.admissionNumber ? s.admissionNumber.toUpperCase() : '')
        );

        let status = 'matched';
        let note = `Matched ${matchedKids.length} of ${tokens.length} students.`;
        if (matchedKids.length === 0) {
          status = 'unresolved';
          note = 'No students found matching the provided admission numbers.';
        } else if (matchedKids.length < tokens.length) {
          status = 'warning';
          note = `Only ${matchedKids.length} of ${tokens.length} students were resolved.`;
        }

        reconciliationList.push({
          rowNumber: rowNum,
          identifier: email,
          entity: 'Parent-Student Link',
          matchedRecord: matchedKids.map((k) => `${k.name} (${k.admissionNumber})`).join(', ') || 'None',
          proposedRelationship: `Link ${fullName} to ${matchedKids.length} student(s)`,
          status,
          note,
          suggestedAction: status === 'matched' ? 'Link and provision parent account' : 'Review unlinked admission numbers',
        });
      }
    }

    return res.status(200).json({
      success: true,
      result: {
        totalReconciled: reconciliationList.length,
        items: reconciliationList,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Commit Import (Safe Staged Commit + Audit Logging)
const commitImport = async (req, res) => {
  const startedAt = new Date();
  const jobId = `IMP-${Date.now()}-${uniqueId()}`;
  const performedBy = req.admin?._id;
  const performedByName = req.admin?.name ? `${req.admin.name} ${req.admin.surname || ''}`.trim() : 'Administrator';

  const { importType, rows, columnMapping, provisionAccounts, fileName, fileSize } = req.body;

  if (!IMPORT_SCHEMAS[importType]) {
    return res.status(400).json({ success: false, message: 'Invalid import type.' });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No rows to commit.' });
  }

  if (rows.length > 5000) {
    return res.status(400).json({
      success: false,
      message: `Batch contains ${rows.length} records, exceeding the maximum allowed batch limit of 5,000 records.`,
    });
  }

  const ImportJob = mongoose.model('ImportJob');
  const Student = mongoose.model('Student');
  const Teacher = mongoose.model('Teacher');
  const SchoolClass = mongoose.model('SchoolClass');
  const Section = mongoose.model('Section');
  const Subject = mongoose.model('Subject');
  const FeeStructure = mongoose.model('FeeStructure');
  const Admin = mongoose.model('Admin');
  const AdminPassword = mongoose.model('AdminPassword');

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let accountsProvisioned = 0;
  let reconciledCount = 0;
  const errors = [];
  const createdRecordIds = []; // For compensating rollback in case of catastrophic error

  try {
    // Pre-commit validation: Check 120-student class-section capacity before writing any records
    if (importType === 'students') {
      const [allClasses, allSections] = await Promise.all([
        SchoolClass.find({ removed: false }),
        Section.find({ removed: false }),
      ]);

      const batchAdms = rows.map((r) => {
        const mapped = mapRow(r, columnMapping);
        return String(mapped.admissionNumber || '').trim().toUpperCase();
      }).filter(Boolean);

      const existingBatchStudents = await Student.find({
        admissionNumber: { $in: batchAdms },
        removed: false,
      }).select('admissionNumber schoolClass section status');

      const existingStudentMap = new Map();
      existingBatchStudents.forEach((s) => {
        if (s.admissionNumber) existingStudentMap.set(s.admissionNumber.toUpperCase(), s);
      });

      const destCounts = new Map();

      for (let i = 0; i < rows.length; i++) {
        const mapped = mapRow(rows[i], columnMapping);
        const adm = String(mapped.admissionNumber || '').trim().toUpperCase();
        if (!adm) continue;

        const rawClass = mapped.className || mapped.schoolClass || mapped.classId;
        const rawSec = mapped.sectionName || mapped.section || mapped.sectionId;
        if (!rawClass) continue;

        const cStr = String(rawClass).trim().toLowerCase();
        const matchedClass = allClasses.find(
          (c) =>
            (c._id && c._id.toString() === String(rawClass).trim()) ||
            c.name.toLowerCase() === cStr ||
            (c.code && c.code.toLowerCase() === cStr)
        );

        let matchedSec = null;
        if (matchedClass && rawSec) {
          const sStr = String(rawSec).trim().toLowerCase();
          matchedSec = allSections.find(
            (s) =>
              (s.schoolClass?._id?.toString() === matchedClass._id.toString() ||
                s.schoolClass?.toString() === matchedClass._id.toString()) &&
              ((s._id && s._id.toString() === String(rawSec).trim()) ||
                s.name.toLowerCase() === sStr ||
                (s.code && s.code.toLowerCase() === sStr))
          );
        }

        if (matchedClass && matchedSec) {
          const destKey = `${matchedClass._id.toString()}:${matchedSec._id.toString()}`;
          if (!destCounts.has(destKey)) {
            destCounts.set(destKey, {
              classId: matchedClass._id.toString(),
              sectionId: matchedSec._id.toString(),
              className: matchedClass.name,
              sectionName: matchedSec.name,
              incomingAdms: new Set(),
            });
          }

          const existingStu = existingStudentMap.get(adm);
          const isSame =
            existingStu &&
            (existingStu.schoolClass?._id?.toString() === matchedClass._id.toString() ||
              existingStu.schoolClass?.toString() === matchedClass._id.toString()) &&
            (existingStu.section?._id?.toString() === matchedSec._id.toString() ||
              existingStu.section?.toString() === matchedSec._id.toString());

          if (!isSame) {
            destCounts.get(destKey).incomingAdms.add(adm);
          }
        }
      }

      const capacityViolations = [];
      for (const [, destInfo] of destCounts.entries()) {
        const currentEnrolled = await Student.countDocuments({
          schoolClass: destInfo.classId,
          section: destInfo.sectionId,
          removed: false,
          status: { $ne: 'inactive' },
        });
        const incomingCount = destInfo.incomingAdms.size;
        if (currentEnrolled + incomingCount > 120) {
          capacityViolations.push({
            class: destInfo.className,
            section: destInfo.sectionName,
            currentlyEnrolled: currentEnrolled,
            incomingNewEnrollments: incomingCount,
            projectedTotal: currentEnrolled + incomingCount,
            maxCapacity: 120,
          });
        }
      }

      if (capacityViolations.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Import rejected: Maximum class-section capacity of 120 students would be exceeded for ${capacityViolations.length} section(s).`,
          capacityViolations,
        });
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const row = mapRow(rows[i], columnMapping);

      try {
        if (importType === 'students') {
          const adm = String(row.admissionNumber || '').trim().toUpperCase();
          if (!adm) {
            skippedCount++;
            continue;
          }

          // 1. Resolve Class & Section (supporting names, codes, and ObjectIds)
          const rawClass = row.className || row.schoolClass || row.classId;
          const rawSec = row.sectionName || row.section || row.sectionId;
          row.className = rawClass;
          row.sectionName = rawSec;

          let classDoc = null;
          if (row.className) {
            const classQuery = mongoose.Types.ObjectId.isValid(row.className)
              ? { _id: row.className, removed: false }
              : {
                  $or: [
                    { name: new RegExp(`^${row.className}$`, 'i') },
                    { code: new RegExp(`^${row.className}$`, 'i') },
                  ],
                  removed: false,
                };
            classDoc = await SchoolClass.findOne(classQuery);
            if (!classDoc) {
              classDoc = await new SchoolClass({
                name: row.className,
                code: row.className.toUpperCase().replace(/\s+/g, '-'),
              }).save();
              createdRecordIds.push({ model: 'SchoolClass', id: classDoc._id });
            }
          }

          let secDoc = null;
          if (classDoc && row.sectionName) {
            const secQuery = mongoose.Types.ObjectId.isValid(row.sectionName)
              ? { _id: row.sectionName, schoolClass: classDoc._id, removed: false }
              : {
                  schoolClass: classDoc._id,
                  $or: [
                    { name: new RegExp(`^${row.sectionName}$`, 'i') },
                    { code: new RegExp(`^${row.sectionName}$`, 'i') },
                  ],
                  removed: false,
                };
            secDoc = await Section.findOne(secQuery);
            if (!secDoc) {
              secDoc = await new Section({
                name: row.sectionName,
                code: `${classDoc.code || 'CLS'}-${row.sectionName}`,
                schoolClass: classDoc._id,
              }).save();
              createdRecordIds.push({ model: 'Section', id: secDoc._id });
            }
          }

          // 2. Upsert Student
          const studentPayload = {
            name: row.firstName || 'Student',
            surname: row.lastName || '',
            admissionNumber: adm,
            studentId: row.studentId || adm,
            academicYear: row.academicYear || '2026-2027',
            rollNumber: row.rollNumber || '',
            schoolClass: classDoc ? classDoc._id : undefined,
            section: secDoc ? secDoc._id : undefined,
            gender: row.gender || undefined,
            dob: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
            phone: row.studentMobile || '',
            email: row.studentEmail ? String(row.studentEmail).toLowerCase() : '',
            guardianName: row.parentName || '',
            guardianPhone: row.parentMobile || '',
            guardianEmail: row.parentEmail ? String(row.parentEmail).toLowerCase() : '',
            guardianRelation: row.parentRelationship || 'Parent',
            address: row.address || '',
            bloodGroup: row.bloodGroup || '',
            emergencyContact: row.emergencyContact || '',
            medicalNotes: row.medicalNotes || '',
            nationality: row.nationality || 'Citizen',
            photo: row.photographUrl || '',
          };

          let studentDoc = await Student.findOne({ admissionNumber: adm });
          if (studentDoc) {
            Object.assign(studentDoc, studentPayload);
            await studentDoc.save();
            updatedCount++;
          } else {
            studentDoc = await new Student(studentPayload).save();
            createdRecordIds.push({ model: 'Student', id: studentDoc._id });
            createdCount++;
          }
          reconciledCount++;

          // 3. Optional Account Provisioning
          if (provisionAccounts && (row.studentEmail || adm)) {
            const loginEmail = row.studentEmail ? row.studentEmail.toLowerCase() : `${adm.toLowerCase()}@school.local`;
            let existingUser = await Admin.findOne({ email: loginEmail });
            if (!existingUser) {
              const tempPass = generateSecurePassword(12);
              const newUser = await new Admin({
                email: loginEmail,
                name: row.firstName,
                surname: row.lastName,
                role: 'student',
                studentRef: studentDoc._id,
                enabled: true,
              }).save();

              const newPass = new AdminPassword();
              const salt = uniqueId();
              const hash = newPass.generateHash(salt, tempPass);
              await new AdminPassword({
                user: newUser._id,
                password: hash,
                salt,
                emailVerified: true,
              }).save();
              accountsProvisioned++;
            } else if (!existingUser.studentRef) {
              existingUser.studentRef = studentDoc._id;
              await existingUser.save();
            }
          }
        } else if (importType === 'teachers') {
          const empId = String(row.employeeId || '').trim().toUpperCase();
          const email = String(row.email || '').trim().toLowerCase();
          if (!email) {
            skippedCount++;
            continue;
          }

          let teacherDoc = await Teacher.findOne({
            $or: [{ email }, ...(empId ? [{ employeeId: empId }] : [])],
          });

          // Resolve assigned classes
          const classIds = [];
          if (row.assignedClassCodes) {
            const classTokens = String(row.assignedClassCodes).split(',').map((t) => t.trim());
            for (const t of classTokens) {
              const found = await SchoolClass.findOne({
                $or: [{ name: new RegExp(`^${t}$`, 'i') }, { code: new RegExp(`^${t}$`, 'i') }],
                removed: false,
              });
              if (found) classIds.push(found._id);
            }
          }

          // Resolve assigned subjects
          const subjectIds = [];
          if (row.assignedSubjectCodes) {
            const subTokens = String(row.assignedSubjectCodes).split(',').map((t) => t.trim());
            for (const t of subTokens) {
              const found = await Subject.findOne({
                $or: [{ code: new RegExp(`^${t}$`, 'i') }, { name: new RegExp(`^${t}$`, 'i') }],
                removed: false,
              });
              if (found) subjectIds.push(found._id);
            }
          }

          const teacherPayload = {
            name: row.firstName || 'Teacher',
            surname: row.lastName || '',
            employeeId: empId || undefined,
            email,
            phone: row.mobile || '',
            gender: row.gender || undefined,
            qualification: row.qualification || '',
            specialization: row.specialization || '',
            joiningDate: row.joiningDate ? new Date(row.joiningDate) : undefined,
            salary: row.salary ? Number(row.salary) : undefined,
            status: row.status || 'active',
            ...(classIds.length > 0 && { assignedClasses: classIds }),
            ...(subjectIds.length > 0 && { assignedSubjects: subjectIds }),
          };

          if (teacherDoc) {
            Object.assign(teacherDoc, teacherPayload);
            await teacherDoc.save();
            updatedCount++;
          } else {
            teacherDoc = await new Teacher(teacherPayload).save();
            createdRecordIds.push({ model: 'Teacher', id: teacherDoc._id });
            createdCount++;
          }
          reconciledCount++;

          // Account provisioning
          if (provisionAccounts) {
            let existingUser = await Admin.findOne({ email });
            if (!existingUser) {
              const tempPass = generateSecurePassword(12);
              const newUser = await new Admin({
                email,
                name: row.firstName,
                surname: row.lastName,
                role: 'teacher',
                teacherRef: teacherDoc._id,
                enabled: true,
              }).save();

              const newPass = new AdminPassword();
              const salt = uniqueId();
              const hash = newPass.generateHash(salt, tempPass);
              await new AdminPassword({
                user: newUser._id,
                password: hash,
                salt,
                emailVerified: true,
              }).save();
              accountsProvisioned++;
            } else if (!existingUser.teacherRef) {
              existingUser.teacherRef = teacherDoc._id;
              await existingUser.save();
            }
          }
        } else if (importType === 'parents') {
          const email = String(row.email || '').trim().toLowerCase();
          if (!email) {
            skippedCount++;
            continue;
          }

          const tokens = String(row.studentAdmissionNumbers || '')
            .split(',')
            .map((t) => t.trim().toUpperCase())
            .filter(Boolean);

          const matchedKids = await Student.find({
            admissionNumber: { $in: tokens },
            removed: false,
          });

          const studentIds = matchedKids.map((k) => k._id);

          // Update student records with parent details
          for (const kid of matchedKids) {
            kid.guardianName = row.fullName || kid.guardianName;
            kid.guardianEmail = email;
            kid.guardianPhone = row.mobile || kid.guardianPhone;
            kid.guardianRelation = row.relationship || kid.guardianRelation;
            await kid.save();
          }

          // User account
          let parentUser = await Admin.findOne({ email });
          if (!parentUser) {
            const tempPass = generateSecurePassword(12);
            parentUser = await new Admin({
              email,
              name: row.fullName || 'Parent',
              role: 'parent',
              parentStudentRef: studentIds[0] || undefined,
              parentStudentRefs: studentIds,
              enabled: true,
            }).save();

            const newPass = new AdminPassword();
            const salt = uniqueId();
            const hash = newPass.generateHash(salt, tempPass);
            await new AdminPassword({
              user: parentUser._id,
              password: hash,
              salt,
              emailVerified: true,
            }).save();
            createdCount++;
            accountsProvisioned++;
          } else {
            parentUser.parentStudentRefs = Array.from(
              new Set([...(parentUser.parentStudentRefs || []), ...studentIds])
            );
            if (!parentUser.parentStudentRef && studentIds[0]) {
              parentUser.parentStudentRef = studentIds[0];
            }
            await parentUser.save();
            updatedCount++;
          }
          reconciledCount += studentIds.length;
        } else if (importType === 'classes_sections') {
          let classDoc = await SchoolClass.findOne({
            $or: [{ name: new RegExp(`^${row.className}$`, 'i') }, { code: new RegExp(`^${row.classCode || row.className}$`, 'i') }],
            removed: false,
          });

          if (!classDoc) {
            classDoc = await new SchoolClass({
              name: row.className,
              code: row.classCode || row.className.toUpperCase().replace(/\s+/g, '-'),
              grade: row.grade ? Number(row.grade) : undefined,
              capacity: row.capacity ? Number(row.capacity) : 40,
            }).save();
            createdCount++;
            createdRecordIds.push({ model: 'SchoolClass', id: classDoc._id });
          }

          if (row.sectionName) {
            let secDoc = await Section.findOne({
              schoolClass: classDoc._id,
              $or: [{ name: new RegExp(`^${row.sectionName}$`, 'i') }, { code: new RegExp(`^${row.sectionCode || row.sectionName}$`, 'i') }],
              removed: false,
            });

            if (!secDoc) {
              secDoc = await new Section({
                name: row.sectionName,
                code: row.sectionCode || `${classDoc.code || 'CLS'}-${row.sectionName}`,
                schoolClass: classDoc._id,
                roomNumber: row.roomNumber || '',
                capacity: row.capacity ? Number(row.capacity) : 35,
              }).save();
              createdCount++;
              createdRecordIds.push({ model: 'Section', id: secDoc._id });
            } else {
              if (row.roomNumber) secDoc.roomNumber = row.roomNumber;
              await secDoc.save();
              updatedCount++;
            }
          }
          reconciledCount++;
        } else if (importType === 'subjects') {
          const classDoc = await SchoolClass.findOne({
            $or: [{ name: new RegExp(`^${row.className}$`, 'i') }, { code: new RegExp(`^${row.className}$`, 'i') }],
            removed: false,
          });

          if (!classDoc) {
            throw new Error(`Associated class '${row.className}' not found for subject '${row.subjectName}'.`);
          }

          let teacherDoc = null;
          if (row.teacherEmployeeId) {
            teacherDoc = await Teacher.findOne({
              $or: [
                { employeeId: String(row.teacherEmployeeId).toUpperCase() },
                { email: String(row.teacherEmployeeId).toLowerCase() },
              ],
              removed: false,
            });
          }

          let subDoc = await Subject.findOne({
            code: new RegExp(`^${row.subjectCode}$`, 'i'),
            schoolClass: classDoc._id,
            removed: false,
          });

          if (subDoc) {
            subDoc.name = row.subjectName || subDoc.name;
            subDoc.type = row.type || subDoc.type;
            subDoc.credits = row.credits ? Number(row.credits) : subDoc.credits;
            if (teacherDoc) subDoc.teacher = teacherDoc._id;
            await subDoc.save();
            updatedCount++;
          } else {
            subDoc = await new Subject({
              name: row.subjectName,
              code: row.subjectCode,
              schoolClass: classDoc._id,
              type: row.type || 'Theory',
              credits: row.credits ? Number(row.credits) : 3,
              teacher: teacherDoc ? teacherDoc._id : undefined,
            }).save();
            createdCount++;
            createdRecordIds.push({ model: 'Subject', id: subDoc._id });
          }
          reconciledCount++;
        } else if (importType === 'assignments') {
          const teacherDoc = await Teacher.findOne({
            $or: [
              { employeeId: String(row.teacherEmployeeId).toUpperCase() },
              { email: String(row.teacherEmployeeId).toLowerCase() },
            ],
            removed: false,
          });

          if (!teacherDoc) {
            throw new Error(`Teacher '${row.teacherEmployeeId}' not found for assignment.`);
          }

          const classDoc = await SchoolClass.findOne({
            $or: [{ name: new RegExp(`^${row.classCode}$`, 'i') }, { code: new RegExp(`^${row.classCode}$`, 'i') }],
            removed: false,
          });

          if (!classDoc) {
            throw new Error(`Class '${row.classCode}' not found.`);
          }

          const secDoc = await Section.findOne({
            schoolClass: classDoc._id,
            $or: [{ name: new RegExp(`^${row.sectionCode}$`, 'i') }, { code: new RegExp(`^${row.sectionCode}$`, 'i') }],
            removed: false,
          });

          const subDoc = await Subject.findOne({
            code: new RegExp(`^${row.subjectCode}$`, 'i'),
            schoolClass: classDoc._id,
            removed: false,
          });

          // Add to teacher's assignments
          let updated = false;
          if (!teacherDoc.assignedClasses.includes(classDoc._id)) {
            teacherDoc.assignedClasses.push(classDoc._id);
            updated = true;
          }
          if (secDoc && !teacherDoc.assignedSections.includes(secDoc._id)) {
            teacherDoc.assignedSections.push(secDoc._id);
            updated = true;
          }
          if (subDoc && !teacherDoc.assignedSubjects.includes(subDoc._id)) {
            teacherDoc.assignedSubjects.push(subDoc._id);
            updated = true;
          }
          if (updated) await teacherDoc.save();

          // Class teacher allocation if specified
          const isCT = String(row.isClassTeacher).toLowerCase() === 'yes' || row.isClassTeacher === true || row.isClassTeacher === 'true';
          if (isCT && secDoc) {
            secDoc.classTeacher = teacherDoc._id;
            await secDoc.save();
          }

          reconciledCount++;
          updatedCount++;
        } else if (importType === 'fee_structures') {
          const classDoc = await SchoolClass.findOne({
            $or: [{ name: new RegExp(`^${row.className}$`, 'i') }, { code: new RegExp(`^${row.className}$`, 'i') }],
            removed: false,
          });

          if (!classDoc) {
            throw new Error(`Class '${row.className}' not found for fee structure.`);
          }

          const feeDoc = await new FeeStructure({
            title: row.title,
            schoolClass: classDoc._id,
            amount: Number(row.amount),
            concessionAmount: row.concessionAmount ? Number(row.concessionAmount) : 0,
            feeType: row.feeType || 'Tuition',
            academicYear: row.academicYear || '2026-2027',
            dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
          }).save();

          createdCount++;
          createdRecordIds.push({ model: 'FeeStructure', id: feeDoc._id });
          reconciledCount++;
        }
      } catch (rowErr) {
        failedCount++;
        errors.push({
          row: rowNum,
          field: 'commit',
          value: JSON.stringify(row),
          message: rowErr.message,
          type: 'error',
        });
      }
    }

    const completedAt = new Date();
    const finalStatus = failedCount === 0 ? 'completed' : createdCount > 0 ? 'partial' : 'failed';

    const job = await new ImportJob({
      jobId,
      importType,
      fileName: fileName || `${importType}_batch_upload.xlsx`,
      fileSize: fileSize || 0,
      totalRows: rows.length,
      validRows: createdCount + updatedCount,
      invalidRows: failedCount,
      createdCount,
      updatedCount,
      skippedCount,
      failedCount,
      accountsProvisioned,
      reconciledCount,
      status: finalStatus,
      errors,
      performedBy,
      performedByName,
      startedAt,
      completedAt,
    }).save();

    return res.status(200).json({
      success: true,
      result: {
        jobId,
        importType,
        totalRows: rows.length,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        accountsProvisioned,
        reconciledCount,
        status: finalStatus,
        errors,
        startedAt,
        completedAt,
      },
    });
  } catch (fatalError) {
    // Compensating rollback for newly created records in non-transactional environment
    for (const rec of createdRecordIds) {
      try {
        await mongoose.model(rec.model).findByIdAndDelete(rec.id);
      } catch (e) {
        // Continue compensating cleanup
      }
    }

    await new ImportJob({
      jobId,
      importType,
      fileName: fileName || `${importType}_batch_upload.xlsx`,
      totalRows: rows.length,
      status: 'failed',
      errors: [{ row: 0, field: 'batch', message: fatalError.message, type: 'fatal' }],
      performedBy,
      performedByName,
      startedAt,
      completedAt: new Date(),
    }).save();

    return res.status(500).json({
      success: false,
      message: `Fatal error during import commit: ${fatalError.message}. Compensating rollback executed.`,
    });
  }
};

// 6. List Import History
const getImportJobs = async (req, res) => {
  try {
    const ImportJob = mongoose.model('ImportJob');
    const { type, status } = req.query;

    const query = { removed: false };
    if (type) query.importType = type;
    if (status) query.status = status;

    const jobs = await ImportJob.find(query).sort({ startedAt: -1 }).limit(50);

    return res.status(200).json({
      success: true,
      result: jobs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Get Single Import Job Details
const getImportJob = async (req, res) => {
  try {
    const ImportJob = mongoose.model('ImportJob');
    const job = await ImportJob.findOne({ jobId: req.params.jobId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Import job not found.' });
    }
    return res.status(200).json({ success: true, result: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Export Job Report (Safe from Formula Injection)
const exportJobReport = async (req, res) => {
  try {
    const ImportJob = mongoose.model('ImportJob');
    const job = await ImportJob.findOne({ jobId: req.params.jobId });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Import job not found.' });
    }

    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';

    // Summary Sheet
    const summaryData = [
      ['Import Job Audit Report', ''],
      ['Job ID', job.jobId],
      ['Import Type', job.importType],
      ['File Name', sanitizeFormulaInjection(job.fileName || '')],
      ['Status', job.status],
      ['Total Rows', job.totalRows],
      ['Created Records', job.createdCount],
      ['Updated Records', job.updatedCount],
      ['Skipped Records', job.skippedCount],
      ['Failed Records', job.failedCount],
      ['Accounts Provisioned', job.accountsProvisioned],
      ['Reconciled Count', job.reconciledCount],
      ['Performed By', sanitizeFormulaInjection(job.performedByName || 'Admin')],
      ['Started At', job.startedAt ? job.startedAt.toISOString() : ''],
      ['Completed At', job.completedAt ? job.completedAt.toISOString() : ''],
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Errors Sheet
    const errorData = [['Row Number', 'Field', 'Supplied Value', 'Error / Warning Message']];
    for (const err of job.errors || []) {
      errorData.push([
        err.row || 0,
        sanitizeFormulaInjection(err.field || ''),
        sanitizeFormulaInjection(String(err.value || '')),
        sanitizeFormulaInjection(err.message || ''),
      ]);
    }
    const wsErrors = XLSX.utils.aoa_to_sheet(errorData);
    wsErrors['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsErrors, 'Issues_Log');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(wsErrors);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${job.jobId}_report.csv"`);
      return res.status(200).send(csv);
    } else {
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${job.jobId}_report.xlsx"`);
      return res.status(200).send(buffer);
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  downloadTemplate,
  parseSpreadsheet,
  validateBatch,
  reconcileBatch,
  commitImport,
  getImportJobs,
  getImportJob,
  exportJobReport,
};
