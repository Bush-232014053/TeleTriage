#!/usr/bin/env node
/** One-time patch: enable i18n on all frontend HTML pages */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../frontend');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));

const inlineToggleRe = /\n?\s*\/\/[^\n]*Language[^\n]*\n[\s\S]*?langToggle[\s\S]*?\}\);\s*\n/g;
const inlineToggleRe2 = /document\.getElementById\('langToggle'\)\?\.addEventListener\('click', function \(\) \{[\s\S]*?\}\);\s*/g;

for (const file of files) {
  let html = fs.readFileSync(path.join(dir, file), 'utf8');
  let changed = false;

  if (!html.includes('data-i18n-auto')) {
    html = html.replace(/<body([^>]*)>/i, '<body$1 data-i18n-auto>');
    changed = true;
  }

  // Ensure lang toggle button has id
  html = html.replace(
    /<button([^>]*class="[^"]*rounded-pill[^"]*"[^>]*)>\s*EN \| বাং\s*<\/button>/gi,
    (m, attrs) => {
      if (/id=["']langToggle["']/.test(attrs)) return m;
      changed = true;
      return `<button${attrs.replace(/\s*\/?>$/, '')} id="langToggle">EN | বাং</button>`;
    }
  );

  // Remove fake inline toggle handlers
  const cleaned = html.replace(inlineToggleRe, '\n').replace(inlineToggleRe2, '');
  if (cleaned !== html) {
    html = cleaned;
    changed = true;
  }

  if (!html.includes('js/i18n.js')) {
    html = html.replace(/<\/body>/i, '  <script src="js/i18n.js"></script>\n</body>');
    changed = true;
  }

  // Inject toggle into page headers that lack one
  if (!html.includes('id="langToggle"') && !html.includes("id='langToggle'")) {
    const toggleBtn =
      '<button type="button" class="btn btn-sm text-white rounded-pill px-3" id="langToggle" style="background-color:#187D85;font-size:0.8rem;">EN | বাং</button>';
    if (html.includes('</header>')) {
      html = html.replace(/<\/header>/, `  ${toggleBtn}\n      </header>`);
      changed = true;
    } else if (html.includes('<body')) {
      html = html.replace(/<body[^>]*>/, (m) => `${m}\n  <div class="position-fixed top-0 end-0 p-3" style="z-index:9999">${toggleBtn}</div>`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(path.join(dir, file), html);
    console.log('patched', file);
  }
}

console.log('done');
