// === Initial Setup ===
let nextAssetId = 0;

const playerAssets = [];
const enemyAssets = [];

let placedAssetsCount = {
    cannon: 0,
    archer: 0,
    ammoDump: 0,
    barrier: 0,
    footSoldier: 0,
    sniper: 0,
    mortar: 0,
    machineGunNest: 0,
    hq: 0
};

const assetLimits = {
    cannon: 3,
    archer: 4,
    ammoDump: 1,
    barrier: 4,
    footSoldier: 3,
    sniper: 1,
    mortar: 2,
    machineGunNest: 3,
    hq: 1
};

function canPlaceAsset(type) {
    return placedAssetsCount[type] < (assetLimits[type] || 0);
}

let nextSquadId = 0; // ✅ Ensure this exists
const footSoldierSquads = {}; // ✅ Ensure this exists
const { Engine, Render, World, Bodies, Body, Events, Mouse, Vector, Query, Composite, Sleeping } = Matter;
const engine = Engine.create();
const world = engine.world;
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

function getCanvasRelativeMousePos() {
    return {
        x: mouse.position.x,
        y: mouse.position.y
    };
}

// === Scale Constants for SVG rendering ===
const FOOT_SOLDIER_SCALE = 0.6;
const FOOT_SOLDIER_BASE_WIDTH = 27;
const FOOT_SOLDIER_BASE_HEIGHT = 54;
const FOOT_SOLDIER_WIDTH = FOOT_SOLDIER_BASE_WIDTH * FOOT_SOLDIER_SCALE;
const FOOT_SOLDIER_HEIGHT = FOOT_SOLDIER_BASE_HEIGHT * FOOT_SOLDIER_SCALE;

const CANNON_SCALE = 0.6; // Adjust this if it feels too big/small later
const CANNON_BASE_WIDTH = 90;
const CANNON_BASE_HEIGHT = 45;
const CANNON_WIDTH = CANNON_BASE_WIDTH * CANNON_SCALE;
const CANNON_HEIGHT = CANNON_BASE_HEIGHT * CANNON_SCALE;

const ARCHER_SCALE = 0.8;
const ARCHER_BASE_WIDTH = 36;
const ARCHER_BASE_HEIGHT = 54;
const ARCHER_WIDTH = ARCHER_BASE_WIDTH * ARCHER_SCALE;
const ARCHER_HEIGHT = ARCHER_BASE_HEIGHT * ARCHER_SCALE;

const MORTAR_SCALE = 0.6;
const MORTAR_BASE_WIDTH = 60;
const MORTAR_BASE_HEIGHT = 54;
const MORTAR_WIDTH = MORTAR_BASE_WIDTH * MORTAR_SCALE;
const MORTAR_HEIGHT = MORTAR_BASE_HEIGHT * MORTAR_SCALE;

const SNIPER_SCALE = 0.8;
const SNIPER_BASE_WIDTH = 65;
const SNIPER_BASE_HEIGHT = 25;
const SNIPER_WIDTH = SNIPER_BASE_WIDTH * SNIPER_SCALE;
const SNIPER_HEIGHT = SNIPER_BASE_HEIGHT * SNIPER_SCALE;

const MGN_SCALE = 0.6;
const MGN_BASE_WIDTH = 60;
const MGN_BASE_HEIGHT = 54;
const MGN_WIDTH = MGN_BASE_WIDTH * MGN_SCALE;
const MGN_HEIGHT = MGN_BASE_HEIGHT * MGN_SCALE;

const COMMANDER_SCALE = 0.6;
const COMMANDER_BASE_WIDTH = 35;
const COMMANDER_BASE_HEIGHT = 54;
const COMMANDER_WIDTH = COMMANDER_BASE_WIDTH * COMMANDER_SCALE;
const COMMANDER_HEIGHT = COMMANDER_BASE_HEIGHT * COMMANDER_SCALE;

const HQ_SCALE = 1;
const HQ_BASE_WIDTH = 60;
const HQ_BASE_HEIGHT = 40;
const HQ_WIDTH = HQ_BASE_WIDTH * HQ_SCALE;
const HQ_HEIGHT = HQ_BASE_HEIGHT * HQ_SCALE;

const AMMO_DUMP_SCALE = 1.2;
const AMMO_DUMP_BASE_WIDTH = 40;
const AMMO_DUMP_BASE_HEIGHT = 20;
const AMMO_DUMP_WIDTH = AMMO_DUMP_BASE_WIDTH * AMMO_DUMP_SCALE;
const AMMO_DUMP_HEIGHT = AMMO_DUMP_BASE_HEIGHT * AMMO_DUMP_SCALE;

const assetSizes = {
    cannon: [CANNON_WIDTH, CANNON_HEIGHT],
    archer: [ARCHER_WIDTH, ARCHER_HEIGHT],
    mortar: [MORTAR_WIDTH, MORTAR_HEIGHT],
    sniper: [SNIPER_WIDTH, SNIPER_HEIGHT],
    machineGunNest: [MGN_WIDTH, MGN_HEIGHT],
    commander: [COMMANDER_WIDTH, COMMANDER_HEIGHT],
    hq: [HQ_WIDTH, HQ_HEIGHT],
    ammoDump: [AMMO_DUMP_WIDTH, AMMO_DUMP_HEIGHT]
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const sounds = {};

const footSoldierImages = [];

for (let i = 1; i <= 5; i++) {
    const img = new Image();
    img.src = `images/foot_soldiers/foot_soldier_${i}.svg`;
    footSoldierImages.push(img);
}

// === Load Single Image Assets ===
const images = {};
const imagePaths = {
  cannon: 'images/cannon.svg',
  cannon_damaged: 'images/cannon_damaged.svg',
  archer: 'images/archer.svg',
  archer_damaged: 'images/archer_damaged.svg',
  sniper: 'images/sniper.svg',
  sniper_damaged: 'images/sniper_damaged.svg',
  mortar: 'images/mortar.svg',
  mortar_damaged: 'images/mortar_damaged.svg',
  machineGunNest: 'images/machineGunNest.svg',
  machineGunNest_damaged: 'images/machineGunNest_damaged.svg',
  ammoDump: 'images/ammoDump.svg',
  ammoDump_damaged: 'images/ammoDump_damaged.svg',
  hq: 'images/hq.svg',
  hq_damaged: 'images/hq_damaged.svg',
  commander: 'images/commander.svg',
  commander_damaged: 'images/commander_damaged.svg',
  barrier_block: 'images/barrier_block.svg', // stays unchanged
  notebook_bg: 'images/notebook_bg.png'
};


for (const [key, path] of Object.entries(imagePaths)) {
    const img = new Image();
    img.src = path;
    images[key] = img;
  }  

const notebookBg = new Image();
notebookBg.src = 'images/notebook_bg.png';

function drawNotebookBackground() {
    const bg = images['notebook_bg'];
    if (!bg || !bg.complete) return;

    context.drawImage(bg, 0, 0, canvas.width, canvas.height);
}

function drawAssetImage(ctx, asset, label, width, height) {
    const maxHP = assetHPs[label];
    const isDamaged = asset.hp < maxHP;

    const imgKey = isDamaged && images[`${label}_damaged`] ? `${label}_damaged` : label;
    const img = images[imgKey];
    if (!img || !img.complete) return;

    const pos = asset.position;
    const angle = asset.angle || 0;

    const neverFlipLabels = ['hq', 'ammoDump'];
    const allowFlip = !neverFlipLabels.includes(label);
    const flip = (asset.isFlipped && allowFlip) ? -1 : 1;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    if (flip === -1) {
        ctx.scale(-1, 1);
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
    } else {
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
    }

    ctx.restore();
}


playerAssets.concat(enemyAssets).forEach(asset => {
    const size = assetSizes[asset.label];
    if (size) {
        drawAssetImage(context, asset, asset.label, size[0], size[1]);
    }
});



async function loadSound(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
}

// Call after sounds is defined
loadAllSounds()
    .then(() => console.log("🔊 All sounds loaded!"))
    .catch(err => console.error("❌ Sound loading failed:", err));

async function loadAllSounds() {
    sounds['arrow_fire'] = await loadSound('sounds/arrow_fire.wav');
    sounds['barrier_colapse'] = await loadSound('sounds/barrier_colapse.wav');
    sounds['button_click_1'] = await loadSound('sounds/button_click_1.wav');
    sounds['button_click_2'] = await loadSound('sounds/button_click_2.wav');
    sounds['cannon_fire'] = await loadSound('sounds/cannon_fire.wav');
    sounds['commander_deathcry'] = await loadSound('sounds/commander_deathcry.wav');
    sounds['commander_pistol'] = await loadSound('sounds/commander_pistol.wav');
    sounds['explosion'] = await loadSound('sounds/explosion.wav');
    sounds['explosion_debris'] = await loadSound('sounds/explosion_debris.wav');
    sounds['foot_soldier_volley'] = await loadSound('sounds/foot_soldier_volley.wav');
    sounds['machinegun_burst'] = await loadSound('sounds/machinegun_burst.wav');
    sounds['mortar_fire'] = await loadSound('sounds/mortar_fire.wav');
    sounds['mortar_hit'] = await loadSound('sounds/mortar_hit.wav');
    sounds['rubber_band_stretch'] = await loadSound('sounds/rubber_band_stretch.wav');
    sounds['scream_1'] = await loadSound('sounds/scream_1.wav');
    sounds['scream_2'] = await loadSound('sounds/scream_2.wav');
    sounds['scream_3'] = await loadSound('sounds/scream_3.wav');
    sounds['scream_4'] = await loadSound('sounds/scream_4.wav');
    sounds['scream_5'] = await loadSound('sounds/scream_5.wav');
    sounds['scream_6'] = await loadSound('sounds/scream_6.wav');
    sounds['sniper_fire'] = await loadSound('sounds/sniper_fire.wav');
    sounds['structure_collapse'] = await loadSound('sounds/structure_collapse.wav');
    sounds['scribble_1'] = await loadSound('sounds/scribble_1.wav');
    sounds['scribble_2'] = await loadSound('sounds/scribble_2.wav');
    sounds['scribble_3'] = await loadSound('sounds/scribble_3.wav');
    sounds['scribble_4'] = await loadSound('sounds/scribble_4.wav');
    sounds['arrow_impact'] = await loadSound('sounds/arrow_impact.wav');
    sounds['bullet_ricochet_1'] = await loadSound('sounds/bullet_ricochet_1.wav');
    sounds['bullet_ricochet_2'] = await loadSound('sounds/bullet_ricochet_2.wav');
    sounds['bullet_ricochet_3'] = await loadSound('sounds/bullet_ricochet_3.wav');
    sounds['bullet_ricochet_4'] = await loadSound('sounds/bullet_ricochet_4.wav');
    sounds['metal_clunk_1'] = await loadSound('sounds/metal_clunk_1.wav');
}

console.log("🎯 mortar_hit buffer:", sounds['mortar_hit']);
playSound('scribble_1'); // sanity check

function playRandomScribble() {
    const loadedScribbles = ['scribble_1', 'scribble_2', 'scribble_3', 'scribble_4']
        .filter(name => !!sounds[name]);

    if (loadedScribbles.length === 0) {
        console.warn("⚠️ No scribble sounds loaded yet.");
        return;
    }

    const name = loadedScribbles[Math.floor(Math.random() * loadedScribbles.length)];
    console.log("🖊️ Random scribble selected:", name);
    playSound(name);
}

function playSound(name, volume = 1.0) {
    if (!sounds[name]) {
        console.warn(`⚠️ Sound '${name}' not found.`);
        return;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = sounds[name];
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    try {
        source.start();
        console.log(`✅ Playing sound: ${name}`);
    } catch (err) {
        console.error(`❌ Failed to play sound '${name}':`, err);
    }
}


function playRandomButtonClick() {
    const rand = Math.random() < 0.5 ? 'button_click_1' : 'button_click_2';
    playSound(rand);
}

let gameOver = false;

const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        background: 'transparent',
        wireframes: false
    }
});

