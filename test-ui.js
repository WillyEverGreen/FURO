const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to all network responses
  page.on('response', async response => {
    if (response.url().includes('/api/upload') || response.url().includes('supabase.co/storage')) {
      try {
        const text = await response.text();
        console.log(`[Network] ${response.request().method()} ${response.url()} -> ${response.status()}`);
        console.log(`[Response] ${text}`);
      } catch(e) {}
    }
  });

  console.log("Navigating to home...");
  await page.goto('http://localhost:3000');
  
  console.log("Creating new page...");
  await page.fill('input[type="text"]', `test-${Date.now()}`);
  await page.click('button[type="submit"]');
  
  // Wait to navigate to the new page
  await page.waitForTimeout(3000);
  
  console.log("Adding new section...");
  await page.click('button:has-text("+ Add Section")');
  await page.waitForTimeout(1000);

  console.log("Uploading file...");
  // Find file input and upload a dummy file
  const buffer = Buffer.from('hello world');
  const fileChooserPromise = page.waitForEvent('filechooser');
  // Click on the label
  await page.click('label.cursor-pointer');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'test-from-playwright.txt',
    mimeType: 'text/plain',
    buffer: buffer
  });

  await page.waitForTimeout(5000); // Wait for upload to complete

  await browser.close();
})();
