const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

// Static file server to serve frontend/dist
function startStaticServer(distDir, port = 3000) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    let filePath = path.join(distDir, reqUrl === '/' ? 'index.html' : reqUrl);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading file');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

const testResults = [];
function record(name, pass, details = '') {
  testResults.push({ name, pass, details });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`);
  if (!pass && details) {
    console.log(`       Details: ${details}`);
  }
}

async function runVerification() {
  console.log('========================================================================');
  console.log(' CAMPUSHQ SCHOOL ERP — COMPREHENSIVE LOGIN & SECURITY VERIFICATION SUITE');
  console.log('========================================================================\n');

  const distDir = path.resolve(__dirname, '../../../frontend/dist');
  if (!fs.existsSync(distDir)) {
    console.error('Error: frontend/dist not found. Please run npm run build first.');
    process.exit(1);
  }

  const FRONTEND_PORT = 3000;
  const frontendServer = await startStaticServer(distDir, FRONTEND_PORT);
  console.log(`Frontend SPA test server listening on http://localhost:${FRONTEND_PORT}\n`);

  let browser;
  try {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch {
      browser = await chromium.launch({ channel: 'msedge', headless: true });
    }
  } catch (err) {
    console.error('Could not launch Chrome/Edge:', err.message);
    frontendServer.close();
    process.exit(1);
  }

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Unified single route interceptor
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/api/login')) {
        const postData = route.request().postDataJSON() || {};
        const { email, password } = postData;

        if (password === 'WrongPassword!') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Invalid credentials.' }),
          });
          return;
        }

        if (email === 'admin@admin.com' && password === 'admin123') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              result: {
                _id: '6acbb58c290caa175efe3b12',
                name: 'CampusHQ',
                surname: 'Admin',
                role: 'owner',
                email: 'admin@admin.com',
                token: 'test_admin_jwt_token',
              },
              message: 'Successfully login user',
            }),
          });
          return;
        }

        if (email === 'teacher@school.edu' && password === 'teacher123') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              result: {
                _id: '6acbb58c290caa175efe3b13',
                name: 'Sarah',
                surname: 'Jenkins',
                role: 'teacher',
                email: 'teacher@school.edu',
                token: 'test_teacher_jwt_token',
              },
              message: 'Successfully login user',
            }),
          });
          return;
        }

        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Invalid credentials.' }),
        });
        return;
      }

      if (url.includes('/api/logout')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Successfully logout user' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, result: [] }),
      });
    });

    // ------------------------------------------------------------------------
    // TEST 1: FRESH VISIT TO /login
    // ------------------------------------------------------------------------
    await page.goto(`http://localhost:${FRONTEND_PORT}/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('form.login-form', { timeout: 10000 });

    const emailVal = await page.$eval('input[type="email"]', el => el.value);
    record(
      'Requirement 1 & 2: Email input is empty on fresh page load',
      emailVal === '',
      `Email value was: "${emailVal}"`
    );

    const passVal = await page.$eval('input[type="password"]', el => el.value);
    record(
      'Requirement 1 & 2: Password input is empty on fresh page load (not pre-filled)',
      passVal === '',
      `Password value was: "${passVal}"`
    );

    const passType = await page.$eval('input[type="password"]', el => el.type);
    record(
      'Requirement 2: Password input has type="password"',
      passType === 'password',
      `Type was: "${passType}"`
    );

    const passAutoComplete = await page.$eval('input[type="password"]', el => el.getAttribute('autocomplete'));
    record(
      'Requirement 3: Password autocomplete is disabled / set to new-password',
      passAutoComplete === 'new-password' || passAutoComplete === 'off',
      `Autocomplete was: "${passAutoComplete}"`
    );

    const emailPlaceholder = await page.$eval('input[type="email"]', el => el.placeholder);
    record(
      'Requirement 1 & 6: Email placeholder does not expose admin@admin.com',
      !emailPlaceholder.includes('admin@admin.com'),
      `Placeholder was: "${emailPlaceholder}"`
    );

    const passPlaceholder = await page.$eval('input[type="password"]', el => el.placeholder);
    record(
      'Requirement 1 & 6: Password placeholder does not expose admin123',
      !passPlaceholder.includes('admin123') && !passPlaceholder.includes('admin'),
      `Placeholder was: "${passPlaceholder}"`
    );

    const demoTagsText = await page.$$eval('.ant-tag', tags => tags.map(t => t.textContent.trim()));
    const hasAdminDemoTag = demoTagsText.some(text => text.toLowerCase().includes('admin'));
    record(
      'Requirement 1 & 3: Admin demo tag completely removed from quick-fill list',
      !hasAdminDemoTag,
      `Tags found: ${JSON.stringify(demoTagsText)}`
    );

    const hasPrincipal = demoTagsText.some(text => text.includes('Principal'));
    const hasTeacher = demoTagsText.some(text => text.includes('Teacher'));
    const hasStudent = demoTagsText.some(text => text.includes('Student'));
    record(
      'Requirement 4: Other user roles (Principal, Teacher, Student, etc.) remain intact',
      hasPrincipal && hasTeacher && hasStudent,
      `Tags found: ${JSON.stringify(demoTagsText)}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: INCORRECT CREDENTIALS REJECTION
    // ------------------------------------------------------------------------
    await page.fill('input[type="email"]', 'admin@admin.com');
    await page.fill('input[type="password"]', 'WrongPassword!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);
    const formStillVisible = await page.locator('form.login-form').isVisible();
    const tokenAfterReject = await page.evaluate(() => localStorage.getItem('auth'));
    record(
      'Requirement 9: Incorrect credentials rejected, remains on login screen without auth token',
      formStillVisible && !tokenAfterReject,
      `Login form visible: ${formStillVisible}, token in storage: ${tokenAfterReject}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: MANUAL ADMIN LOGIN SUCCESS & REDIRECTION
    // ------------------------------------------------------------------------
    await page.fill('input[type="email"]', 'admin@admin.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForSelector('form.login-form', { state: 'detached', timeout: 10000 });
    const tokenInStorage = await page.evaluate(() => localStorage.getItem('auth'));
    record(
      'Requirement 4 & 9: Admin successfully logs in with manual credentials and reaches authenticated view',
      Boolean(tokenInStorage),
      `Auth token stored: ${Boolean(tokenInStorage)}`
    );

    // ------------------------------------------------------------------------
    // TEST 4: LOGOUT AND RE-LOGIN (PASSWORD MUST REMAIN EMPTY)
    // ------------------------------------------------------------------------
    await page.evaluate(() => {
      window.localStorage.clear();
      window.location.href = '/login';
    });
    await page.waitForSelector('form.login-form', { timeout: 10000 });

    const passAfterLogout = await page.$eval('input[type="password"]', el => el.value);
    const emailAfterLogout = await page.$eval('input[type="email"]', el => el.value);
    record(
      'Requirement 2 & 9: Password field is strictly empty after logout and return to login',
      passAfterLogout === '',
      `Password after logout was: "${passAfterLogout}"`
    );

    // ------------------------------------------------------------------------
    // TEST 5: PAGE REFRESH ON LOGIN (PASSWORD MUST REMAIN EMPTY)
    // ------------------------------------------------------------------------
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('form.login-form');
    const passAfterReload = await page.$eval('input[type="password"]', el => el.value);
    const emailAfterReload = await page.$eval('input[type="email"]', el => el.value);
    record(
      'Requirement 2 & 9: Password and Email stay strictly empty after browser reload',
      passAfterReload === '' && emailAfterReload === '',
      `After reload - Email: "${emailAfterReload}", Password: "${passAfterReload}"`
    );

    // ------------------------------------------------------------------------
    // TEST 6: NORMAL LOGIN FUNCTIONALITY FOR OTHER USER ROLES (TEACHER)
    // ------------------------------------------------------------------------
    const teacherTag = await page.$('span.ant-tag:has-text("Teacher")');
    if (teacherTag) {
      await teacherTag.click();
      await page.waitForTimeout(300);
      const teacherEmail = await page.$eval('input[type="email"]', el => el.value);
      const teacherPass = await page.$eval('input[type="password"]', el => el.value);
      record(
        'Requirement 4: Clicking Teacher demo role fills credentials for testing',
        teacherEmail === 'teacher@school.edu' && teacherPass === 'teacher123',
        `Teacher email: "${teacherEmail}", pass: "${teacherPass}"`
      );

      // Submit teacher login
      await page.click('button[type="submit"]');
      await page.waitForSelector('form.login-form', { state: 'detached', timeout: 10000 });
      const teacherToken = await page.evaluate(() => localStorage.getItem('auth'));
      record(
        'Requirement 4: Teacher role logs in successfully without breaking normal auth flow',
        Boolean(teacherToken),
        `Teacher logged in, auth token stored: ${Boolean(teacherToken)}`
      );
    }

    // ------------------------------------------------------------------------
    // TEST 7: LANDING PAGE DOES NOT EXPOSE ADMIN CREDENTIALS
    // ------------------------------------------------------------------------
    await page.goto(`http://localhost:${FRONTEND_PORT}/landing`, { waitUntil: 'networkidle' });
    const landingContent = await page.content();
    record(
      'Requirement 6: Landing page does not expose admin credentials (admin@admin.com / admin123)',
      !landingContent.includes('admin@admin.com') && !landingContent.includes('admin123'),
      `Contains admin@admin.com: ${landingContent.includes('admin@admin.com')}, Contains admin123: ${landingContent.includes('admin123')}`
    );

    // ------------------------------------------------------------------------
    // TEST 8: LOGOUT / RETURN TO LOGIN ALWAYS SHOWS EMPTY PASSWORD FIELD
    // ------------------------------------------------------------------------
    await page.evaluate(() => {
      window.localStorage.clear();
      window.location.href = '/login';
    });
    await page.waitForSelector('form.login-form', { timeout: 10000 });
    const passOnReturn = await page.$eval('input[type="password"]', el => el.value);
    record(
      'Requirement 2: Fresh login form always displays empty password field',
      passOnReturn === '',
      `Password was: "${passOnReturn}"`
    );

    await context.close();
    await browser.close();
  } catch (err) {
    console.error('Browser test failed:', err);
    record('Browser Test Suite Execution', false, err.message);
  } finally {
    frontendServer.close();
  }

  console.log('\n========================================================================');
  const passed = testResults.filter(t => t.pass).length;
  const failed = testResults.filter(t => !t.pass).length;
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${testResults.length} checks`);
  console.log('========================================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

runVerification();
