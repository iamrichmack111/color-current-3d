# Color Current 3D

[![CI/CD](https://github.com/iamrichmack111/color-current-3d/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/iamrichmack111/color-current-3d/actions/workflows/ci-cd.yml)
![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?logo=javascript&logoColor=000)
![Three.js](https://img.shields.io/badge/Three.js-0.185.1-000000?logo=threedotjs&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-Screenshots-2EAD33?logo=playwright&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Game-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Responsive-1572B6?logo=css&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-3D-990000?logo=webgl&logoColor=white)

**Color Current 3D** is a browser-based Three.js underwater spelling game. Swim through a reef, catch fish your swimmer is large enough to eat, spell each fish's color, earn coins, and grow from a Tiny Swimmer into the Reef Giant.

## Gameplay

- **Catch fish:** swim into fish at or below your current size tier.
- **Spell colors:** each catch opens a color-spelling challenge.
- **Earn coins:** every correct answer awards 10 coins.
- **Grow:** every 50 coins unlocks the next swimmer size.
- **Win:** reach 200 coins and become the **Reef Giant**.
- **Explore:** a foggy 3D reef includes coral, plants, rocks, ruins, bubbles, and schools of fish.
- **Desktop + touch:** keyboard controls are supported, with touch controls on smaller devices.

## Controls

| Action | Control |
| --- | --- |
| Swim forward | `W` / `↑` |
| Swim backward | `S` / `↓` |
| Turn left | `A` / `←` |
| Turn right | `D` / `→` |
| Rise | `Space` |
| Dive | `Shift` |
| Pause | `P` |

## Playwright Screenshots

### Start Screen

![Color Current 3D start screen](media/screenshots/01-start-screen.png)

### Live Reef HUD

![Color Current 3D live reef HUD](media/screenshots/02-live-reef.png)

### Color Catch Challenge

![Color Current 3D color spelling challenge](media/screenshots/03-color-catch.png)

### Level Progression

![Color Current 3D level progression](media/screenshots/04-level-progress.png)

### Reef Giant Victory

![Color Current 3D victory screen](media/screenshots/05-reef-giant.png)

The screenshots are regenerated with Playwright by `scripts/capture_screenshots.py` and verified in CI.

## Run Locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

> Three.js is loaded from jsDelivr, so the live 3D renderer needs network access on first load.

## Screenshot Automation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install playwright
playwright install chromium
python scripts/capture_screenshots.py
```

## Demo Video

The repository includes `scripts/build_demo.sh`, which uses the Playwright gallery, **Piper Ryan High** narration, and FFmpeg to produce a 1080p H.264/AAC walkthrough.

```bash
bash scripts/build_demo.sh . ~/Downloads/DEMOS
```

Output:

```text
~/Downloads/DEMOS/color-current-3d-demo.mp4
```

## CI/CD

GitHub Actions performs JavaScript/Python checks, regenerates all Playwright screenshots in Chromium, verifies the expected PNGs, and uploads the gallery as a workflow artifact.

## Tech

- Three.js / WebGL
- JavaScript ES modules
- HTML5 + CSS3
- Playwright
- GitHub Actions
- Piper TTS + FFmpeg for the narrated demo

## License

Use and adapt according to the repository's license and project requirements.

## Narrated Demo

[▶ Watch the narrated Color Current 3D demo](media/demo/color-current-3d-demo.mp4)