const notebookBackground = new Image();
notebookBackground.src = 'images/notebook_bg.png'; // or .png if needed

function drawNotebookBackground(event) {
    const ctx = render.context; // ✅ Use Matter's internal canvas
    const img = images['notebook_bg'];
    if (!img || !img.complete) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 🧼 Clean canvas before drawing
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // 🖼️ Fill entire canvas
    ctx.restore();
}


// === Canyon Floor and Invisible Side Walls ===
const ground = Bodies.rectangle(400, 495, 800, 20, {
    isStatic: true,
    render: { visible: false }  // 👈 Hides the tan block
});

// Replace these ugly bars with invisible offscreen boundaries
const invisibleWallLeft = Bodies.rectangle(-25, 250, 50, 500, {
    isStatic: true,
    render: { visible: false }
});
const invisibleWallRight = Bodies.rectangle(825, 250, 50, 500, {
    isStatic: true,
    render: { visible: false }
});

World.add(world, [ground, invisibleWallLeft, invisibleWallRight]);

// === Assets Arrays ===
let barrierUnits = [];
let nextBarrierUnitId = 0;
let mortarTrails = [];
let bloodParticles = [];

// === Turn Management ===
let isPlayerTurn = true;
let placementPhase = true;

function updateTurnIndicator() {
    const turnIndicator = document.getElementById('turnIndicator');
    if (!placementPhase) {
        turnIndicator.textContent = isPlayerTurn ? "Player 1's (Blue) Turn" : "Player 2's (Red) Turn";
        turnIndicator.style.color = isPlayerTurn ? '#3498db' : '#e74c3c';
    }
}

// === 🔁 New & Improved Turn End Logic ===
function endTurn() {
    console.log("🚨 endTurn() triggered");

    if (!gameOver) {
        isPlayerTurn = !isPlayerTurn;
        updateTurnIndicator();

        // 🫡 Commander Chaos
        if (window.commanders && window.commanders.length) {
            console.log("🧠 Commander list:", window.commanders);

            window.commanders.forEach(commander => {
                if (!world.bodies.includes(commander)) {
                    console.warn("🚫 Commander not in world:", commander);
                    return;
                }

                console.log("🎯 Commander found! Ready to move and shoot.");

                // 💃 Random sidestep
                const drift = (Math.random() - 0.5) * 0.02; // 10x more dramatic scooch
                Body.applyForce(commander, commander.position, { x: drift, y: 0 });
                console.log("🏃‍♂️ Drift applied:", drift);

                Sleeping.set(commander, false);
                Body.setVelocity(commander, {
                    x: (Math.random() - 0.5) * 2, // side hop
                    y: 0
                });
                
                // 🎯 Targeting logic
                const enemies = commander.ownerIsPlayer ? enemyAssets : playerAssets;
                const viableTargets = enemies.filter(e => world.bodies.includes(e) && e.label !== 'barrier');

                let angle;
                if (viableTargets.length > 0) {
                    const target = viableTargets[Math.floor(Math.random() * viableTargets.length)];
                    const dx = target.position.x - commander.position.x;
                    const dy = target.position.y - commander.position.y;
                    angle = Math.atan2(dy, dx);
                } else {
                    angle = Math.random() * Math.PI * 2; // fallback chaos
                }

                // 💥 Stronger shot
                const speed = 16 + Math.random() * 6; // 💪 Beefcake bullets
                const velocity = {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                };

                // 📍 Spawn position slightly ahead of the commander
                const offsetPos = {
                    x: commander.position.x + Math.cos(angle) * 10,
                    y: commander.position.y + Math.sin(angle) * 10
                };

                const bullet = Bodies.circle(
                    offsetPos.x,
                    offsetPos.y,
                    3,
                    {
                        restitution: 0.3,
                        frictionAir: 0.002,
                        render: { fillStyle: '#d35400' },
                        projectileType: 'bullet',
                        shooterId: commander.assetId,
                        collisionFilter: { category: 0x0002, mask: 0xFFFFFFFF }
                    }
                );
                
                bullet.hasHitSomething = false;
                World.add(world, bullet);
                Body.setVelocity(bullet, velocity);
                console.log("🧨 Commander fired bullet:", bullet);

                let timeAlive = 0;
                bullet.cleanupInterval = setInterval(() => {
                    const speed = Vector.magnitude(bullet.velocity);
                    timeAlive += 100;
                    if (speed < 0.05 || timeAlive >= 5000) {
                        clearInterval(bullet.cleanupInterval);
                        if (!bullet.hasHitSomething) spawnDebris(bullet.position, 8, '#d35400');
                        World.remove(world, bullet);
                    }
                }, 100);
            });
        }

        canShoot = true;
    }
}


// === Asset Placement Logic ===
let selectedAssetType = null;
let selectedSoldierGroupCenter = null; // For rubber band aiming

