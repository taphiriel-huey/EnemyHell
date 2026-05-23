const LANES = [415, 468, 520, 574, 622];

const PHASES = [
  {
    wave: 1,
    name: "Ankunft am Dorfplatz",
    start: 0,
    end: 42,
    interval: 2.05,
    pool: ["skeleton", "skeleton", "zombie"],
    count: [4, 6],
    flankInterval: 12,
    flankChance: 1,
    flankPool: ["skeleton", "skeleton"],
    flankCount: [2, 3],
    flankPulses: 2,
  },
  {
    wave: 2,
    name: "Die Gassen brechen",
    start: 46,
    end: 108,
    interval: 1.95,
    pool: ["skeleton", "skeleton", "skeleton", "zombie", "zombie"],
    count: [3, 6],
    ghoulChance: 0.16,
    flankInterval: 10,
    flankChance: 0.9,
    flankPool: ["skeleton", "skeleton", "skeleton", "zombie"],
    flankCount: [2, 3],
    flankPulses: 2,
  },
  {
    wave: 3,
    name: "Der Hof wird ueberrannt",
    start: 114,
    end: 186,
    interval: 1.7,
    pool: ["skeleton", "skeleton", "zombie", "zombie", "ghoul"],
    count: [4, 7],
    ghoulChance: 0.35,
    flankInterval: 10,
    flankChance: 0.85,
    flankPool: ["skeleton", "skeleton", "skeleton", "ghoul", "zombie"],
    flankCount: [2, 4],
    flankPulses: 2,
  },
  {
    wave: 4,
    name: "Miniboss: Torbrecher von Blackhaven",
    start: 194,
    end: 300,
    interval: 2.45,
    pool: ["skeleton", "skeleton", "zombie", "zombie", "ghoul"],
    count: [3, 5],
    ghoulChance: 0.25,
    flankInterval: 9,
    flankChance: 0.85,
    flankPool: ["skeleton", "skeleton", "skeleton", "zombie", "ghoul"],
    flankCount: [2, 3],
    flankPulses: 2,
  },
];

export function createWaveSystem() {
  return {
    time: 0,
    pressure: 1,
    nextSpawn: 0.5,
    nextFlank: 10,
    preview: [
      createPreview("skeleton", 250, 456),
      createPreview("skeleton", 330, 520),
      createPreview("zombie", 390, 612),
    ],
    flankWarnings: [],
    wave: 1,
    phaseName: PHASES[0].name,
    phaseEndsAt: PHASES[0].end,
    bossPreviewQueued: false,
    bossSpawned: false,
    bossDefeated: false,
  };
}

export function updateWaves(system, dt, activateEnemy) {
  system.time += dt;
  const phase = getCurrentPhase(system.time);
  system.wave = phase.wave;
  system.phaseName = phase.name;
  system.phaseEndsAt = phase.end;
  system.pressure = 1 + phase.wave * 0.2 + system.time / 180;

  if (system.time >= 166 && !system.bossPreviewQueued) {
    system.preview.push(createPreview("ogre", 980, 548, { isBoss: true, scale: 2.15 }));
    system.bossPreviewQueued = true;
  }

  system.nextSpawn -= dt;
  if (system.time >= phase.start && system.time < phase.end) {
    while (system.nextSpawn <= 0) {
      enqueuePack(system, phase);
      system.nextSpawn += phase.interval;
    }
    system.nextFlank -= dt;
    if (phase.flankInterval && system.nextFlank <= 0) {
      if (Math.random() < phase.flankChance) enqueueFlank(system, phase);
      system.nextFlank += phase.flankInterval + Math.random() * 4;
    }
  }

  for (const item of system.preview) {
    const layerSpeed = item.type === "ogre" ? (item.isBoss ? 12 : 20) : 39 + system.pressure * 7;
    item.depth -= dt * layerSpeed;
    item.wobble += dt;
    if (item.depth <= 0) {
      const enemy = activateEnemy(item.type, 845 + Math.random() * 45, item.y, {
        isBoss: item.isBoss,
        hpMultiplier: item.isBoss ? 2.35 : 1,
        speedMultiplier: item.isBoss ? 0.82 : 1,
        scoreBonus: item.isBoss ? 220 : 0,
        name: item.isBoss ? "Torbrecher von Blackhaven" : null,
      });
      if (item.isBoss || enemy?.isBoss) system.bossSpawned = true;
      item.dead = true;
    }
  }
  system.preview = system.preview.filter((item) => !item.dead);

  for (const flank of system.flankWarnings) {
    flank.timer -= dt;
    flank.wobble += dt;
    if (flank.timer <= 0) {
      for (let i = 0; i < flank.enemies.length; i += 1) {
        const type = flank.enemies[i];
        activateEnemy(type, 76 + Math.random() * 28, flank.y + (i - flank.enemies.length / 2) * 28, {
          spawnPoint: "leftFlank",
        });
      }
      flank.pulsesLeft -= 1;
      if (flank.pulsesLeft > 0) {
        flank.timer = flank.pulseDelay;
        flank.maxTimer = flank.pulseDelay;
        flank.enemies = rollFlankEnemies(flank.phase);
        flank.y = LANES[Math.floor(Math.random() * LANES.length)];
      } else {
        flank.dead = true;
      }
    }
  }
  system.flankWarnings = system.flankWarnings.filter((flank) => !flank.dead);
}

export function markBossDefeated(system) {
  system.bossDefeated = true;
}

function enqueuePack(system, phase) {
  const [min, max] = phase.count;
  const count = min + Math.floor(Math.random() * (max - min + 1));

  for (let i = 0; i < count; i += 1) {
    const type = phase.pool[Math.floor(Math.random() * phase.pool.length)];
    system.preview.push(createPreview(type, 310 + Math.random() * 210 + i * 10));
  }

  if (phase.ghoulChance && Math.random() < phase.ghoulChance) {
    system.preview.push(createPreview("ghoul", 360 + Math.random() * 170));
  }

  if (phase.wave === 3 && Math.random() < 0.18) {
    system.preview.push(createPreview("ogre", 780 + Math.random() * 120));
  }
}

function enqueueFlank(system, phase) {
  system.flankWarnings.push({
    spawnPoint: "leftFlank",
    timer: 1.65,
    maxTimer: 1.65,
    y: LANES[Math.floor(Math.random() * LANES.length)],
    phase,
    enemies: rollFlankEnemies(phase),
    pulsesLeft: phase.flankPulses ?? 1,
    pulseDelay: 1.25,
    wobble: Math.random() * 10,
  });
}

function rollFlankEnemies(phase) {
  const [min, max] = phase.flankCount;
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const enemies = [];
  for (let i = 0; i < count; i += 1) {
    enemies.push(phase.flankPool[Math.floor(Math.random() * phase.flankPool.length)]);
  }
  return enemies;
}

function getCurrentPhase(time) {
  for (let i = PHASES.length - 1; i >= 0; i -= 1) {
    if (time >= PHASES[i].start) return PHASES[i];
  }
  return PHASES[0];
}

function createPreview(type, depth, y = null, options = {}) {
  return {
    type,
    depth,
    isBoss: options.isBoss ?? false,
    y: y ?? LANES[Math.floor(Math.random() * LANES.length)] + (Math.random() - 0.5) * 18,
    wobble: Math.random() * 10,
    scale: options.scale ?? (type === "ogre" ? 1.65 : 0.75 + Math.random() * 0.35),
  };
}
