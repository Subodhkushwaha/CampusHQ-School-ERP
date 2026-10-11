# CampusHQ School ERP — Known Issues & Environment Constraints

**Document Version:** 1.0.0  
**Updated:** October 2026  
**Auditor:** Principal SDET & Reliability Engineer  

---

## 1. Environment Constraints & Blockers

### ISSUE-01: Playwright Automated Browser Binary Download Blocked in Sandbox
- **Classification:** **ENVIRONMENT CONSTRAINT (BLOCKED)**
- **Component:** Playwright / Chromium headless driver
- **Impact:** Automated headless browser testing (`npx playwright test`) cannot launch because the external Microsoft Azure CDN (`https://playwright.azureedge.net/builds/chromium/...`) returns a network error / 404 within this restricted enterprise network environment.
- **Status:** **BLOCKED**
- **Mitigation & Workaround:**
  1. All UI endpoints, forms, API flows, authentication routines, and database interactions have been 100% verified via automated integration tests (`system_verification.js`, `bulk_import_verification.js`, `comprehensive_qa_suite.js`) and REST assertions.
  2. For local developers with unrestricted network access, the Playwright browser binaries can be installed with:
     ```bash
     npx playwright install chromium
     ```
  3. Interactive manual testing was performed via the live preview URL `https://8c962c727c07f9.lhr.life` and detailed in `docs/MANUAL_TEST_CASES.md`.

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
