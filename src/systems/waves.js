const DEFAULT_LANES = [415, 468, 520, 574, 622];

const SECTIONS = [
  {
    id: 1,
    title: "Blackhaven / Burning Village",
    shortTitle: "Dorfplatz",
    initialPreview: [
      ["skeleton", 250, 456],
      ["skeleton", 330, 520],
      ["zombie", 390, 612],
    ],
    bossPreviewAt: 132,
    lanes: [415, 468, 520, 574, 622],
    rightSpawnX: 845,
    leftFlankX: 76,
    boss: {
      type: "ogre",
      name: "Torbrecher von Blackhaven",
      y: 548,
      depth: 980,
      scale: 2.15,
      hpMultiplier: 1.9,
      speedMultiplier: 0.88,
      scoreBonus: 220,
    },
    phases: [
      {
        wave: 1,
        name: "Ankunft am Dorfplatz",
        start: 0,
        end: 38,
        interval: 2.35,
        pool: ["skeleton", "skeleton", "zombie"],
        count: [3, 5],
        flankInterval: 16,
        flankChance: 0.75,
        flankPool: ["skeleton", "skeleton"],
        flankCount: [1, 2],
        flankPulses: 1,
      },
      {
        wave: 2,
        name: "Die Gassen brechen",
        start: 44,
        end: 94,
        interval: 2.2,
        pool: ["skeleton", "skeleton", "skeleton", "zombie", "zombie"],
        count: [3, 5],
        ghoulChance: 0.1,
        flankInterval: 13,
        flankChance: 0.75,
        flankPool: ["skeleton", "skeleton", "skeleton", "zombie"],
        flankCount: [1, 3],
        flankPulses: 1,
      },
      {
        wave: 3,
        name: "Der Hof wird ueberrannt",
        start: 100,
        end: 154,
        interval: 2.05,
        pool: ["skeleton", "skeleton", "zombie", "zombie", "ghoul"],
        count: [3, 6],
        ghoulChance: 0.22,
        flankInterval: 12,
        flankChance: 0.75,
        flankPool: ["skeleton", "skeleton", "skeleton", "ghoul", "zombie"],
        flankCount: [2, 3],
        flankPulses: 1,
        ogreChance: 0.08,
      },
      {
        wave: 4,
        name: "Miniboss: Torbrecher von Blackhaven",
        start: 162,
        end: 230,
        interval: 2.75,
        pool: ["skeleton", "skeleton", "zombie", "zombie", "ghoul"],
        count: [2, 4],
        ghoulChance: 0.16,
        flankInterval: 13,
        flankChance: 0.65,
        flankPool: ["skeleton", "skeleton", "skeleton", "zombie", "ghoul"],
        flankCount: [1, 3],
        flankPulses: 1,
      },
    ],
  },
  {
    id: 2,
    title: "Chapel Gate / Aschenkapelle",
    shortTitle: "Kapellentor",
    initialPreview: [
      ["zombie", 230, 504],
      ["skeleton", 300, 574],
      ["ghoul", 410, 626],
    ],
    bossPreviewAt: 142,
    lanes: [492, 532, 574, 616, 646],
    rightSpawnX: 830,
    leftFlankX: 92,
    boss: {
      type: "ogre",
      name: "Kapellenwaechter",
      y: 596,
      depth: 940,
      scale: 2.05,
      hpMultiplier: 2.55,
      speedMultiplier: 0.9,
      scoreBonus: 280,
    },
    phases: [
      {
        wave: 5,
        name: "Kapellentor: Aschewind",
        start: 0,
        end: 38,
        interval: 2.15,
        pool: ["skeleton", "skeleton", "zombie", "ghoul"],
        count: [3, 5],
        ghoulChance: 0.22,
        flankInterval: 8,
        flankChance: 1,
        flankPool: ["skeleton", "skeleton", "ghoul"],
        flankCount: [2, 3],
        flankPulses: 2,
      },
      {
        wave: 6,
        name: "Die Seitenstrassen oeffnen sich",
        start: 44,
        end: 98,
        interval: 2.05,
        pool: ["skeleton", "zombie", "zombie", "ghoul"],
        count: [4, 6],
        ghoulChance: 0.28,
        flankInterval: 7,
        flankChance: 0.95,
        flankPool: ["skeleton", "skeleton", "zombie", "ghoul"],
        flankCount: [2, 4],
        flankPulses: 2,
      },
      {
        wave: 7,
        name: "Die Kapelle antwortet",
        start: 104,
        end: 164,
        interval: 1.95,
        pool: ["skeleton", "skeleton", "zombie", "ghoul", "ghoul"],
        count: [4, 6],
        ghoulChance: 0.34,
        flankInterval: 8,
        flankChance: 0.9,
        flankPool: ["skeleton", "zombie", "ghoul"],
        flankCount: [2, 3],
        flankPulses: 2,
        ogreChance: 0.14,
      },
      {
        wave: 8,
        name: "Miniboss: Kapellenwaechter",
        start: 172,
        end: 270,
        interval: 2.35,
        pool: ["skeleton", "skeleton", "zombie", "ghoul"],
        count: [3, 5],
        ghoulChance: 0.28,
        flankInterval: 8,
        flankChance: 0.85,
        flankPool: ["skeleton", "zombie", "ghoul"],
        flankCount: [2, 3],
        flankPulses: 2,
      },
    ],
  },
  {
    id: 3,
    title: "Forest Road / Blutmondhain",
    shortTitle: "Blutmondhain",
    initialPreview: [
      ["ghoul", 220, 548],
      ["skeleton", 300, 582],
      ["zombie", 390, 616],
      ["ogre", 520, 646],
    ],
    bossPreviewAt: 150,
    lanes: [548, 582, 616, 646],
    rightSpawnX: 805,
    leftFlankX: 116,
    boss: {
      type: "ogre",
      name: "Hainbrecher",
      y: 626,
      depth: 960,
      scale: 2.25,
      hpMultiplier: 3.0,
      speedMultiplier: 0.94,
      scoreBonus: 360,
    },
    phases: [
      {
        wave: 9,
        name: "Blutmondhain: Erste Schatten",
        start: 0,
        end: 42,
        interval: 2.0,
        pool: ["skeleton", "skeleton", "zombie", "ghoul"],
        count: [4, 6],
        ghoulChance: 0.3,
        flankInterval: 7,
        flankChance: 0.95,
        flankPool: ["skeleton", "ghoul", "ghoul"],
        flankCount: [2, 3],
        flankPulses: 2,
      },
      {
        wave: 10,
        name: "Die Waldwege schliessen sich",
        start: 48,
        end: 108,
        interval: 1.9,
        pool: ["skeleton", "zombie", "zombie", "ghoul", "ghoul"],
        count: [4, 7],
        ghoulChance: 0.38,
        flankInterval: 7,
        flankChance: 1,
        flankPool: ["skeleton", "zombie", "ghoul", "ghoul"],
        flankCount: [2, 4],
        flankPulses: 2,
        ogreChance: 0.12,
      },
      {
        wave: 11,
        name: "Unter dem roten Mond",
        start: 114,
        end: 176,
        interval: 1.85,
        pool: ["skeleton", "skeleton", "zombie", "ghoul", "ghoul"],
        count: [5, 7],
        ghoulChance: 0.42,
        flankInterval: 6,
        flankChance: 1,
        flankPool: ["skeleton", "zombie", "ghoul"],
        flankCount: [2, 4],
        flankPulses: 2,
        ogreChance: 0.16,
      },
      {
        wave: 12,
        name: "Miniboss: Hainbrecher",
        start: 184,
        end: 290,
        interval: 2.22,
        pool: ["skeleton", "skeleton", "zombie", "ghoul", "ghoul"],
        count: [3, 6],
        ghoulChance: 0.35,
        flankInterval: 7,
        flankChance: 0.9,
        flankPool: ["skeleton", "zombie", "ghoul"],
        flankCount: [2, 3],
        flankPulses: 2,
      },
    ],
  },
];

