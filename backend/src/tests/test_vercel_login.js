const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', res => console.log('HTTP:', res.status(), res.url()));
  page.on('requestfailed', req => console.log('NET FAIL:', req.url(), req.failure()?.errorText));

  console.log('Navigating to Vercel deployment: https://temporary-rapid-fjord-4794ao4.vercel.app/login ...');
  await page.goto('https://temporary-rapid-fjord-4794ao4.vercel.app/login', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Filling credentials: admin@admin.com / admin123 ...');
  await page.fill('input[type="email"]', 'admin@admin.com');
  await page.fill('input[type="password"]', 'admin123');

  console.log('Submitting login form...');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(6000);
  console.log('URL after submit:', page.url());

  await browser.close();
})().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
