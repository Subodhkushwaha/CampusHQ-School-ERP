require('module-alias/register');
const path = require('path');
const { globSync } = require('glob');
const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

// Register all mongoose models
const modelsFiles = globSync(path.join(__dirname, '../src/models/**/*.js').replace(/\\/g, '/'));
for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

const schoolImport = require('../src/controllers/schoolControllers/schoolImportController');
const schoolAttendance = require('../src/controllers/schoolControllers/schoolAttendanceController');
const { sanitizeFormulaInjection } = require('../src/controllers/schoolControllers/importHelper');
const errorHandlers = require('../src/handlers/errorHandlers');

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

// Model references
const Student = mongoose.model('Student');
const Teacher = mongoose.model('Teacher');
const SchoolClass = mongoose.model('SchoolClass');
const Section = mongoose.model('Section');
const Subject = mongoose.model('Subject');
const Admin = mongoose.model('Admin');

function withMockedModels(custom = {}, testFn) {
  return async () => {
    const origs = {
      studentFind: Student.find,
      teacherFind: Teacher.find,
      classFind: SchoolClass.find,
      secFind: Section.find,
      subFind: Subject.find,
    };

    Student.find = custom.students || (() => ({ select: async () => [] }));
    Teacher.find = custom.teachers || (() => ({ select: async () => [] }));
    SchoolClass.find = custom.classes || (() => ({ select: async () => [] }));
    Section.find = custom.sections || (() => ({ select: async () => [] }));
    Subject.find = custom.subjects || (() => ({ select: async () => [] }));

    try {
      await testFn();
    } finally {
      Student.find = origs.studentFind;
      Teacher.find = origs.teacherFind;
      SchoolClass.find = origs.classFind;
      Section.find = origs.secFind;
      Subject.find = origs.subFind;
    }
  };
}

