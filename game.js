import * as THREE from 'three';

const canvas = document.querySelector('#gameCanvas');
const startScreen = document.querySelector('#startScreen');
const startButton = document.querySelector('#startButton');
const playerNameInput = document.querySelector('#playerName');
const hud = document.querySelector('#hud');
const hudName = document.querySelector('#hudName');
const coinText = document.querySelector('#coinText');
const fishText = document.querySelector('#fishText');
const rankText = document.querySelector('#rankText');
const levelText = document.querySelector('#levelText');
const upgradeText = document.querySelector('#upgradeText');
const upgradeBar = document.querySelector('#upgradeBar');
const missionPanel = document.querySelector('#missionPanel');
const missionText = document.querySelector('#missionText');
const messageToast = document.querySelector('#messageToast');
const quizOverlay = document.querySelector('#quizOverlay');
const colorAnswer = document.querySelector('#colorAnswer');
const submitAnswer = document.querySelector('#submitAnswer');
const quizFeedback = document.querySelector('#quizFeedback');
const fishPreview = document.querySelector('#fishPreview');
const pauseOverlay = document.querySelector('#pauseOverlay');
const resumeButton = document.querySelector('#resumeButton');
const winOverlay = document.querySelector('#winOverlay');
const winSummary = document.querySelector('#winSummary');
const playAgainButton = document.querySelector('#playAgainButton');
const touchControls = document.querySelector('#touchControls');

const COLORS = [
  { name: 'red', hex: 0xff405d },
  { name: 'blue', hex: 0x3185ff },
  { name: 'green', hex: 0x36d782 },
  { name: 'yellow', hex: 0xffd84b },
  { name: 'orange', hex: 0xff8a32 },
  { name: 'purple', hex: 0x9d62ff },
  { name: 'pink', hex: 0xff72bd },
  { name: 'white', hex: 0xf3fbff },
  { name: 'black', hex: 0x1b2331 },
  { name: 'brown', hex: 0x9b6038 }
];

const RANKS = ['Tiny Swimmer', 'Reef Hunter', 'Current Cruiser', 'Ocean Predator', 'Reef Giant'];
const FISH_SIZES = [0.58, 0.86, 1.18, 1.55];
const WORLD = { x: 62, yMin: -8, yMax: 16, z: 62 };
const keys = Object.create(null);

let scene;
let camera;
let renderer;
let clock;
let player;
let playerMixer = 0;
let fishSchool = [];
let bubbleParticles;
let plankton;
let gameStarted = false;
let paused = false;
let quizActive = false;
let gameWon = false;
let pendingFish = null;
let coins = 0;
let caught = 0;
let level = 1;
let targetYaw = 0;
let verticalVelocity = 0;
let toastTimer = 0;
let answerLocked = false;
let playerName = 'Player';
let lastSpawnCheck = 0;

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x052f4c);
  scene.fog = new THREE.FogExp2(0x073653, 0.021);

  camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 180);
  camera.position.set(0, 5, 12);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  clock = new THREE.Clock();
  buildOcean();
  player = createDolphin();
  player.position.set(0, 3, 4);
  scene.add(player);
  spawnSchool(30);
  addParticles();
  addLights();
  animate();
}

function addLights() {
  const hemi = new THREE.HemisphereLight(0x9eeaff, 0x083c36, 2.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xc7f5ff, 3.2);
  sun.position.set(-18, 35, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  scene.add(sun);

  const glow = new THREE.PointLight(0x24caff, 22, 50, 2);
  glow.position.set(0, 9, 0);
  scene.add(glow);
}

function buildOcean() {
  const floorGeo = new THREE.PlaneGeometry(150, 150, 30, 30);
  const p = floorGeo.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, Math.sin(x * 0.12) * 0.45 + Math.cos(y * 0.1) * 0.35 + Math.random() * 0.28);
  }
  floorGeo.computeVertexNormals();
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0xb79563, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = WORLD.yMin - 1;
  floor.receiveShadow = true;
  scene.add(floor);

  const waterTop = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshPhysicalMaterial({ color: 0x69e8ff, transparent: true, opacity: 0.18, roughness: 0.15, transmission: 0.45, side: THREE.DoubleSide })
  );
  waterTop.rotation.x = Math.PI / 2;
  waterTop.position.y = WORLD.yMax + 2;
  scene.add(waterTop);

  for (let i = 0; i < 70; i += 1) addPlant();
  for (let i = 0; i < 38; i += 1) addRock();
  for (let i = 0; i < 16; i += 1) addCoral();
  addRuins();
}