export function createWaveSystem(sectionId = 1) {
  const section = getSectionConfig(sectionId);
  return {
    sectionId: section.id,
    sectionTitle: section.title,
    sectionShortTitle: section.shortTitle,
    phases: section.phases,
    bossConfig: section.boss,
    bossPreviewAt: section.bossPreviewAt,
    lanes: section.lanes ?? DEFAULT_LANES,
    rightSpawnX: section.rightSpawnX ?? 845,
    leftFlankX: section.leftFlankX ?? 76,
    time: 0,
    pressure: 1,
    nextSpawn: 0.5,
    nextFlank: section.id === 1 ? 10 : 6,
    preview: section.initialPreview.map(([type, depth, y]) => createPreview(type, depth, y)),
    flankWarnings: [],
    wave: section.phases[0].wave,
    phaseName: section.phases[0].name,
    phaseEndsAt: section.phases[0].end,
    bossPreviewQueued: false,
    bossSpawned: false,
    bossDefeated: false,
  };
}

export function updateWaves(system, dt, activateEnemy) {
  system.time += dt;
  const phase = getCurrentPhase(system, system.time);
  system.wave = phase.wave;
  system.phaseName = phase.name;
  system.phaseEndsAt = phase.end;
  system.pressure = 1 + phase.wave * 0.14 + system.time / 180;

  if (system.time >= system.bossPreviewAt && !system.bossPreviewQueued) {
    const boss = system.bossConfig;
    system.preview.push(createPreview(boss.type, boss.depth, boss.y, { isBoss: true, scale: boss.scale }));
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
      const enemy = activateEnemy(item.type, system.rightSpawnX + Math.random() * 45, item.y, {
        isBoss: item.isBoss,
        hpMultiplier: item.isBoss ? system.bossConfig.hpMultiplier : 1,
        speedMultiplier: item.isBoss ? system.bossConfig.speedMultiplier : 1,
        scoreBonus: item.isBoss ? system.bossConfig.scoreBonus : 0,
        name: item.isBoss ? system.bossConfig.name : null,
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
        activateEnemy(type, system.leftFlankX + Math.random() * 28, flank.y + (i - flank.enemies.length / 2) * 24, {
          spawnPoint: "leftFlank",
        });
      }
      flank.pulsesLeft -= 1;
      if (flank.pulsesLeft > 0) {
        flank.timer = flank.pulseDelay;
        flank.maxTimer = flank.pulseDelay;
        flank.enemies = rollFlankEnemies(flank.phase);
        flank.y = system.lanes[Math.floor(Math.random() * system.lanes.length)];
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
    system.preview.push(createPreview(type, 310 + Math.random() * 210 + i * 10, null, { lanes: system.lanes }));
  }

  if (phase.ghoulChance && Math.random() < phase.ghoulChance) {
    system.preview.push(createPreview("ghoul", 360 + Math.random() * 170, null, { lanes: system.lanes }));
  }

  if (phase.ogreChance && Math.random() < phase.ogreChance) {
    system.preview.push(createPreview("ogre", 780 + Math.random() * 120, null, { lanes: system.lanes }));
  }
}

function enqueueFlank(system, phase) {
  system.flankWarnings.push({
    spawnPoint: "leftFlank",
    x: system.leftFlankX + 40,
    timer: 1.65,
    maxTimer: 1.65,
    y: system.lanes[Math.floor(Math.random() * system.lanes.length)],
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

function getCurrentPhase(system, time) {
  for (let i = system.phases.length - 1; i >= 0; i -= 1) {
    if (time >= system.phases[i].start) return system.phases[i];
  }
  return system.phases[0];
}

function getSectionConfig(sectionId) {
  return SECTIONS.find((section) => section.id === sectionId) ?? SECTIONS[0];
}

function createPreview(type, depth, y = null, options = {}) {
  const lanes = options.lanes ?? DEFAULT_LANES;
  return {
    type,
    depth,
    isBoss: options.isBoss ?? false,
    y: y ?? lanes[Math.floor(Math.random() * lanes.length)] + (Math.random() - 0.5) * 18,
    wobble: Math.random() * 10,
    scale: options.scale ?? (type === "ogre" ? 1.65 : 0.75 + Math.random() * 0.35),
  };
}
