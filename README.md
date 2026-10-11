# 🏫 CampusHQ — Modern School ERP & Institutional Management Platform

CampusHQ is a full-featured, production-ready School Enterprise Resource Planning (ERP) platform designed for modern K-12 schools, academies, colleges, and learning institutions. Built on the MERN stack (MongoDB, Express.js, React, Node.js) with Ant Design, it provides academic oversight, student management, fee accounting, faculty workload management, and role-segregated portals.

---

## 📌 Table of Contents
1. [Platform Overview & Modules](#-platform-overview--modules)
2. [Technology Stack](#-technology-stack)
3. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
4. [Installation & Setup](#-installation--setup)
5. [Environment Configuration](#-environment-configuration)
6. [Database Seeding](#-database-seeding)
7. [Running the Application](#-running-the-application)
8. [Local Development Demo Accounts](#-local-development-demo-accounts)
9. [Bulk Excel Import & Data Reconciliation Center](#-bulk-excel-import--data-reconciliation-center)
10. [Reconciliation Rules & Conflict Resolution](#-reconciliation-rules--conflict-resolution)
11. [Troubleshooting Guide](#-troubleshooting-guide)
12. [Security, Governance & Production Notes](#-security-governance--production-notes)
13. [Module Scope & Current Boundaries](#-module-scope--current-boundaries)

---

## 🚀 Platform Overview & Modules

- **🎓 Student Admissions & Profile Management:** Complete demographic profiles, photos, academic years, emergency contacts, medical notes, printable ID cards, and admission workflows.
- **👨‍🏫 Faculty & Teacher Administration:** Class, section, and subject allocations, weekly teaching periods, workload tracking, and timetables.
- **🏫 Class & Section Hierarchy:** Classroom capacities, room number allocations, and designated class teachers.
- **✅ Daily Attendance Tracking:** Date-wise bulk attendance marking, duplicate prevention with upserts, monthly summaries, and attendance percentage metrics.
- **📊 Examinations & Report Cards:** Maximum marks validation, absentee marking (`AB`), automated grading, and printable official student report cards.
- **💳 Fee Management & Accounts:** Class-wise and student-wise structures, installments, approved concessions, payment receipts, refunds, and date/class-wise collection reports.
- **📢 Notice Board & Targeted Broadcasts:** Bulletins categorized by audience (All, Students, Teachers, Parents, Staff) with expiry date filtering and pinned announcements.
- **📅 Timetable & Scheduling:** Period-by-period class timetables with instructor and room allocations.
- **📥 Bulk Excel Import Center:** Admin-only 9-step wizard for batch importing students, teachers, parents, classes, sections, subjects, assignments, enrollments, and fee structures with automated relationship reconciliation and account provisioning.
- **🔐 Role-Segregated Portals:** Distinct interfaces tailored for Super Admins, Principals, Teachers, Accountants, Receptionists, Students, and Parents.

---

## 💻 Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Ant Design (AntD) 5, Redux Toolkit, React Router v6, Vite |
| **Backend** | Node.js, Express.js, Multer, SheetJS (`xlsx`), JWT (`jsonwebtoken`), Bcrypt.js |
| **Database** | MongoDB 6.0+ via Mongoose ODM (with local embedded fallback) |
| **Security** | Role-Based Access Control (RBAC), CORS whitelist, Bearer JWT, formula injection protection |

---

## 📋 Prerequisites & System Requirements

- **Node.js:** v20.0.0 or higher
- **npm:** v9.0.0 or higher
- **MongoDB:** MongoDB Community Server 6.0+ on `mongodb://127.0.0.1:27017/campushq` or an authorized MongoDB Atlas URI.

---

## 🛠️ Installation & Setup

### 1. Install Backend Dependencies
```powershell
cd backend
npm install
```

### 2. Install Frontend Dependencies
```powershell
cd ../frontend
npm install
```

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
Ensure `backend/.env` is configured with your database and security credentials:
```env
PORT=8888
DATABASE=mongodb://127.0.0.1:27017/campushq
JWT_SECRET=your_secure_random_64_char_jwt_secret_key_here
FRONTEND_URL=http://localhost:3000,http://127.0.0.1:3000
NODE_ENV=development
WEBSITE_URL=http://localhost:3000
PUBLIC_SERVER_FILE=http://localhost:8888/
```

### Frontend (`frontend/.env`)
Ensure `frontend/.env` points to the local backend API:
```env
VITE_BACKEND_SERVER=http://localhost:8888
VITE_FILE_BASE_URL=http://localhost:8888
```

---

## 🌱 Database Seeding & Verification

To run automated backend security and unit tests:
```powershell
cd backend
npm test
```

To seed initial demo academic classes, subjects, faculty, demo students, and role accounts:
```powershell
cd backend
npm run seed
```

---

## 🏃 Running the Application

### Terminal 1: Backend API Server
```powershell
cd backend
npm run dev
```
- API server listens on: **`http://localhost:8888`**
- Health check endpoint: **`http://localhost:8888/api/health`**

### Terminal 2: Frontend Vite Dev Server
```powershell
cd frontend
npm run dev
```
- Application user interface: **`http://localhost:3000`**

---

## 🌐 Production Deployment Architecture

CampusHQ uses a decoupled production deployment model:
- **Frontend:** Hosted on **Vercel** as a high-performance static SPA with edge caching and client-side routing rewrites (`vercel.json`).
- **Backend:** Hosted on a persistent Node.js runtime (e.g. **Render**, **Railway**, AWS ECS, or DigitalOcean App Platform) running Express 4 and Mongoose.
- **Database:** Hosted on **MongoDB Atlas** (M0/M10+ cluster) with TLS connection strings, automated backups, and IP access control.

```
┌─────────────────────────────────┐
│         End Users / CDN         │
└────────────────┬────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────┐
│     Vercel Frontend (SPA)       │
│  - React 18 + Ant Design + Vite │
│  - SPA Routing via vercel.json  │
│  - VITE_BACKEND_SERVER config   │
└────────────────┬────────────────┘
                 │ HTTPS REST API + Bearer JWT
                 ▼
┌─────────────────────────────────┐
│   Node.js Backend (Express)     │
│  - Hosted on Render / Railway   │
│  - Strict CORS Origin Checks    │
│  - RBAC & Validation Middleware │
└────────────────┬────────────────┘
                 │ TLS connection (mongodb+srv://)
                 ▼
┌─────────────────────────────────┐
│    MongoDB Atlas Cluster        │
│  - M0 Free / M10 Dedicated      │
│  - Persistent institutional db  │
└─────────────────────────────────┘
```

### 1. MongoDB Atlas Setup
1. Create a free M0 or production cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user (e.g. `campushq_user`) with read/write privileges to the `campushq` database.
3. Under **Network Access**, add IP whitelist entries (use your backend server IP or `0.0.0.0/0` with strong authentication).
4. Copy the connection string format:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/campushq?retryWrites=true&w=majority
   ```

### 2. Backend Deployment (Render / Railway)
1. Link your GitHub repository (`campus-hq-school-erp`).
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `npm start` (or `node src/server.js`).
5. Configure Environment Variables in the hosting dashboard:
   | Variable | Example Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations and sanitized error handling |
   | `DATABASE` | `mongodb+srv://user:pass@cluster.mongodb.net/campushq` | MongoDB Atlas URI |
   | `JWT_SECRET` | *(64-char random hex)* | JWT signing secret |
   | `FRONTEND_URL` | `https://your-app.vercel.app` | Vercel production origin for CORS |
   | `WEBSITE_URL` | `https://your-app.vercel.app` | Vercel origin |
   | `PUBLIC_SERVER_FILE` | `https://your-backend.onrender.com/` | Public asset serving URL |
   | `PORT` | `8888` | Port (automatically supplied on Render/Railway) |

### 3. Frontend Deployment (Vercel)
1. Import your GitHub repository (`campus-hq-school-erp`) on [Vercel](https://vercel.com).
2. Configure **Root Directory**: `frontend`.
3. Framework Preset: **Vite** (automatically detected).
4. Build Command: `npm run build` (outputs to `dist`).
5. Output Directory: `dist`.
6. Add Environment Variable:
   - `VITE_BACKEND_SERVER`: `https://your-backend.onrender.com/`
   - `VITE_FILE_BASE_URL`: `https://your-backend.onrender.com/`
7. Click **Deploy**. Vercel will build and assign your production HTTPS URL.
8. Update the backend `FRONTEND_URL` with your assigned Vercel URL.

### 4. Rollback Plan
- **Frontend Rollback:** In the Vercel dashboard, click **Deployments**, select any previous successful deployment, and click **Promote to Production** for instant zero-downtime rollback.
- **Backend Rollback:** In the Render/Railway dashboard, select previous deployment commits to rollback.
- **Database Safety:** Backups are automated on MongoDB Atlas; non-destructive schema migrations ensure backward compatibility.

---

## 🔑 Local Development Demo Accounts

> [!WARNING]
> **DEVELOPMENT AND TESTING ONLY:**
> The accounts below are deterministic demo accounts seeded strictly for local development and QA evaluation. **Never expose or enable these credentials in production environments.**

| Portal Role | Demo Email | Demo Password | Login URL | Intended Testing & Permissions |
|---|---|---|---|---|
| **Super Admin / Owner** | `admin@admin.com` | `admin123` | [http://localhost:3000/login](http://localhost:3000/login) | Full system configuration, bulk Excel imports, admissions, staff assignments, institutional settings. |
| **Principal** | `principal@school.edu` | `principal123` | [http://localhost:3000/login](http://localhost:3000/login) | Institutional academic oversight, exam approvals, faculty workload audits, school-wide notices. |
| **Teacher** | `teacher@school.edu` | `teacher123` | [http://localhost:3000/login](http://localhost:3000/login) | Daily attendance marking, exam marks entry for assigned classes, timetable access. |
| **Accountant** | `accountant@school.edu` | `accountant123` | [http://localhost:3000/login](http://localhost:3000/login) | Fee structures, payment processing, collection analytics, fee receipt printing, refunds. |
| **Receptionist** | `receptionist@school.edu` | `receptionist123` | [http://localhost:3000/login](http://localhost:3000/login) | Visitor records, notice board broadcasts, general front-desk student directory lookup. |
| **Student** | `student@school.edu` | `student123` | [http://localhost:3000/login](http://localhost:3000/login) | Personal profile, class timetable, personal attendance history, report cards, fee dues. |
| **Parent** | `parent@school.edu` | `parent123` | [http://localhost:3000/login](http://localhost:3000/login) | Child performance tracking, attendance percentage, tuition receipt status. |
| **Librarian** | *Not provisioned* | *N/A* | *N/A* | *Module out of scope in current release.* |
| **Transport Manager** | *Not provisioned* | *N/A* | *N/A* | *Module out of scope in current release.* |

---

## 📥 Bulk Excel Import & Data Reconciliation Center

Administrators can navigate to **Bulk Import & Reconcile** (`/school/import`) to upload spreadsheets and automatically create or update records.

### Supported Datasets & Canonical Schemas

#### 1. Students (`students`)
- **Mandatory Fields:** `admissionNumber`, `firstName`, `lastName`, `className`
- **Optional Fields:** `studentId`, `dateOfBirth` (YYYY-MM-DD), `gender` (Male/Female/Other), `sectionName`, `academicYear`, `rollNumber`, `studentMobile`, `studentEmail`, `bloodGroup`, `emergencyContact`, `medicalNotes`, `parentName`, `parentMobile`, `parentEmail`, `parentRelationship`, `address`, `nationality`, `photographUrl`

#### 2. Faculty & Teachers (`teachers`)
- **Mandatory Fields:** `employeeId`, `firstName`, `lastName`, `email`
- **Optional Fields:** `mobile`, `gender`, `qualification`, `specialization`, `joiningDate` (YYYY-MM-DD), `assignedClassCodes` (comma-separated), `assignedSectionCodes`, `assignedSubjectCodes`, `salary`, `status` (`active`/`inactive`/`on_leave`)

#### 3. Parents & Guardians (`parents`)
- **Mandatory Fields:** `fullName`, `email`, `studentAdmissionNumbers` (comma-separated admission numbers of children)
- **Optional Fields:** `mobile`, `relationship`, `address`

#### 4. Classes & Sections (`classes_sections`)
- **Mandatory Fields:** `className`, `sectionName`
- **Optional Fields:** `classCode`, `grade`, `sectionCode`, `roomNumber`, `capacity`

#### 5. Curriculum Subjects (`subjects`)
- **Mandatory Fields:** `subjectName`, `subjectCode`, `className`
- **Optional Fields:** `type` (`Theory`/`Practical`/`Elective`), `credits`, `teacherEmployeeId`

#### 6. Teacher-Class Assignments (`assignments`)
- **Mandatory Fields:** `classCode`, `sectionCode`, `subjectCode`, `teacherEmployeeId`
- **Optional Fields:** `academicYear`, `isClassTeacher` (`Yes`/`No`), `roomNumber`

#### 7. Academic Enrollments (`enrollments`)
- **Mandatory Fields:** `admissionNumber`, `academicYear`, `className`
- **Optional Fields:** `sectionName`, `rollNumber`

#### 8. Fee Structures (`fee_structures`)
- **Mandatory Fields:** `title`, `className`, `amount`
- **Optional Fields:** `concessionAmount`, `feeType` (`Tuition`/`Admission`/`Exam`/`Transport`/`Library`/`Activity`/`Other`), `academicYear`, `dueDate`

---

## 🔄 Reconciliation Rules & Conflict Resolution

1. **Class & Section Integrity:** Every student enrollment must resolve to a valid class and section. If a specified section belongs to a different class, the reconciliation engine flags a `conflict`.
2. **Teacher Allocation:** Assignments require existing faculty. Unmatched employee IDs are flagged as `unresolved`.
3. **Class Teacher Conflicts:** If a section already has a class teacher and an incoming row specifies another teacher as class teacher, the engine alerts with a `conflict` requiring administrator confirmation.
4. **Multi-Child Parent Linkage:** Parents can be linked to multiple children in a single row by listing comma-separated student admission numbers.
5. **Idempotency & Re-imports:** Re-uploading a spreadsheet updates existing profiles without creating duplicate records or resetting passwords.
6. **Formula Injection Sanitization:** Exported CSV/Excel reports escape leading `=`, `+`, `-`, `@` characters by prepending `'` to prevent spreadsheet formula injection vulnerabilities.

---

## 🩺 Troubleshooting Guide

### 1. CORS Preflight or Origin Errors
- Ensure `FRONTEND_URL` in `backend/.env` is set to `http://localhost:3000`.
- The Express backend includes credentials support with explicit origin validation.

### 2. "No authentication token, authorization denied"
- Requests to protected `/api/*` endpoints require an `Authorization: Bearer <token>` header.
- Token is returned in `result.token` upon calling `POST /api/login`.

### 3. Local MongoDB Connection Issues
- If local MongoDB Community server is not running on port 27017, the backend automatically initializes an embedded in-memory MongoDB fallback instance for local development.

### 4. Excel Upload Errors
- Maximum batch size is 5,000 rows and 15MB.
- Ensure files are saved in `.xlsx`, `.xls`, or standard `.csv` format.

---

## 🔒 Security, Governance & Production Notes

1. **JWT Secret:** Change `JWT_SECRET` in `backend/.env` to a cryptographically secure 256-bit string generated with `openssl rand -base64 32` before deploying.
2. **Password Security:** All passwords are salted and hashed using Bcrypt. Plaintext passwords are never stored or included in audit logs.
3. **Upload Storage:** Student photographs are stored in `backend/src/public/uploads/student/`. In containerized cloud environments, connect an S3 or Google Cloud Storage bucket.
4. **Database Clustering:** For production, configure `DATABASE` in `backend/.env` with a replica set cluster (e.g. MongoDB Atlas) with TLS enabled to leverage native multi-document transactions.

---

## 📦 Module Scope & Current Boundaries

To maintain full transparency, the following specialized features are out of scope for the current release:
- **Librarian Barcode System:** Library checkout, ISBN barcode tracking, and book fine calculations are not implemented.
- **Transport Fleet GPS:** Live GPS telemetry and route stops are not implemented.
- **Automated SMS Gateway:** Phone numbers are stored and validated, but direct external SMS API gateways (Twilio/Gupshup) require vendor credentials and are not active by default.
