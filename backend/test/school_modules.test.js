require('module-alias/register');
const path = require('path');
const { globSync } = require('glob');
const { describe, it } = require('node:test');
const assert = require('node:assert');

// Register all mongoose models
const modelsFiles = globSync(path.join(__dirname, '../src/models/**/*.js').replace(/\\/g, '/'));
for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

const schoolAttendance = require('../src/controllers/schoolControllers/schoolAttendanceController');
const schoolExam = require('../src/controllers/schoolControllers/schoolExamController');
const schoolFee = require('../src/controllers/schoolControllers/schoolFeeController');

function createMockResponse() {
  const res = {
    statusCode: null,
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

describe('Attendance Controller Validation & IDOR Protection', () => {
  it('rejects bulkMarkAttendance with missing required fields', async () => {
    const req = {
      body: { schoolClass: '6acbb58f936611745b4b92c4' },
      admin: { role: 'teacher' },
    };
    const res = createMockResponse();

    await schoolAttendance.bulkMarkAttendance(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  it('rejects bulkMarkAttendance with invalid ObjectId format', async () => {
    const req = {
      body: {
        schoolClass: 'invalid-id-123',
        section: 'invalid-sec',
        date: '2026-10-12',
        records: [{ student: '123' }],
      },
      admin: { role: 'teacher' },
    };
    const res = createMockResponse();

    await schoolAttendance.bulkMarkAttendance(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Invalid schoolClass or section ID/);
  });

  it('rejects bulkMarkAttendance with future date', async () => {
    const req = {
      body: {
        schoolClass: '6acbb58f936611745b4b92c4',
        section: '6acbb58f936611745b4b92c5',
        date: '2099-01-01',
        records: [{ student: '6acbb58f936611745b4b92c6' }],
      },
      admin: { role: 'teacher' },
    };
    const res = createMockResponse();

    await schoolAttendance.bulkMarkAttendance(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /future dates/);
  });

  it('prevents students from accessing another student attendance (IDOR protection)', async () => {
    const req = {
      params: { studentId: '6acbb590936611745b4b92d6' },
      admin: { role: 'student', studentRef: '6acbb590936611745b4b92aa' },
    };
    const res = createMockResponse();

    await schoolAttendance.getStudentAttendance(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Access denied/);
  });

  it('prevents students from accessing class attendance reports', async () => {
    const req = {
      query: { schoolClass: '6acbb58f936611745b4b92c4' },
      admin: { role: 'student' },
    };
    const res = createMockResponse();

    await schoolAttendance.getClassAttendanceReport(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });
});

describe('Exam Controller Validation & Bounds Checking', () => {
  it('rejects bulkSaveMarks when missing exam or records', async () => {
    const req = {
      body: { exam: '6acbb58f936611745b4b92c4' },
      admin: { role: 'teacher' },
    };
    const res = createMockResponse();

    await schoolExam.bulkSaveMarks(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  it('rejects bulkSaveMarks with malformed ObjectIds', async () => {
    const req = {
      body: {
        exam: 'bad-exam-id',
        schoolClass: 'bad-class-id',
        subject: 'bad-sub-id',
        records: [{ student: '123' }],
      },
      admin: { role: 'teacher' },
    };
    const res = createMockResponse();

    await schoolExam.bulkSaveMarks(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /Invalid ObjectId format/);
  });

  it('prevents student from viewing another student report card (IDOR protection)', async () => {
    const req = {
      params: { studentId: '6acbb590936611745b4b92d6' },
      query: {},
      admin: { role: 'student', studentRef: '6acbb590936611745b4b92aa' },
    };
    const res = createMockResponse();

    await schoolExam.getStudentReportCard(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Access denied/);
  });
});

describe('Fee Controller Financial Integrity & IDOR Protection', () => {
  it('rejects fee payment recording when amount is zero or negative', async () => {
    const req = {
      body: {
        student: '6acbb590936611745b4b92d6',
        feeStructure: '6acbb590936611745b4b92d7',
        amountPaid: -500,
      },
      admin: { role: 'accountant' },
    };
    const res = createMockResponse();

    await schoolFee.recordFeePayment(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /positive number greater than zero/);
  });

  it('rejects fee payment recording with non-numeric amount', async () => {
    const req = {
      body: {
        student: '6acbb590936611745b4b92d6',
        feeStructure: '6acbb590936611745b4b92d7',
        amountPaid: 'not-a-number',
      },
      admin: { role: 'accountant' },
    };
    const res = createMockResponse();

    await schoolFee.recordFeePayment(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  it('prevents students from viewing other student fee balances (IDOR protection)', async () => {
    const req = {
      params: { studentId: '6acbb590936611745b4b92d6' },
      admin: { role: 'student', studentRef: '6acbb590936611745b4b92aa' },
    };
    const res = createMockResponse();

    await schoolFee.getStudentBalance(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Access denied/);
  });

  it('rejects refund with invalid payment ObjectId', async () => {
    const req = {
      params: { id: 'invalid-payment-id' },
      body: { refundReason: 'Test' },
      admin: { role: 'accountant' },
    };
    const res = createMockResponse();

    await schoolFee.refundFeePayment(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Invalid payment ID/);
  });
});
