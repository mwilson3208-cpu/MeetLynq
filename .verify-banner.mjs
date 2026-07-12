import { chromium } from 'playwright-core';
const EVENT = 'cmrh2v8jw000d7dghaw57d33r';
const BASE = 'http://127.0.0.1:3100';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext()).newPage();
const log = (...a) => console.log(...a);
try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', 'organizer@meetlynq.com');
  await page.fill('input[name="password"]', 'password123');
  await Promise.all([page.waitForURL('**/dashboard**', {timeout: 30000}).catch(()=>{}), page.click('button[type="submit"]')]);
  await page.goto(`${BASE}/dashboard/events/${EVENT}/builder`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // DRAFT banner
  log('1. draft banner:', (await page.getByText(/still a draft/).count()) > 0 ? 'PASS' : 'FAIL');
  log('2. preview link:', await page.getByRole('link', { name: /Preview page/ }).count());

  // Click "Publish event"
  await page.getByRole('button', { name: /Publish event/ }).click();
  await page.waitForTimeout(1500);
  log('3. after publish — live banner:', (await page.getByText(/Registration is live/).count()) > 0 ? 'PASS' : 'FAIL');
  log('4. view registration link:', await page.getByRole('link', { name: /View registration page/ }).count());

  // MOVE SECTION order verification — first page with >=2 sections
  const firstCard = page.locator('div').filter({ has: page.locator('button[aria-label="Delete section"]') }).first();
  const secHeads = page.locator('button[aria-label="Move up"]');
  // capture the badges/headings order within the first page card via section rows
  const rows = page.locator('li, div.rounded-lg').filter({ has: page.locator('button[aria-label="Move down"]') });
  const texts = async () => await rows.allTextContents();
  const before = (await texts()).slice(0, 2);
  // click the second section's Move up
  await page.locator('button[aria-label="Move up"]').nth(1).click();
  await page.waitForTimeout(1200);
  const after = (await texts()).slice(0, 2);
  log('5. MOVE SECTION swap:', JSON.stringify(before) !== JSON.stringify(after) ? 'PASS' : 'FAIL(no change)');

  await page.screenshot({ path: '.verify-banner.png', fullPage: false });
  log('DONE');
} catch (e) { log('ERROR', e.message.split('\n')[0]); await page.screenshot({ path: '.verify-banner-err.png' }).catch(()=>{}); }
finally { await browser.close(); }
