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

  const pageCards = () => page.locator('div.lg\\:col-span-1, div').filter({ has: page.locator('text=/./') });
  const nPages = async () => await page.locator('button[aria-label="Delete page"]').count();

  log('1. initial pages:', await nPages());

  // ADD PAGE
  await page.getByRole('button', { name: 'Add page' }).first().click();
  await page.waitForTimeout(400);
  await page.locator('input[name="title"]:visible').fill('Verify Test Page');
  await page.getByRole('button', { name: /^Add page$/ }).last().click();
  await page.waitForTimeout(1200);
  log('2. ADD PAGE:', (await page.getByText('Verify Test Page').count()) > 0 ? 'PASS' : 'FAIL');

  // RENAME PAGE (last page card = our new one)
  await page.locator('button[aria-label="Rename page"]').last().click();
  await page.waitForTimeout(400);
  const renameInput = page.locator('input[name="title"]:visible').last();
  await renameInput.fill('Renamed Test Page');
  await page.getByRole('button', { name: /^Save$/ }).last().click();
  await page.waitForTimeout(1200);
  log('3. RENAME PAGE:', (await page.getByText('Renamed Test Page').count()) > 0 ? 'PASS' : 'FAIL');

  // ADD SECTION to that page (its card's "Add section" button)
  const addSectionBtns = page.getByRole('button', { name: 'Add section' });
  await addSectionBtns.last().click();
  await page.waitForTimeout(400);
  await page.locator('input[name="heading"]:visible').fill('Verify Section Heading');
  await page.locator('textarea[name="body"]:visible').fill('Section body text.');
  await page.getByRole('button', { name: /^Add section$/ }).last().click();
  await page.waitForTimeout(1200);
  log('4. ADD SECTION:', (await page.getByText('Verify Section Heading').count()) > 0 ? 'PASS' : 'FAIL');

  // EDIT SECTION
  await page.locator('button[aria-label="Edit section"]').last().click();
  await page.waitForTimeout(400);
  await page.locator('input[name="heading"]:visible').last().fill('Edited Section Heading');
  await page.getByRole('button', { name: /^Save section$/ }).click();
  await page.waitForTimeout(1200);
  log('5. EDIT SECTION:', (await page.getByText('Edited Section Heading').count()) > 0 ? 'PASS' : 'FAIL');

  // PUBLISH page toggle (the new page starts unpublished)
  const pubBtn = page.locator('button[aria-label="Publish"]').last();
  const hadPub = await pubBtn.count();
  if (hadPub) { await pubBtn.click(); await page.waitForTimeout(1000); }
  log('6. PUBLISH toggle:', hadPub ? 'clicked, ok' : 'no unpublished page found');

  // MOVE PAGE up
  const upBefore = await page.locator('h3, .text-base').filter({hasText: 'Renamed Test Page'}).count();
  await page.locator('button[aria-label="Move page up"]').last().click();
  await page.waitForTimeout(1000);
  log('7. MOVE PAGE: clicked, ok');

  // MOVE SECTION (needs 2 sections; our page has 1 -> use another page's or just check disabled state)
  const moveSecUp = page.locator('button[aria-label="Move up"]');
  log('8. MOVE SECTION buttons present:', await moveSecUp.count());

  // DELETE SECTION
  const secDelBefore = await page.locator('button[aria-label="Delete section"]').count();
  await page.locator('button[aria-label="Delete section"]').last().click();
  await page.waitForTimeout(1000);
  const secDelAfter = await page.locator('button[aria-label="Delete section"]').count();
  log('9. DELETE SECTION:', secDelAfter === secDelBefore - 1 ? 'PASS' : `FAIL (${secDelBefore}->${secDelAfter})`);

  // DELETE PAGE (our test page)
  const pDelBefore = await nPages();
  await page.locator('button[aria-label="Delete page"]').last().click();
  await page.waitForTimeout(1200);
  const pDelAfter = await nPages();
  log('10. DELETE PAGE:', pDelAfter === pDelBefore - 1 ? 'PASS' : `FAIL (${pDelBefore}->${pDelAfter})`);

  // PUBLISH ALL
  await page.getByRole('button', { name: /Publish all pages/ }).click();
  await page.waitForTimeout(1200);
  log('11. PUBLISH ALL: clicked, unpublished-count now', await page.locator('button[aria-label="Publish"]').count());

  // Brand color picker presence (already verified working earlier)
  log('12. BRAND COLOR picker present:', await page.locator('input[aria-label="Brand color"]').count());

  // AI page copy
  log('13. AI page copy rendered:', (await page.getByText('AI page copy').count()) > 0 ? 'PASS' : 'FAIL');

  await page.screenshot({ path: '.verify-b.png', fullPage: false });
  log('DONE');
} catch (e) {
  log('ERROR', e.message.split('\n')[0]);
  await page.screenshot({ path: '.verify-b-err.png', fullPage: true }).catch(()=>{});
} finally { await browser.close(); }
