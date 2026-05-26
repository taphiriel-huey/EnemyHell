const TYPES = {
  skeleton: { hp: 35, speed: 78, damage: 6, radius: 18, score: 8, knockResist: 0.8 },
  zombie: { hp: 78, speed: 39, damage: 10, radius: 24, score: 13, knockResist: 1.0 },
  ghoul: { hp: 48, speed: 112, damage: 9, radius: 20, score: 14, knockResist: 0.75 },
  ogre: { hp: 400, speed: 24, damage: 24, radius: 52, score: 70, knockResist: 0.28 },
};

export function createEnemy(type, x, y, options = {}) {
  const def = TYPES[type];
  const hp = Math.round(def.hp * (options.hpMultiplier ?? 1));
  return {
    type,
    name: options.name ?? type,
    isBoss: options.isBoss ?? false,
    x,
    y,
    hp,
    maxHp: hp,
    speed: def.speed * (options.speedMultiplier ?? 1),
    damage: def.damage,
    radius: def.radius,
    score: def.score + (options.scoreBonus ?? 0),
    knockResist: def.knockResist,
    state: "active",
    attackCooldown: 0,
    slow: 0,
    freeze: 0,
    burn: 0,
    stagger: 0,
    hitFlash: 0,
    hitKind: null,
    recoil: 0,
    flankDir: Math.random() < 0.5 ? -1 : 1,
    roleTimer: 0.5 + Math.random() * 1.5,
    entryStability: 0.55,
    specialState: null,
    specialTimer: 0,
    specialTargetX: 0,
    specialTargetY: 0,
    specialApplied: false,
    knockX: 0,
    knockY: 0,
    facing: options.spawnPoint === "leftFlank" ? 1 : -1,
  };
}

export function updateEnemies(enemies, player, dt, onPlayerHit) {
  for (const enemy of enemies) {
    const previousX = enemy.x;
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.slow = Math.max(0, enemy.slow - dt);
    enemy.freeze = Math.max(0, enemy.freeze - dt);
    enemy.burn = Math.max(0, enemy.burn - dt);
    enemy.stagger = Math.max(0, enemy.stagger - dt);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.recoil = Math.max(0, enemy.recoil - dt);
    enemy.roleTimer = Math.max(0, enemy.roleTimer - dt);
    enemy.entryStability = Math.max(0, enemy.entryStability - dt);
    enemy.specialTimer = Math.max(0, enemy.specialTimer - dt);
    if (enemy.hitFlash <= 0) enemy.hitKind = null;

    enemy.x += enemy.knockX * dt;
    enemy.y += enemy.knockY * dt;
    enemy.knockX *= Math.pow(0.035, dt);
    enemy.knockY *= Math.pow(0.035, dt);

    if (enemy.freeze <= 0 && enemy.stagger <= 0) {
      updateSpecialAttack(enemy, player, dt, onPlayerHit);
    }

    if (enemy.freeze <= 0 && enemy.stagger <= 0 && !isSpecialMovementLocked(enemy)) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const slowFactor = enemy.slow > 0 ? 0.34 : 1;
      const role = getRoleMovement(enemy, dx, dy, dist);
      enemy.x += role.x * enemy.speed * slowFactor * dt;
      enemy.y += role.y * enemy.speed * slowFactor * dt;
    }

    const moveX = enemy.x - previousX;
    if (Math.abs(moveX) > 0.015) enemy.facing = Math.sign(moveX);

    const hitDist = enemy.radius + player.radius;
    if (distance(enemy, player) < hitDist && enemy.attackCooldown <= 0 && enemy.stagger <= 0) {
      enemy.attackCooldown = enemy.type === "ogre" ? 1.25 : 0.72;
      onPlayerHit(enemy.damage);
    }
  }
}

function updateSpecialAttack(enemy, player, dt, onPlayerHit) {
  if (enemy.type === "ghoul") updateGhoulLunge(enemy, player, dt, onPlayerHit);
  if (enemy.type === "ogre") updateOgreSlam(enemy, player, dt, onPlayerHit);
}

