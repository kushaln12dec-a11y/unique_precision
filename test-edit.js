const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error));

  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="text"]', 'EMP0001');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard*');
  console.log('Logged in, going to programmer page...');

  await page.goto('http://localhost:5173/programmer');
  await page.waitForSelector('.nav-item');

  // wait for table to load
  await page.waitForTimeout(2000);

  // click first edit button
  console.log('Clicking edit...');
  const editBtns = await page.$$('button[title="Edit Job"]');
  if (editBtns.length === 0) {
    console.log('No edit buttons found. Maybe no jobs?');
    await browser.close();
    return;
  }
  await editBtns[0].click();

  // wait for form to load
  await page.waitForTimeout(2000);
  console.log('Current URL:', page.url());

  // Click Save
  console.log('Clicking save...');
  await page.click('button:has-text("Save Job")');

  await page.waitForTimeout(3000);
  console.log('URL after save:', page.url());
  
  // Click Programmer on sidebar
  console.log('Clicking programmer on sidebar...');
  await page.click('text="Programmer"');
  await page.waitForTimeout(1000);
  console.log('URL after sidebar click:', page.url());
  
  await browser.close();
})();