const assetDefs = {
    cannon: { size: [54, 27], color: '#3498db' },
    archer: { size: [20, 15], color: '#2ecc71' },
    ammoDump: { size: [40, 25], color: '#f1c40f' },
    barrier: { size: [30, 15], color: '#7f8c8d' },
    footSoldier: { size: [27, 54], color: '#8e44ad' }, // was [10, 20]
    sniper: { size: [30, 10], color: '#e74c3c' }, // Red horizontal body
    mortar: { size: [30, 15], color: '#9b59b6' }, // purple-gray
    machineGunNest: { size: [20, 20], color: '#2980b9' }, // Blue square
    hq: { size: [HQ_WIDTH, HQ_HEIGHT], color: '#95a5a6' }, // Bigger, bunker-looking
    commander: { size: [10, 20], color: '#d35400' } // Orange stick dude
    
    
};

const assetHPs = {
    cannon: 30,         // Can survive 2 cannonballs
    archer: 16,         // Dies in 2 arrows or 4 bullets
    footSoldier: 10,    // Dies in 2 bullets or 1 arrow
    sniper: 16,         // Like archers — fragile, but deadly
    ammoDump: 35,       // Needs 3 cannonballs, 5 arrows
    barrier: 35,        // Per block = 3 blocks = 105 total
    mortar: 25,         // Adjust as needed
    machineGunNest: 25, // Adjust as needed
    hq: 100,
    commander: 30       // Tougher than a soldier
};

const ammoDumpExplosionRadius = 100;

const commanderTaunts = [
    "You'll have to do better than that!",
    "Is that all you've got?",
    "Ive seen kindergarteners aim better!",
    "Come at me, bro!",
    "I shall return!",
    "Ha! Missed me!",
    "For glory and snacks!",
    "You fools!",
    "Still standing!",
    "Aim for the mustache!"
];

function selectAsset(type) {
    if (placedAssetsCount[type] >= assetLimits[type]) {
        alert(`You've reached the maximum number of ${type}s.`);
        selectedAssetType = null;
        return;
    }
    selectedAssetType = type;
}

let canShoot = true; // Tracks if it's the player's turn to shoot

// === Foot Soldier Placement with squad tracking ===
canvas.addEventListener('click', (event) => {
    if (!placementPhase || !selectedAssetType) return;

    const mousePos = getCanvasRelativeMousePos();

    const isLeftSide = mousePos.x < canvas.width / 2;
    const validSide = isPlayerTurn ? isLeftSide : !isLeftSide;
    if (!validSide) {
        alert("You must place assets on your own side!");
        return;
    }

    if (placedAssetsCount[selectedAssetType] >= assetLimits[selectedAssetType]) {
        alert(`You've reached the maximum number of ${selectedAssetType}s.`);
        selectedAssetType = null;
        return;
    }

    const def = assetDefs[selectedAssetType];

    if (selectedAssetType === 'footSoldier') {
        const spacing = def.size[0] + 1;
        const count = 5;
        const squadId = `squad_${nextSquadId++}`; // Ensure unique squad ID
        const squad = [];

        console.log(`🛠️ Creating squad: ${squadId}`); // Debug log

        for (let i = 0; i < count; i++) {
            const xOffset = (i - 2) * spacing;
            const soldier = Bodies.rectangle(
                mousePos.x + xOffset,
                mousePos.y,
                def.size[0],
                def.size[1],
                {
                    isStatic: true,
                    label: 'footSoldier',
                    hp: assetHPs.footSoldier,
                    render: { visible: false }, // We draw it ourselves
                    assetId: nextAssetId++
                }
            );
            soldier.squadId = squadId;
            soldier.isFlipped = !isPlayerTurn; // Player 2's soldiers are flipped
            soldier.customImageIndex = Math.floor(Math.random() * footSoldierImages.length);
            soldier.alive = true;
            squad.push(soldier);
            World.add(world, soldier);

            if (isPlayerTurn) playerAssets.push(soldier);
            else enemyAssets.push(soldier);
        }

        footSoldierSquads[squadId] = squad;
        playRandomScribble(); // Play sound when squad is placed

        placedAssetsCount.footSoldier++;
        if (placedAssetsCount.footSoldier >= assetLimits.footSoldier) {
            selectedAssetType = null;
        }
    } else if (selectedAssetType === 'barrier') {
        const parts = [];
        const barrierUnitId = String(nextBarrierUnitId++); // Ensure unique barrier ID

        for (let i = 0; i < 3; i++) {
            const yOffset = -i * (def.size[1] + 2);
            const block = Bodies.rectangle(
                mousePos.x,
                mousePos.y + yOffset,
                def.size[0],
                def.size[1],
                {
                    isStatic: true,
                    label: 'barrier',
                    render: { fillStyle: def.color },
                    collisionFilter: {
                        category: 0x0001,
                        mask: 0xFFFFFFFF
                    }
                }
            );
            block.parentUnitId = barrierUnitId;
            block.assetId = nextAssetId++;
            parts.push(block);
            World.add(world, block);

            if (isPlayerTurn) playerAssets.push(block);
            else enemyAssets.push(block);
        }

        barrierUnits.push({
            id: barrierUnitId,
            hp: assetHPs.barrier * parts.length,
            parts: parts
        });

        console.log("✅ Registered barrier unit:", barrierUnitId, barrierUnits);
        playRandomScribble(); // Play sound when barrier is placed

        placedAssetsCount.barrier++;
        if (placedAssetsCount.barrier >= assetLimits.barrier) {
            selectedAssetType = null;
        }
    } else {
        // Standard asset placement
        const newAsset = Bodies.rectangle(
            mousePos.x,
            mousePos.y,
            def.size[0],
            def.size[1],
            {
                isStatic: true,
                label: selectedAssetType,
                hp: assetHPs[selectedAssetType],
                render: selectedAssetType === 'barrier'
                    ? { fillStyle: def.color }       // ✅ keep for barrier
                    : { visible: false },            // ❌ hide for SVG-drawn assets
                assetId: nextAssetId++
            }
        );
        

        newAsset.alive = true;
        newAsset.isFlipped = !isPlayerTurn; // Flip horizontally for Player 2

        if (isPlayerTurn) playerAssets.push(newAsset);
        else enemyAssets.push(newAsset);

        World.add(world, newAsset);
        playRandomScribble(); // Play sound when single asset is placed

        placedAssetsCount[selectedAssetType]++;
        if (placedAssetsCount[selectedAssetType] >= assetLimits[selectedAssetType]) {
            selectedAssetType = null;
        }
    }
});

function finishPlacement() {
    playRandomButtonClick(); // 🔊 Play click sound here!

    const turnIndicator = document.getElementById('turnIndicator');
    const readyButton = document.getElementById('readyButton');

    if (isPlayerTurn && placementPhase) {
        // Player 1 done placing, switch to Player 2
        isPlayerTurn = false; 
        turnIndicator.textContent = "Player 2, Choose Your Weapons";
        turnIndicator.style.color = '#e74c3c';
        readyButton.textContent = "Player 2 Ready";

        for (let type in placedAssetsCount) {
            placedAssetsCount[type] = 0;
        }
    } else if (!isPlayerTurn && placementPhase) {
        // Player 2 done placing, ready to begin battle
        placementPhase = false;  
        isPlayerTurn = true; 
        turnIndicator.textContent = "Ready to Battle!";
        turnIndicator.style.color = '#2c3e50';
        readyButton.textContent = "Begin Battle";
    } else if (!placementPhase) {
        // Actual battle starts here, hide or disable the button
        readyButton.style.display = 'none';
        updateTurnIndicator();
    }
}

function collapseBarrier(unit) {
    console.log("🧱 Collapsing barrier unit:", unit.id);

    playSound('barrier_collapse');

    unit.parts.forEach((part) => {
        Body.setStatic(part, false);
        Body.setMass(part, 0.01);
        part.density = 0.0001;
        part.restitution = 0.9;
        part.friction = 0.5;
        part.render.fillStyle = '#555';

        part.collisionFilter = {
            category: 0x0004,
            mask: 0xFFFFFFFF
        };

        // 👉 DO NOT REMOVE SVG – just mark it for visual "debris"
        if (part.svg) {
            part.assetType = 'debris';
            part.alive = false;
        }

        // Optional: Add explosion force to scatter them
        const angle = Math.random() * 2 * Math.PI;
        const forceMagnitude = 0.03 + Math.random() * 0.02;
        Body.applyForce(part, part.position, {
            x: Math.cos(angle) * forceMagnitude,
            y: Math.sin(angle) * forceMagnitude,
        });
    });

    console.log("✅ Barrier collapse complete.");
}


// === Mouse Interaction for Firing ===
const mouse = Mouse.create(canvas);
let selectedAsset = null;
let isDragging = false;
let rubberBandPlayed = false;