function randomFloorPosition(padding = 5) {
  return {
    x: THREE.MathUtils.randFloatSpread(WORLD.x * 2 - padding),
    z: THREE.MathUtils.randFloatSpread(WORLD.z * 2 - padding)
  };
}

function addPlant() {
  const pos = randomFloorPosition();
  const group = new THREE.Group();
  const height = THREE.MathUtils.randFloat(1.4, 4.5);
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.11, height, 6),
    new THREE.MeshStandardMaterial({ color: Math.random() > .45 ? 0x2b9b6b : 0x5b8f3a, roughness: .9 })
  );
  stalk.position.y = height / 2;
  stalk.rotation.z = THREE.MathUtils.randFloatSpread(.2);
  group.add(stalk);
  for (let j = 0; j < 4; j += 1) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 6, 5),
      new THREE.MeshStandardMaterial({ color: 0x42b978, roughness: .8 })
    );
    leaf.scale.set(1, 3.5, 1);
    leaf.position.set(Math.sin(j * 2.1) * .12, height * (.25 + j * .16), Math.cos(j * 2.1) * .12);
    leaf.rotation.z = j % 2 ? .75 : -.75;
    group.add(leaf);
  }
  group.position.set(pos.x, WORLD.yMin, pos.z);
  group.rotation.y = Math.random() * Math.PI;
  scene.add(group);
}

function addRock() {
  const pos = randomFloorPosition();
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(THREE.MathUtils.randFloat(.4, 1.8), 0),
    new THREE.MeshStandardMaterial({ color: Math.random() > .3 ? 0x526c67 : 0x725f5b, roughness: 1 })
  );
  rock.scale.y = THREE.MathUtils.randFloat(.45, 1.05);
  rock.position.set(pos.x, WORLD.yMin - .2 + rock.scale.y * .25, pos.z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

function addCoral() {
  const pos = randomFloorPosition();
  const group = new THREE.Group();
  const coralColors = [0xff6e8d, 0xffa24b, 0xa970ff, 0x55dfca];
  const mat = new THREE.MeshStandardMaterial({ color: coralColors[Math.floor(Math.random() * coralColors.length)], roughness: .82 });
  const branches = THREE.MathUtils.randInt(4, 7);
  for (let i = 0; i < branches; i += 1) {
    const h = THREE.MathUtils.randFloat(.8, 2.8);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(.08, .16, h, 7), mat);
    branch.position.set(THREE.MathUtils.randFloatSpread(.75), h / 2, THREE.MathUtils.randFloatSpread(.75));
    branch.rotation.z = THREE.MathUtils.randFloatSpread(.5);
    group.add(branch);
  }
  group.position.set(pos.x, WORLD.yMin, pos.z);
  scene.add(group);
}

function addRuins() {
  const stone = new THREE.MeshStandardMaterial({ color: 0x637b78, roughness: 1 });
  const ruin = new THREE.Group();
  const columns = [-4.5, -1.5, 1.5, 4.5];
  for (const x of columns) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.48, .62, 5.5, 9), stone);
    col.position.set(x, 2.75, 0);
    col.rotation.z = THREE.MathUtils.randFloatSpread(.08);
    ruin.add(col);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(11, .8, 1.3), stone);
  lintel.position.y = 5.3;
  lintel.rotation.z = .04;
  ruin.add(lintel);
  ruin.position.set(-23, WORLD.yMin, -18);
  ruin.rotation.y = .45;
  scene.add(ruin);
}

