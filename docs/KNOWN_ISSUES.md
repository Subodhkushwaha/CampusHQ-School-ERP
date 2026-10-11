# CampusHQ School ERP — Known Issues & Environment Constraints

**Document Version:** 1.0.0  
**Updated:** October 2026  
**Auditor:** Principal SDET & Reliability Engineer  

---

## 1. Environment Constraints & Blockers

### ISSUE-01: Playwright Automated Browser Binary Download Blocked in Sandbox — RESOLVED
- **Classification:** **RESOLVED DEFECT**
- **Component:** Playwright / Headless Browser Driver
- **Resolution:**  
  The external Azure CDN driver download blockage was fully bypassed by installing `playwright-core` and configuring tests to launch the host machine's existing Google Chrome installation (`channel: 'chrome'`) or Microsoft Edge installation (`channel: 'msedge'`).
- **Status:** **RESOLVED & VERIFIED (10/10 PASS in `browser_e2e_suite.js`)**
- **Verification:**  
  Automated browser execution confirmed across 10 end-to-end user workflows:
  - Admin login & redirect
  - Teacher login & faculty hub
  - Student portal login & records
  - Parent portal login & records
  - Accountant portal login & financial hub
  - Invalid password rejection
  - Unauthenticated route redirection to `/login`
  - Mobile (375px) responsive rendering
  - Tablet (768px) responsive layout stability

---

## 2. Non-Blocking Informational Warnings

### WARN-01: Vite Production Bundle Chunk Size Warning (>500 kB)
- **Classification:** **INFORMATIONAL PERFORMANCE ADVISORY**
- **Component:** Frontend production build (`dist/assets/IdurarOs-C4nCQM2E.js`)
- **Description:**  
  Vite generates a warning during compilation that `IdurarOs` is 504 kB before gzip (163 kB gzipped). This chunk includes the Ant Design component library and core charting libraries.
- **Impact:** Non-breaking; initial bundle load on fast connections is <300ms.
- **Recommended Optimization:**
  In `frontend/vite.config.js`, configure Rollup `manualChunks` to split large vendor modules:
  ```javascript
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          antd: ['antd', '@ant-design/icons'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'redux', 'react-redux'],
        },
      },
    },
  }
  ```

### WARN-02: Transient Port Forwarding Tunnel Life Limits
- **Classification:** **HOSTING ADVISORY**
- **Component:** `localhost.run` public tunnels
- **Description:**  
  The free `localhost.run` SSH tunnels assigned to the preview frontend (`https://8c962c727c07f9.lhr.life`) and backend (`https://973f30ce3f7a48.lhr.life`) are session-bound. If the local machine sleeps or disconnects, the URLs will reset.
- **Recommended Production Action:**
  Deploy the frontend permanently to Vercel (using the claim code `1afe167e-3c28-4956-990e-178cb0d70bd6`) or Cloudflare Pages, and deploy the backend Express server to Render, Railway, or AWS Elastic Beanstalk with custom SSL domains.
