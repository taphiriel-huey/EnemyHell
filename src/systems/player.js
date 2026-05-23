export function createPlayer() {
  return {
    x: 270,
    y: 520,
    radius: 24,
    hp: 160,
    maxHp: 160,
    mana: 82,
    maxMana: 100,
    speed: 235,
    dashCooldown: 0,
    dashTime: 0,
    dashVector: { x: 1, y: 0 },
    staffCooldown: 0,
    comboIndex: 0,
    comboTimer: 0,
    comboResetTime: 0.82,
    attackDuration: 0,
    hitboxActiveTime: 0,
    staffManaGain: 0,
    comboBeatTimer: 99,
    inStaffCombo: false,
    invulnerable: 0,
    facing: 1,
  };
}

export function updatePlayer(player, input, dt, bounds) {
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.dashTime = Math.max(0, player.dashTime - dt);
  player.staffCooldown = Math.max(0, player.staffCooldown - dt);
  player.comboTimer = Math.max(0, player.comboTimer - dt);
  player.comboBeatTimer += dt;
  player.attackDuration = Math.max(0, player.attackDuration - dt);
  player.hitboxActiveTime = Math.max(0, player.hitboxActiveTime - dt);
  player.inStaffCombo = player.comboTimer > 0 || player.attackDuration > 0;
  if (player.comboTimer <= 0 && player.staffCooldown <= 0) {
    player.comboIndex = 0;
    player.inStaffCombo = false;
  }
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.mana = Math.min(player.maxMana, player.mana + 4.0 * dt);

  const rawX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const rawY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(rawX, rawY) || 1;
  let moveX = rawX / len;
  let moveY = rawY / len;

  if (moveX !== 0) {
    player.facing = Math.sign(moveX);
    player.dashVector.x = player.facing;
    player.dashVector.y = 0;
  }
  if (moveY !== 0 && moveX === 0) {
    player.dashVector.x = player.facing;
    player.dashVector.y = moveY * 0.3;
  }

  if (input.dash && player.dashCooldown <= 0) {
    player.dashCooldown = 0.82;
    player.dashTime = 0.16;
    player.invulnerable = 0.2;
    input.dash = false;
  }

  const speed = player.dashTime > 0 ? 780 : player.speed;
  if (player.dashTime > 0) {
    moveX = player.dashVector.x;
    moveY = player.dashVector.y;
  }

  player.x = clamp(player.x + moveX * speed * dt, bounds.left, bounds.right);
  player.y = clamp(player.y + moveY * speed * dt, bounds.top, bounds.bottom);
}

export function canStaffAttack(player) {
  return player.staffCooldown <= 0;
}

export function performStaffAttack(player) {
  const comboStep = player.comboTimer > 0 ? player.comboIndex : 0;
  const attack = createStaffAttack(player, comboStep);
  attack.rhythmic = comboStep === 0 || player.comboBeatTimer >= STAFF_COMBO[Math.max(0, comboStep - 1)].recovery + 0.06;
  if (attack.rhythmic && comboStep > 0) {
    attack.knockback *= 1.12;
    attack.manaGain += 1;
  }
  player.comboIndex = (comboStep + 1) % STAFF_COMBO.length;
  player.comboTimer = player.comboResetTime;
  player.comboBeatTimer = 0;
  player.staffCooldown = attack.recovery;
  player.attackDuration = attack.attackDuration;
  player.hitboxActiveTime = attack.hitboxActiveTime;
  player.staffManaGain = attack.manaGain;
  return attack;
}

export const STAFF_COMBO = [
  {
    name: "thrust",
    label: "Stoss",
    shape: "thrust",
    damage: 20,
    manaGain: 7,
    manaHitCap: 1,
    bonusManaOnHit: 0,
    knockback: 90,
    recovery: 0.22,
    attackDuration: 0.16,
    hitboxActiveTime: 0.09,
    range: 82,
    width: 30,
  },
  {
    name: "sweep",
    label: "Schwinger",
    shape: "arc",
    damage: 20,
    manaGain: 6,
    manaHitCap: 3,
    bonusManaOnHit: 0,
    knockback: 120,
    recovery: 0.28,
    attackDuration: 0.2,
    hitboxActiveTime: 0.12,
    radius: 72,
    offset: 50,
  },
  {
    name: "backhand",
    label: "Rueckhand",
    shape: "heavyArc",
    damage: 24,
    manaGain: 11,
    manaHitCap: 1,
    bonusManaOnHit: 0,
    knockback: 230,
    recovery: 0.38,
    attackDuration: 0.26,
    hitboxActiveTime: 0.14,
    radius: 84,
    offset: 60,
  },
  {
    name: "finisher",
    label: "Finisher",
    shape: "shockwave",
    damage: 26,
    manaGain: 6,
    manaHitCap: 2,
    bonusManaOnHit: 10,
    knockback: 300,
    stagger: 0.38,
    recovery: 0.48,
    attackDuration: 0.34,
    hitboxActiveTime: 0.16,
    radius: 88,
    offset: 72,
  },
];

function createStaffAttack(player, comboStep) {
  const def = STAFF_COMBO[comboStep];
  const attack = {
    ...def,
    comboStep,
    facing: player.facing,
    originX: player.x,
    originY: player.y,
    x: player.x + player.facing * (def.offset ?? def.range * 0.55),
    y: player.y,
  };
  if (def.shape === "thrust") {
    attack.width = def.range;
    attack.height = def.width;
    attack.x = player.x + player.facing * (def.range * 0.55);
  }
  return {
    ...attack,
  };
}

export const canMelee = canStaffAttack;
export const performMelee = performStaffAttack;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