function createDolphin() {
  const group = new THREE.Group();
  group.userData.baseScale = 1;

  const skin = new THREE.MeshStandardMaterial({ color: 0x63b9d8, roughness: .45, metalness: .05 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xb9edf2, roughness: .5 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x07131c, roughness: .4 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), skin);
  body.scale.set(.82, .62, 2.15);
  body.castShadow = true;
  group.add(body);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(.14, .27, 1.15, 12), belly);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -.05, -2.1);
  group.add(snout);

  const finGeo = new THREE.ConeGeometry(.52, 1.4, 3);
  const dorsal = new THREE.Mesh(finGeo, skin);
  dorsal.position.set(0, .78, .2);
  dorsal.rotation.x = -.18;
  group.add(dorsal);

  const sideFinGeo = new THREE.ConeGeometry(.3, 1.25, 3);
  const leftFin = new THREE.Mesh(sideFinGeo, skin);
  leftFin.position.set(.72, -.15, .25);
  leftFin.rotation.set(0, 0, -1.15);
  group.add(leftFin);
  const rightFin = leftFin.clone();
  rightFin.position.x = -.72;
  rightFin.rotation.z = 1.15;
  group.add(rightFin);

  const tailStem = new THREE.Mesh(new THREE.CylinderGeometry(.17, .35, 1.2, 10), skin);
  tailStem.rotation.x = Math.PI / 2;
  tailStem.position.z = 2.18;
  group.add(tailStem);

  const tail = new THREE.Group();
  const tailFinGeo = new THREE.ConeGeometry(.47, 1.45, 3);
  const tailA = new THREE.Mesh(tailFinGeo, skin);
  tailA.rotation.z = Math.PI / 2;
  tailA.position.x = .55;
  const tailB = tailA.clone();
  tailB.rotation.z = -Math.PI / 2;
  tailB.position.x = -.55;
  tail.add(tailA, tailB);
  tail.position.z = 2.9;
  group.add(tail);
  group.userData.tail = tail;

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), eyeMat);
    eye.position.set(.49 * side, .22, -1.25);
    group.add(eye);
  }

  group.rotation.order = 'YXZ';
  return group;
}

function createFish(tier = 0) {
  const colorInfo = COLORS[Math.floor(Math.random() * COLORS.length)];
  const scale = FISH_SIZES[tier];
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorInfo.hex, roughness: .48, metalness: .04 });
  const finMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorInfo.hex).offsetHSL(0, 0, -.08), roughness: .55 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), bodyMat);
  body.scale.set(1.05, .6, .48);
  body.castShadow = true;
  group.add(body);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(.58, 1.05, 3), finMat);
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -1.23;
  group.add(tail);

  const topFin = new THREE.Mesh(new THREE.ConeGeometry(.28, .65, 3), finMat);
  topFin.position.set(-.12, .66, 0);
  group.add(topFin);

  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x05080a });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), eyeWhite);
    eye.position.set(.75, .17, .34 * side);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.055, 7, 5), pupilMat);
    pupil.position.set(.84, .18, .39 * side);
    group.add(pupil);
  }

  if (tier >= 2) {
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .6 });
    for (let i = -1; i <= 1; i += 1) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(.48, .045, 5, 14, Math.PI * 1.35), stripeMat);
      stripe.rotation.y = Math.PI / 2;
      stripe.rotation.z = Math.PI / 2;
      stripe.position.x = i * .36;
      group.add(stripe);
    }
  }

  group.scale.setScalar(scale);
  group.userData = {
    colorName: colorInfo.name,
    tier,
    velocity: new THREE.Vector3(
      THREE.MathUtils.randFloat(-2.1, 2.1),
      THREE.MathUtils.randFloat(-.35, .35),
      THREE.MathUtils.randFloat(-2.1, 2.1)
    ),
    wobble: Math.random() * Math.PI * 2,
    phase: Math.random() * Math.PI * 2,
    tail,
    active: true
  };
  if (group.userData.velocity.lengthSq() < .8) group.userData.velocity.set(1.2, 0, .8);
  group.position.set(
    THREE.MathUtils.randFloat(-WORLD.x, WORLD.x),
    THREE.MathUtils.randFloat(WORLD.yMin + 2, WORLD.yMax - 2),
    THREE.MathUtils.randFloat(-WORLD.z, WORLD.z)
  );
  group.rotation.y = Math.atan2(-group.userData.velocity.z, group.userData.velocity.x);
  scene.add(group);
  fishSchool.push(group);
}

