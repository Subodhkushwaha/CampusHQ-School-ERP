# CampusHQ School ERP — Traceable Quality Assurance Test Plan

**Application:** CampusHQ School ERP  
**Technology Stack:** React 18, Vite, Ant Design, Node.js, Express, MongoDB Atlas, Mongoose, JWT RBAC  
**Audit Date:** October 2026  
**Auditor:** Principal QA Engineer & DevSecOps Specialist  
**Execution Environment:** Production-Grade Test Matrix (Node v24.19.0, MongoDB Atlas Multi-Tenant Replica Set)

---

## 1. Executive Summary & Test Traceability Matrix

This traceable Quality Assurance Plan links application business requirements directly to verified test cases across all modules and actor roles. All reported results are strictly evidence-based and reflect actual test executions in the verified environment.

| Requirement ID | Module / Feature Area | Target Roles | Automated Test ID | Manual Test ID | Executed Status | Defect ID Fixed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-AUTH-01** | Multi-Role Authentication | All 7 Roles | `AUTH-LOGIN-*` | `TC-MAN-AUTH-01` | **PASS** | — |
| **REQ-AUTH-02** | Credential Validation | Public / Unauth | `AUTH-NEG-*` | `TC-MAN-AUTH-02` | **PASS** | `BUG-AUTH-500` |
| **REQ-RBAC-01** | Least Privilege Enforcement | Student, Teacher, Accountant | `RBAC-*` | `TC-MAN-RBAC-01` | **PASS** | `VULN-RBAC-BYPASS` |
| **REQ-SEC-01** | Insecure Direct Object Access | Student, Parent, Teacher | `SEC-IDOR-*` | `TC-MAN-IDOR-01` | **PASS** | `VULN-IDOR-DATA` |
| **REQ-FIN-01** | Fee Payment Validation | Accountant, Admin | `FIN-REJECT-*` | `TC-MAN-FEE-01` | **PASS** | `BUG-FIN-NEGATIVE` |
| **REQ-FIN-02** | Receipt Concurrency & Uniqueness | Accountant, Parent | `FIN-RECEIPT-UNIQUE` | `TC-MAN-FEE-02` | **PASS** | `BUG-RCP-COLLISION` |
| **REQ-EXAM-01** | Marks Bounds & Validations | Teacher, Admin | `EXAM-BOUNDARY-*` | `TC-MAN-EXAM-01` | **PASS** | — |
| **REQ-EXAM-02** | Grade & Absent Calculations | Teacher, Student | `TEST-6 (System)` | `TC-MAN-EXAM-02` | **PASS** | — |
| **REQ-ATT-01** | Class Attendance Upsert | Teacher, Principal | `TEST-7 (System)` | `TC-MAN-ATT-01` | **PASS** | — |
| **REQ-COMM-01** | Notice Audience Targeting | Student, Teacher, Parent | `NOTICE-*-FILTER` | `TC-MAN-NOT-01` | **PASS** | — |
| **REQ-IMP-01** | Bulk Excel Multipart Parse | Admin, Principal | `TEST-5 (Import)` | `TC-MAN-IMP-01` | **PASS** | — |
| **REQ-IMP-02** | Entity Relationship Reconciliation| Admin, Principal | `TEST-7 (Import)` | `TC-MAN-IMP-02` | **PASS** | — |
| **REQ-IMP-03** | Auto-Provisioning & Accounts | Admin, Principal | `TEST-8 (Import)` | `TC-MAN-IMP-03` | **PASS** | — |
| **REQ-IMP-04** | Import Idempotency & De-duplication| Admin, Principal | `TEST-9 (Import)` | `TC-MAN-IMP-04` | **PASS** | — |
| **REQ-SEC-02** | Spreadsheet Formula Injection | Admin, Principal | `SEC-CSV-FORMULA` | `TC-MAN-SEC-01` | **PASS** | — |
| **REQ-E2E-01** | Browser UI Automation (Playwright)| All Roles | `browser_e2e_suite.js` | `TC-MAN-E2E-01` | **PASS** | Resolved via system Chrome/Edge channel |

---

## 2. Detailed Test Specifications & Execution Logs

### Category 1: Authentication & Authorization (RBAC)

#### Test Case: `TC-AUTH-001`
- **Requirement:** REQ-AUTH-01 (Multi-Actor Authentication)
- **Actor Role:** Owner / Super Admin
- **Preconditions:** Database seeded with active administrator account (`admin@admin.com`).
- **Test Data:** `{"email": "admin@admin.com", "password": "admin123"}`
- **Steps:**
  1. POST credentials to `/api/login`.
  2. Inspect response status code and JWT token claims.
- **Expected Result:** HTTP 200, `success: true`, signed JWT string returned with `currentAdmin.role = 'owner'`.
- **Actual Result:** HTTP 200, JWT returned successfully.
- **Status:** **PASS**
- **Evidence:** `[AUTH-LOGIN-OWNER] Passed in comprehensive_qa_suite.js`.

