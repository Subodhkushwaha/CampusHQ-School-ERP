# CampusHQ School ERP — Security Audit & Penetration Assessment

**Date:** October 2026  
**Auditor:** Principal DevSecOps Engineer & Application Security Specialist  
**Target:** CampusHQ School ERP (Express Backend, React Frontend, MongoDB Atlas)  
**Standard:** OWASP Top 10 (2021), ASVS Level 2  

---

## 1. Executive Summary

A comprehensive application security audit was conducted against the CampusHQ School ERP codebase, API endpoints, authentication mechanisms, and data access layers. Four significant vulnerabilities were identified during static and dynamic code inspection. All four vulnerabilities were reproduced, mitigated with surgical code patches, and verified with automated regression test cases.

### Vulnerability Severity Distribution
- **Critical (P0):** 1 (Mitigated)
- **High (P1):** 2 (Mitigated)
- **Medium (P2):** 1 (Mitigated)
- **Low / Informational:** 0

---

## 2. Identified Vulnerabilities & Mitigation Log

### VULN-01: Critical Role-Based Access Control Bypass in Middleware
- **Severity:** **CRITICAL (CVSS: 9.1)**
- **Location:** `backend/src/middlewares/rbacMiddleware.js:3`
- **Description:**  
  The `permit(...allowedRoles)` middleware previously defaulted missing `req.admin?.role` values to `'owner'`:
  ```javascript
  // VULNERABLE CODE:
  const userRole = req.admin?.role || 'owner';
  if (userRole === 'owner') return next();
  ```
  If an unauthenticated request reached a route protected solely by `permit(...)`, or if `req.admin` was undefined, the user was granted full `'owner'` (Super Admin) bypass privileges.
- **Attack Vector:** An unauthenticated attacker could issue requests directly to protected administrative routes without credentials.
- **Remediation Applied:**  
  Enforced mandatory authentication check and safe default role:
  ```javascript
  // REMEDIATED CODE:
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Authorization credentials missing.',
    });
  }
  const userRole = req.admin.role || 'staff';
  ```
- **Verification:** Automated tests `AUTH-NEG-MISSING-TOKEN` and `RBAC-STUDENT-*` confirmed complete resolution.

---

### VULN-02: Broken Object-Level Authorization (IDOR) on Student Endpoints
- **Severity:** **HIGH (CVSS: 8.2)**
- **Locations:**
  - `backend/src/controllers/schoolControllers/schoolAttendanceController.js:74`
  - `backend/src/controllers/schoolControllers/schoolExamController.js:104`
  - `backend/src/controllers/schoolControllers/schoolFeeController.js:8`
  - `backend/src/controllers/schoolControllers/schoolTeacherController.js:7`
- **Description:**  
  Endpoints accepting `:studentId` or `:teacherId` route parameters relied on optional parameters without validating whether the requesting student or parent had rights to view another individual's academic, financial, or attendance records.
- **Attack Vector:** A logged-in student could tamper with the `:studentId` URL parameter to inspect grades, attendance percentages, and outstanding fee debts of any other student in the institution.
- **Remediation Applied:**  
  Implemented strict role-based object-level access controls:
  - If `req.admin.role === 'student'`, the route parameter is constrained strictly to `req.admin.studentRef`. Any mismatch returns `403 Forbidden`.
  - If `req.admin.role === 'parent'`, the parameter is constrained strictly to `req.admin.parentStudentRef`. Any mismatch returns `403 Forbidden`.
  - If `req.admin.role === 'teacher'`, teachers are blocked from accessing other faculty members' internal workload schedules.
- **Verification:** Automated tests `SEC-IDOR-STUDENT-ATTENDANCE`, `SEC-IDOR-STUDENT-REPORTCARD`, `SEC-IDOR-STUDENT-BALANCE`, and `SEC-IDOR-TEACHER-WORKLOAD-CROSS` confirmed 100% enforcement.

---

### VULN-03: Internal Error 500 on Expired or Malformed JWT
- **Severity:** **HIGH (CVSS: 7.5)**
- **Location:** `backend/src/controllers/middlewaresControllers/createAuthMiddleware/isValidAuthToken.js:59`
- **Description:**  
  When `jwt.verify()` failed due to expired tokens (`TokenExpiredError`) or invalid signatures (`JsonWebTokenError`), the catch block returned an unhandled HTTP 500 Internal Server Error along with internal stack error objects.
- **Attack Vector:** Information leakage and non-standard HTTP authorization failure responses, which caused frontend application crashes and session loops.
- **Remediation Applied:**  
  Explicitly handled `JsonWebTokenError` and `TokenExpiredError`, returning standard `401 Unauthorized` with `jwtExpired: true`.
- **Verification:** Test `AUTH-NEG-MALFORMED-TOKEN` verified HTTP 401 response.

---

### VULN-04: Negative Payment Amount & Receipt Number Collision
- **Severity:** **MEDIUM (CVSS: 6.5)**
- **Location:** `backend/src/controllers/schoolControllers/schoolFeeController.js:138`
- **Description:**  
  1. The fee payment recording endpoint did not enforce `amountPaid > 0`, allowing negative payments that could corrupt student balance calculations.
  2. Receipt numbering relied on `countDocuments() + 1`, creating race condition collisions during concurrent transactions.
- **Remediation Applied:**  
  1. Added positive number validation: `isNaN(numAmount) || numAmount <= 0` returns `400 Bad Request`.
  2. Appended high-resolution timestamp suffix to guarantee receipt number uniqueness across concurrent requests (`RCP-2026-XXXX-YYYY`).
- **Verification:** Verified via `FIN-REJECT-NEGATIVE-PAYMENT`, `FIN-REJECT-ZERO-PAYMENT`, and concurrent generation tests.

---

## 3. General Security Protections Verified

| Security Control | Implementation Mechanism | Status |
| :--- | :--- | :--- |
| **Password Hashing** | Bcrypt with secure salt rounds on all user collections | **VERIFIED** |
| **Session Tracking** | Active session token storage in `UserPassword.loggedSessions` array | **VERIFIED** |
| **CORS Configuration** | Whitelisted frontend origins with credentials allowed; OPTIONS preflight 200 | **VERIFIED** |
| **CSV/Excel Injection** | Neutralization of formula prefixes (`=`, `+`, `-`, `@`, `\t`) in exports | **VERIFIED** |
| **File Upload Storage** | Multer type filters for image formats and 15MB size limits | **VERIFIED** |
| **Database Injection** | Mongoose object schema types and parameterized queries | **VERIFIED** |
| **Sensitive Field Suppression** | User passwords, password hashes, and salts excluded from JSON serialization | **VERIFIED** |