// === Mousedown Asset Selection (with foot soldier group logic) ===
canvas.addEventListener('mousedown', () => {
    if (placementPhase || !canShoot) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => console.log("🔓 AudioContext resumed"));
    }
    
    const clickRadius = 20;
    const assets = isPlayerTurn ? playerAssets : enemyAssets;
    const shootableAssets = assets.filter(a => ['cannon', 'archer', 'footSoldier', 'mortar', 'sniper', 'machineGunNest'].includes(a.label));
    const correctedMouse = getCanvasRelativeMousePos();
    const clicked = Query.point(shootableAssets, correctedMouse)[0];


    if (clicked && clicked.label === 'footSoldier') {
        selectedAsset = footSoldierSquads[clicked.squadId];
        const alive = selectedAsset.filter(s => s && !s.isRemoved && world.bodies.includes(s));
        selectedSoldierGroupCenter = alive.reduce((sum, s) => Vector.add(sum, s.position), { x: 0, y: 0 });
        selectedSoldierGroupCenter = Vector.div(selectedSoldierGroupCenter, alive.length);
    } else {
        selectedAsset = clicked;
        selectedSoldierGroupCenter = selectedAsset?.position || null;
    }

    if (selectedAsset) {
        isDragging = true;
        rubberBandPlayed = false; // 💥 Reset this so the sound can play once per drag
    }
    
});

function spawnProjectile(spawnPos, type = "bullet", shooterId = null, squadId = null) {
    let body;

    if (type === "arrow") {
        body = Bodies.rectangle(spawnPos.x, spawnPos.y, 20, 3, {
            restitution: 0.1,
            frictionAir: 0.01,
            render: { fillStyle: '#2c3e50' },
            collisionFilter: { category: 0x0002, mask: 0xFFFFFFFF }
        });
    } else if (type === "cannonball") {
        body = Bodies.circle(spawnPos.x, spawnPos.y, 5, {
            restitution: 0.8,
            render: { fillStyle: '#000' },
            collisionFilter: { category: 0x0002, mask: 0xFFFFFFFF }
        });
    } else if (type === "bullet") {
        body = Bodies.circle(spawnPos.x, spawnPos.y, 2, {
            restitution: 0.2,
            render: { fillStyle: '#333' },
            collisionFilter: { category: 0x0002, mask: 0xFFFFFFFF }
        });
    } else if (type === "mgBullet") {
        body = Bodies.circle(spawnPos.x, spawnPos.y, 2, {
            restitution: 0.1,
            frictionAir: 0.002, // 🟢 Lower this for flatter travel
            render: { fillStyle: '#444' },
            collisionFilter: { category: 0x0002, mask: 0xFFFFFFFF }
        });

        // Optional: trail effect
        body.trailInterval = setInterval(() => {
            if (body.isSleeping || !world.bodies.includes(body)) {
                clearInterval(body.trailInterval);
                return;
            }

            mortarTrails.push({
                x: body.position.x,
                y: body.position.y,
                vx: 0,
                vy: 0,
                radius: 1 + Math.random(),
                color: '#888',
                opacity: 0.8,
                lifetime: 15
            });
        }, 40);
    } else if (type === "sniperRound") {
        body = Bodies.circle(spawnPos.x, spawnPos.y, 2, {
            restitution: 0.1,
            frictionAir: 0.005,
            render: { fillStyle: '#e74c3c' },
            collisionFilter: { category: 0x0002, mask: 0xFFFFFFFF }
        });

        body.trailInterval = setInterval(() => {
            if (body.isSleeping || !world.bodies.includes(body)) {
                clearInterval(body.trailInterval);
                return;
            }

            mortarTrails.push({
                x: body.position.x,
                y: body.position.y,
                vx: 0,
                vy: 0,
                radius: 1 + Math.random(),
                color: '#e74c3c',
                opacity: 1.0,
                lifetime: 20
            });
        }, 40);
    } else if (type === "mortarShell") {
        body = Bodies.circle(spawnPos.x, spawnPos.y, 6, {
            restitution: 0.6,
            render: { fillStyle: '#900' },
            collisionFilter: { category: 0x0002, mask: 0xFFFFFFFF }
        });

        body.trailInterval = setInterval(() => {
            if (body.isSleeping || !world.bodies.includes(body)) {
                clearInterval(body.trailInterval);
                return;
            }

            mortarTrails.push({
                x: body.position.x + (Math.random() - 0.5) * 5,
                y: body.position.y + (Math.random() - 0.5) * 5,
                vx: (Math.random() - 0.5) * 0.1,
                vy: (Math.random() - 0.5) * 0.1,
                radius: 1 + Math.random() * 1.5,
                color: ['#f39c12', '#e67e22', '#c0392b'][Math.floor(Math.random() * 3)],
                opacity: 1.0,
                lifetime: 30
            });
        }, 50);
    }

    body.projectileType = type;
    body.hasHitSomething = false;
    body.shooterId = shooterId;

    // ✅ Add squadId so we can avoid friendly fire
    if (squadId !== null && squadId !== undefined) {
        body.squadId = squadId;
    }
    

    return body;
}

// === Mouse Interaction for Firing ===
canvas.addEventListener('mouseup', () => {
    console.log("🖐️ MOUSEUP EVENT FIRED");
    if (!selectedAsset || !isDragging || !canShoot) return;

    function resumeAudioContextIfNeeded() {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => console.log("🔓 AudioContext resumed"));
        }
    }
    
    // Add to any event handlers that can happen early
    canvas.addEventListener('mousedown', resumeAudioContextIfNeeded);
    canvas.addEventListener('mouseup', resumeAudioContextIfNeeded);
    canvas.addEventListener('click', resumeAudioContextIfNeeded);    

    isDragging = false;
    selectedSoldierGroupCenter = null;

    const origin = selectedSoldierGroupCenter || (Array.isArray(selectedAsset) ? selectedAsset[0].position : selectedAsset.position);
    const correctedMouse = getCanvasRelativeMousePos();
    const dragVector = Vector.sub(origin, correctedMouse);
    const offsetDir = Vector.normalise(dragVector);

    if (selectedAsset.label === 'machineGunNest') {
        fireMachineGunNest(selectedAsset, dragVector);
        console.log("🧨 fireMachineGunNest CALLED!", selectedAsset, dragVector);
    } else if (Array.isArray(selectedAsset)) {
        const shooters = selectedAsset.filter(s => world.bodies.includes(s));
        const power = Math.max(Vector.magnitude(dragVector), 30);
        const velocity = Vector.mult(Vector.normalise(dragVector), power * 0.15);

        playSound('foot_soldier_volley');

        shooters.forEach(soldier => {
            const spawnPos = Vector.add(soldier.position, Vector.mult(offsetDir, 15));
        
            // ✅ Add soldier.squadId as 4th argument
            const projectile = spawnProjectile(spawnPos, "bullet", soldier.assetId, soldier.squadId);
        
            if (projectile) {
                World.add(world, projectile);
                Body.setVelocity(projectile, velocity);
        
                projectile.cleanupInterval = setInterval(() => {
                    const speed = Vector.magnitude(projectile.velocity);
                    if (speed < 0.05) {
                        clearInterval(projectile.cleanupInterval);
        
                        if (!projectile.hasHitSomething) {
                            if (projectile.projectileType === 'cannonball') {
                                playSound('explosion');
                                playSound('explosion_debris');
                            } else if (projectile.projectileType === 'mortarShell') {
                                playSound('explosion');
                            }
        
                            spawnDebris(projectile.position, 6, '#aaa');
                        }
        
                        World.remove(world, projectile);
                    }
                }, 100);
            }
        });        

        setTimeout(endTurn, 1000);
    } else {
        const spawnPos = Vector.add(selectedAsset.position, Vector.mult(offsetDir, 30));
        const shooterType = selectedAsset.label;

        let projectileType = "bullet";
        if (shooterType === "archer") projectileType = "arrow";
        else if (shooterType === "cannon") projectileType = "cannonball";
        else if (shooterType === "mortar") projectileType = "mortarShell";
        else if (shooterType === "sniper") projectileType = "sniperRound";

        switch (projectileType) {
            case 'arrow': playSound('arrow_fire'); break;
            case 'cannonball': playSound('cannon_fire'); break;
            case 'mortarShell': playSound('mortar_fire'); break;
            case 'sniperRound': playSound('sniper_fire'); break;
            default: playSound('commander_pistol'); break; // fallback or use for generic 'bullet'
        }
        
        const projectile = spawnProjectile(spawnPos, projectileType, selectedAsset.assetId);
        if (projectile) {
            World.add(world, projectile);
            const power = Math.max(Vector.magnitude(dragVector), 30);
            const velocity = Vector.mult(Vector.normalise(dragVector), power * 0.15);
            Body.setVelocity(projectile, velocity);

            projectile.cleanupInterval = setInterval(() => {
                const speed = Vector.magnitude(projectile.velocity);
                if (speed < 0.05) {
                    clearInterval(projectile.cleanupInterval);
            
                    if (!projectile.hasHitSomething) {
                        // 🎧 End-of-life audio
                        if (projectile.projectileType === 'cannonball') {
                            playSound('explosion');
                            playSound('explosion_debris');
                        } else if (projectile.projectileType === 'mortarShell') {
                            playSound('explosion'); // NOT mortar_hit – this is a fizzle-out boom
                        }
            
                        // 💥 Debris for flavor
                        spawnDebris(projectile.position, 6, '#aaa');
                    }
            
                    World.remove(world, projectile);
                }
            }, 100);

            setTimeout(endTurn, 1000);
        }
    }

    selectedAsset = null;
    canShoot = false;
});
    