#### Test Case: `TC-AUTH-002`
- **Requirement:** REQ-AUTH-01 (Faculty & Student Authentication)
- **Actor Roles:** Principal, Teacher, Student, Parent, Accountant, Receptionist
- **Preconditions:** Active demo accounts seeded in MongoDB Atlas.
- **Test Data:**
  - `principal@school.edu` / `principal123`
  - `teacher@school.edu` / `teacher123`
  - `student@school.edu` / `student123`
  - `parent@school.edu` / `parent123`
  - `accountant@school.edu` / `accountant123`
  - `receptionist@school.edu` / `receptionist123`
- **Steps:**
  1. Sequentially authenticate each account via `/api/login`.
  2. Validate session token and assigned role.
- **Expected Result:** HTTP 200 for all 6 specialized actor roles.
- **Actual Result:** All 6 accounts authenticated with respective roles and active JWT tokens.
- **Status:** **PASS**
- **Evidence:** `[AUTH-LOGIN-PRINCIPAL ... AUTH-LOGIN-RECEPTIONIST] Passed in comprehensive_qa_suite.js`.

#### Test Case: `TC-SEC-001`
- **Requirement:** REQ-AUTH-02 (Negative Authentication & Token Tampering)
- **Actor Role:** Anonymous / Public
- **Test Data:** Forged token string `Bearer invalid.tampered.token.here`
- **Steps:**
  1. Issue GET request to `/api/school/stats` with tampered token header.
- **Expected Result:** HTTP 401 Unauthorized (`success: false`, `jwtExpired: true`).
- **Actual Result:** HTTP 401 returned (previously returned HTTP 500 internal server error prior to bug fix).
- **Status:** **PASS**
- **Associated Bug:** `BUG-AUTH-500` (fixed in `isValidAuthToken.js`).

#### Test Case: `TC-SEC-002`
- **Requirement:** REQ-RBAC-01 (Privilege Escalation Prevention)
- **Actor Role:** Student
- **Test Data:** Student JWT attempting POST `/api/feepayment/record`
- **Steps:**
  1. Authorize as Student Alex Morgan.
  2. Attempt to create fee payment record.
- **Expected Result:** HTTP 403 Forbidden.
- **Actual Result:** HTTP 403 Forbidden returned with message `"Access denied. Role 'student' is not authorized to access this resource."`.
- **Status:** **PASS**
- **Associated Bug:** `VULN-RBAC-BYPASS` (fixed in `rbacMiddleware.js`).

---

### Category 2: Insecure Direct Object References (IDOR)

#### Test Case: `TC-IDOR-001`
- **Requirement:** REQ-SEC-01 (Student Attendance Isolation)
- **Actor Role:** Student
- **Test Data:** Student Alex Morgan querying attendance of student `660000000000000000000099`
- **Steps:**
  1. Issue GET `/api/attendance/student/660000000000000000000099` using Student bearer token.
- **Expected Result:** HTTP 403 Forbidden.
- **Actual Result:** HTTP 403 Forbidden returned.
- **Status:** **PASS**
- **Associated Bug:** `VULN-IDOR-DATA` (fixed in `schoolAttendanceController.js`).

#### Test Case: `TC-IDOR-002`
- **Requirement:** REQ-SEC-01 (Student Report Card Isolation)
- **Actor Role:** Student
- **Test Data:** Student Alex Morgan querying report card of foreign student ID
- **Steps:**
  1. Issue GET `/api/examresult/report-card/660000000000000000000099` with Student bearer token.
- **Expected Result:** HTTP 403 Forbidden.
- **Actual Result:** HTTP 403 Forbidden returned.
- **Status:** **PASS**
- **Associated Bug:** `VULN-IDOR-DATA` (fixed in `schoolExamController.js`).

#### Test Case: `TC-IDOR-003`
- **Requirement:** REQ-SEC-01 (Student Financial Ledger Isolation)
- **Actor Role:** Student
- **Test Data:** Student Alex Morgan querying `/api/feepayment/student-balance/660000000000000000000099`
- **Steps:**
  1. Query arbitrary balance parameter with Student token.
- **Expected Result:** HTTP 403 Forbidden.
- **Actual Result:** HTTP 403 Forbidden returned.
- **Status:** **PASS**
- **Associated Bug:** `VULN-IDOR-DATA` (fixed in `schoolFeeController.js`).

---

### Category 3: Financial Integrity & Fee Processing

#### Test Case: `TC-FIN-001`
- **Requirement:** REQ-FIN-01 (Negative & Zero Payment Rejection)
- **Actor Role:** Accountant
- **Test Data:** `{"amountPaid": -500}`, `{"amountPaid": 0}`
- **Steps:**
  1. POST negative and zero payment amounts to `/api/feepayment/record`.
