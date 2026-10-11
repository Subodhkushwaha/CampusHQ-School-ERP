const { chromium } = require('playwright-core');

const FRONTEND_URL = 'https://8df38a8a10e89c.lhr.life';
const BACKEND_URL = 'https://e087299feef505.lhr.life';

const ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@admin.com', pass: 'admin123', target: '/school' },
  { role: 'Principal', email: 'principal@school.edu', pass: 'principal123', target: '/school' },
  { role: 'Teacher', email: 'teacher@school.edu', pass: 'teacher123', target: '/attendance' },
  { role: 'Accountant', email: 'accountant@school.edu', pass: 'accountant123', target: '/fees' },
  { role: 'Student', email: 'student@school.edu', pass: 'student123', target: '/student-portal' },
  { role: 'Parent', email: 'parent@school.edu', pass: 'parent123', target: '/parent-portal' },
  { role: 'Receptionist', email: 'receptionist@school.edu', pass: 'receptionist123', target: '/students' },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  console.log('--- TESTING REAL BROWSER LOGIN OVER LIVE HTTPS TUNNEL ---');
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend:  ${BACKEND_URL}\n`);

  let passedCount = 0;

  for (const acc of ACCOUNTS) {
    const context = await browser.newContext();
    const page = await context.newPage();

    let apiStatus = null;
    let apiUrl = null;
    page.on('response', res => {
      if (res.url().includes('/api/login')) {
        apiStatus = res.status();
        apiUrl = res.url();
      }
    });

    try {
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 25000 });
      await page.fill('input[type="email"]', acc.email);
      await page.fill('input[type="password"]', acc.pass);
      await page.click('button[type="submit"]');

      await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
      const currentUrl = page.url();
      const tokenInStorage = await page.evaluate(() => localStorage.getItem('auth'));

      const isPass = !currentUrl.includes('/login') && apiStatus === 200 && Boolean(tokenInStorage);
      console.log(`[${isPass ? 'PASS' : 'FAIL'}] ${acc.role.padEnd(14)} (${acc.email})`);
      console.log(`       HTTP ${apiStatus} -> ${currentUrl}`);
      console.log(`       Token stored in localStorage: ${tokenInStorage ? 'YES' : 'NO'}`);
      if (isPass) passedCount++;
    } catch (err) {
      console.log(`[FAIL] ${acc.role.padEnd(14)} (${acc.email}) -> Error: ${err.message}`);
    } finally {
      await context.close();
    }
  }

  // Also test invalid password rejection
  const context = await browser.newContext();
  const page = await context.newPage();
  let invalidStatus = null;
  page.on('response', res => {
    if (res.url().includes('/api/login')) invalidStatus = res.status();
  });
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 25000 });
  await page.fill('input[type="email"]', 'admin@admin.com');
  await page.fill('input[type="password"]', 'WrongPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  const stillOnLogin = page.url().includes('/login') && invalidStatus === 401;
  console.log(`[${stillOnLogin ? 'PASS' : 'FAIL'}] Invalid Password Rejection (HTTP ${invalidStatus}, Stays on /login)`);
  if (stillOnLogin) passedCount++;
  await context.close();

  await browser.close();
  console.log(`\nTOTAL PASSED: ${passedCount}/${ACCOUNTS.length + 1}`);
  process.exit(passedCount === ACCOUNTS.length + 1 ? 0 : 1);
})().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
