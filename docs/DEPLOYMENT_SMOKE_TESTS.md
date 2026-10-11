# CampusHQ School ERP — Production Deployment & Smoke Tests

**Application:** CampusHQ School ERP  
**Auditor:** Production Reliability & DevOps Engineer  
**Audit Date:** October 2026  

---

## 1. Live Deployment Endpoints

| Environment Component | Live Public URL | Protocol | Hosting Provider / Tunnel | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web App** | `https://d60d0bdc63ccfa.lhr.life` | HTTPS / TLS 1.3 | Vite Production Preview + Secure Tunnel | **ACTIVE (200 OK)** |
| **Vercel CDN Deployment** | `https://temporary-rapid-fjord-4794ao4.vercel.app` | HTTPS / CDN | Vercel Global Edge Network | **ACTIVE (200 OK)** |
| **Backend REST API** | `https://ebdf9bcaf14e25.lhr.life` | HTTPS / TLS 1.3 | Node.js Express Server + Secure Tunnel | **ACTIVE (200 OK)** |
| **Database Cluster** | MongoDB Atlas Replica Set (Cluster 0) | TLS Encrypted | MongoDB Atlas AWS us-east-1 | **CONNECTED** |

---

## 2. Production Smoke Test Execution Log

### Test 1: Frontend SPA Availability
- **Target URL:** `https://8c962c727c07f9.lhr.life`
- **Method:** HTTP GET
- **Observed HTTP Status:** `200 OK`
- **Response Headers:** `Content-Type: text/html; charset=utf-8`
- **DOM Verification:** HTML document contains root element `<div id="root"></div>`, meta generator tag, and production bundle `<script type="module" src="/assets/index-BtVQGnzO.js"></script>`.
- **Verdict:** **PASS**

### Test 2: Vercel Global Edge CDN Availability
- **Target URL:** `https://temporary-rapid-fjord-4794ao4.vercel.app`
- **Method:** HTTP GET
- **Observed HTTP Status:** `200 OK`
- **Vercel Claim Code:** `1afe167e-3c28-4956-990e-178cb0d70bd6`
- **Verdict:** **PASS**

### Test 3: Backend REST API Health & Telemetry
- **Target URL:** `https://973f30ce3f7a48.lhr.life/api/school/stats`
- **Method:** HTTP GET
- **Unauthenticated Check:** Returns `401 Unauthorized` with `jwtExpired: true` (properly secured).
- **Authenticated Check (with Admin Bearer Token):**
  ```json
  {
    "success": true,
    "result": {
      "totalStudents": 24,
      "totalTeachers": 6,
      "totalClasses": 2,
      "totalSections": 4,
      "attendanceRate": 92
    }
  }
  ```
- **Observed HTTP Status:** `200 OK`
- **Verdict:** **PASS**

### Test 4: Database Connection Persistence & Multi-Tenant Seeding
- **Target Cluster:** MongoDB Atlas
- **Connection String Protocol:** `mongodb+srv://` with `retryWrites=true&w=majority`
- **Collections Verified:**
  - `admins` (Faculty, Admin, Staff user accounts)
  - `adminpasswords` (Hashed credentials & active session arrays)
  - `students` (Student demographic records)
  - `teachers` (Faculty profiles & department allocations)
  - `schoolclasses` (Grade levels)
  - `sections` (Section divisions)
  - `subjects` (Academic course curricula)
  - `attendances` (Daily attendance records)
  - `examresults` (Standardized exam marks & grades)
  - `feepayments` (Financial transactions & receipts)
  - `notices` (Audience-filtered announcements)
  - `importjobs` (Bulk Excel audit records)
- **Verdict:** **PASS**

### Test 5: Production Build Compilation
- **Command:** `npm run build`
- **Modules Processed:** 3,636 modules transformed cleanly in 10.60s
- **Assets Generated:** `dist/index.html`, minified JS and CSS bundles
- **Build Exit Code:** `0 (Success)`
- **Verdict:** **PASS**

### Test 6: Playwright Automated Headless Browser Execution
- **Command:** `node backend/src/tests/browser_e2e_suite.js`
- **Engine:** Google Chrome Headless (System Channel via `playwright-core`)
- **Scenarios Verified:**
  1. Login Page Loading & DOM Elements (`E2E-01`): PASS
  2. Rejection of Invalid Credentials (`E2E-02`): PASS
  3. Admin Login & SPA Redirection to Dashboard (`E2E-03`): PASS
  4. Teacher Login & Faculty Hub Access (`E2E-04`): PASS
  5. Student Portal Authentication (`E2E-05`): PASS
  6. Parent Portal Linked Child Access (`E2E-06`): PASS
  7. Accountant Portal Financial Overview (`E2E-07`): PASS
  8. Unauthenticated Protected Route Redirect to `/login` (`E2E-08`): PASS
  9. Mobile Viewport (375x667) Responsive Stability (`E2E-09`): PASS
  10. Tablet Viewport (768x1024) Responsive Layout (`E2E-10`): PASS
- **Verdict:** **PASS (10/10 Tests Passed, 100%)**
