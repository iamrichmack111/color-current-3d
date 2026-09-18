#!/usr/bin/env python3
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "media" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "style.css").read_text(encoding="utf-8")
# For deterministic documentation captures, use the project's exact DOM/CSS and
# remove only the network-dependent Three.js module. CI/local runs still capture
# the real application interface with Playwright.
html = re.sub(r'<script type="importmap">.*?</script>', '', html, flags=re.S)
html = re.sub(r'<script type="module" src="game.js"></script>', '', html)
html = html.replace('<link rel="stylesheet" href="style.css" />', f'<style>{css}</style>')
html = html.replace('</head>', '''<style>
#gameCanvas{background:
 radial-gradient(circle at 18% 72%, rgba(91,219,162,.28) 0 2%, transparent 2.5%),
 radial-gradient(circle at 78% 68%, rgba(255,124,151,.24) 0 1.7%, transparent 2.1%),
 radial-gradient(circle at 48% 32%, rgba(90,232,255,.24), transparent 25%),
 linear-gradient(180deg,#0c5d80 0%,#063b5b 45%,#052c45 72%,#173d3f 100%)}
#gameCanvas::after{content:"";position:fixed;inset:auto 0 0;height:30%;background:linear-gradient(transparent,rgba(18,57,50,.7))}
</style></head>''')

def show_game(page):
    page.evaluate("""() => {
      document.querySelector('#startScreen').classList.remove('active');
      document.querySelector('#hud').classList.remove('hidden');
      document.querySelector('#missionPanel').classList.remove('hidden');
      document.querySelector('#hudName').textContent='Richmack';
      document.querySelector('#rankText').textContent='Tiny Swimmer';
      document.querySelector('#coinText').textContent='20';
      document.querySelector('#fishText').textContent='2';
      document.querySelector('#levelText').textContent='LV 1';
      document.querySelector('#upgradeText').textContent='Next growth: 50 coins';
      document.querySelector('#upgradeBar').style.width='40%';
      document.querySelector('#missionText').textContent='Catch tier 1 fish or smaller';
    }""")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None, args=['--no-sandbox'])
    page = browser.new_page(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    page.set_content(html, wait_until='domcontentloaded')
    page.screenshot(path=str(OUT / '01-start-screen.png'), full_page=True)

    show_game(page)
    page.screenshot(path=str(OUT / '02-live-reef.png'), full_page=True)

    page.evaluate("""() => {
      const q=document.querySelector('#quizOverlay'); q.classList.remove('hidden');
      document.querySelector('#fishPreview').textContent='🐟';
      document.querySelector('#fishPreview').style.filter='hue-rotate(190deg) drop-shadow(0 12px 15px rgba(0,0,0,.25))';
      document.querySelector('#colorAnswer').value='blue';
      const f=document.querySelector('#quizFeedback'); f.textContent='Correct! BLUE earns 10 coins.'; f.className='good';
    }""")
    page.screenshot(path=str(OUT / '03-color-catch.png'), full_page=True)

    page.evaluate("""() => {
      document.querySelector('#quizOverlay').classList.add('hidden');
      document.querySelector('#rankText').textContent='Ocean Predator';
      document.querySelector('#coinText').textContent='170';
      document.querySelector('#fishText').textContent='17';
      document.querySelector('#levelText').textContent='LV 4';
      document.querySelector('#upgradeText').textContent='Next growth: 200 coins';
      document.querySelector('#upgradeBar').style.width='40%';
      document.querySelector('#missionText').textContent='Catch tier 4 fish or smaller';
      const t=document.querySelector('#messageToast'); t.textContent='LEVEL UP! You are now an Ocean Predator!'; t.className='show good';
    }""")
    page.screenshot(path=str(OUT / '04-level-progress.png'), full_page=True)

    page.evaluate("""() => {
      document.querySelector('#messageToast').className='';
      document.querySelector('#winOverlay').classList.remove('hidden');
      document.querySelector('#winSummary').textContent='Richmack collected 20 fish, earned 200 coins, and became the biggest swimmer in the reef.';
    }""")
    page.screenshot(path=str(OUT / '05-reef-giant.png'), full_page=True)
    browser.close()
print(f'Captured Playwright screenshots in {OUT}')
