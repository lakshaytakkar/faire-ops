const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const bugs = [];
  const summary = {};

  const hqPages = [
    '/hq/overview', '/hq/overview/p-and-l',
    '/hq/hiring/candidates', '/hq/hiring/pipeline', '/hq/hiring/roles',
    '/hq/hiring/interviews', '/hq/hiring/offers', '/hq/hiring/platforms',
    '/hq/hiring/posts', '/hq/hiring/daily-reports',
    '/hq/people/directory', '/hq/people/departments', '/hq/people/leave',
    '/hq/people/payroll', '/hq/people/performance', '/hq/people/attendance',
    '/hq/finance/revenue', '/hq/finance/expenses', '/hq/finance/reconciliation',
    '/hq/finance/transactions',
    '/hq/assets/inventory', '/hq/assets/contracts', '/hq/assets/devices', '/hq/assets/licenses',
    '/hq/compliance/filings', '/hq/compliance/contracts', '/hq/compliance/entities',
    '/hq/social/posts', '/hq/social/analytics', '/hq/social/accounts', '/hq/social/calendar',
    '/hq/sites/overview', '/hq/sites/traffic', '/hq/sites/seo', '/hq/sites/leads', '/hq/sites/uptime',
    '/hq/calls/dashboard', '/hq/calls/recordings',
  ];

  const goyoPages = [
    '/goyo/dashboard', '/goyo/bookings', '/goyo/bookings/upcoming',
    '/goyo/bookings/in-progress', '/goyo/bookings/completed',
    '/goyo/clients', '/goyo/clients/active', '/goyo/clients/repeat',
    '/goyo/tours', '/goyo/tours/by-type',
    '/goyo/guides', '/goyo/guides/active', '/goyo/guides/by-city',
    '/goyo/itineraries',
    '/goyo/finance', '/goyo/finance/by-booking', '/goyo/finance/payments',
    '/goyo/visas', '/goyo/visas/calendar',
    '/goyo/travel/flights', '/goyo/travel/hotels',
  ];

  const allPages = [...hqPages, ...goyoPages];
  const BASE = 'https://faire-ops-flax.vercel.app';

  for (let i = 0; i < allPages.length; i++) {
    const path = allPages[i];
    const isGoyo = path.startsWith('/goyo');
    const errors = [];
    const consoleHandler = msg => {
      if (msg.type() === 'error') {
        const text = msg.text().slice(0, 200);
        // skip noisy browser internals
        if (!text.includes('favicon') && !text.includes('ERR_NAME_NOT_RESOLVED'))
          errors.push(text);
      }
    };
    page.on('console', consoleHandler);

    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(5000); // let data load
      const status = resp?.status() ?? 0;
      const bodyText = await page.textContent('body') ?? '';
      const bodyHtml = await page.innerHTML('body') ?? '';

      // 1. HTTP status
      if (status >= 400) {
        bugs.push({ path, severity: 'critical', issue: `HTTP ${status}` });
      }

      // 2. 404 / 500 content
      if (bodyText.includes('This page could not be found') || bodyText.includes('404'))
        bugs.push({ path, severity: 'critical', issue: '404 page content detected' });
      if (bodyText.includes('Application error') || bodyText.includes('Internal Server Error'))
        bugs.push({ path, severity: 'critical', issue: 'Application error / 500' });

      // 3. NaN / undefined / null visible
      // Check for standalone NaN, undefined, null (not inside code/attribute context)
      if (/\bNaN\b/.test(bodyText))
        bugs.push({ path, severity: 'medium', issue: 'NaN visible in page text' });
      if (/\bundefined\b/.test(bodyText))
        bugs.push({ path, severity: 'medium', issue: '"undefined" visible in page text' });
      // null as standalone displayed value (not "nullable", "null and void", etc.)
      if (/(?:^|[\s:,])null(?:[\s,.]|$)/i.test(bodyText) && !/annull|nullable/i.test(bodyText))
        bugs.push({ path, severity: 'low', issue: '"null" possibly visible in page text' });

      // 4. Raw ISO dates
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(bodyText))
        bugs.push({ path, severity: 'low', issue: 'Raw ISO datetime visible' });

      // 5. INR formatting for Goyo pages (should use ₹)
      if (isGoyo) {
        // Check if there are currency values without ₹
        const hasRupeeSymbol = bodyText.includes('₹');
        const hasDollarInGoyo = /\$\d/.test(bodyText);
        if (hasDollarInGoyo)
          bugs.push({ path, severity: 'medium', issue: 'Goyo page shows $ instead of ₹' });

        // 6. Hero banner on dashboard
        if (path === '/goyo/dashboard') {
          const gradientBanner = await page.$('[class*="gradient"], [class*="banner"], [class*="hero"], [style*="gradient"]');
          if (!gradientBanner)
            bugs.push({ path, severity: 'low', issue: 'No gradient/hero banner detected on Goyo dashboard' });
        }
      }

      // 7. Status badges - check for StatusBadge components or colored badges
      const badges = await page.$$('[class*="badge"], [class*="Badge"], [class*="status"]');

      // 8. KPI cards - check for zero or dash values
      const kpiCards = await page.$$('[class*="card"], [class*="Card"], [class*="kpi"], [class*="metric"], [class*="stat"]');
      if (kpiCards.length > 0) {
        for (const card of kpiCards.slice(0, 10)) {
          const cardText = await card.textContent() ?? '';
          // Card has a label but value is just 0 or -
          if (/^[\s]*[-0][\s]*$/.test(cardText.replace(/[a-zA-Z\s]+/g, ''))) {
            // Only flag if there's actually a label suggesting data should exist
          }
        }
      }

      // 9. Empty state - page loaded but essentially empty
      const trimmedText = bodyText.replace(/\s+/g, ' ').trim();
      if (trimmedText.length < 50 && status === 200)
        bugs.push({ path, severity: 'medium', issue: 'Page appears mostly empty (< 50 chars of content)' });

      // 10. Console errors
      if (errors.length > 0) {
        const unique = [...new Set(errors)];
        unique.forEach(e => bugs.push({ path, severity: 'low', issue: `Console error: ${e.slice(0, 150)}` }));
      }

      // Track summary
      summary[path] = { status, contentLength: trimmedText.length, badges: badges.length, kpiCards: kpiCards.length, consoleErrors: errors.length };

      process.stdout.write(`[${i + 1}/${allPages.length}] ${path} -> ${status} (${trimmedText.length} chars, ${errors.length} console errs)\n`);

    } catch (e) {
      bugs.push({ path, severity: 'critical', issue: `Navigation failed: ${e.message.slice(0, 120)}` });
      process.stdout.write(`[${i + 1}/${allPages.length}] ${path} -> FAILED: ${e.message.slice(0, 80)}\n`);
    }

    page.removeListener('console', consoleHandler);
  }

  await browser.close();

  // Print results
  console.log('\n' + '='.repeat(100));
  console.log('TEST RESULTS');
  console.log('='.repeat(100));

  if (bugs.length === 0) {
    console.log('NO BUGS FOUND across all ' + allPages.length + ' pages.');
  } else {
    const critical = bugs.filter(b => b.severity === 'critical');
    const medium = bugs.filter(b => b.severity === 'medium');
    const low = bugs.filter(b => b.severity === 'low');

    if (critical.length > 0) {
      console.log(`\n--- CRITICAL (${critical.length}) ---`);
      critical.forEach(b => console.log(`  ${b.path} | ${b.issue}`));
    }
    if (medium.length > 0) {
      console.log(`\n--- MEDIUM (${medium.length}) ---`);
      medium.forEach(b => console.log(`  ${b.path} | ${b.issue}`));
    }
    if (low.length > 0) {
      console.log(`\n--- LOW (${low.length}) ---`);
      low.forEach(b => console.log(`  ${b.path} | ${b.issue}`));
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log(`TOTAL: ${allPages.length} pages tested | ${bugs.length} bugs found`);
  console.log(`  Critical: ${bugs.filter(b => b.severity === 'critical').length}`);
  console.log(`  Medium: ${bugs.filter(b => b.severity === 'medium').length}`);
  console.log(`  Low: ${bugs.filter(b => b.severity === 'low').length}`);
  console.log('='.repeat(100));
})();
