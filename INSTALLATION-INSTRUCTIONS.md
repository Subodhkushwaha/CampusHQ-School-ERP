# 🏫 CampusHQ School ERP — Installation & Local Setup Guide

Follow this guide to install, configure, verify, and run CampusHQ School ERP locally.

---

### Prerequisites

- **Node.js:** Node.js v20.0.0 or higher
- **npm:** npm v9.0.0 or higher
- **MongoDB:** MongoDB Community Server (local) or MongoDB Atlas connection string

---

### Step 1: Install Dependencies

#### 1. Backend Dependencies
```bash
cd backend
npm install
```

#### 2. Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

### Step 2: Configure Environment Variables

#### Backend (`backend/.env`)
Ensure `backend/.env` is set up with valid database and security configuration:
```env
PORT=8888
DATABASE=mongodb://127.0.0.1:27017/campushq
JWT_SECRET=your_secure_random_64_char_jwt_secret_key_here
FRONTEND_URL=http://localhost:3000,http://127.0.0.1:3000
NODE_ENV=development
WEBSITE_URL=http://localhost:3000
PUBLIC_SERVER_FILE=http://localhost:8888/
```
*(A safe reference template is provided at `backend/.env.example`)*

#### Frontend (`frontend/.env`)
Ensure `frontend/.env` points to your backend instance:
```env
VITE_BACKEND_SERVER=http://localhost:8888
VITE_FILE_BASE_URL=http://localhost:8888
```
*(A safe reference template is provided at `frontend/.env.example`)*

---

### Step 3: Run Automated Verification Tests

Run the security and integration test suite to verify token security, RBAC policies, and validation:
```bash
cd backend
npm test
```

---

### Step 4: Seed Development Data (Optional)

If starting with an empty database, seed initial academic classes, sections, subjects, faculty, students, and demo accounts:
```bash
cd backend
npm run seed
```

---

### Step 5: Start the Application

#### Terminal 1 — Start the Backend Server:
```bash
cd backend
npm run dev
```
- API server listens on: **`http://localhost:8888`**
- Health check endpoint: **`http://localhost:8888/api/health`**

#### Terminal 2 — Start the Frontend Development Server:
```bash
cd frontend
npm run dev
```
- Access the web application in your browser: **`http://localhost:3000`**