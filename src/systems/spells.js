import { damageEnemy, distance, knockEnemy, staggerEnemy } from "./enemies.js";

export function createSpellState() {
  return {
    fireSize: 1,
    fireDamageMultiplier: 1,
    fireKnockbackMultiplier: 1,
    lightningRange: 480,
    lightningDamageMultiplier: 1,
    lightningSplashDamageMultiplier: 1,
    frostRadius: 154,
    frostDamageMultiplier: 1,
    chainTargets: 6,
    frostDuration: 1.6,
    meleeManaMultiplier: 1,
    nextFireOverload: false,
    nextSpellCostMultiplier: 1,
    lastCast: null,
    castSequence: [],
    rhythmEmpowered: false,
    traits: {
      lightningRefundPerHit: 0,
      frostRefundOnCrowd: 0,
      staffDiscipline: 0,
      staffFinisherWave: 0,
      fullStaffComboMana: 0,
      nextSpellDiscountOnFullCombo: 0,
      staffComboDamageReduction: 0,
      brittleIceStaffBonus: 0,
      brittleIceShatterDamage: 0,
      conductiveAshExtraTargets: 0,
      burningDuration: 2.8,
      pressureVsSlowed: 0,
      rhythmBonus: 0,
      savedFireBonusPerSecond: 0,
      savedFireMaxBonus: 0,
    },
    spells: {
      fire: createSpell("fire", 68, 8.5),
      lightning: createSpell("lightning", 34, 4.0),
      frost: createSpell("frost", 30, 5.0),
    },
  };
}

function createSpell(key, manaCost, cooldown) {
  return {
    key,
    manaCost,
    cooldown,
    currentCooldown: 0,
    readyPulse: 0,
    canCast(player, costMultiplier = 1) {
      return player.mana >= Math.ceil(this.manaCost * costMultiplier) && this.currentCooldown <= 0;
    },
    cast(player, costMultiplier = 1) {
      if (!this.canCast(player, costMultiplier)) return false;
      player.mana -= Math.ceil(this.manaCost * costMultiplier);
      this.currentCooldown = this.cooldown;
      this.readyPulse = 0;
      return true;
    },
    updateCooldown(delta) {
      const before = this.currentCooldown;
      this.currentCooldown = Math.max(0, this.currentCooldown - delta);
      this.readyPulse = Math.max(0, this.readyPulse - delta);
      if (before > 0 && this.currentCooldown <= 0) this.readyPulse = 0.35;
    },
  };
}

export function updateSpellCooldowns(spells, dt) {
  for (const spell of Object.values(spells.spells)) {
    spell.updateCooldown(dt);
  }
  const fire = spells.spells.fire;
  if (fire.currentCooldown <= 0) {
    fire.heldReadyTime = (fire.heldReadyTime ?? 0) + dt;
  } else {
    fire.heldReadyTime = 0;
  }
}

export function getSkillbarState(spells, player) {
  return [
    skillState("fire", "RMB/1", "Feuer", spells.spells.fire, player, spells.nextSpellCostMultiplier),
    skillState("lightning", "Q/2", "Blitz", spells.spells.lightning, player, spells.nextSpellCostMultiplier),
    skillState("frost", "E/3", "Frost", spells.spells.frost, player, spells.nextSpellCostMultiplier),
  ];
}

export function reduceLastSpellCooldown(spells, amount) {
  if (!spells.lastCast || !spells.spells[spells.lastCast]) return;
  const spell = spells.spells[spells.lastCast];
  spell.currentCooldown = Math.max(0, spell.currentCooldown - amount);
  if (spell.currentCooldown <= 0) spell.readyPulse = 0.25;
}