function spawnExplosion(position) {
    spawnDebris(position, 10, '#ff6600'); // 🔥 orange particles for impact
}

function spawnBloodSplatter(x, y) {
    for (let i = 0; i < 6 + Math.random() * 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 0.5;
        bloodParticles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 1 + Math.random() * 1.5,
            opacity: 1,
            lifetime: 25 + Math.random() * 15
        });
    }
}

function drawBloodEffects() {
    
    // === Draw Blood Particles (splatter) ===
    for (let i = bloodParticles.length - 1; i >= 0; i--) {
        const p = bloodParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.opacity -= 0.03;
        p.lifetime--;

        if (p.opacity <= 0 || p.lifetime <= 0) {
            bloodParticles.splice(i, 1);
        } else {
            context.beginPath();
            context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            context.fillStyle = `rgba(192, 57, 43, ${p.opacity})`;
            context.fill();
        }
    }
}

// === Collision Handling ===
Events.on(engine, 'collisionStart', event => {
    event.pairs.forEach(pair => {
        const [bodyA, bodyB] = [pair.bodyA, pair.bodyB];

        // Identify the projectile by checking for .projectileType
        const projectile = [bodyA, bodyB].find(body => body.projectileType);
        const asset = [bodyA, bodyB].find(body => body.label && assetHPs[body.label]);

        console.log("Collision detected!", bodyA.label, bodyB.label);

        if (!projectile || !asset || projectile.hasHitSomething) return;

        // 🙅 Prevent self-hit from Commander (or any unit)
        if (projectile.shooterId !== undefined && projectile.shooterId === asset.assetId) {
            console.log("🚫 Self-hit prevented (shooterId matches assetId).");
            return;
        }

        // === Avoid friendly fire for Foot Soldiers ===
        if (
            projectile.squadId !== undefined &&
            asset.squadId !== undefined &&
            projectile.squadId === asset.squadId
        ) {
            console.log("💥 Friendly fire avoided.");
            return;
        }

        projectile.hasHitSomething = true;
        if (projectile.cleanupInterval) clearInterval(projectile.cleanupInterval);
        World.remove(world, projectile);

        // === Impact Effects (Sound + Particles)
        if (projectile.projectileType === "arrow" || projectile.projectileType === "bullet") {
            spawnDebris(projectile.position, 4, '#ccc');
        } else if (projectile.projectileType === "cannonball") {
            playSound('explosion');
            playSound('explosion_debris');
            spawnExplosion(projectile.position);
        } else if (projectile.projectileType === "mortarShell") {
            playSound('mortar_hit');
            spawnDebris(projectile.position, 15, '#e74c3c');
        } else if (projectile.projectileType === "sniperRound") {
            spawnDebris(projectile.position, 6, '#ff3333'); // Blood-red puff
        }

        // === Apply damage by projectile type ===
        let damage = 0;
        switch (projectile.projectileType) {
            case 'cannonball':  damage = 15; break;  // 2-3 shots to destroy big things
            case 'arrow':       damage = 8; break;   // decent against medium HP
            case 'bullet':      damage = 4; break;   // good for soft targets, chip damage
            case 'mgBullet':    damage = 4; break;   // same as foot soldier bullets
            case 'mortarShell': damage = 20; break;  // 💥 Big boom
            case 'sniperRound': damage = 25; break;  // 💀 One-shot soft targets
        }

        console.log("🎯 Target hit:", asset.label, "Remaining HP:", asset.hp);

        if (['footSoldier', 'sniper', 'archer', 'commander'].includes(asset.label)) {
            console.log("🧠 Soft target hit, spawning blood");
            spawnBloodSplatter(asset.position.x, asset.position.y);

            if (['footSoldier', 'sniper', 'archer', 'commander'].includes(asset.label)) {
                const scream = `scream_${1 + Math.floor(Math.random() * 6)}`;
                playSound(scream);
            }
            
        }

        // === Barrier-specific logic ===
        if (asset.label === 'barrier') {
            const unitId = asset.parentUnitId;
            const unit = barrierUnits.find(u => String(u.id) === String(unitId));
        
            if (unit) {
                unit.hp -= damage;
                console.log(`🧱 HIT Barrier Unit ${unit.id} | Remaining HP: ${unit.hp}`);
        
                // Visually flash all blocks orange to show impact
                unit.parts.forEach(block => {
                    block.render.fillStyle = '#e67e22'; // Orange flash
                });
                
                // Trigger smoke when barrier drops below half HP
                if (unit.hp <= (assetHPs.barrier * unit.parts.length) / 2 && !unit.hasSmoke) {
                    console.log("🔥 Starting particle smoke for barrier unit", unit.id);
                    spawnBarrierSmokeParticles(unit);
                    unit.hasSmoke = true;
                }

                if (unit.hp <= 0) {
                    console.log(`💥 COLLAPSING Barrier Unit ${unit.id}`);
                    collapseBarrier(unit);
                    barrierUnits = barrierUnits.filter(u => u.id !== unitId);
                }
            } else {
                console.warn("⚠️ No barrier unit found for parentUnitId:", unitId);
            }
        
            return;
        }
        

        // === All other asset types ===
        asset.hp -= damage;

        if (asset.hp <= 0) {
            if (asset.label === 'footSoldier') {
                console.log("☠️ Foot Soldier dead, removing from world and assets.");
                World.remove(world, asset);
                playerAssets = playerAssets.filter(a => a.assetId !== asset.assetId);
                enemyAssets = enemyAssets.filter(a => a.assetId !== asset.assetId);
                return; // prevent further processing
            }        
            if (asset.label === 'ammoDump') {
                const friendlyAssets = playerAssets.includes(asset) ? playerAssets : enemyAssets;
                spawnExplosion(asset.position);
                playSound('explosion');
                explodeAmmoDump(asset, friendlyAssets);
        
            } else if (asset.label === 'hq') {
                // 💣 HQ explodes and spawns the commander
                const isPlayer = playerAssets.includes(asset);
                World.remove(world, asset);
                spawnExplosion(asset.position); // or create a spawnHQCollapse() for fancy stuff
                playSound('structure_collapse');

                // 👨‍✈️ Spawn Commander
                const commander = Bodies.rectangle(
                    asset.position.x,
                    asset.position.y,
                    assetDefs.commander.size[0],
                    assetDefs.commander.size[1],
                    {
                        isStatic: false,
                        label: 'commander',
                        hp: assetHPs.commander,
                        render: { visible: false },
                        assetId: nextAssetId++,
                        frictionAir: 0.2,
                        friction: 1,
                        restitution: 0,
                        angle: 0,
                        inertia: Infinity
                    }
                );

                // 🎤 Give him a voice
                commander.tauntText = null;
                commander.tauntTimer = 0;

                commander.ownerIsPlayer = isPlayer;
                World.add(world, commander);
                if (isPlayer) playerAssets.push(commander);
                else enemyAssets.push(commander);
                commanderTaunt(commander, "I regret nothing!");
                playSound('commander_deathcry', 0.6);

                if (!window.commanders) window.commanders = [];
                window.commanders.push(commander);

                // 🪂 Parachute
                const parachute = Bodies.rectangle(
                    commander.position.x,
                    commander.position.y - 25,
                    30,
                    10,
                    {
                        isStatic: false,
                        isSensor: true,
                        inertia: Infinity,
                        frictionAir: 0.05,
                        render: {
                            fillStyle: '#ccc'
                        },
                        collisionFilter: {
                            mask: 0 // ignore all collisions
                        }
                    }
                );

                World.add(world, parachute);

                // ☁️ Keep the parachute floating above commander
                let parachuteLanded = false;
                const followInterval = setInterval(() => {
                    if (!world.bodies.includes(commander)) {
                        clearInterval(followInterval);
                        World.remove(world, parachute);
                        return;
                    }

                    Body.setPosition(parachute, {
                        x: commander.position.x,
                        y: commander.position.y - 25
                    });

                    // Gentle drift
                    const drift = (Math.random() - 0.5) * 0.0005;
                    Body.applyForce(commander, commander.position, { x: drift, y: 0 });

                    // Let parachute stay a bit after landing
                    if (!parachuteLanded && Math.abs(commander.velocity.y) < 0.1 && Math.abs(commander.velocity.x) < 0.1) {
                        parachuteLanded = true;
                        setTimeout(() => {
                            World.remove(world, parachute);
                            clearInterval(followInterval);
                        }, 300); // 🕑 Show parachute for 2 seconds after landing
                    }
                }, 30);
                               
            } else {
                // 🔪 Regular unit death
                if (asset.label === 'commander') {
                    if (asset.tauntInterval) {
                        clearInterval(asset.tauntInterval);
                        asset.tauntInterval = null;
                    }
            
                    if (window.commanders) {
                        window.commanders = window.commanders.filter(c => c.assetId !== asset.assetId);
                    }
                }
            
                World.remove(world, asset);
                asset.render.visible = false;
                playerAssets = playerAssets.filter(a => a.assetId !== asset.assetId);
                enemyAssets = enemyAssets.filter(a => a.assetId !== asset.assetId);
            }            
                    
        } else {
            asset.render.fillStyle = '#e67e22';
        }
        
    });

    checkVictoryCondition();
});