describe('Bulk Student Import & Class Capacity (120 Max)', () => {
  it('accepts 100 valid students into a class-section with sufficient capacity', withMockedModels({
    classes: () => ({ select: async () => [{ _id: '6acbb58f936611745b4b92c1', name: 'Grade 10', code: 'G10' }] }),
    sections: () => ({ select: async () => [{ _id: '6acbb58f936611745b4b92c2', name: 'Section A', code: 'G10-A', schoolClass: '6acbb58f936611745b4b92c1' }] }),
    students: () => ({ select: async () => [] }),
  }, async () => {
    const rows = [];
    for (let i = 1; i <= 100; i++) {
      rows.push({
        admissionNumber: `ADM-G10A-${String(i).padStart(3, '0')}`,
        firstName: `Student${i}`,
        lastName: 'Test',
        className: 'Grade 10',
        sectionName: 'Section A',
      });
    }

    const req = {
      body: {
        importType: 'students',
        rows,
        columnMapping: {
          admissionNumber: 'admissionNumber',
          firstName: 'firstName',
          lastName: 'lastName',
          className: 'className',
          sectionName: 'sectionName',
        },
      },
    };
    const res = createMockResponse();

    await schoolImport.validateBatch(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.result.summary.validRows, 100);
    assert.strictEqual(res.body.result.summary.invalidRows, 0);
  }));

  it('accepts 1,000 students distributed across 10 valid class-sections within capacity', withMockedModels({
    classes: () => {
      const cls = [];
      for (let c = 1; c <= 10; c++) cls.push({ _id: `cls_id_${c}`, name: `Grade ${c}`, code: `G${c}` });
      return { select: async () => cls };
    },
    sections: () => {
      const secs = [];
      for (let c = 1; c <= 10; c++) secs.push({ _id: `sec_id_${c}`, name: 'Section A', code: `G${c}-A`, schoolClass: `cls_id_${c}` });
      return { select: async () => secs };
    },
    students: () => ({ select: async () => [] }),
  }, async () => {
    const rows = [];
    for (let c = 1; c <= 10; c++) {
      for (let s = 1; s <= 100; s++) {
        rows.push({
          admissionNumber: `ADM-G${c}-${String(s).padStart(3, '0')}`,
          firstName: `Stu${c}_${s}`,
          lastName: 'User',
          className: `Grade ${c}`,
          sectionName: 'Section A',
        });
      }
    }

    const req = {
      body: {
        importType: 'students',
        rows,
        columnMapping: {
          admissionNumber: 'admissionNumber',
          firstName: 'firstName',
          lastName: 'lastName',
          className: 'className',
          sectionName: 'sectionName',
        },
      },
    };
    const res = createMockResponse();

    await schoolImport.validateBatch(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.result.summary.validRows, 1000);
    assert.strictEqual(res.body.result.summary.invalidRows, 0);
  }));

  it('accepts up to 5,000 records batch in validateBatch', withMockedModels({
    classes: () => ({ select: async () => [{ _id: 'cls_1', name: 'Grade 1', code: 'G1' }] }),
    sections: () => ({ select: async () => [{ _id: 'sec_1', name: 'Section A', code: 'G1-A', schoolClass: 'cls_1' }] }),
    students: () => ({ select: async () => [] }),
  }, async () => {
    const rows = new Array(5000).fill(null).map((_, i) => ({
      admissionNumber: `ADM-5K-${i + 1}`,
      firstName: `First${i + 1}`,
      lastName: 'Last',
      className: 'Grade 1',
    }));

    const req = {
      body: {
        importType: 'students',
        rows,
        columnMapping: {
          admissionNumber: 'admissionNumber',
          firstName: 'firstName',
          lastName: 'lastName',
          className: 'className',
        },
      },
    };
    const res = createMockResponse();

    await schoolImport.validateBatch(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.result.summary.totalRows, 5000);
  }));

  it('rejects batches exceeding 5,000 records (e.g. 5,001 rows) with clear error', async () => {
    const rows = new Array(5001).fill({ admissionNumber: 'ADM-01', firstName: 'John' });
    const req = {
      body: {
        importType: 'students',
        rows,
      },
    };
    const res = createMockResponse();

    await schoolImport.validateBatch(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /5,000/);
  });

  it('rejects a batch that exceeds the 120-student capacity for any destination class-section', withMockedModels({
    classes: () => ({ select: async () => [{ _id: 'cls_cap', name: 'Grade 10', code: 'G10' }] }),
    sections: () => ({ select: async () => [{ _id: 'sec_cap', name: 'Section A', code: 'G10-A', schoolClass: 'cls_cap' }] }),
    students: () => {
      const existing = [];
      for (let i = 1; i <= 100; i++) {
        existing.push({
          _id: `existing_${i}`,
          admissionNumber: `ADM-EXIST-${i}`,
          schoolClass: 'cls_cap',
          section: 'sec_cap',
          status: 'active',
        });
      }
      return { select: async () => existing };
    },
  }, async () => {
    // 100 existing + 21 incoming = 121 (> 120 capacity)
    const rows = [];
    for (let i = 1; i <= 21; i++) {
      rows.push({
        admissionNumber: `ADM-NEW-${i}`,
        firstName: `NewStudent${i}`,
        lastName: 'Test',
        className: 'Grade 10',
        sectionName: 'Section A',
      });
    }

    const req = {
      body: {
        importType: 'students',
        rows,
        columnMapping: {
          admissionNumber: 'admissionNumber',
          firstName: 'firstName',
          lastName: 'lastName',
          className: 'className',
          sectionName: 'sectionName',
        },
      },
    };
    const res = createMockResponse();

    await schoolImport.validateBatch(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.result.summary.invalidRows > 0, true);
    const capacityIssue = res.body.result.issues.find((iss) => iss.message.includes('120'));
    assert.ok(capacityIssue, 'Expected capacity issue mentioning 120 students');
  }));

  it('accepts a batch that brings a section to exactly 120 students (100 existing + 20 new)', withMockedModels({
    classes: () => ({ select: async () => [{ _id: 'cls_cap', name: 'Grade 10', code: 'G10' }] }),
    sections: () => ({ select: async () => [{ _id: 'sec_cap', name: 'Section A', code: 'G10-A', schoolClass: 'cls_cap' }] }),
    students: () => {
      const existing = [];
      for (let i = 1; i <= 100; i++) {
        existing.push({
          _id: `existing_${i}`,
          admissionNumber: `ADM-EXIST-${i}`,
          schoolClass: 'cls_cap',
          section: 'sec_cap',
          status: 'active',
        });
      }
      return { select: async () => existing };
    },
  }, async () => {
    // 100 existing + 20 incoming = 120 (allowed!)
    const rows = [];
    for (let i = 1; i <= 20; i++) {
      rows.push({
        admissionNumber: `ADM-NEW-${i}`,
        firstName: `NewStudent${i}`,
        lastName: 'Test',
        className: 'Grade 10',
        sectionName: 'Section A',
      });
    }

    const req = {
      body: {
        importType: 'students',
        rows,
        columnMapping: {
          admissionNumber: 'admissionNumber',
          firstName: 'firstName',
          lastName: 'lastName',
          className: 'className',
          sectionName: 'sectionName',
        },
      },
    };
    const res = createMockResponse();

    await schoolImport.validateBatch(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.result.summary.validRows, 20);
    assert.strictEqual(res.body.result.summary.invalidRows, 0);
  }));

  it('does not count updates to existing students in same section towards capacity', withMockedModels({
    classes: () => ({ select: async () => [{ _id: 'cls_cap', name: 'Grade 10', code: 'G10' }] }),
    sections: () => ({ select: async () => [{ _id: 'sec_cap', name: 'Section A', code: 'G10-A', schoolClass: 'cls_cap' }] }),
    students: () => {
      const existing = [];
      for (let i = 1; i <= 120; i++) {
        existing.push({
          _id: `existing_${i}`,
          admissionNumber: `ADM-FULL-${i}`,
          schoolClass: 'cls_cap',
          section: 'sec_cap',
          status: 'active',
        });
      }
      return { select: async () => existing };
    },
  }, async () => {
    const rows = [];
    for (let i = 1; i <= 10; i++) {
      rows.push({
        admissionNumber: `ADM-FULL-${i}`,
        firstName: `Updated${i}`,
        lastName: 'Student',
        className: 'Grade 10',
        sectionName: 'Section A',
      });
    }

    const req = {
      body: {
        importType: 'students',
        rows,
        columnMapping: {
          admissionNumber: 'admissionNumber',
          firstName: 'firstName',
          lastName: 'lastName',
          className: 'className',
          sectionName: 'sectionName',
        },
      },
    };
    const res = createMockResponse();

    await schoolImport.validateBatch(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.result.summary.invalidRows, 0);
    assert.strictEqual(res.body.result.summary.updateRecords, 10);
  }));

  it('detects and rejects cross-class section assignment conflicts', withMockedModels({
    classes: () => ({
      select: async () => [
        { _id: 'cls_10', name: 'Grade 10', code: 'G10' },
        { _id: 'cls_9', name: 'Grade 9', code: 'G9' },
      ],
    }),
    sections: () => ({
      select: async () => [
        { _id: 'sec_a10', name: 'Section A', code: 'G10-A', schoolClass: { _id: 'cls_10', name: 'Grade 10' } },
      ],
    }),
    students: () => ({ select: async () => [] }),
  }, async () => {
    const req = {
      body: {
        importType: 'students',
        rows: [
          {
            admissionNumber: 'ADM-CONFLICT-01',
            firstName: 'Cross',
            lastName: 'Student',
            className: 'Grade 9', // Targeting Grade 9
            sectionName: 'Section A', // But Section A belongs to Grade 10!
          },
        ],
        columnMapping: {
          admissionNumber: 'admissionNumber',
          firstName: 'firstName',
          lastName: 'lastName',
          className: 'className',
          sectionName: 'sectionName',
        },
      },
    };
    const res = createMockResponse();

    await schoolImport.validateBatch(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.result.summary.invalidRows, 1);
    const conflictIssue = res.body.result.issues.find((iss) => iss.message.includes('belongs to'));
    assert.ok(conflictIssue, 'Expected cross-class section conflict error');
  }));

  it('sanitizes formula injection payloads in cell values safely', () => {
    const safe1 = sanitizeFormulaInjection('=SUM(A1:A10)');
    assert.strictEqual(safe1, "'=SUM(A1:A10)");

    const safe2 = sanitizeFormulaInjection('+12345678');
    assert.strictEqual(safe2, "'+12345678");

    const safe3 = sanitizeFormulaInjection('@dangerousCommand');
    assert.strictEqual(safe3, "'@dangerousCommand");

    const normal = sanitizeFormulaInjection('Regular Student Name');
    assert.strictEqual(normal, 'Regular Student Name');
  });

  it('handles multer LIMIT_FILE_SIZE with HTTP 413 and clear message', () => {
    const error = new Error('File too large');
    error.code = 'LIMIT_FILE_SIZE';

    const req = {};
    const res = createMockResponse();

    errorHandlers.productionErrors(error, req, res);
    assert.strictEqual(res.statusCode, 413);
    assert.match(res.body.message, /15 MB/);
  });

  it('handles entity.too.large with HTTP 413 and clear message', () => {
    const error = new Error('request entity too large');
    error.type = 'entity.too.large';
    error.status = 413;

    const req = {};
    const res = createMockResponse();

    errorHandlers.productionErrors(error, req, res);
    assert.strictEqual(res.statusCode, 413);
    assert.match(res.body.message, /Request payload exceeds/);
  });
});