export function castFireball(player, enemies, spells, aim = null) {
  const fire = spells.spells.fire;
  let damage = 142 * spells.fireDamageMultiplier;
  let radius = 144 * spells.fireSize;
  let knockback = 620 * spells.fireKnockbackMultiplier;
  let originalCost = fire.manaCost;
  const rhythm = consumeRhythmBonus(spells);
  const savedBonus = spells.traits.savedFireBonusPerSecond > 0
    ? Math.min(spells.traits.savedFireMaxBonus, (fire.heldReadyTime ?? 0) * spells.traits.savedFireBonusPerSecond)
    : 0;
  damage *= 1 + rhythm + savedBonus;
  knockback *= 1 + rhythm * 0.65 + savedBonus * 0.65;

  if (spells.nextFireOverload) {
    originalCost = fire.manaCost;
    fire.manaCost = player.mana;
    damage = 265 * spells.fireDamageMultiplier;
    radius = 214;
    knockback = 820 * spells.fireKnockbackMultiplier;
  }

  const costMultiplier = spells.nextSpellCostMultiplier;
  if (!fire.cast(player, costMultiplier)) {
    fire.manaCost = originalCost;
    return null;
  }

  spells.nextSpellCostMultiplier = 1;
  fire.manaCost = originalCost;
  fire.heldReadyTime = 0;
  spells.nextFireOverload = false;
  recordCast(spells, "fire");
  const aimVector = getAimVector(player, aim);
  const target = getAimTarget(player, aim, 330, 86);
  const impact = {
    x: target.x,
    y: target.y,
    radius,
    damage,
    knockback,
  };
  const killed = applyAreaDamage(enemies, impact.x, impact.y, radius, damage, knockback, player.x, player.y, spells);
  return { kind: "fire", impact, aim: aimVector, killed, empowered: rhythm > 0 || savedBonus > 0 };
}

export function castLightning(player, enemies, spells, aim = null) {
  const lightning = spells.spells.lightning;
  if (!lightning.cast(player, spells.nextSpellCostMultiplier)) return null;
  spells.nextSpellCostMultiplier = 1;

  const rhythm = consumeRhythmBonus(spells);
  recordCast(spells, "lightning");
  const aimVector = getAimVector(player, aim);
  const aimTarget = getAimTarget(player, aim, spells.lightningRange, 110);
  const start = { x: player.x + aimVector.x * 90, y: player.y + aimVector.y * 62 };
  const hasBurningTarget = enemies.some((enemy) => enemy.hp > 0 && enemy.burn > 0 && distance(aimTarget, enemy) < 500);
  const bonusTargets = hasBurningTarget ? spells.traits.conductiveAshExtraTargets : 0;
  const range = spells.lightningRange + (hasBurningTarget ? 80 : 0);
  const targets = enemies
    .filter((enemy) => enemy.hp > 0 && distance(start, enemy) < range && distance(aimTarget, enemy) < range * 0.82)
    .sort((a, b) => lightningPriority(start, aimTarget, a) - lightningPriority(start, aimTarget, b))
    .slice(0, spells.chainTargets + bonusTargets);
  const killed = [];
  targets.forEach((enemy, index) => {
    const damage = Math.max(28, 46 - index * 3) * spells.lightningDamageMultiplier * (1 + rhythm);
    staggerEnemy(enemy, enemy.type === "ogre" ? 0.08 : 0.2);
    if (damageEnemy(enemy, damage, "lightning")) killed.push(enemy);
  });
  const splashes = applyLightningSplash(enemies, targets, rhythm, spells.lightningSplashDamageMultiplier);
  killed.push(...splashes);
  if (spells.traits.lightningRefundPerHit > 0 && targets.length > 0) {
    lightning.currentCooldown = Math.max(0, lightning.currentCooldown - targets.length * spells.traits.lightningRefundPerHit);
  }
  return { kind: "lightning", start, aim: aimVector, aimTarget, targets, splashCount: splashes.length, killed, empowered: rhythm > 0 || hasBurningTarget };
}

function lightningPriority(start, aimTarget, enemy) {
  const typeBias = enemy.type === "ogre" ? 180 : enemy.type === "zombie" ? 50 : 0;
  const woundedBias = enemy.hp / enemy.maxHp < 0.45 ? -45 : 0;
  const cursorBias = distance(aimTarget, enemy) * 1.45;
  const chainBias = distance(start, enemy) * 0.35;
  return cursorBias + chainBias + typeBias + woundedBias;
}

function applyLightningSplash(enemies, targets, rhythm, splashMultiplier = 1) {
  const killed = [];
  const targetSet = new Set(targets);
  for (const target of targets) {
    for (const enemy of enemies) {
      if (targetSet.has(enemy) || enemy.hp <= 0 || enemy.type === "ogre") continue;
      if (distance(target, enemy) < 78 + enemy.radius) {
        staggerEnemy(enemy, 0.1);
        if (damageEnemy(enemy, 12 * splashMultiplier * (1 + rhythm), "lightning")) killed.push(enemy);
      }
    }
  }
  return killed;
}

