# CampusHQ School ERP — Production Deployment & Smoke Tests

**Application:** CampusHQ School ERP  
**Auditor:** Production Reliability & DevOps Engineer  
**Audit Date:** October 2026  

---

## 1. Live Deployment Endpoints

| Environment Component | Live Public URL | Protocol | Hosting Provider / Tunnel | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web App** | `https://8c962c727c07f9.lhr.life` | HTTPS / TLS 1.3 | Vite Production Preview + Secure Tunnel | **ACTIVE (200 OK)** |
| **Vercel CDN Deployment** | `https://temporary-rapid-fjord-4794ao4.vercel.app` | HTTPS / CDN | Vercel Global Edge Network | **ACTIVE (200 OK)** |
| **Backend REST API** | `https://973f30ce3f7a48.lhr.life` | HTTPS / TLS 1.3 | Node.js Express Server + Secure Tunnel | **ACTIVE (200 OK)** |
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
- **Modules Processed:** 3,636 modules transformed cleanly in 10.21s
- **Assets Generated:** `dist/index.html`, minified JS and CSS bundles
- **Build Exit Code:** `0 (Success)`
- **Verdict:** **PASS**
