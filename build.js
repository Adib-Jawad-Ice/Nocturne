/**
 * Nocturne — build.js
 * Production minification script.
 *
 * Usage:
 *   npm install --save-dev esbuild html-minifier-terser
 *   node build.js
 *
 * Outputs a self-contained `dist/` folder ready to zip and submit to the
 * Chrome Web Store.  All developer comments and whitespace are stripped;
 * identifiers in non-IIFE scripts are mangled where safe.
 */

const esbuild       = require('esbuild');
const { minify: minifyHTML } = require('html-minifier-terser');
const fs            = require('fs');
const path          = require('path');

const SRC  = __dirname;
const DIST = path.join(__dirname, 'dist');

// ── Helpers ──────────────────────────────────────────────────────────────────
function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
function write(dest, data) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
}

// ── 1. Clean dist ─────────────────────────────────────────────────────────────
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// ── 2. Minify JavaScript ──────────────────────────────────────────────────────
// Files are listed in dependency order so esbuild processes them correctly.
// Each is kept as a standalone file (no bundling) so the extension loader
// injects them in the right sequence.
const jsFiles = [
  'theme.js',      // flash-prevention — must be tiny and run synchronously in <head>
  'config.js',     // globals — window.X assignments, must load before popup.js/content.js
  'content.js',    // content script IIFE
  'background.js', // service worker
  'popup.js',      // popup script
];

(async () => {
  for (const file of jsFiles) {
    const src  = path.join(SRC, file);
    const dest = path.join(DIST, file);
    if (!fs.existsSync(src)) { console.warn(`⚠  Skipping missing file: ${file}`); continue; }

    await esbuild.build({
      entryPoints : [src],
      outfile     : dest,
      bundle      : false,   // keep files separate — extension injection order matters
      minify      : true,
      legalComments: 'none', // strip all /* */ and // comments
      target      : ['chrome120'],
      format      : 'iife',  // wraps each file in an IIFE; safe for all extension scripts
    });
    console.log(`✓  ${file}  →  dist/${file}`);
  }

  // ── 3. Minify CSS ───────────────────────────────────────────────────────────
  const cssFiles = ['popup.css', 'reader.css'];
  for (const file of cssFiles) {
    const src  = path.join(SRC, file);
    const dest = path.join(DIST, file);
    if (!fs.existsSync(src)) { console.warn(`⚠  Skipping missing CSS: ${file}`); continue; }

    await esbuild.build({
      entryPoints : [src],
      outfile     : dest,
      bundle      : false,
      minify      : true,
    });
    console.log(`✓  ${file}  →  dist/${file}`);
  }

  // ── 4. Minify HTML ──────────────────────────────────────────────────────────
  const htmlFiles = ['popup.html'];
  for (const file of htmlFiles) {
    const src = path.join(SRC, file);
    if (!fs.existsSync(src)) { console.warn(`⚠  Skipping missing HTML: ${file}`); continue; }

    const raw = fs.readFileSync(src, 'utf8');
    const minified = await minifyHTML(raw, {
      collapseWhitespace    : true,
      removeComments        : true,
      removeAttributeQuotes : false, // keep quotes for extension CSP safety
      minifyCSS             : true,
      minifyJS              : true,
      removeRedundantAttributes: true,
      useShortDoctype       : true,
    });
    write(path.join(DIST, file), minified);
    console.log(`✓  ${file}  →  dist/${file}`);
  }

  // ── 5. Copy static assets unchanged ─────────────────────────────────────────
  const staticItems = ['manifest.json', 'icons'];
  for (const item of staticItems) {
    const src = path.join(SRC, item);
    if (!fs.existsSync(src)) { console.warn(`⚠  Skipping missing asset: ${item}`); continue; }
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      // Copy entire directory
      fs.readdirSync(src).forEach(f => {
        cp(path.join(src, f), path.join(DIST, item, f));
      });
    } else {
      cp(src, path.join(DIST, item));
    }
    console.log(`✓  ${item}  →  dist/${item}`);
  }

  // ── 6. Report sizes ──────────────────────────────────────────────────────────
  console.log('\n── Size report ──');
  function walkDir(dir) {
    let total = 0;
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) total += walkDir(full);
      else {
        const sz = fs.statSync(full).size;
        total += sz;
        const srcPath = path.join(SRC, path.relative(DIST, full));
        const srcSz   = fs.existsSync(srcPath) ? fs.statSync(srcPath).size : null;
        const savings = srcSz ? ` (${Math.round((1 - sz/srcSz)*100)}% smaller)` : '';
        console.log(`  ${path.relative(DIST, full).padEnd(22)} ${String(sz).padStart(7)} B${savings}`);
      }
    });
    return total;
  }
  const total = walkDir(DIST);
  console.log(`\n  Total dist size: ${total.toLocaleString()} B`);
  console.log('\nBuild complete → dist/');
})().catch(err => { console.error(err); process.exit(1); });