export function castFrost(player, enemies, spells, aim = null) {
  const frost = spells.spells.frost;
  if (!frost.cast(player, spells.nextSpellCostMultiplier)) return null;
  spells.nextSpellCostMultiplier = 1;

  const rhythm = consumeRhythmBonus(spells);
  recordCast(spells, "frost");
  const aimVector = getAimVector(player, aim);
  const target = getAimTarget(player, aim, 255, 76);
  const cone = { x: target.x, y: target.y, radius: spells.frostRadius, aim: aimVector };
  const killed = [];
  let hitCount = 0;
  for (const enemy of enemies) {
    if (distance(cone, enemy) < cone.radius + enemy.radius) {
      hitCount += 1;
      enemy.slow = spells.frostDuration * (1 + rhythm * 0.45);
      enemy.freeze = Math.min(0.85, spells.frostDuration * 0.36 * (1 + rhythm * 0.35));
      if (damageEnemy(enemy, 24 * spells.frostDamageMultiplier * (1 + rhythm), "frost")) killed.push(enemy);
    }
  }
  if (hitCount >= 6 && spells.traits.frostRefundOnCrowd > 0) {
    frost.currentCooldown = Math.max(0, frost.currentCooldown - spells.traits.frostRefundOnCrowd);
  }
  return { kind: "frost", cone, killed, empowered: rhythm > 0 };
}

export function getStaffDamage(enemy, baseDamage, spells) {
  if (spells.traits.brittleIceStaffBonus > 0 && (enemy.slow > 0 || enemy.freeze > 0)) {
    return baseDamage * (1 + spells.traits.brittleIceStaffBonus);
  }
  return baseDamage;
}

function skillState(key, hotkey, label, spell, player, costMultiplier = 1) {
  const manaCost = Math.ceil(spell.manaCost * costMultiplier);
  return {
    key,
    hotkey,
    label,
    manaCost,
    cooldown: spell.cooldown,
    currentCooldown: spell.currentCooldown,
    readyPulse: spell.readyPulse,
    canCast: spell.canCast(player, costMultiplier),
    discounted: costMultiplier < 1,
  };
}

function applyAreaDamage(enemies, x, y, radius, damage, knockback = 0, knockSourceX = x, knockSourceY = y, spells = null) {
  const killed = [];
  for (const enemy of enemies) {
    if (distance({ x, y }, enemy) < radius + enemy.radius) {
      const slowedBonus = spells?.traits.pressureVsSlowed && (enemy.slow > 0 || enemy.freeze > 0) ? 1 + spells.traits.pressureVsSlowed : 1;
      enemy.burn = Math.max(enemy.burn, spells?.traits.burningDuration ?? 2.8);
      if (knockback > 0) knockEnemy(enemy, knockSourceX, knockSourceY, knockback * slowedBonus);
      if (damageEnemy(enemy, damage, "fire")) killed.push(enemy);
    }
  }
  return killed;
}

function recordCast(spells, kind) {
  spells.lastCast = kind;
  spells.castSequence.push(kind);
  if (spells.castSequence.length > 3) spells.castSequence.shift();
  if (spells.traits.rhythmBonus > 0 && new Set(spells.castSequence).size === 3) {
    spells.rhythmEmpowered = true;
    spells.castSequence = [];
  }
}

function consumeRhythmBonus(spells) {
  if (!spells.rhythmEmpowered) return 0;
  spells.rhythmEmpowered = false;
  return spells.traits.rhythmBonus;
}

function getAimVector(player, aim) {
  if (!aim) return { x: player.facing || 1, y: 0 };
  const dx = aim.x - player.x;
  const dy = (aim.y - player.y) * 0.72;
  const len = Math.hypot(dx, dy);
  if (len < 18) return { x: player.facing || 1, y: 0 };
  return {
    x: dx / len,
    y: Phaser.Math.Clamp(dy / len, -0.7, 0.7),
  };
}

function getAimTarget(player, aim, maxRange, minForward = 0) {
  const fallback = { x: player.x + (player.facing || 1) * maxRange * 0.75, y: player.y };
  if (!aim) return fallback;
  const dx = aim.x - player.x;
  const dy = aim.y - player.y;
  const len = Math.hypot(dx, dy);
  if (len < 18) return fallback;
  const clampedLen = Phaser.Math.Clamp(len, minForward, maxRange);
  return {
    x: player.x + (dx / len) * clampedLen,
    y: player.y + (dy / len) * clampedLen,
  };
}