// === Foot Soldier gets crushed by falling debris ===
Events.on(engine, 'collisionActive', event => {
    event.pairs.forEach(pair => {
        const a = pair.bodyA;
        const b = pair.bodyB;

        const isFootSoldier = body => body.label === 'footSoldier';
        const isCrushingBody = body => body.label !== 'footSoldier' && !body.isStatic;

        let soldier = null;
        let crusher = null;

        if (isFootSoldier(a) && isCrushingBody(b)) {
            soldier = a;
            crusher = b;
        } else if (isFootSoldier(b) && isCrushingBody(a)) {
            soldier = b;
            crusher = a;
        }

        if (soldier && crusher) {
            const speed = Vector.magnitude(crusher.velocity);
            if (speed > 2) {
                // 💥 Send the soldier flying
                Body.setStatic(soldier, false);
                soldier.restitution = 0.9;
                soldier.frictionAir = 0.01;

                const force = {
                    x: (Math.random() - 0.5) * 0.05,
                    y: -0.2 + (Math.random() * -0.1)
                };

                Body.applyForce(soldier, soldier.position, force);
                Body.setAngularVelocity(soldier, (Math.random() - 0.5) * 2);

                const scream = `scream_${1 + Math.floor(Math.random() * 6)}`;
                playSound(scream, 0.8); // volume slightly lower, your call

                setTimeout(() => World.remove(world, soldier), 2000);
            }
        }
    });
});

function checkVictoryCondition() {
    const turnIndicator = document.getElementById('turnIndicator');

    // 🛠️ Include all units that can attack
    const offensiveLabels = ['cannon', 'archer', 'footSoldier', 'mortar', 'sniper', 'commander', 'machineGunNest'];
    const isAlive = asset => world.bodies.includes(asset); // ✅ Only count bodies still in the world

    const playerOffense = playerAssets.filter(asset =>
        offensiveLabels.includes(asset.label) && isAlive(asset)
    );
    const enemyOffense = enemyAssets.filter(asset =>
        offensiveLabels.includes(asset.label) && isAlive(asset)
    );

    if (playerOffense.length === 0 && enemyOffense.length === 0) {
        turnIndicator.textContent = "\u{1F937} It's a draw! Nobody can shoot!";
        turnIndicator.style.color = '#999';
        canShoot = false;
        gameOver = true;
    } else if (playerOffense.length === 0) {
        turnIndicator.textContent = "\u{1F3C6} Victory Player 2 (Red)!";
        turnIndicator.style.color = '#e74c3c';
        canShoot = false;
        gameOver = true;
    } else if (enemyOffense.length === 0) {
        turnIndicator.textContent = "\u{1F3C6} Victory Player 1 (Blue)!";
        turnIndicator.style.color = '#3498db';
        canShoot = false;
        gameOver = true;
    }
}

function fireMachineGunNest(unit, dragVector) {
    console.log("💥 Machine Gun Nest BURST FIRE from:", unit.position);

    // Use player's drag direction to aim
    const angle = Math.atan2(dragVector.y, dragVector.x);

    canShoot = false; // Lock until burst is done
    let shotsFired = 0;

    function fireNextShot() {
        if (shotsFired >= 5) {
            console.log("✅ MG Nest burst complete");
            canShoot = true;
            checkVictoryCondition();
            setTimeout(endTurn, 1000); // End turn after burst
            return;
        }
    
        // 🔊 Play burst sound only on first shot
        if (shotsFired === 0) {
            playSound('machinegun_burst');
        }

        const jitter = (Math.random() - 0.5) * 0.1;
        const jitteredAngle = angle + jitter;
    
        const spawnX = unit.position.x + Math.cos(jitteredAngle) * 10;
        const spawnY = unit.position.y + Math.sin(jitteredAngle) * 10;
        const bullet = spawnProjectile({ x: spawnX, y: spawnY }, "mgBullet", unit.assetId);
    
        // ✅ Add the bullet to the physics world
        World.add(world, bullet);

        let timeAlive = 0;
        bullet.cleanupInterval = setInterval(() => {
            const speed = Vector.magnitude(bullet.velocity);
            timeAlive += 100;

            if (speed < 0.05 || timeAlive >= 5000) {
                clearInterval(bullet.cleanupInterval);
                if (!bullet.hasHitSomething) {
                    spawnDebris(bullet.position, 6, '#666'); // optional debris
                }
                World.remove(world, bullet);
            }
        }, 100);
    
        const speed = 15 + Math.random() * 4;
        Body.setVelocity(bullet, {
            x: Math.cos(jitteredAngle) * speed,
            y: Math.sin(jitteredAngle) * speed
        });
    
        console.log(`🔫 Machine gun bullet ${shotsFired + 1} fired`);
        shotsFired++;
    
        setTimeout(fireNextShot, 150);
    }
    
    fireNextShot();
}

// Clearly defined explosion function for Ammo Dumps
function explodeAmmoDump(ammoDump, friendlyAssets) {
    friendlyAssets.forEach(asset => {
        if (asset === ammoDump) return; // Don't check itself
        
        const distance = Vector.magnitude(Vector.sub(asset.position, ammoDump.position));

        if (distance <= ammoDumpExplosionRadius) {
            asset.hp -= 2; // Explosion causes 2 damage

            if (asset.hp <= 0) {
                World.remove(world, asset);
                friendlyAssets.splice(friendlyAssets.indexOf(asset), 1);
            } else {
                asset.render.fillStyle = '#e67e22'; // Damaged assets turn orange
            }
        }
    });

    World.remove(world, ammoDump);
    friendlyAssets.splice(friendlyAssets.indexOf(ammoDump), 1);
    
    // Optional: Add visual explosion here
}