describe('Attendance Workflow Integration & Validation', () => {
  it('rejects bulkMarkAttendance when students do not belong to the specified class and section', async () => {
    const classId = new mongoose.Types.ObjectId().toString();
    const sectionId = new mongoose.Types.ObjectId().toString();
    const student1Id = new mongoose.Types.ObjectId().toString();
    const student2Id = new mongoose.Types.ObjectId().toString();

    const origStuFind = Student.find;

    // Student 1 belongs to the class/section, but Student 2 belongs to another section
    Student.find = () => ({
      select: async () => [{ _id: student1Id }],
    });

    const req = {
      body: {
        schoolClass: classId,
        section: sectionId,
        date: '2026-10-12',
        records: [
          { student: student1Id, status: 'Present' },
          { student: student2Id, status: 'Present' },
        ],
      },
      admin: { role: 'admin' },
    };
    const res = createMockResponse();

    try {
      await schoolAttendance.bulkMarkAttendance(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(
        res.body.message,
        'Validation Error: 1 student(s) do not belong to the specified class and section.'
      );
      assert.deepStrictEqual(res.body.invalidStudentIds, [student2Id]);
    } finally {
      Student.find = origStuFind;
    }
  });

  it('verifies Student model pre-save hook blocks exceeding 120 students per class-section', async () => {
    const classId = new mongoose.Types.ObjectId();
    const sectionId = new mongoose.Types.ObjectId();

    const origCount = Student.countDocuments;
    // Simulate section already having 120 enrolled students
    Student.countDocuments = async () => 120;

    const newStudent = new Student({
      name: 'John',
      surname: 'Doe',
      admissionNumber: 'ADM-TEST-OVER-120',
      schoolClass: classId,
      section: sectionId,
      status: 'active',
      removed: false,
    });

    try {
      let caughtError = null;
      try {
        await newStudent.save();
      } catch (err) {
        caughtError = err;
      }
      assert.ok(caughtError, 'Expected capacity ValidationError to be thrown');
      assert.match(caughtError.message, /120/);
    } finally {
      Student.countDocuments = origCount;
    }
  });
});