function spawnSchool(count) {
  for (let i = 0; i < count; i += 1) {
    const roll = Math.random();
    const tier = roll < .46 ? 0 : roll < .76 ? 1 : roll < .94 ? 2 : 3;
    createFish(tier);
  }
}

function addParticles() {
  const bubbleGeo = new THREE.BufferGeometry();
  const bubbleCount = 130;
  const bubbleData = new Float32Array(bubbleCount * 3);
  for (let i = 0; i < bubbleCount; i += 1) {
    bubbleData[i * 3] = THREE.MathUtils.randFloat(-WORLD.x, WORLD.x);
    bubbleData[i * 3 + 1] = THREE.MathUtils.randFloat(WORLD.yMin, WORLD.yMax);
    bubbleData[i * 3 + 2] = THREE.MathUtils.randFloat(-WORLD.z, WORLD.z);
  }
  bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubbleData, 3));
  bubbleParticles = new THREE.Points(
    bubbleGeo,
    new THREE.PointsMaterial({ color: 0xc6f7ff, size: .13, transparent: true, opacity: .58, depthWrite: false })
  );
  scene.add(bubbleParticles);

  const plankGeo = new THREE.BufferGeometry();
  const plankCount = 540;
  const plankData = new Float32Array(plankCount * 3);
  for (let i = 0; i < plankCount; i += 1) {
    plankData[i * 3] = THREE.MathUtils.randFloat(-WORLD.x, WORLD.x);
    plankData[i * 3 + 1] = THREE.MathUtils.randFloat(WORLD.yMin, WORLD.yMax);
    plankData[i * 3 + 2] = THREE.MathUtils.randFloat(-WORLD.z, WORLD.z);
  }
  plankGeo.setAttribute('position', new THREE.BufferAttribute(plankData, 3));
  plankton = new THREE.Points(
    plankGeo,
    new THREE.PointsMaterial({ color: 0x9aefff, size: .045, transparent: true, opacity: .5, depthWrite: false })
  );
  scene.add(plankton);
}

function updateParticles(dt) {
  if (!bubbleParticles) return;
  const attr = bubbleParticles.geometry.attributes.position;
  for (let i = 0; i < attr.count; i += 1) {
    let y = attr.getY(i) + dt * (.45 + (i % 7) * .035);
    if (y > WORLD.yMax + 2) y = WORLD.yMin;
    attr.setY(i, y);
  }
  attr.needsUpdate = true;
  plankton.rotation.y += dt * .008;
}

function startGame() {
  playerName = playerNameInput.value.trim() || 'Player';
  gameStarted = true;
  paused = false;
  quizActive = false;
  gameWon = false;
  coins = 0;
  caught = 0;
  level = 1;
  pendingFish = null;
  answerLocked = false;
  targetYaw = 0;
  verticalVelocity = 0;
  player.position.set(0, 3, 4);
  player.rotation.set(0, 0, 0);
  player.scale.setScalar(1);
  for (const fish of fishSchool) scene.remove(fish);
  fishSchool = [];
  spawnSchool(30);

  startScreen.classList.remove('active');
  hud.classList.remove('hidden');
  missionPanel.classList.remove('hidden');
  touchControls.classList.remove('hidden');
  quizOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  winOverlay.classList.add('hidden');
  hudName.textContent = playerName;
  updateHud();
  showToast('Find a small fish and swim into it!', 'good');
  clock.getDelta();
}

