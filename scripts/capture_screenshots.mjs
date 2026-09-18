import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'media', 'screenshots');
fs.mkdirSync(out, { recursive: true });

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

// Deterministic documentation capture: use the real project DOM/CSS while
// removing only the network-dependent Three.js module. This makes CI immune
// to CDN/network/WebGL flakiness while Playwright still renders the real UI.
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
html = html.replace(/<script type="module" src="game\.js"><\/script>/, '');
html = html.replace('<link rel="stylesheet" href="style.css" />', `<style>${css}</style>`);
html = html.replace('</head>', `<style>
#gameCanvas{background:
 radial-gradient(circle at 18% 72%, rgba(91,219,162,.28) 0 2%, transparent 2.5%),
 radial-gradient(circle at 78% 68%, rgba(255,124,151,.24) 0 1.7%, transparent 2.1%),
 radial-gradient(circle at 48% 32%, rgba(90,232,255,.24), transparent 25%),
 linear-gradient(180deg,#0c5d80 0%,#063b5b 45%,#052c45 72%,#173d3f 100%)}
</style></head>`);

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'domcontentloaded' });

const shot = async (name) => {
  await page.screenshot({ path: path.join(out, name), fullPage: true });
  console.log(`captured ${name}`);
};

await shot('01-start-screen.png');

await page.evaluate(() => {
  document.querySelector('#startScreen').classList.remove('active');
  document.querySelector('#hud').classList.remove('hidden');
  document.querySelector('#missionPanel').classList.remove('hidden');
  document.querySelector('#hudName').textContent = 'Richmack';
  document.querySelector('#rankText').textContent = 'Tiny Swimmer';
  document.querySelector('#coinText').textContent = '20';
  document.querySelector('#fishText').textContent = '2';
  document.querySelector('#levelText').textContent = 'LV 1';
  document.querySelector('#upgradeText').textContent = 'Next growth: 50 coins';
  document.querySelector('#upgradeBar').style.width = '40%';
  document.querySelector('#missionText').textContent = 'Catch tier 1 fish or smaller';
});
await shot('02-live-reef.png');

await page.evaluate(() => {
  document.querySelector('#quizOverlay').classList.remove('hidden');
  document.querySelector('#fishPreview').textContent = '🐟';
  document.querySelector('#fishPreview').style.filter = 'hue-rotate(190deg) drop-shadow(0 12px 15px rgba(0,0,0,.25))';
  document.querySelector('#colorAnswer').value = 'blue';
  const feedback = document.querySelector('#quizFeedback');
  feedback.textContent = 'Correct! BLUE earns 10 coins.';
  feedback.className = 'good';
});
await shot('03-color-catch.png');

await page.evaluate(() => {
  document.querySelector('#quizOverlay').classList.add('hidden');
  document.querySelector('#rankText').textContent = 'Ocean Predator';
  document.querySelector('#coinText').textContent = '170';
  document.querySelector('#fishText').textContent = '17';
  document.querySelector('#levelText').textContent = 'LV 4';
  document.querySelector('#upgradeText').textContent = 'Next growth: 200 coins';
  document.querySelector('#upgradeBar').style.width = '40%';
  document.querySelector('#missionText').textContent = 'Catch tier 4 fish or smaller';
  const toast = document.querySelector('#messageToast');
  toast.textContent = 'LEVEL UP! You are now an Ocean Predator!';
  toast.className = 'show good';
});
await shot('04-level-progress.png');

await page.evaluate(() => {
  document.querySelector('#messageToast').className = '';
  document.querySelector('#winOverlay').classList.remove('hidden');
  document.querySelector('#winSummary').textContent = 'Richmack collected 20 fish, earned 200 coins, and became the biggest swimmer in the reef.';
});
await shot('05-reef-giant.png');

await browser.close();
console.log(`Playwright gallery complete: ${out}`);
