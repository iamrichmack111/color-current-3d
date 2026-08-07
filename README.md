# Color Current 3D

A browser-based Three.js underwater spelling game.

## Goal

- Swim into a fish you are large enough to catch.
- Spell the fish's color correctly.
- Earn 10 coins per correct answer.
- Every 50 coins, your swimmer grows and can eat the next size of fish.
- Reach 200 coins to become the Reef Giant.

## Controls

- W / Up Arrow: swim forward
- S / Down Arrow: swim backward
- A / Left Arrow: turn left
- D / Right Arrow: turn right
- Space: rise
- Shift: dive
- P: pause

Touch controls appear automatically on phones and tablets.

## Run it

From inside the game folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

The game loads Three.js from a CDN, so the first launch needs an internet connection.
