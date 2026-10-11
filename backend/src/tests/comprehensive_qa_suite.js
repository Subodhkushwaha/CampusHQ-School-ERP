const http = require('http');
const { sanitizeFormulaInjection, generateTemplateWorkbook, IMPORT_SCHEMAS } = require('../controllers/schoolControllers/importHelper');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888';

// HTTP helper
function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };

    let bodyData = null;
    if (data) {
      bodyData = JSON.stringify(data);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (e) {
          parsed = rawData;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

const testResults = [];

function recordTest(id, category, description, passed, details = '') {
  const result = { id, category, description, status: passed ? 'PASS' : 'FAIL', details };
  testResults.push(result);
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] ${id} - ${description}`);
  if (!passed && details) {
    console.log(`       Error details: ${details}`);
  }
}

async function runComprehensiveQASuite() {
  console.log('========================================================================');
  console.log(' CAMPUSHQ SCHOOL ERP — COMPREHENSIVE AUTOMATED QA & VERIFICATION SUITE');
  console.log(' Target URL: ' + BASE_URL);
  console.log('========================================================================\n');

  // Cache for tokens and IDs
  const tokens = {};
  const userProfiles = {};

  // ------------------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & CREDENTIAL VALIDATION ACROSS ALL ROLES
  // ------------------------------------------------------------------------
  console.log('--- SUITE 1: Authentication & Credential Validation ---');

  const testAccounts = [
    { role: 'owner', email: 'admin@admin.com', pass: 'admin123' },
    { role: 'principal', email: 'principal@school.edu', pass: 'principal123' },
    { role: 'teacher', email: 'teacher@school.edu', pass: 'teacher123' },
    { role: 'student', email: 'student@school.edu', pass: 'student123' },
    { role: 'parent', email: 'parent@school.edu', pass: 'parent123' },
    { role: 'accountant', email: 'accountant@school.edu', pass: 'accountant123' },
    { role: 'receptionist', email: 'receptionist@school.edu', pass: 'receptionist123' },
  ];

  for (const acc of testAccounts) {
    try {
      const res = await request('POST', '/api/login', { email: acc.email, password: acc.pass });
      const pass = res.statusCode === 200 && res.data?.success === true && Boolean(res.data?.result?.token);
      if (pass) {
        tokens[acc.role] = res.data.result.token;
        userProfiles[acc.role] = res.data.result.currentAdmin;
      }
      recordTest(
        `AUTH-LOGIN-${acc.role.toUpperCase()}`,
        'Authentication',
        `Valid credentials login for role '${acc.role}'`,
        pass,
        pass ? '' : `Status ${res.statusCode}: ${JSON.stringify(res.data)}`
      );
    } catch (err) {
      recordTest(`AUTH-LOGIN-${acc.role.toUpperCase()}`, 'Authentication', `Login for role '${acc.role}'`, false, err.message);
    }
  }

  // Negative Auth Tests
  try {
    const res = await request('POST', '/api/login', { email: 'admin@admin.com', password: 'WrongPassword999!' });
    const pass = res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 403;
    recordTest(
      'AUTH-NEG-INVALID-PW',
      'Authentication',
      'Reject login attempt with invalid password (401/403)',
      pass,
      `Received status ${res.statusCode}`
    );
  } catch (err) {
    recordTest('AUTH-NEG-INVALID-PW', 'Authentication', 'Reject invalid password', false, err.message);
  }

  try {
    const res = await request('POST', '/api/login', { email: 'nonexistent.user.999@school.edu', password: 'AnyPassword' });
    const pass = res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 404;
    recordTest(
      'AUTH-NEG-UNKNOWN-USER',
      'Authentication',
      'Reject login attempt for non-existent account',
      pass,
      `Received status ${res.statusCode}`
    );
  } catch (err) {
    recordTest('AUTH-NEG-UNKNOWN-USER', 'Authentication', 'Reject unknown user', false, err.message);
  }

  try {
    const res = await request('GET', '/api/school/stats');
    const pass = res.statusCode === 401;
    recordTest(
      'AUTH-NEG-MISSING-TOKEN',
      'Authentication',
      'Reject unauthenticated access to protected API without token (401)',
      pass,
      `Received status ${res.statusCode}`
    );
  } catch (err) {
    recordTest('AUTH-NEG-MISSING-TOKEN', 'Authentication', 'Reject missing token', false, err.message);
  }

  try {
    const res = await request('GET', '/api/school/stats', null, { Authorization: 'Bearer invalid.tampered.token.here' });
    const pass = res.statusCode === 401;
    recordTest(
      'AUTH-NEG-MALFORMED-TOKEN',
      'Authentication',
      'Reject forged/tampered JWT with HTTP 401 Unauthorized',
      pass,
      `Received status ${res.statusCode}`
    );
  } catch (err) {
    recordTest('AUTH-NEG-MALFORMED-TOKEN', 'Authentication', 'Reject tampered token', false, err.message);
  }

  // ------------------------------------------------------------------------
  // SUITE 2: ROLE-BASED ACCESS CONTROL (RBAC) AUTHORIZATION MATRIX
  // ------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Role-Based Authorization & Least Privilege Matrix ---');

  // Student forbidden from recording fee payment
  if (tokens.student) {
    try {
      const res = await request(
        'POST',
        '/api/feepayment/record',
        { student: 'anyId', feeStructure: 'anyId', amountPaid: 100 },
        { Authorization: `Bearer ${tokens.student}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'RBAC-STUDENT-RECORD-FEE',
        'Authorization',
        'Deny student attempt to record fee payments (403 Forbidden)',
        pass,
        `Status ${res.statusCode}`
      );
    } catch (err) {
      recordTest('RBAC-STUDENT-RECORD-FEE', 'Authorization', 'Deny student fee recording', false, err.message);
    }

    // Student forbidden from bulk marking attendance
    try {
      const res = await request(
        'POST',
        '/api/attendance/bulk-mark',
        { schoolClass: 'c1', section: 's1', date: '2026-10-10', records: [] },
        { Authorization: `Bearer ${tokens.student}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'RBAC-STUDENT-MARK-ATTENDANCE',
        'Authorization',
        'Deny student attempt to mark class attendance (403 Forbidden)',
        pass,
        `Status ${res.statusCode}`
      );
    } catch (err) {
      recordTest('RBAC-STUDENT-MARK-ATTENDANCE', 'Authorization', 'Deny student attendance marking', false, err.message);
    }

    // Student forbidden from bulk saving exam marks
    try {
      const res = await request(
        'POST',
        '/api/examresult/bulk-save',
        { exam: 'e1', schoolClass: 'c1', subject: 'sub1', records: [] },
        { Authorization: `Bearer ${tokens.student}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'RBAC-STUDENT-SAVE-MARKS',
        'Authorization',
        'Deny student attempt to submit exam marks (403 Forbidden)',
        pass,
        `Status ${res.statusCode}`
      );
    } catch (err) {
      recordTest('RBAC-STUDENT-SAVE-MARKS', 'Authorization', 'Deny student exam marks submission', false, err.message);
    }

    // Student forbidden from accessing import endpoints
    try {
      const res = await request(
        'POST',
        '/api/import/commit',
        { type: 'students', rows: [] },
        { Authorization: `Bearer ${tokens.student}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'RBAC-STUDENT-IMPORT-DATA',
        'Authorization',
        'Deny student access to bulk import commit endpoint (403 Forbidden)',
        pass,
        `Status ${res.statusCode}`
      );
    } catch (err) {
      recordTest('RBAC-STUDENT-IMPORT-DATA', 'Authorization', 'Deny student import access', false, err.message);
    }
  }

  // Teacher forbidden from financial payment recording
  if (tokens.teacher) {
    try {
      const res = await request(
        'POST',
        '/api/feepayment/record',
        { student: 'anyId', feeStructure: 'anyId', amountPaid: 100 },
        { Authorization: `Bearer ${tokens.teacher}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'RBAC-TEACHER-RECORD-FEE',
        'Authorization',
        'Deny teacher attempt to record fee payments (403 Forbidden)',
        pass,
        `Status ${res.statusCode}`
      );
    } catch (err) {
      recordTest('RBAC-TEACHER-RECORD-FEE', 'Authorization', 'Deny teacher fee recording', false, err.message);
    }
  }

  // Accountant forbidden from marking attendance
  if (tokens.accountant) {
    try {
      const res = await request(
        'POST',
        '/api/attendance/bulk-mark',
        { schoolClass: 'c1', section: 's1', date: '2026-10-10', records: [] },
        { Authorization: `Bearer ${tokens.accountant}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'RBAC-ACCOUNTANT-MARK-ATTENDANCE',
        'Authorization',
        'Deny accountant attempt to mark attendance (403 Forbidden)',
        pass,
        `Status ${res.statusCode}`
      );
    } catch (err) {
      recordTest('RBAC-ACCOUNTANT-MARK-ATTENDANCE', 'Authorization', 'Deny accountant attendance marking', false, err.message);
    }
  }

  // ------------------------------------------------------------------------
  // SUITE 3: INSECURE DIRECT OBJECT REFERENCE (IDOR) & OBJECT ACCESS SECURITY
  // ------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Insecure Direct Object Reference (IDOR) Defenses ---');

  const otherStudentDummyId = '660000000000000000000099';
  const otherTeacherDummyId = '660000000000000000000088';

  // IDOR 1: Student querying another student's attendance
  if (tokens.student) {
    try {
      const res = await request(
        'GET',
        `/api/attendance/student/${otherStudentDummyId}`,
        null,
        { Authorization: `Bearer ${tokens.student}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'SEC-IDOR-STUDENT-ATTENDANCE',
        'Security/IDOR',
        'Block student from accessing another student attendance via IDOR param (403)',
        pass,
        `Received status ${res.statusCode}: ${JSON.stringify(res.data)}`
      );
    } catch (err) {
      recordTest('SEC-IDOR-STUDENT-ATTENDANCE', 'Security/IDOR', 'Block student attendance IDOR', false, err.message);
    }

    // IDOR 2: Student querying another student's report card
    try {
      const res = await request(
        'GET',
        `/api/examresult/report-card/${otherStudentDummyId}`,
        null,
        { Authorization: `Bearer ${tokens.student}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'SEC-IDOR-STUDENT-REPORTCARD',
        'Security/IDOR',
        'Block student from accessing another student report card via IDOR param (403)',
        pass,
        `Received status ${res.statusCode}: ${JSON.stringify(res.data)}`
      );
    } catch (err) {
      recordTest('SEC-IDOR-STUDENT-REPORTCARD', 'Security/IDOR', 'Block student report card IDOR', false, err.message);
    }

    // IDOR 3: Student querying another student's fee balance
    try {
      const res = await request(
        'GET',
        `/api/feepayment/student-balance/${otherStudentDummyId}`,
        null,
        { Authorization: `Bearer ${tokens.student}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'SEC-IDOR-STUDENT-BALANCE',
        'Security/IDOR',
        'Block student from viewing another student fee balance via IDOR param (403)',
        pass,
        `Received status ${res.statusCode}: ${JSON.stringify(res.data)}`
      );
    } catch (err) {
      recordTest('SEC-IDOR-STUDENT-BALANCE', 'Security/IDOR', 'Block student fee balance IDOR', false, err.message);
    }

    // IDOR 4: Student probing teacher workload
    try {
      const res = await request(
        'GET',
        `/api/teacher/workload/${otherTeacherDummyId}`,
        null,
        { Authorization: `Bearer ${tokens.student}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'SEC-IDOR-STUDENT-TEACHER-WORKLOAD',
        'Security/IDOR',
        'Block student role from inspecting faculty internal teaching schedules (403)',
        pass,
        `Received status ${res.statusCode}`
      );
    } catch (err) {
      recordTest('SEC-IDOR-STUDENT-TEACHER-WORKLOAD', 'Security/IDOR', 'Block student workload probe', false, err.message);
    }
  }

  // IDOR 5: Teacher probing another teacher's workload
  if (tokens.teacher) {
    try {
      const res = await request(
        'GET',
        `/api/teacher/workload/${otherTeacherDummyId}`,
        null,
        { Authorization: `Bearer ${tokens.teacher}` }
      );
      const pass = res.statusCode === 403;
      recordTest(
        'SEC-IDOR-TEACHER-WORKLOAD-CROSS',
        'Security/IDOR',
        'Block teacher from inspecting other faculty member confidential workload (403)',
        pass,
        `Received status ${res.statusCode}`
      );
    } catch (err) {
      recordTest('SEC-IDOR-TEACHER-WORKLOAD-CROSS', 'Security/IDOR', 'Block cross teacher workload inspection', false, err.message);
    }
  }

  // ------------------------------------------------------------------------
  // SUITE 4: FINANCIAL & FEE RECORDING INTEGRITY
  // ------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Fee & Financial Business Logic Integrity ---');

  if (tokens.accountant || tokens.owner) {
    const feeAuthToken = tokens.accountant || tokens.owner;

    // 1. Rejection of negative payment amounts
    try {
      const res = await request(
        'POST',
        '/api/feepayment/record',
        {
          student: otherStudentDummyId,
          feeStructure: otherStudentDummyId,
          amountPaid: -500,
          paymentMethod: 'Cash',
        },
        { Authorization: `Bearer ${feeAuthToken}` }
      );
      const pass = res.statusCode === 400 && res.data?.message?.includes('positive number');
      recordTest(
        'FIN-REJECT-NEGATIVE-PAYMENT',
        'Financial Logic',
        'Reject fee payment with negative amount (-500) with HTTP 400',
        pass,
        `Received status ${res.statusCode}: ${JSON.stringify(res.data)}`
      );
    } catch (err) {
      recordTest('FIN-REJECT-NEGATIVE-PAYMENT', 'Financial Logic', 'Reject negative fee payment', false, err.message);
    }

    // 2. Rejection of zero payment amounts
    try {
      const res = await request(
        'POST',
        '/api/feepayment/record',
        {
          student: otherStudentDummyId,
          feeStructure: otherStudentDummyId,
          amountPaid: 0,
          paymentMethod: 'Cash',
        },
        { Authorization: `Bearer ${feeAuthToken}` }
      );
      const pass = res.statusCode === 400;
      recordTest(
        'FIN-REJECT-ZERO-PAYMENT',
        'Financial Logic',
        'Reject fee payment with zero amount ($0.00) with HTTP 400',
        pass,
        `Received status ${res.statusCode}: ${JSON.stringify(res.data)}`
      );
    } catch (err) {
      recordTest('FIN-REJECT-ZERO-PAYMENT', 'Financial Logic', 'Reject zero fee payment', false, err.message);
    }

    // 3. Rejection of missing required fields
    try {
      const res = await request(
        'POST',
        '/api/feepayment/record',
        {
          amountPaid: 1000,
        },
        { Authorization: `Bearer ${feeAuthToken}` }
      );
      const pass = res.statusCode === 400;
      recordTest(
        'FIN-REJECT-MISSING-FIELDS',
        'Financial Logic',
        'Reject fee payment missing student or feeStructure with HTTP 400',
        pass,
        `Received status ${res.statusCode}`
      );
    } catch (err) {
      recordTest('FIN-REJECT-MISSING-FIELDS', 'Financial Logic', 'Reject missing fields', false, err.message);
    }
  }

  // ------------------------------------------------------------------------
  // SUITE 5: EXAM MARKS BOUNDARY VALIDATIONS & CALCULATIONS
  // ------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Examination Marks Boundary Calculations ---');

  if (tokens.owner || tokens.principal) {
    const adminToken = tokens.owner || tokens.principal;

    // 1. Marks greater than maxMarks must be rejected
    try {
      const res = await request(
        'POST',
        '/api/examresult/bulk-save',
        {
          exam: otherStudentDummyId,
          schoolClass: otherStudentDummyId,
          subject: otherStudentDummyId,
          records: [
            {
              student: otherStudentDummyId,
              maxMarks: 100,
              marksObtained: 125, // Boundary violation: 125 > 100
            },
          ],
        },
        { Authorization: `Bearer ${adminToken}` }
      );
      const pass = res.statusCode === 400 && res.data?.message?.includes('cannot exceed maximum marks');
      recordTest(
        'EXAM-BOUNDARY-OVER-MAX',
        'Exam Engine',
        'Reject marks obtained greater than maximum marks (125 > 100) with HTTP 400',
        pass,
        `Received status ${res.statusCode}: ${JSON.stringify(res.data)}`
      );
    } catch (err) {
      recordTest('EXAM-BOUNDARY-OVER-MAX', 'Exam Engine', 'Reject marks exceeding maximum', false, err.message);
    }

    // 2. Negative marks must be rejected
    try {
      const res = await request(
        'POST',
        '/api/examresult/bulk-save',
        {
          exam: otherStudentDummyId,
          schoolClass: otherStudentDummyId,
          subject: otherStudentDummyId,
          records: [
            {
              student: otherStudentDummyId,
              maxMarks: 100,
              marksObtained: -15, // Negative marks violation
            },
          ],
        },
        { Authorization: `Bearer ${adminToken}` }
      );
      const pass = res.statusCode === 400 && res.data?.message?.includes('negative');
      recordTest(
        'EXAM-BOUNDARY-NEGATIVE-MARKS',
        'Exam Engine',
        'Reject negative marks obtained (-15) with HTTP 400',
        pass,
        `Received status ${res.statusCode}: ${JSON.stringify(res.data)}`
      );
    } catch (err) {
      recordTest('EXAM-BOUNDARY-NEGATIVE-MARKS', 'Exam Engine', 'Reject negative marks', false, err.message);
    }
  }

  // ------------------------------------------------------------------------
  // SUITE 6: NOTICE FEED AUDIENCE FILTERING
  // ------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Notice Feed Role-Based Audience Filtering ---');

  if (tokens.student) {
    try {
      const res = await request('GET', '/api/notice/feed', null, { Authorization: `Bearer ${tokens.student}` });
      const pass =
        res.statusCode === 200 &&
        res.data?.success === true &&
        Array.isArray(res.data?.result) &&
        res.data.result.every((n) => ['All', 'Students'].includes(n.targetAudience));
      recordTest(
        'NOTICE-STUDENT-AUDIENCE-FILTER',
        'Communications',
        "Student notice feed strictly filters for 'All' or 'Students' audiences",
        pass,
        `Filtered notices count: ${res.data?.result?.length}`
      );
    } catch (err) {
      recordTest('NOTICE-STUDENT-AUDIENCE-FILTER', 'Communications', 'Student notice filter', false, err.message);
    }
  }

  if (tokens.teacher) {
    try {
      const res = await request('GET', '/api/notice/feed', null, { Authorization: `Bearer ${tokens.teacher}` });
      const pass =
        res.statusCode === 200 &&
        res.data?.success === true &&
        Array.isArray(res.data?.result) &&
        res.data.result.every((n) => ['All', 'Teachers'].includes(n.targetAudience));
      recordTest(
        'NOTICE-TEACHER-AUDIENCE-FILTER',
        'Communications',
        "Teacher notice feed strictly filters for 'All' or 'Teachers' audiences",
        pass,
        `Filtered notices count: ${res.data?.result?.length}`
      );
    } catch (err) {
      recordTest('NOTICE-TEACHER-AUDIENCE-FILTER', 'Communications', 'Teacher notice filter', false, err.message);
    }
  }

  // ------------------------------------------------------------------------
  // SUITE 7: SPREADSHEET FORMULA INJECTION & TEMPLATE INTEGRITY
  // ------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Bulk Import Security & Template Generation ---');

  // Formula injection sanitization tests
  const formulaPayloads = [
    '=1+1',
    '+12345',
    '-cmd|"/C calc"!A0',
    '@SUM(1,2)',
    '\t=malicious',
  ];

  let formulaPassed = true;
  for (const payload of formulaPayloads) {
    const sanitized = sanitizeFormulaInjection(payload);
    if (!sanitized.startsWith("'")) {
      formulaPassed = false;
      break;
    }
  }
  recordTest(
    'SEC-CSV-FORMULA-INJECTION',
    'Security/Data',
    "Spreadsheet formula injection sanitization prepends single quote (') to dangerous leading tokens (=, +, -, @, \\t)",
    formulaPassed,
    formulaPassed ? '' : 'Failed to sanitize leading operator'
  );

  // Non-dangerous strings remain unaltered
  const safeString = 'Aarav Sharma';
  const cleanPass = sanitizeFormulaInjection(safeString) === 'Aarav Sharma';
  recordTest(
    'DATA-FORMULA-SAFE-PASSTHROUGH',
    'Data Transformation',
    'Standard strings pass through formula sanitizer without modification',
    cleanPass
  );

  // Template generation verification for all supported entities
  const supportedTypes = ['students', 'teachers', 'parents', 'classes_sections', 'subjects', 'assignments', 'enrollments', 'fee_structures'];
  let templatesOk = true;
  for (const type of supportedTypes) {
    try {
      const buffer = generateTemplateWorkbook(type, 'xlsx');
      if (!buffer || buffer.length === 0) {
        templatesOk = false;
      }
    } catch (e) {
      templatesOk = false;
    }
  }
  recordTest(
    'IMPORT-TEMPLATE-GENERATION',
    'Bulk Import Engine',
    `Successfully generated valid Excel workbooks for all 8 entities (${supportedTypes.join(', ')})`,
    templatesOk
  );

  // ------------------------------------------------------------------------
  // SUITE 8: SYSTEM HEALTH & PRODUCTION MONITORING STATS
  // ------------------------------------------------------------------------
  console.log('\n--- SUITE 8: Production Telemetry & System Statistics ---');

  if (tokens.owner) {
    try {
      const res = await request('GET', '/api/school/stats', null, { Authorization: `Bearer ${tokens.owner}` });
      const stats = res.data?.result;
      const pass =
        res.statusCode === 200 &&
        res.data?.success === true &&
        stats &&
        typeof stats.totalStudents === 'number' &&
        typeof stats.totalTeachers === 'number' &&
        typeof stats.totalClasses === 'number';
      recordTest(
        'STATS-SCHOOL-TELEMETRY',
        'Production Reliability',
        'School admin dashboard telemetry returns valid numeric aggregated counts',
        pass,
        pass ? `Students: ${stats.totalStudents}, Teachers: ${stats.totalTeachers}, Classes: ${stats.totalClasses}` : 'Invalid stats schema'
      );
    } catch (err) {
      recordTest('STATS-SCHOOL-TELEMETRY', 'Production Reliability', 'School stats endpoint', false, err.message);
    }
  }

  // ------------------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(' COMPREHENSIVE QA AUTOMATION SUITE — EXECUTION SUMMARY');
  console.log('========================================================================');

  const total = testResults.length;
  const passed = testResults.filter((t) => t.status === 'PASS').length;
  const failed = testResults.filter((t) => t.status === 'FAIL').length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`TOTAL TESTS EXECUTED: ${total}`);
  console.log(`PASSED:               ${passed} (${passRate}%)`);
  console.log(`FAILED:               ${failed}`);
  console.log(`STATUS:               ${failed === 0 ? 'ALL CHECKS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runComprehensiveQASuite().catch((err) => {
  console.error('Fatal test suite failure:', err);
  process.exit(1);
});