// === Frame-based rendering for rubber-band + smoke particles ===
Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    // Rubber-band aiming line
if (isDragging && selectedAsset) {
    const origin = selectedSoldierGroupCenter || 
        (Array.isArray(selectedAsset) ? selectedAsset[0].position : selectedAsset.position);

    // 🔊 Play the rubber band stretch sound once per drag
    if (!rubberBandPlayed) {
        playSound('rubber_band_stretch');
        rubberBandPlayed = true;
    }

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.moveTo(origin.x, origin.y);
    const correctedMouse = getCanvasRelativeMousePos();
    ctx.lineTo(correctedMouse.x, correctedMouse.y);
    ctx.stroke();
}

    // Smoke particle rendering
    smokeParticles.forEach(p => {
        ctx.beginPath();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = '#555';
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // 💬 Render taunts near commanders
    if (window.commanders) {
        window.commanders.forEach(commander => {
            if (commander.tauntTimer > 0 && commander.tauntText) {
                ctx.font = "bold 14px Comic Sans MS";
                ctx.fillStyle = "#333";
                ctx.fillText(commander.tauntText, commander.position.x + 10, commander.position.y - 10);
                commander.tauntTimer--;
            }
        });
    }

    // 🎨 Draw SVG Foot Soldiers
    Object.values(footSoldierSquads).forEach(squad => {
        squad.forEach(soldier => {
            if (soldier.isSleeping || !world.bodies.includes(soldier)) return;
    
            const img = footSoldierImages[soldier.customImageIndex];
            const pos = soldier.position;
            const angle = soldier.angle;
    
            context.save();
            context.translate(pos.x, pos.y);
            context.rotate(angle);
    
            // Determine flip direction
            const flip = soldier.isFlipped ? -1 : 1;
            context.scale(flip, 1);
    
            const offsetX = -FOOT_SOLDIER_WIDTH / 2 * flip;
            const offsetY = -FOOT_SOLDIER_HEIGHT / 2;
    
            context.drawImage(
                img,
                offsetX,
                offsetY,
                FOOT_SOLDIER_WIDTH,
                FOOT_SOLDIER_HEIGHT
            );
    
            context.restore();
        });
    });   
    
    // Render assets
    playerAssets.concat(enemyAssets).forEach(asset => {
        if (!world.bodies.includes(asset)) return; // 🧹 Skip if body has been removed
        
        switch (asset.label) {
            case 'cannon':
                drawAssetImage(context, asset, 'cannon', CANNON_WIDTH, CANNON_HEIGHT);
                break;
    
            case 'archer':
                drawAssetImage(context, asset, 'archer', ARCHER_WIDTH, ARCHER_HEIGHT);
                break;
    
            case 'mortar':
                drawAssetImage(context, asset, 'mortar', MORTAR_WIDTH, MORTAR_HEIGHT);
                break;
    
            case 'sniper':
                drawAssetImage(context, asset, 'sniper', SNIPER_WIDTH, SNIPER_HEIGHT);
                break;
    
            case 'machineGunNest':
                drawAssetImage(context, asset, 'machineGunNest', MGN_WIDTH, MGN_HEIGHT);
                break;
    
            case 'commander':
                drawAssetImage(context, asset, 'commander', COMMANDER_WIDTH, COMMANDER_HEIGHT);
                break;
    
            case 'hq':
                drawAssetImage(context, asset, 'hq', HQ_WIDTH, HQ_HEIGHT);
                break;
    
            case 'ammoDump':
                drawAssetImage(context, asset, 'ammoDump', AMMO_DUMP_WIDTH, AMMO_DUMP_HEIGHT);
                break;

            case 'barrier':
                drawAssetImage(context, asset, 'barrier_block', 30, 15); // 👈 or use actual barrier block size
                break;
                    
        }
    });
               
    // 🔥 Mortar trail rendering
    for (let i = mortarTrails.length - 1; i >= 0; i--) {
        const t = mortarTrails[i];
        t.x += t.vx;
        t.y += t.vy;
        t.opacity -= 0.03;
        t.lifetime--;
    
        ctx.beginPath();
        ctx.globalAlpha = t.opacity;
        ctx.fillStyle = t.color;
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    
        if (t.lifetime <= 0 || t.opacity <= 0) {
                mortarTrails.splice(i, 1);
        }
    }
    
    let globalMousePos = null; // 🌍 Track mouse position globally

canvas.addEventListener('mousemove', () => {
    if (isDragging) {
        globalMousePos = getCanvasRelativeMousePos(); // Update global mouse position
    }
});

Events.on(render, 'afterRender', () => {
    const ctx = render.context;

    // 🎯 Sniper laser sight (aims where the bullet will actually go)
    if (selectedAsset && selectedAsset.label === 'sniper' && isDragging && globalMousePos) {
        const origin = selectedAsset.position;
        const dragVector = Vector.sub(origin, globalMousePos); // ✅ Use globalMousePos
        const aimDirection = Vector.normalise(dragVector);
        const laserLength = 1000; // Can be shorter if desired

        const laserEnd = {
            x: origin.x + aimDirection.x * laserLength,
            y: origin.y + aimDirection.y * laserLength
        };

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(laserEnd.x, laserEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }
});

    // 💬 Commander taunt text rendering
    if (window.commanders) {
        window.commanders.forEach(commander => {
            if (commander.tauntText && commander.tauntText.timer > 0) {
                const x = commander.position.x + 20;
                const y = commander.position.y - 10;

                ctx.font = '12px Comic Sans MS'; // funnier font optional
                ctx.fillStyle = '#000';
                ctx.fillText(commander.tauntText.text, x, y);
            }
        });
    }

});

document.getElementById('loadTestBtn').addEventListener('click', () => {
    loadTestLevel();
});

function loadTestLevel() {
    // Clear existing world state
    World.clear(world);
    Engine.clear(engine);

    // Re-add boundaries
    World.add(world, [ground, leftWall, rightWall]);

    // Reset state
    playerAssets = [];
    enemyAssets = [];
    barrierUnits = [];
    nextBarrierUnitId = 0;
    nextAssetId = 0;
    placementPhase = false;
    isPlayerTurn = true;
    canShoot = true;
    gameOver = false;

    document.getElementById('readyButton').style.display = 'none';
    updateTurnIndicator();

    const xLeft = 300;
    const xRight = 500;
    const yStart = 250;
    const spacing = 50;

const testAssets = [
    // Player 1
    { type: 'cannon', x: xLeft, y: yStart - 2 * spacing, isPlayer: true },
    { type: 'archer', x: xLeft, y: yStart - spacing, isPlayer: true },
    { type: 'footSoldier', x: xLeft, y: yStart, isPlayer: true },
    { type: 'ammoDump', x: xLeft, y: yStart + spacing, isPlayer: true },
    { type: 'barrier', x: xLeft, y: yStart + 2.8 * spacing, isPlayer: true },

    // Player 2
    { type: 'cannon', x: xRight, y: yStart - 2 * spacing, isPlayer: false },
    { type: 'archer', x: xRight, y: yStart - spacing, isPlayer: false },
    { type: 'footSoldier', x: xRight, y: yStart, isPlayer: false },
    { type: 'ammoDump', x: xRight, y: yStart + spacing, isPlayer: false },
    { type: 'barrier', x: xRight, y: yStart + 2.8 * spacing, isPlayer: false },
];


    testAssets.forEach(item => {
        const def = assetDefs[item.type];

        if (item.type === 'footSoldier') {
            const spacing = def.size[0] + 1;
            const count = 5;
            const squadId = `squad_${nextAssetId}`;
            const squad = [];

            for (let i = 0; i < count; i++) {
                const xOffset = (i - 2) * spacing;
                const soldier = Bodies.rectangle(
                    mousePos.x + xOffset,
                    mousePos.y,
                    def.size[0],
                    def.size[1],
                    {
                        isStatic: true,
                        label: 'footSoldier',
                        hp: assetHPs.footSoldier,
                        render: { visible: false }, // 🔇 We draw it ourselves now
                        assetId: nextAssetId++
                    }
                );
                soldier.squadId = squadId;
                soldier.isFlipped = !item.isPlayer;
                soldier.customImageIndex = Math.floor(Math.random() * footSoldierImages.length);                
                squad.push(soldier);
                World.add(world, soldier);

                if (item.isPlayer) playerAssets.push(soldier);
                else enemyAssets.push(soldier);
            }

            if (!window.footSoldierSquads) window.footSoldierSquads = {};
            footSoldierSquads[squadId] = squad;
        }

        else if (item.type === 'barrier') {
            const parts = [];
            const barrierUnitId = String(nextBarrierUnitId);
            for (let i = 0; i < 3; i++) {
                const yOffset = -i * (def.size[1] + 2);
                const block = Bodies.rectangle(
                    item.x,
                    item.y + yOffset,
                    def.size[0],
                    def.size[1],
                    {
                        isStatic: true,
                        label: 'barrier',
                        render: { fillStyle: def.color },
                        collisionFilter: {
                            category: 0x0001,
                            mask: 0xFFFFFFFF
                        }
                    }
                );
                block.parentUnitId = barrierUnitId;
                block.assetId = nextAssetId++;
                // block.hp = assetHPs.barrier;
                World.add(world, block);
                parts.push(block);

                if (item.isPlayer) playerAssets.push(block);
                else enemyAssets.push(block);
            }

            barrierUnits.push({
                id: barrierUnitId,
                hp: assetHPs.barrier * parts.length,
                parts: parts
            });

            playRandomScribble(); // 🔊 Scribble when barrier is placed

            nextBarrierUnitId++;
        }

        else {
            const newAsset = Bodies.rectangle(item.x, item.y, def.size[0], def.size[1], {
                isStatic: true,
                label: item.type,
                hp: assetHPs[item.type],
                render: { fillStyle: def.color },
                assetId: nextAssetId++
            });

            World.add(world, newAsset);
            if (item.isPlayer) playerAssets.push(newAsset);
            else enemyAssets.push(newAsset);
        }
    });

    console.log("✅ Test level loaded with full unit stack.");
}

function quickStartRandomBattle() {
    console.log("🎲 Quick Start: Random Battle!");

    // Clear world and state
    World.clear(world);
    Engine.clear(engine);
    World.add(world, [ground, invisibleWallLeft, invisibleWallRight]);

    playerAssets.length = 0;
    enemyAssets.length = 0;
    barrierUnits.length = 0;
    let nextAssetId = 0;
    let nextBarrierUnitId = 0;
    placementPhase = false;
    isPlayerTurn = true;
    canShoot = true;
    gameOver = false;
    updateTurnIndicator();

    const sideConfig = (isPlayer) => {
        const xBase = isPlayer ? 250 : 550;
        const yStart = 60;
        const spacing = 48;
        const types = ['cannon', 'archer', 'footSoldier', 'ammoDump', 'barrier', 'mortar', 'sniper', 'machineGunNest', 'hq'];
        
        types.forEach((type, i) => {
            if (type === 'footSoldier') {
                // Squad of 5
                const spacingFS = assetDefs.footSoldier.size[0] + 1;
                const squadId = `squad_${nextAssetId}`;
                const squad = [];

                for (let j = 0; j < 5; j++) {
                    const xOffset = (j - 2) * spacingFS;
                    const fs = Bodies.rectangle(
                        xBase + xOffset,
                        yStart + i * spacing,
                        assetDefs.footSoldier.size[0],
                        assetDefs.footSoldier.size[1],
                        {
                            isStatic: true,
                            label: 'footSoldier',
                            hp: assetHPs.footSoldier,
                            render: { visible: false },
                            assetId: nextAssetId++
                        }
                    );
                    fs.squadId = squadId;
                    fs.isFlipped = !isPlayer;
                    fs.customImageIndex = Math.floor(Math.random() * footSoldierImages.length);
                    fs.alive = true;
                    World.add(world, fs);

                    squad.push(fs);
                    (isPlayer ? playerAssets : enemyAssets).push(fs);
                }

                footSoldierSquads[squadId] = squad;
            }

            else if (type === 'barrier') {
                const parts = [];
                const barrierUnitId = String(nextBarrierUnitId++);

                for (let j = 0; j < 3; j++) {
                    const yOffset = (2 - j) * (assetDefs.barrier.size[1] + 2);
                    const block = Bodies.rectangle(
                        xBase,
                        yStart + i * spacing + yOffset,
                        assetDefs.barrier.size[0],
                        assetDefs.barrier.size[1],
                        {
                            isStatic: true,
                            label: 'barrier',
                            render: { fillStyle: assetDefs.barrier.color },
                            collisionFilter: {
                                category: 0x0001,
                                mask: 0xFFFFFFFF
                            }
                        }
                    );
                    block.parentUnitId = barrierUnitId;
                    block.assetId = nextAssetId++;
                    parts.push(block);
                    World.add(world, block);
                    (isPlayer ? playerAssets : enemyAssets).push(block);
                }

                barrierUnits.push({
                    id: barrierUnitId,
                    hp: assetHPs.barrier * 3,
                    parts: parts
                });
            }

            else {
                const body = Bodies.rectangle(
                    xBase,
                    yStart + i * spacing,
                    assetDefs[type].size[0],
                    assetDefs[type].size[1],
                    {
                        isStatic: true,
                        label: type,
                        hp: assetHPs[type],
                        render: { visible: false },
                        assetId: nextAssetId++
                    }
                );

                body.isFlipped = !isPlayer;
                body.alive = true;

                World.add(world, body);
                (isPlayer ? playerAssets : enemyAssets).push(body);
            }
        });
    };

    // Deploy both sides
    sideConfig(true);  // Player 1 (left)
    sideConfig(false); // Player 2 (right)

    console.log("✅ Quick battle ready.");
}

window.quickStartRandomBattle = quickStartRandomBattle;
console.log("🧠 Global hook set:", window.quickStartRandomBattle);


let smokeParticles = [];

function spawnBarrierSmokeParticles(unit) {
    const interval = setInterval(() => {
        if (barrierUnits.includes(unit)) {
            const block = unit.parts[Math.floor(Math.random() * unit.parts.length)];
            smokeParticles.push({
                x: block.position.x + (Math.random() - 0.5) * 10,
                y: block.position.y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 0.1,
                vy: -0.2 + Math.random() * -0.1,
                radius: 2 + Math.random() * 2,
                opacity: 0.4 + Math.random() * 0.2,
                lifetime: 400
            });
        } else {
            clearInterval(interval); // Stop emitting if barrier unit is gone
        }
    }, 300);

    unit.smokeInterval = interval;
}

function commanderTaunt(commander, message) {
    commander.tauntText = {
        text: message,
        timer: 120 // frames to show the text
    };
}

function updateSmokeParticles() {
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.opacity -= 0.001;
        p.lifetime--;

        if (p.opacity <= 0 || p.lifetime <= 0) {
            smokeParticles.splice(i, 1);
        }
    }
}

