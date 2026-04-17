const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const bugs = [];
  const results = [];

  const pages = [
    '/legal/dashboard', '/legal/clients', '/legal/clients/active',
    '/legal/clients/onboarding', '/legal/cases', '/legal/cases/list',
    '/legal/cases/hearings', '/legal/documents', '/legal/documents/by-type',
    '/legal/payments', '/legal/payments/by-client', '/legal/compliance',
    '/legal/compliance/calendar', '/legal/compliance/done', '/legal/dashboard/activity'
  ];

  const BASE = 'https://faire-ops-flax.vercel.app';

  const minRows = {
    '/legal/clients': 8, '/legal/clients/active': 1, '/legal/clients/onboarding': 1,
    '/legal/cases': 12, '/legal/cases/list': 12, '/legal/cases/hearings': 1,
    '/legal/documents': 15, '/legal/documents/by-type': 1,
    '/legal/payments': 14, '/legal/payments/by-client': 1,
    '/legal/compliance': 12, '/legal/compliance/calendar': 1, '/legal/compliance/done': 1,
  };

  for (const path of pages) {
    const errors = [];
    const listener = msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 200)); };
    page.on('console', listener);

    const info = { path, status: 0, bugs: [], dataRows: 0, badges: 0, currencies: 0, dates: 0, notes: [] };

    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(5000);
      info.status = resp ? resp.status() : 0;
      const bodyText = (await page.textContent('body')) || '';
      const bodyHtml = (await page.innerHTML('body')) || '';

      // Check 1: HTTP status
      if (info.status === 404 || bodyText.includes('This page could not be found')) {
        bugs.push('BUG: ' + path + ' | critical | 404 Not Found');
        info.bugs.push('404');
      }
      if (info.status === 500 || bodyText.includes('Application error')) {
        bugs.push('BUG: ' + path + ' | critical | Server error 500');
        info.bugs.push('500');
      }
      if (info.status >= 400 && info.status !== 404 && info.status !== 500) {
        bugs.push('BUG: ' + path + ' | high | HTTP ' + info.status);
        info.bugs.push('HTTP ' + info.status);
      }

      // Check 2: Console errors
      const uniqueErrors = [...new Set(errors)];
      if (uniqueErrors.length > 0) {
        uniqueErrors.forEach(e => {
          bugs.push('BUG: ' + path + ' | low | Console error: ' + e.slice(0, 120));
        });
        info.bugs.push(uniqueErrors.length + ' console error(s)');
      }

      // Check 3: Data rows - try table rows, then role=row, then cards
      let tableRows = await page.$$('table tbody tr');
      if (tableRows.length === 0) tableRows = await page.$$('[role="row"]');
      let cardItems = await page.$$('[class*="card"], [class*="Card"]');
      info.dataRows = tableRows.length || cardItems.length;

      if (info.dataRows === 0) {
        const anyRows = await page.$$('tr');
        info.dataRows = Math.max(0, anyRows.length - 2);
      }

      const expectedMin = minRows[path];
      const primaryListings = ['/legal/clients', '/legal/cases', '/legal/cases/list', '/legal/documents', '/legal/payments', '/legal/compliance'];
      if (expectedMin && info.dataRows < expectedMin) {
        if (primaryListings.includes(path)) {
          bugs.push('BUG: ' + path + ' | medium | Expected ' + expectedMin + '+ data rows, found ' + info.dataRows);
        } else {
          info.notes.push('Data rows: ' + info.dataRows + ' (expected ' + expectedMin + '+)');
        }
      }

      // Check 4: Status badges
      const badgeEls = await page.$$('[class*="badge"], [class*="Badge"], [class*="status"], [class*="Status"]');
      info.badges = badgeEls.length;
      if (info.badges > 0) {
        try {
          const badgeSample = await page.evaluate(() => {
            const els = document.querySelectorAll('[class*="badge"], [class*="Badge"], [class*="status"], [class*="Status"]');
            return Array.from(els).slice(0, 5).map(el => ({
              text: (el.textContent || '').trim().slice(0, 30),
              classes: (el.className || '').slice(0, 100),
              bg: getComputedStyle(el).backgroundColor,
              color: getComputedStyle(el).color,
            }));
          });
          info.badgeSamples = badgeSample;
        } catch (e) {
          info.notes.push('Badge eval error');
        }
      }

      // Check 5: Currency values
      const currencyMatches = bodyText.match(/\$[\d,]+\.?\d*/g) || [];
      info.currencies = currencyMatches.length;
      if (path.includes('payment') && currencyMatches.length === 0) {
        bugs.push('BUG: ' + path + ' | medium | No USD currency values found on payments page');
      }

      // Check 6: Date formatting - raw ISO dates
      const isoDateMatches = bodyText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/g) || [];
      if (isoDateMatches.length > 0) {
        bugs.push('BUG: ' + path + ' | low | Raw ISO dates visible: ' + isoDateMatches.slice(0, 3).join(', '));
      }
      const formattedDates = bodyText.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4}/g) || [];
      const slashDates = bodyText.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g) || [];
      info.dates = formattedDates.length + slashDates.length;

      // Check 7: Stuck loading
      if (bodyText.includes('Loading...') && bodyText.length < 500) {
        bugs.push('BUG: ' + path + ' | medium | Stuck on loading state');
      }
      const hasEmptyState = bodyText.match(/no (data|results|items|records|clients|cases|documents|payments|hearings)/i) ||
                           bodyText.includes('Nothing to show') || bodyText.includes('No entries');
      if (hasEmptyState && info.dataRows === 0) {
        info.notes.push('Empty state displayed correctly');
      }

      // Check 8: NaN, undefined, null
      const nanMatch = bodyText.match(/\bNaN\b/g);
      if (nanMatch) {
        bugs.push('BUG: ' + path + ' | medium | "NaN" visible on page (' + nanMatch.length + ' occurrence(s))');
      }

      const visibleText = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const texts = [];
        let node;
        while ((node = walker.nextNode())) texts.push(node.textContent);
        return texts.join(' ');
      });

      if (/\bundefined\b/.test(visibleText)) {
        bugs.push('BUG: ' + path + ' | medium | "undefined" visible as text');
      }

      const nullMatches = visibleText.match(/.{0,20}\bnull\b.{0,20}/gi);
      if (nullMatches) {
        const suspicious = nullMatches.filter(c => !c.match(/null and void|nullif|annul/i));
        if (suspicious.length > 0) {
          bugs.push('BUG: ' + path + ' | medium | "null" visible as text: "' + suspicious[0].trim().slice(0, 50) + '"');
        }
      }

    } catch (e) {
      bugs.push('BUG: ' + path + ' | critical | Navigation failed: ' + e.message.slice(0, 120));
      info.bugs.push('Navigation failed');
    }

    page.removeListener('console', listener);
    errors.length = 0;
    results.push(info);
  }

  await browser.close();

  console.log('=== LEGAL NATIONS ADMIN SPACE - TEST RESULTS ===\n');

  for (const r of results) {
    console.log('--- ' + r.path + ' ---');
    console.log('  HTTP: ' + r.status + ' | Rows: ' + r.dataRows + ' | Badges: ' + r.badges + ' | Currencies: ' + r.currencies + ' | Dates: ' + r.dates);
    if (r.badgeSamples && r.badgeSamples.length > 0) {
      r.badgeSamples.forEach(b => {
        console.log('    Badge: "' + b.text + '" bg=' + b.bg + ' color=' + b.color);
      });
    }
    if (r.notes.length > 0) console.log('  Notes: ' + r.notes.join('; '));
    if (r.bugs.length > 0) console.log('  Issues: ' + r.bugs.join('; '));
    console.log('');
  }

  console.log('\n=== ALL BUGS ===\n');
  if (bugs.length === 0) {
    console.log('NO BUGS FOUND');
  } else {
    bugs.forEach(b => console.log(b));
  }
  console.log('\nPages tested: ' + pages.length + ' | Total bugs: ' + bugs.length);
})();
