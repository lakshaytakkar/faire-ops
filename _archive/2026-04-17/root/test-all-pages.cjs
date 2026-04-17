const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const bugs = [];

  const pages = [
    '/workspace/comms/overview', '/workspace/comms/templates', '/workspace/comms/campaigns',
    '/workspace/comms/triggers', '/workspace/comms/logs',
    '/workspace/emails/dashboard', '/workspace/emails/compose',
    '/workspace/emails/templates', '/workspace/emails/logs',
    '/workspace/messaging/whatsapp', '/workspace/messaging/sms',
    '/workspace/messaging/templates', '/workspace/messaging/logs',
    '/workspace/tickets/dashboard', '/workspace/tickets/all',
    '/workspace/tickets/internal', '/workspace/tickets/client', '/workspace/tickets/categories',
    '/workspace/chat', '/workspace/inbox', '/workspace/inbox/orders', '/workspace/inbox/system',
    '/workspace/team', '/workspace/roles', '/workspace/settings',
    '/workspace/account', '/workspace/account/preferences', '/workspace/account/security',
    '/workspace/sops',
    '/workspace/research', '/workspace/research/products', '/workspace/research/competitors',
    '/workspace/research/trends', '/workspace/research/tools', '/workspace/research/goals',
    '/workspace/research/reports', '/workspace/research/sources',
    '/workspace/ai-tools/all', '/workspace/ai-team',
    '/workspace/vendors', '/workspace/stores/all', '/workspace/applications',
    '/workspace/ledger', '/workspace/blogs', '/workspace/notes', '/workspace/gmail',
    '/workspace/knowledge/faq', '/workspace/links', '/workspace/stack',
    '/workspace/training', '/workspace/training/sops', '/workspace/training/videos',
    '/automations/overview', '/automations/sync', '/automations/history', '/automations/notifications',
    '/tasks', '/projects', '/plugins', '/vendor', '/reports/all', '/reports/day-close'
  ];

  const BASE = 'https://faire-ops-flax.vercel.app';
  let completed = 0;

  for (const path of pages) {
    const errors = [];
    const consoleHandler = msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 200)); };
    page.on('console', consoleHandler);
    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(4000);
      const status = resp?.status() ?? 0;
      const bodyText = await page.textContent('body') ?? '';

      // Check HTTP status
      if (status === 404 || bodyText.includes('This page could not be found'))
        bugs.push('BUG: ' + path + ' | critical | 404 Not Found');
      if (status === 500 || bodyText.includes('Application error') || bodyText.includes("couldn't load"))
        bugs.push('BUG: ' + path + ' | critical | 500/crash');
      if (status !== 200 && status !== 304 && status !== 404 && status !== 500)
        bugs.push('BUG: ' + path + ' | medium | HTTP ' + status);

      // Check for NaN / undefined in visible text
      if (/\bNaN\b/.test(bodyText))
        bugs.push('BUG: ' + path + ' | medium | NaN visible in page text');
      if (/\bundefined\b/.test(bodyText))
        bugs.push('BUG: ' + path + ' | low | "undefined" visible in page text');

      // Check for broken images
      const brokenImgs = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:'))
          .map(i => i.src.slice(0, 120));
      });
      if (brokenImgs.length > 0)
        bugs.push('BUG: ' + path + ' | medium | ' + brokenImgs.length + ' broken image(s): ' + brokenImgs.slice(0, 3).join(', '));

      // Check for interactive elements
      const interactiveCount = await page.evaluate(() => {
        return document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"]').length;
      });
      if (interactiveCount === 0 && !bodyText.includes('This page could not be found'))
        bugs.push('BUG: ' + path + ' | low | No interactive elements found');

      // Check for empty body / no meaningful content
      const trimmed = bodyText.replace(/\s+/g, ' ').trim();
      if (trimmed.length < 20 && status === 200)
        bugs.push('BUG: ' + path + ' | medium | Page appears empty (body < 20 chars)');

      // Console errors
      if (errors.length > 0) {
        const unique = [...new Set(errors)];
        unique.forEach(e => bugs.push('BUG: ' + path + ' | low | Console error: ' + e.slice(0, 150)));
        errors.length = 0;
      }

      completed++;
      if (completed % 10 === 0) console.log('Progress: ' + completed + '/' + pages.length);
    } catch (e) {
      bugs.push('BUG: ' + path + ' | critical | Navigation error: ' + e.message.slice(0, 120));
      completed++;
    }
    page.removeAllListeners('console');
  }

  await browser.close();

  console.log('\n========== TEST RESULTS ==========');
  console.log('Pages tested: ' + pages.length);
  console.log('Total bugs found: ' + bugs.length);
  console.log('');

  // Group by severity
  const critical = bugs.filter(b => b.includes('| critical |'));
  const medium = bugs.filter(b => b.includes('| medium |'));
  const low = bugs.filter(b => b.includes('| low |'));

  if (critical.length) { console.log('--- CRITICAL (' + critical.length + ') ---'); critical.forEach(b => console.log(b)); console.log(''); }
  if (medium.length) { console.log('--- MEDIUM (' + medium.length + ') ---'); medium.forEach(b => console.log(b)); console.log(''); }
  if (low.length) { console.log('--- LOW (' + low.length + ') ---'); low.forEach(b => console.log(b)); console.log(''); }
  if (bugs.length === 0) console.log('NO BUGS FOUND - all 62 pages clean!');
})();