function updateHud() {
  coinText.textContent = coins;
  fishText.textContent = caught;
  rankText.textContent = RANKS[level - 1];
  levelText.textContent = `LV ${level}`;
  const withinLevel = level >= 5 ? 50 : coins % 50;
  upgradeBar.style.width = `${level >= 5 ? 100 : withinLevel * 2}%`;
  upgradeText.textContent = level >= 5 ? 'Maximum size reached' : `Next growth: ${Math.ceil(coins / 50) * 50 || 50} coins`;
  missionText.textContent = level >= 5 ? 'You can eat every fish!' : `Catch tier ${level} fish or smaller`;
}

function updatePlayer(dt) {
  const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const turn = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  const rise = (keys.Space ? 1 : 0) - (keys.ShiftLeft || keys.ShiftRight ? 1 : 0);

  const turnSpeed = 2.15;
  targetYaw += turn * turnSpeed * dt;
  player.rotation.y = dampAngle(player.rotation.y, targetYaw, 7, dt);

  const speed = (7.4 + level * .42) * (forward < 0 ? .52 : 1);
  const direction = new THREE.Vector3(Math.sin(player.rotation.y), 0, -Math.cos(player.rotation.y));
  player.position.addScaledVector(direction, forward * speed * dt);

  verticalVelocity = THREE.MathUtils.damp(verticalVelocity, rise * 5.8, 5, dt);
  player.position.y += verticalVelocity * dt;
  player.position.y = THREE.MathUtils.clamp(player.position.y, WORLD.yMin + 1.2, WORLD.yMax + .8);
  player.position.x = THREE.MathUtils.clamp(player.position.x, -WORLD.x, WORLD.x);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -WORLD.z, WORLD.z);

  const swimAmount = Math.abs(forward) + Math.abs(turn) * .4;
  playerMixer += dt * (5 + swimAmount * 6);
  player.userData.tail.rotation.y = Math.sin(playerMixer) * (.13 + swimAmount * .2);
  player.rotation.z = THREE.MathUtils.damp(player.rotation.z, -turn * .22, 5, dt);
  player.rotation.x = THREE.MathUtils.damp(player.rotation.x, -rise * .12, 5, dt);
  player.position.y += Math.sin(playerMixer * .55) * .0025;
}