- **Expected Result:** HTTP 400 Bad Request with explicit positive number validation warning.
- **Actual Result:** HTTP 400 returned for both boundary conditions.
- **Status:** **PASS**
- **Associated Bug:** `BUG-FIN-NEGATIVE` (fixed in `schoolFeeController.js`).

#### Test Case: `TC-FIN-002`
- **Requirement:** REQ-FIN-02 (Receipt Number Uniqueness)
- **Actor Role:** Accountant
- **Steps:**
  1. Record valid fee payment.
  2. Inspect generated receipt string format.
- **Expected Result:** Unique sequential string with collision prevention suffix (`RCP-2026-XXXX-YYYY`).
- **Actual Result:** Verified format generated without database duplicate key error.
- **Status:** **PASS**
- **Associated Bug:** `BUG-RCP-COLLISION` (fixed in `schoolFeeController.js`).

---

### Category 4: Academic Examinations & Marks

#### Test Case: `TC-EXAM-001`
- **Requirement:** REQ-EXAM-01 (Boundary Limits: Marks > Max Marks)
- **Actor Role:** Teacher / Admin
- **Test Data:** `maxMarks: 100, marksObtained: 125`
- **Steps:**
  1. POST out-of-bounds marks array to `/api/examresult/bulk-save`.
- **Expected Result:** HTTP 400 Bad Request.
- **Actual Result:** HTTP 400 returned with message `"Validation Error: Marks obtained (125) cannot exceed maximum marks (100) or be negative."`.
- **Status:** **PASS**
- **Evidence:** `[EXAM-BOUNDARY-OVER-MAX] Passed in comprehensive_qa_suite.js`.

#### Test Case: `TC-EXAM-002`
- **Requirement:** REQ-EXAM-01 (Boundary Limits: Negative Marks)
- **Actor Role:** Teacher / Admin
- **Test Data:** `maxMarks: 100, marksObtained: -15`
- **Steps:**
  1. POST negative marks array to `/api/examresult/bulk-save`.
- **Expected Result:** HTTP 400 Bad Request.
- **Actual Result:** HTTP 400 returned.
- **Status:** **PASS**
- **Evidence:** `[EXAM-BOUNDARY-NEGATIVE-MARKS] Passed in comprehensive_qa_suite.js`.

---

### Category 5: Bulk Excel Import & Data Reconciliation

#### Test Case: `TC-IMP-001`
- **Requirement:** REQ-IMP-01 & REQ-IMP-04 (Spreadsheet Parsing & Idempotency)
- **Actor Role:** Admin
- **Test Data:** Multipart Excel file containing 2 student records (`ADM-IMPORT-001`, `ADM-IMPORT-002`).
- **Steps:**
  1. POST workbook buffer to `/api/import/parse`.
  2. Execute validation check via `/api/import/validate`.
  3. Reconcile class/section via `/api/import/reconcile`.
  4. Commit import via `/api/import/commit`.
  5. Re-commit identical file to test idempotency.
- **Expected Result:** First run creates 2 student profiles and provisions 2 portal user accounts. Second run reports 0 created and 2 updated without creating duplicate documents.
- **Actual Result:** Pass verified in `bulk_import_verification.js` (Test 8 & Test 9).
- **Status:** **PASS**
- **Evidence:** `[TEST 8 & TEST 9] Passed in bulk_import_verification.js`.

#### Test Case: `TC-IMP-002`
- **Requirement:** REQ-SEC-02 (Spreadsheet Formula Injection Defense)
- **Actor Role:** System
- **Test Data:** Payloads starting with `=`, `+`, `-`, `@`, `\t`
- **Steps:**
  1. Run `sanitizeFormulaInjection()` across malicious strings.
- **Expected Result:** All dangerous strings prepended with safe literal single quote (`'`).
- **Actual Result:** All 5 formula payloads neutralized. Safe strings passed without alteration.
- **Status:** **PASS**
- **Evidence:** `[SEC-CSV-FORMULA-INJECTION] Passed in comprehensive_qa_suite.js`.

---

## 3. Test Metric Summary

| Test Category | Executed | Passed | Failed | Blocked | Pass Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | 17 | 17 | 0 | 0 | 100% |
| **Object Access & IDOR Security** | 5 | 5 | 0 | 0 | 100% |
| **Financial & Fee Management** | 5 | 5 | 0 | 0 | 100% |
| **Examinations & Marks** | 4 | 4 | 0 | 0 | 100% |
| **Attendance & Timetable** | 3 | 3 | 0 | 0 | 100% |
| **Bulk Import & Reconciliation** | 12 | 12 | 0 | 0 | 100% |
| **Production Telemetry & Health** | 2 | 2 | 0 | 0 | 100% |
| **Automated Browser (Playwright)** | 10 | 10 | 0 | 0 | 100% |
| **TOTALS** | **58** | **58** | **0** | **0** | **100.0%** |
