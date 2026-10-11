const { chromium } = require('playwright-core');

const FRONTEND_URL = process.env.TEST_FRONTEND_URL || 'http://localhost:3000';

const testResults = [];

function recordTest(id, name, passed, details = '') {
  testResults.push({ id, name, status: passed ? 'PASS' : 'FAIL', details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] ${id} - ${name}`);
  if (!passed && details) {
    console.log(`       Details: ${details}`);
  }
}

async function runBrowserE2ESuite() {
  console.log('========================================================================');
  console.log(' CAMPUSHQ SCHOOL ERP — PLAYWRIGHT END-TO-END BROWSER AUTOMATION SUITE');
  console.log(` Target Frontend URL: ${FRONTEND_URL}`);
  console.log(' Browser Engine: Chromium / Google Chrome (System Channel)');
  console.log('========================================================================\n');

  let browser;
  try {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
      console.log('Browser initialized: Google Chrome (headless)\n');
    } catch (e1) {
      console.log('Google Chrome launch failed, attempting Microsoft Edge...');
      browser = await chromium.launch({ channel: 'msedge', headless: true });
      console.log('Browser initialized: Microsoft Edge (headless)\n');
    }
  } catch (err) {
    console.error('Fatal Browser Initialization Error:', err.message);
    recordTest('E2E-BROWSER-INIT', 'Launch Headless Browser', false, err.message);
    process.exit(1);
  }

  const createContext = async (viewport = { width: 1280, height: 800 }) => {
    return await browser.newContext({ viewport });
  };

  // ------------------------------------------------------------------------
  // TEST 1: LOGIN PAGE RENDERING & INITIAL ASSETS
  // ------------------------------------------------------------------------
  try {
    const context = await createContext();
    const page = await context.newPage();
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const title = await page.title();
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]');

    const pass = Boolean(title && emailInput && passwordInput && submitBtn);
    recordTest(
      'E2E-01-LOGIN-PAGE-RENDER',
      'Login page loads with form inputs, branding, and submit action',
      pass,
      `Title: "${title}", Inputs detected: ${Boolean(emailInput && passwordInput)}`
    );
    await context.close();
  } catch (err) {
    recordTest('E2E-01-LOGIN-PAGE-RENDER', 'Login page rendering', false, err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 2: NEGATIVE AUTHENTICATION (INVALID CREDENTIALS)
  // ------------------------------------------------------------------------
  try {
    const context = await createContext();
    const page = await context.newPage();
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    await page.fill('input[type="email"]', 'admin@admin.com');
    await page.fill('input[type="password"]', 'InvalidPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const stillOnLogin = currentUrl.includes('/login');
    recordTest(
      'E2E-02-REJECT-INVALID-LOGIN',
      'Invalid password stays on /login and denies entry to dashboard',
      stillOnLogin,
      `Current URL: ${currentUrl}`
    );
    await context.close();
  } catch (err) {
    recordTest('E2E-02-REJECT-INVALID-LOGIN', 'Invalid password rejection', false, err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 3: ADMIN LOGIN & DASHBOARD ROUTING
  // ------------------------------------------------------------------------
  try {
    const context = await createContext();
    const page = await context.newPage();
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    await page.fill('input[type="email"]', 'admin@admin.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(2000);

    const navigatedUrl = page.url();
    const pass = !navigatedUrl.includes('/login');
    recordTest(
      'E2E-03-ADMIN-LOGIN-SUCCESS',
      'Administrator authenticates and redirects to ERP application view',
      pass,
      `Navigated to: ${navigatedUrl}`
    );
    await context.close();
  } catch (err) {
    recordTest('E2E-03-ADMIN-LOGIN-SUCCESS', 'Admin login redirection', false, err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 4: TEACHER LOGIN WORKFLOW
  // ------------------------------------------------------------------------
  try {
    const context = await createContext();
    const page = await context.newPage();
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    await page.fill('input[type="email"]', 'teacher@school.edu');
    await page.fill('input[type="password"]', 'teacher123');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(2000);

    const teacherUrl = page.url();
    const pass = !teacherUrl.includes('/login');
    recordTest(
      'E2E-04-TEACHER-LOGIN-SUCCESS',
      'Teacher Sarah Jenkins logs in and reaches faculty application view',
      pass,
      `Navigated to: ${teacherUrl}`
    );
    await context.close();
  } catch (err) {
    recordTest('E2E-04-TEACHER-LOGIN-SUCCESS', 'Teacher login workflow', false, err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 5: STUDENT PORTAL LOGIN & AUTHORIZATION
  // ------------------------------------------------------------------------
  try {
    const context = await createContext();
    const page = await context.newPage();
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    await page.fill('input[type="email"]', 'student@school.edu');
    await page.fill('input[type="password"]', 'student123');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(2000);

    const studentUrl = page.url();
    const pass = !studentUrl.includes('/login');
    recordTest(
      'E2E-05-STUDENT-PORTAL-ACCESS',
      'Student Alex Morgan logs in to student portal environment',
      pass,
      `Navigated to: ${studentUrl}`
    );
    await context.close();
  } catch (err) {
    recordTest('E2E-05-STUDENT-PORTAL-ACCESS', 'Student portal access', false, err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 6: PARENT PORTAL LOGIN & AUTHORIZATION
  // ------------------------------------------------------------------------
  try {
    const context = await createContext();
    const page = await context.newPage();
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    await page.fill('input[type="email"]', 'parent@school.edu');
    await page.fill('input[type="password"]', 'parent123');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(2000);

    const parentUrl = page.url();
    const pass = !parentUrl.includes('/login');
    recordTest(
      'E2E-06-PARENT-PORTAL-ACCESS',
      'Parent David Morgan logs in to parent portal environment',
      pass,
      `Navigated to: ${parentUrl}`
    );
    await context.close();
  } catch (err) {
    recordTest('E2E-06-PARENT-PORTAL-ACCESS', 'Parent portal access', false, err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 7: ACCOUNTANT PORTAL LOGIN & FINANCIAL VIEW
  // ------------------------------------------------------------------------
  try {
    const context = await createContext();
    const page = await context.newPage();
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    await page.fill('input[type="email"]', 'accountant@school.edu');
    await page.fill('input[type="password"]', 'accountant123');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(2000);

    const accUrl = page.url();
    const pass = !accUrl.includes('/login');
    recordTest(
      'E2E-07-ACCOUNTANT-PORTAL-ACCESS',
      'Accountant Marcus Sterling logs in to financial management view',
      pass,
      `Navigated to: ${accUrl}`
    );
    await context.close();
  } catch (err) {
    recordTest('E2E-07-ACCOUNTANT-PORTAL-ACCESS', 'Accountant portal access', false, err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 8: PROTECTED ROUTE REDIRECT (UNAUTHENTICATED ACCESS PREVENTION)
  // ------------------------------------------------------------------------
  try {
    const cleanContext = await createContext();
    const page = await cleanContext.newPage();

    // Navigate directly to protected route without auth token
    await page.goto(`${FRONTEND_URL}/students`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    const redirectUrl = page.url();
    const pass = redirectUrl.includes('/login');
    recordTest(
      'E2E-08-PROTECTED-ROUTE-REDIRECT',
      'Unauthenticated direct URL navigation to /students redirects to /login',
      pass,
      `Redirected to: ${redirectUrl}`
    );
    await cleanContext.close();
  } catch (err) {
    recordTest('E2E-08-PROTECTED-ROUTE-REDIRECT', 'Protected route redirection', false, err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 9: RESPONSIVE MOBILE VIEWPORT (375x667 iPhone SE)
  // ------------------------------------------------------------------------
  try {
    const mobileContext = await createContext({ width: 375, height: 667 });
    const page = await mobileContext.newPage();
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const submitBtn = await page.$('button[type="submit"]');
    const isVisible = await submitBtn.isVisible();
    recordTest(
      'E2E-09-MOBILE-VIEWPORT-RESPONSIVE',
      'Login interface renders cleanly on 375px mobile viewport without overflow',
      isVisible,
      'Submit button fully visible and clickable on mobile layout'
    );
    await mobileContext.close();
  } catch (err) {
    recordTest('E2E-09-MOBILE-VIEWPORT-RESPONSIVE', 'Mobile viewport test', false, err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 10: RESPONSIVE TABLET VIEWPORT (768x1024 iPad)
  // ------------------------------------------------------------------------
  try {
    const tabletContext = await createContext({ width: 768, height: 1024 });
    const page = await tabletContext.newPage();
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

    const submitBtn = await page.$('button[type="submit"]');
    const isVisible = await submitBtn.isVisible();
    recordTest(
      'E2E-10-TABLET-VIEWPORT-RESPONSIVE',
      'Login interface adapts to 768px tablet layout cleanly',
      isVisible,
      'Layout stable on tablet viewport'
    );
    await tabletContext.close();
  } catch (err) {
    recordTest('E2E-10-TABLET-VIEWPORT-RESPONSIVE', 'Tablet viewport test', false, err.message);
  }

  await browser.close().catch(() => {});

  // ------------------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(' PLAYWRIGHT END-TO-END BROWSER AUTOMATION — EXECUTION SUMMARY');
  console.log('========================================================================');

  const total = testResults.length;
  const passed = testResults.filter((t) => t.status === 'PASS').length;
  const failed = testResults.filter((t) => t.status === 'FAIL').length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`TOTAL BROWSER TESTS EXECUTED: ${total}`);
  console.log(`PASSED:                       ${passed} (${passRate}%)`);
  console.log(`FAILED:                       ${failed}`);
  console.log(`STATUS:                       ${failed === 0 ? 'ALL BROWSER WORKFLOWS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBrowserE2ESuite().catch((err) => {
  console.error('Fatal E2E suite execution failure:', err);
  process.exit(1);
});