function dampAngle(current, target, lambda, dt) {
  let delta = (target - current + Math.PI) % (Math.PI * 2) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function updateCamera(dt) {
  const forward = new THREE.Vector3(Math.sin(player.rotation.y), 0, -Math.cos(player.rotation.y));
  const desired = player.position.clone().addScaledVector(forward, -10 - level * .45).add(new THREE.Vector3(0, 4.2 + level * .22, 0));
  camera.position.lerp(desired, 1 - Math.exp(-4.8 * dt));
  const lookAt = player.position.clone().addScaledVector(forward, 4.8).add(new THREE.Vector3(0, .65, 0));
  camera.lookAt(lookAt);
}

function updateFish(dt, elapsed) {
  for (const fish of fishSchool) {
    if (!fish.userData.active) continue;
    const data = fish.userData;
    data.wobble += dt * (4 + data.tier);
    data.phase += dt;

    if (Math.random() < .008) {
      data.velocity.x += THREE.MathUtils.randFloatSpread(.65);
      data.velocity.y += THREE.MathUtils.randFloatSpread(.18);
      data.velocity.z += THREE.MathUtils.randFloatSpread(.65);
    }

    const distanceToPlayer = fish.position.distanceTo(player.position);
    if (distanceToPlayer < 8 && data.tier > level - 1) {
      const flee = fish.position.clone().sub(player.position).normalize();
      data.velocity.lerp(flee.multiplyScalar(4.2 + data.tier), dt * 1.9);
    }

    const edgeForce = new THREE.Vector3();
    if (Math.abs(fish.position.x) > WORLD.x - 6) edgeForce.x = -Math.sign(fish.position.x);
    if (Math.abs(fish.position.z) > WORLD.z - 6) edgeForce.z = -Math.sign(fish.position.z);
    if (fish.position.y > WORLD.yMax - 1) edgeForce.y = -1;
    if (fish.position.y < WORLD.yMin + 1.5) edgeForce.y = 1;
    data.velocity.addScaledVector(edgeForce, dt * 4);

    const maxSpeed = 2.4 + data.tier * .5;
    if (data.velocity.length() > maxSpeed) data.velocity.setLength(maxSpeed);
    fish.position.addScaledVector(data.velocity, dt);
    fish.position.y += Math.sin(data.phase * 1.7) * dt * .09;

    const wantedYaw = Math.atan2(-data.velocity.z, data.velocity.x);
    fish.rotation.y = dampAngle(fish.rotation.y, wantedYaw, 4, dt);
    fish.rotation.z = Math.sin(data.wobble) * .035;
    data.tail.rotation.y = Math.sin(data.wobble * 1.7) * .38;

    const collisionDistance = 1.05 * player.scale.x + FISH_SIZES[data.tier] * .9;
    if (gameStarted && !paused && !quizActive && distanceToPlayer < collisionDistance) attemptCatch(fish);
  }

  if (elapsed - lastSpawnCheck > 2) {
    lastSpawnCheck = elapsed;
    const activeCount = fishSchool.filter(f => f.userData.active).length;
    const needed = Math.max(0, 30 - activeCount);
    for (let i = 0; i < needed; i += 1) createFish(Math.floor(Math.random() * 4));
  }
}

function attemptCatch(fish) {
  if (fish.userData.tier > level - 1) {
    const needed = fish.userData.tier * 50;
    showToast(`Too big! Reach level ${fish.userData.tier + 1} to eat this fish.`, 'bad');
    const push = fish.position.clone().sub(player.position).normalize();
    fish.position.addScaledVector(push, 2.8);
    return;
  }

  pendingFish = fish;
  quizActive = true;
  answerLocked = false;
  fish.userData.active = false;
  quizFeedback.textContent = '';
  quizFeedback.className = '';
  colorAnswer.value = '';
  fishPreview.style.color = `#${fish.children[0].material.color.getHexString()}`;
  fishPreview.textContent = fish.userData.tier >= 2 ? '🐠' : '🐟';
  quizOverlay.classList.remove('hidden');
  setTimeout(() => colorAnswer.focus(), 70);
}

function checkAnswer() {
  if (!quizActive || answerLocked || !pendingFish) return;
  const raw = colorAnswer.value.trim().toLowerCase();
  const normalized = raw === 'grey' ? 'gray' : raw;
  const expected = pendingFish.userData.colorName;
  const correct = normalized === expected || (expected === 'black' && normalized === 'dark black');
  answerLocked = true;

  if (correct) {
    coins += 10;
    caught += 1;
    quizFeedback.textContent = `Correct! ${expected.toUpperCase()} earns 10 coins.`;
    quizFeedback.className = 'good';
    burstBubbles(pendingFish.position);
    scene.remove(pendingFish);
    fishSchool = fishSchool.filter(f => f !== pendingFish);
    const oldLevel = level;
    level = Math.min(5, Math.floor(coins / 50) + 1);
    updateHud();

    if (level > oldLevel) {
      growPlayer();
      setTimeout(() => showToast(`LEVEL UP! You are now a ${RANKS[level - 1]}!`, 'good'), 450);
    }

    if (level === 5 && coins >= 200) {
      setTimeout(endGame, 900);
    } else {
      setTimeout(closeQuiz, 650);
    }
  } else {
    quizFeedback.textContent = `Try again next time — it was ${expected.toUpperCase()}.`;
    quizFeedback.className = 'bad';
    const escapeDir = pendingFish.position.clone().sub(player.position).normalize();
    pendingFish.userData.velocity.copy(escapeDir.multiplyScalar(5));
    pendingFish.userData.active = true;
    setTimeout(closeQuiz, 1050);
  }
}

function closeQuiz() {
  quizOverlay.classList.add('hidden');
  quizActive = false;
  pendingFish = null;
  answerLocked = false;
  clock.getDelta();
}

function growPlayer() {
  const targetScale = 1 + (level - 1) * .21;
  const startScale = player.scale.x;
  const start = performance.now();
  const duration = 650;
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const pulse = Math.sin(t * Math.PI) * .11;
    player.scale.setScalar(THREE.MathUtils.lerp(startScale, targetScale, eased) + pulse);
    if (t < 1) requestAnimationFrame(step);
    else player.scale.setScalar(targetScale);
  }
  requestAnimationFrame(step);
}

