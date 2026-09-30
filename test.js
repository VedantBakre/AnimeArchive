const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080');
  
  // Press '?'
  await page.keyboard.type('?');
  await page.waitForTimeout(500);
  
  const isActive = await page.evaluate(() => {
    return document.getElementById('shortcuts-modal').classList.contains('active');
  });
  console.log("Is active after ?: ", isActive);
  
  await browser.close();
})();
