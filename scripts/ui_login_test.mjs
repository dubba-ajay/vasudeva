// scripts/ui_login_test.mjs
import puppeteer from "puppeteer";

// Config via env
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
const USERNAME = process.env.UI_TEST_USERNAME || "testowner1_ejno";
const PASSWORD = process.env.UI_TEST_PASSWORD || "OwnerPass123";
const HEADLESS = process.env.UI_TEST_HEADLESS !== 'false';
const BROWSER_WS_ENDPOINT = process.env.BROWSER_WS_ENDPOINT || process.env.BROWSER_WSEB || null;
const CHROME_EXECUTABLE_PATH = process.env.CHROME_EXECUTABLE_PATH || null;

async function createBrowser() {
  if (BROWSER_WS_ENDPOINT) {
    console.log('Connecting to remote browser at', BROWSER_WS_ENDPOINT);
    return await puppeteer.connect({ browserWSEndpoint: BROWSER_WS_ENDPOINT });
  }

  const launchOptions = {
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  if (CHROME_EXECUTABLE_PATH) {
    launchOptions.executablePath = CHROME_EXECUTABLE_PATH;
    console.log('Launching Chrome from executablePath', CHROME_EXECUTABLE_PATH);
  } else {
    console.log('Launching bundled Chromium (may fail if system libs missing)');
  }

  return await puppeteer.launch(launchOptions);
}

(async () => {
  let browser;
  try {
    browser = await createBrowser();
  } catch (err) {
    console.error('Failed to obtain browser instance:', err);
    console.error('If you see missing shared libs (libnss3/libnspr4...), install them or provide a remote browser via BROWSER_WS_ENDPOINT.');
    process.exit(4);
  }

  const page = await browser.newPage();

  // Capture console logs
  page.on("console", msg => {
    try { console.log("[Browser Console]", msg.text()); } catch(e) {}
  });

  // Capture network requests/responses
  page.on("requestfinished", async (req) => {
    try {
      const res = await req.response();
      if (!res) return;
      const url = req.url();
      const status = res.status();
      if (url.includes("/login") || url.includes("/upsertProfile") || url.includes("/createCredential") || url.includes('/.netlify/functions')) {
        let text = '';
        try { text = await res.text(); } catch(e) { text = '<unable to read body>'; }
        console.log(`[Network] ${url} → ${status}`);
        console.log('Response:', text);
      }
    } catch (err) {
      console.error('[Network Error]', err);
    }
  });

  try {
    console.log('Navigating to', FRONTEND_URL);
    await page.goto(FRONTEND_URL, { waitUntil: "networkidle2", timeout: 30000 });

    // Open auth dialog by clicking Login / Sign Up button (best-effort selectors)
    try {
      await page.click('button:has-text("Login")');
    } catch (e) {
      try { await page.click('button:has-text("Login / Sign Up")'); } catch (e) { /* ignore */ }
    }

    // Wait for username field - attempt multiple selectors
    const usernameSelCandidates = ['input[name="username"]','input[placeholder="username"]','input[placeholder="Email or username"]','input[type="text"]'];
    let usernameSel = null;
    for (const s of usernameSelCandidates) {
      const el = await page.$(s);
      if (el) { usernameSel = s; break; }
    }

    if (!usernameSel) {
      console.error('Username input not found; stopping test.');
      await browser.close();
      process.exit(2);
    }

    await page.type(usernameSel, USERNAME);

    const passwordSelCandidates = ['input[name="password"]','input[type="password"]','input[placeholder="Password"]'];
    let passwordSel = null;
    for (const s of passwordSelCandidates) {
      const el = await page.$(s);
      if (el) { passwordSel = s; break; }
    }
    if (!passwordSel) {
      console.error('Password input not found; stopping test.');
      await browser.close();
      process.exit(2);
    }

    await page.type(passwordSel, PASSWORD);

    // Click submit button
    const submitCandidates = ['button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign in")', 'button:has-text("Submit")'];
    for (const s of submitCandidates) {
      try {
        await page.click(s);
        break;
      } catch (e) { /* try next */ }
    }

    // Wait some time for network activity
    await page.waitForTimeout(5000);

    console.log('UI test completed.');
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('UI test failed', e);
    try { await browser.close(); } catch(_) {}
    process.exit(3);
  }
})();
