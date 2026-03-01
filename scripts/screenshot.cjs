const { chromium } = require('playwright');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const BASE_URL = 'http://localhost:3001';
// Optional: set GEMINI_API_KEY env var for real AI feedback (all 3 personas). Never commit the key.
const API_KEY = process.env.GEMINI_API_KEY || '';

async function main() {
  if (!API_KEY) {
    console.warn('No GEMINI_API_KEY set. Screenshots will show mock AI responses.');
  }
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('canvas', { timeout: 10000 });

    if (API_KEY) {
      await page.evaluate((key) => localStorage.setItem('gemini_api_key', key), API_KEY);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('canvas', { timeout: 10000 });
    }

    // 1. Main view
    await page.screenshot({ path: path.join(DOCS_DIR, 'screenshot-main.png') });
    console.log('Saved: docs/screenshot-main.png');

    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    // 2. Add note (left click on canvas)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(DOCS_DIR, 'screenshot-with-notes.png') });
    console.log('Saved: docs/screenshot-with-notes.png');

    // 3. Type text in the note and mark as completed
    const textarea = page.locator('textarea').first();
    await textarea.click();
    await textarea.fill('My first draft idea for the project.');
    await page.waitForTimeout(300);

    // Click checkmark to complete (triggers AI - real if API_KEY set, else mock)
    const checkBtn = page.getByTitle('Complete & Generate AI Comments');
    await checkBtn.click();
    // Wait for AI: real API needs time for all 3 personas; wait for bot button to appear
    const botBtn = page.locator('button.bg-indigo-100, button[title="View AI Suggestions"]').first();
    await botBtn.waitFor({ state: 'visible', timeout: API_KEY ? 20000 : 5000 });
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(DOCS_DIR, 'screenshot-note-completed.png') });
    console.log('Saved: docs/screenshot-note-completed.png');

    // 4. Click Bot button to view AI suggestions
    await botBtn.click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(DOCS_DIR, 'screenshot-ai-suggestions.png') });
    console.log('Saved: docs/screenshot-ai-suggestions.png');

    // 5. Click Adopt on first suggestion
    const adoptBtn = page.getByRole('button', { name: 'Adopt' }).first();
    await adoptBtn.click();
    await page.waitForTimeout(600);

    await page.screenshot({ path: path.join(DOCS_DIR, 'screenshot-after-adopt.png') });
    console.log('Saved: docs/screenshot-after-adopt.png');

    // 6. Open settings (Adopt auto-closes the modal)
    const settingsBtn = page.getByTitle('AI Personas').or(
      page.getByRole('button', { name: /AI Personas/i })
    ).or(page.getByText('Go to Settings'));
    await settingsBtn.first().click();
    await page.waitForTimeout(600);

    await page.screenshot({ path: path.join(DOCS_DIR, 'screenshot-settings.png') });
    console.log('Saved: docs/screenshot-settings.png');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