Events.on(engine, 'beforeUpdate', () => {
    updateSmokeParticles();

    if (window.commanders) {
        window.commanders.forEach(commander => {
            if (!commander || commander.isSleeping) return;
    
            // Count down between taunts
            if (!commander.tauntCooldown) {
                commander.tauntCooldown = Math.floor(300 + Math.random() * 300); // 5–10 seconds
            } else {
                commander.tauntCooldown--;
            }
    
            if (commander.tauntCooldown <= 0) {
                const phrase = commanderTaunts[Math.floor(Math.random() * commanderTaunts.length)];
                commanderTaunt(commander, phrase);
                commander.tauntCooldown = Math.floor(300 + Math.random() * 300);
            }
    
            // Count down how long the current taunt is displayed
            if (commander.tauntText && commander.tauntText.timer > 0) {
                commander.tauntText.timer--;
            } else {
                commander.tauntText = null;
            }
        });
    }
    
});

document.addEventListener('DOMContentLoaded', () => {
    loadAllSounds()
        .then(() => console.log("🔊 All sounds loaded!"))
        .catch(err => console.error("❌ Sound loading failed:", err));

    // 🔊 Add click sound to all buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            playRandomButtonClick();
        });
    });

    // 🧠 Hook up Quick Start button
    const quickStartBtn = document.getElementById('quickStartBtn');
    if (quickStartBtn) {
        quickStartBtn.addEventListener('click', () => {
            quickStartRandomBattle();
        });
    }
});

Matter.Events.on(engine, 'collisionStart', function(event) {
    event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;

        const projectile = [bodyA, bodyB].find(b => b.projectileType);
        const other = projectile === bodyA ? bodyB : bodyA;

        if (!projectile || projectile.hasHitSomething) return;

        // === Arrow Impact Sound ===
        if (projectile.projectileType === 'arrow' && !projectile.hasBounced) {
            projectile.hasBounced = true;
            playSound('arrow_impact', 0.8);
        }
        

        // === Bullet Ricochet (Foot Soldier, MG, Sniper)
        if (['bullet', 'mgBullet', 'sniperRound'].includes(projectile.projectileType)) {
            if (!projectile.ricocheted) {
                projectile.ricocheted = true;
                const ricochetId = 1 + Math.floor(Math.random() * 4);
                playSound(`bullet_ricochet_${ricochetId}`, 0.6 + Math.random() * 0.3);
            }
        }

        // === Metal Clunk for cannonball & mortar bounces ===
        if (['cannonball', 'mortarShell'].includes(projectile.projectileType)) {
            if (!projectile.hasBounced) {
                projectile.hasBounced = true;
                const clunkId = 1 + Math.floor(Math.random() * 2);
                playSound(`metal_clunk_${clunkId}`, 0.8);
            }
        }
    });
});

// === Run Engine and Renderer ===
Engine.run(engine);
Render.run(render);

Events.on(render, 'beforeRender', drawNotebookBackground);

function customDrawLoop() {
    drawBloodEffects(); // Draw blood every frame
    // console.log("🩸 drawBloodEffects running");
    requestAnimationFrame(customDrawLoop);
}

customDrawLoop(); // Start it!

// === Debris Particle Spawner ===
function spawnDebris(position, count = 6, color = '#a65c00') {
    for (let i = 0; i < count; i++) {
        const size = 3 + Math.random() * 3;
        const piece = Bodies.rectangle(
            position.x,
            position.y,
            size,
            size,
            {
                isStatic: false,
                frictionAir: 0.05,
                restitution: 0.8,
                render: { fillStyle: color }
            }
        );

        const angle = Math.random() * 2 * Math.PI;
        const speed = 3 + Math.random() * 4;
        const force = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };

        Body.setVelocity(piece, force);
        Body.setAngularVelocity(piece, (Math.random() - 0.5) * 1);
        World.add(world, piece);

        setTimeout(() => World.remove(world, piece), 1000); // fade away
    }
}