function burstBubbles(position) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xcdfaff, transparent: true, opacity: .75 });
  for (let i = 0; i < 16; i += 1) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(THREE.MathUtils.randFloat(.04, .15), 7, 5), mat.clone());
    bubble.position.copy(position);
    bubble.userData.velocity = new THREE.Vector3(THREE.MathUtils.randFloatSpread(3), THREE.MathUtils.randFloat(.5, 3.2), THREE.MathUtils.randFloatSpread(3));
    group.add(bubble);
  }
  scene.add(group);
  const started = performance.now();
  function animateBurst(now) {
    const dt = .016;
    const t = (now - started) / 800;
    group.children.forEach(b => {
      b.position.addScaledVector(b.userData.velocity, dt);
      b.material.opacity = Math.max(0, .75 * (1 - t));
    });
    if (t < 1) requestAnimationFrame(animateBurst);
    else scene.remove(group);
  }
  requestAnimationFrame(animateBurst);
}

function endGame() {
  closeQuiz();
  gameWon = true;
  paused = true;
  winSummary.textContent = `${playerName} collected ${caught} fish, earned ${coins} coins, and became the biggest swimmer in the reef.`;
  winOverlay.classList.remove('hidden');
}

function togglePause(force) {
  if (!gameStarted || quizActive || gameWon) return;
  paused = typeof force === 'boolean' ? force : !paused;
  pauseOverlay.classList.toggle('hidden', !paused);
  if (!paused) clock.getDelta();
}

function showToast(message, type = '') {
  clearTimeout(toastTimer);
  messageToast.textContent = message;
  messageToast.className = `show ${type}`;
  toastTimer = setTimeout(() => { messageToast.className = ''; }, 1800);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .04);
  const elapsed = clock.elapsedTime;

  updateParticles(dt);
  if (gameStarted && !paused && !quizActive && !gameWon) {
    updatePlayer(dt);
    updateFish(dt, elapsed);
    updateCamera(dt);
  } else if (!gameStarted) {
    camera.position.x = Math.sin(elapsed * .12) * 14;
    camera.position.z = 14 + Math.cos(elapsed * .12) * 5;
    camera.position.y = 7 + Math.sin(elapsed * .18) * 1.4;
    camera.lookAt(0, 1, 0);
    updateFish(dt, elapsed);
  }

  renderer.render(scene, camera);
}

function setKey(code, pressed) {
  keys[code] = pressed;
}

window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyP' && !event.repeat) togglePause();
  if (event.code === 'Escape' && quizActive) return;
  setKey(event.code, true);
});
window.addEventListener('keyup', event => setKey(event.code, false));
window.addEventListener('blur', () => {
  Object.keys(keys).forEach(key => { keys[key] = false; });
  if (gameStarted && !quizActive && !gameWon) togglePause(true);
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

document.querySelectorAll('#touchControls button').forEach(button => {
  const code = button.dataset.key;
  const press = event => {
    event.preventDefault();
    setKey(code, true);
    button.classList.add('pressed');
  };
  const release = event => {
    event.preventDefault();
    setKey(code, false);
    button.classList.remove('pressed');
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
});

startButton.addEventListener('click', startGame);
playerNameInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') startGame();
});
submitAnswer.addEventListener('click', checkAnswer);
colorAnswer.addEventListener('keydown', event => {
  if (event.key === 'Enter') checkAnswer();
});
resumeButton.addEventListener('click', () => togglePause(false));
playAgainButton.addEventListener('click', startGame);

initThree();