function updateGhoulLunge(enemy, player, dt, onPlayerHit) {
  const playerCampingRight = player.x > 630;
  const lungeRange = playerCampingRight ? 330 : 250;
  if (!enemy.specialState && enemy.roleTimer <= 0 && distance(enemy, player) < lungeRange) {
    enemy.specialState = "ghoulWindup";
    enemy.specialTimer = 0.58;
    enemy.specialTargetX = player.x;
    enemy.specialTargetY = player.y + (playerCampingRight ? enemy.flankDir * 46 : 0);
    enemy.roleTimer = 3.1 + Math.random() * 1.2;
  }
  if (enemy.specialState === "ghoulWindup" && enemy.specialTimer <= 0) {
    enemy.specialState = "ghoulLunge";
    enemy.specialTimer = 0.26;
    enemy.specialApplied = false;
  }
  if (enemy.specialState === "ghoulLunge") {
    const dx = enemy.specialTargetX - enemy.x;
    const dy = enemy.specialTargetY - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / dist) * enemy.speed * 3.35 * dt;
    enemy.y += (dy / dist) * enemy.speed * 1.55 * dt;
    if (!enemy.specialApplied && distance(enemy, player) < enemy.radius + player.radius + 2) {
      enemy.specialApplied = true;
      onPlayerHit(enemy.damage + 1);
    }
    if (enemy.specialTimer <= 0) {
      enemy.specialState = "ghoulRecover";
      enemy.specialTimer = 0.34;
    }
  }
  if (enemy.specialState === "ghoulRecover" && enemy.specialTimer <= 0) enemy.specialState = null;
}

function updateOgreSlam(enemy, player, dt, onPlayerHit) {
  const playerCampingRight = player.x > 630;
  const slamRange = playerCampingRight ? 205 : 140;
  if (!enemy.specialState && enemy.roleTimer <= 0 && distance(enemy, player) < slamRange) {
    enemy.specialState = "ogreWindup";
    enemy.specialTimer = enemy.isBoss ? 0.82 : 0.68;
    enemy.specialTargetX = player.x;
    enemy.specialTargetY = player.y;
    enemy.specialApplied = false;
    enemy.roleTimer = enemy.isBoss ? 3.5 : 4.4;
  }
  if (enemy.specialState === "ogreWindup" && enemy.specialTimer <= 0) {
    enemy.specialState = "ogreSlam";
    enemy.specialTimer = 0.22;
  }
  if (enemy.specialState === "ogreSlam") {
    if (!enemy.specialApplied) {
      enemy.specialApplied = true;
      if (distance({ x: enemy.specialTargetX, y: enemy.specialTargetY }, player) < (enemy.isBoss ? 96 : 78) + player.radius) {
        onPlayerHit(enemy.damage + (enemy.isBoss ? 12 : 7));
      }
    }
    if (enemy.specialTimer <= 0) enemy.specialState = null;
  }
}

function getRoleMovement(enemy, dx, dy, dist) {
  const towardX = dx / dist;
  const towardY = dy / dist;
  if (enemy.type === "skeleton") {
    const side = enemy.flankDir;
    return {
      x: towardX * 0.82 + (-towardY) * side * 0.28,
      y: towardY * 0.48 + towardX * side * 0.22,
    };
  }
  if (enemy.type === "zombie") {
    return { x: towardX * 0.92, y: towardY * 0.34 };
  }
  if (enemy.type === "ghoul") {
    return { x: towardX * 1.08, y: towardY * 0.72 };
  }
  return { x: towardX * 0.78, y: towardY * 0.26 };
}

function isSpecialMovementLocked(enemy) {
  return enemy.specialState === "ghoulWindup" || enemy.specialState === "ghoulRecover" || enemy.specialState === "ogreWindup" || enemy.specialState === "ogreSlam";
}

export function staggerEnemy(enemy, duration) {
  enemy.stagger = Math.max(enemy.stagger, duration * enemy.knockResist);
  enemy.recoil = Math.max(enemy.recoil, duration * 0.35);
}

export function damageEnemy(enemy, amount, hitKind = "physical") {
  enemy.hp -= amount;
  enemy.hitFlash = hitKind === "fire" ? 0.24 : 0.18;
  enemy.hitKind = hitKind;
  enemy.recoil = hitKind === "fire" ? 0.2 : 0.1;
  return enemy.hp <= 0;
}

export function knockEnemy(enemy, sourceX, sourceY, force) {
  const dx = enemy.x - sourceX;
  const dy = enemy.y - sourceY;
  const dist = Math.hypot(dx, dy) || 1;
  const resistedForce = force * enemy.knockResist;
  enemy.knockX += (dx / dist) * resistedForce;
  enemy.knockY += (dy / dist) * resistedForce * 0.36;
}

export function getEnemyDef(type) {
  return TYPES[type];
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
