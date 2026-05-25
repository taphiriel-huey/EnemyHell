import { createPlayer, performMelee, updatePlayer, canMelee } from "../systems/player.js";
import { createEnemy, damageEnemy, distance, knockEnemy, staggerEnemy, updateEnemies } from "../systems/enemies.js";
import { createWaveSystem, updateWaves, markBossDefeated } from "../systems/waves.js";
import { createSpellState, updateSpellCooldowns, castFireball, castLightning, castFrost, getSkillbarState, reduceLastSpellCooldown, getStaffDamage } from "../systems/spells.js";
import { getCardChoices } from "../systems/cards.js";
import { createHud, drawHud, createCardOverlay } from "../systems/ui.js";
import { formatRunTime, recordRunProgress } from "../systems/progress.js";

const BOUNDS = { left: 90, right: 690, top: 380, bottom: 650 };
const PICKUP_BOUNDS = { left: 90, right: 660, top: 395, bottom: 635 };
const PICKUP_MIN_PLAYER_DISTANCE = 150;
const USE_CONCEPT_PLAYER_SPRITE = true;
const CONCEPT_PLAYER_TEXTURE = "playerMageWalk";
const CONCEPT_PLAYER_IDLE_TEXTURE = "playerMageIdleStable";
const CONCEPT_PLAYER_STAFF_TEXTURE = "playerMageStaffAttack";
const CONCEPT_PLAYER_CAST_TEXTURE = "playerMageCast";
const CONCEPT_PLAYER_WALK_ANIM = "mage-walk";
const CONCEPT_PLAYER_IDLE_ANIM = "mage-idle";
const CONCEPT_PLAYER_STAFF_ANIM = "mage-staff-attack";
const CONCEPT_PLAYER_CAST_ANIM = "mage-cast";
const CONCEPT_PLAYER_HEIGHT = 130;
const CONCEPT_PLAYER_SCALE_MULTIPLIERS = {
  [CONCEPT_PLAYER_TEXTURE]: 0.9,
  [CONCEPT_PLAYER_IDLE_TEXTURE]: 1,
  [CONCEPT_PLAYER_STAFF_TEXTURE]: 1,
  [CONCEPT_PLAYER_CAST_TEXTURE]: 1,
};
const CONCEPT_PLAYER_WALK_FRAMES = Array.from({ length: 28 }, (_, frame) => frame);
const CONCEPT_PLAYER_IDLE_FRAMES = [0];
const CONCEPT_PLAYER_STAFF_FRAMES = Array.from({ length: 29 }, (_, frame) => frame);
const CONCEPT_PLAYER_CAST_FRAMES = Array.from({ length: 29 }, (_, frame) => frame);
const CONCEPT_PLAYER_STAFF_VISUAL_DURATION = 0.72;
const CONCEPT_PLAYER_CAST_DURATION = 0.9;
const FIRE_PROJECTILE_ANIM = "fire-projectile-fx";
const FIRE_PROJECTILE_FRAMES = Array.from({ length: 6 }, (_, frame) => frame);
const FIRE_PROJECTILE_TRAVEL_TIME = 0.2;
const SPELL_RELEASE_DELAYS = {
  fire: 0.34,
  lightning: 0.26,
  frost: 0.28,
};
const LIGHTNING_IMPACT_ANIM = "lightning-impact-fx";
const LIGHTNING_IMPACT_FRAMES = Array.from({ length: 8 }, (_, frame) => frame);
const FROST_AREA_ANIM = "frost-area-fx";
const FROST_AREA_FRAMES = Array.from({ length: 6 }, (_, frame) => frame);
const SKELETON_WALK_ANIM = "skeleton-walk";
const SKELETON_WALK_FRAMES = Array.from({ length: 8 }, (_, frame) => frame);
const USE_CONCEPT_ENEMY_SPRITES = true;
const CONCEPT_ENEMY_TEXTURES = {
  skeleton: "enemySkeletonWalk",
  zombie: "enemyZombieConcept",
  ghoul: "enemyGhoulConcept",
  ogre: "enemyOgreConcept",
};
const CONCEPT_ENEMY_HEIGHTS = {
  skeleton: 72,
  zombie: 94,
  ghoul: 86,
  ogre: 162,
};

function applyStartFocus(focus, player, spells) {
  if (focus === "storm") {
    spells.chainTargets += 1;
    player.maxMana -= 8;
    player.mana = Math.min(player.mana, player.maxMana);
    return "Sturmleiter";
  }
  if (focus === "staff") {
    spells.meleeManaMultiplier += 0.15;
    spells.spells.fire.cooldown += 0.7;
    return "Kampfmagier";
  }
  spells.fireDamageMultiplier *= 1.12;
  spells.fireKnockbackMultiplier *= 1.08;
  spells.spells.fire.manaCost += 8;
  return "Pyromantisch";
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data) {
    this.startFocus = data?.startFocus ?? "pyromantic";
    this.startSection = data?.startSection ?? 1;
  }

  create() {
    this.section = this.startSection;
    this.player = createPlayer();
    this.spells = createSpellState();
    this.waves = createWaveSystem(this.section);
    this.enemies = [];
    this.pickups = [];
    this.effects = [];
    this.floatTexts = [];
    this.kills = 0;
    this.score = 0;
    this.gold = 0;
    this.cardsPicked = 0;
    this.pausedForCard = false;
    this.pausedForMenu = false;
    this.pausedForSection = false;
    this.pauseOverlay = null;
    this.nextCardAt = this.section === 1 ? 60 : 45;
    this.gameOver = false;
    this.victory = false;
    this.debugView = false;
    this.staffAttackAnimTimer = 0;
    this.castAnimTimer = 0;
    this.pendingSpellReleases = [];
    this.aimPoint = { x: this.player.x + 240, y: this.player.y };
    this.usingMouseAim = false;
    this.restartCastAnim = false;
    this.runFocusLabel = applyStartFocus(this.startFocus, this.player, this.spells);

    this.createInput();
    this.createWorld();
    createPlayerAnimations(this);
    createEnemyAnimations(this);
    createFxAnimations(this);
    this.playerLayer = this.add.graphics().setDepth(29);
    this.mageTextureKey = USE_CONCEPT_PLAYER_SPRITE ? CONCEPT_PLAYER_IDLE_TEXTURE : "mage";
    this.mage = this.add.sprite(this.player.x, this.player.y - 42, this.mageTextureKey).setDepth(30);
    applyPlayerSpritePose(this.mage, this.player, this.mageTextureKey);
    this.enemySprites = new Map();
    this.hud = createHud(this);
    this.addFloatText(`Fokus: ${this.runFocusLabel}`, 640, 164, "#f3d69d");
    if (this.section > 1) this.addFloatText(`Abschnitt ${this.section}: ${this.waves.sectionShortTitle}`, 640, 194, "#d8b976");
  }

  createInput() {
    this.heldKeys = new Set();
    this.pressedKeys = new Set();
    this.input.mouse?.disableContextMenu();
    this.onKeyDown = (event) => {
      const key = normalizeKey(event.key);
      if (isGameKey(key)) event.preventDefault();
      if (key === "escape") {
        event.preventDefault();
        if (event.repeat) return;
        this.togglePauseMenu();
        return;
      }
      if (!event.repeat) this.pressedKeys.add(key);
      this.heldKeys.add(key);
    };
    this.onKeyUp = (event) => {
      this.heldKeys.delete(normalizeKey(event.key));
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.input.on("pointerdown", this.onPointerDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
      this.input.off("pointerdown", this.onPointerDown, this);
    });
    this.inputState = { up: false, left: false, down: false, right: false, dash: false };
  }

  onPointerDown(pointer) {
    if (this.pausedForCard || this.pausedForMenu || this.pausedForSection || this.gameOver) return;
    if (pointer.leftButtonDown()) this.pressedKeys.add("mouseleft");
    if (pointer.rightButtonDown()) this.pressedKeys.add("mouseright");
  }

  createWorld() {
    this.bgImage = this.add.image(640, 360, "blackhavenBackgroundConcept").setDepth(-2);
    this.bgImage.setDisplaySize(this.scale.width, this.scale.height);
    this.bgImage.setAlpha(this.section === 1 ? 0.68 : 0);
    this.churchyardImage = this.add.image(640, 360, "blackhavenChurchyardConcept").setDepth(-2);
    fitImageCover(this.churchyardImage, this.scale.width, this.scale.height);
    this.churchyardImage.setAlpha(0);
    this.forestImage = this.add.image(640, 360, "blackhavenForestConcept").setDepth(-2);
    fitImageCover(this.forestImage, this.scale.width, this.scale.height);
    this.forestImage.setAlpha(0);
    this.bgVeil = this.add.graphics().setDepth(-1);
    this.bg = this.add.graphics().setDepth(0);
    this.groundImage = this.add.image(640, 628, "blackhavenGroundConcept").setDepth(17);
    this.groundImage.setDisplaySize(this.scale.width, 228);
    this.groundImage.setAlpha(this.section === 1 ? 0.72 : 0);
    this.churchyardGroundImage = this.add.image(640, 628, "blackhavenChurchyardGroundConcept").setDepth(17);
    this.churchyardGroundImage.setDisplaySize(this.scale.width, 228);
    this.churchyardGroundImage.setAlpha(0);
    this.forestGroundImage = this.add.image(640, 628, "blackhavenForestGroundConcept").setDepth(17);
    this.forestGroundImage.setDisplaySize(this.scale.width, 228);
    this.forestGroundImage.setAlpha(0);
    this.previewLayer = this.add.graphics().setDepth(6);
    this.warningLayer = this.add.graphics().setDepth(12);
    this.ground = this.add.graphics().setDepth(18);
    this.activeInfoLayer = this.add.graphics().setDepth(58);
    this.pickupLayer = this.add.graphics().setDepth(27);
    this.fxLayer = this.add.graphics().setDepth(60);
    this.drawSectionBackdrop();
  }

  drawSectionBackdrop() {
    this.bg.clear();
    this.bgVeil.clear();
    this.bgImage.setAlpha(this.section === 1 ? 0.68 : 0);
    this.churchyardImage.setAlpha(this.section === 2 ? 0.72 : 0);
    this.forestImage.setAlpha(this.section === 3 ? 0.74 : 0);
    this.groundImage.setAlpha(this.section === 1 ? 0.72 : 0);
    this.churchyardGroundImage.setAlpha(this.section === 2 ? 0.86 : 0);
    this.forestGroundImage.setAlpha(this.section === 3 ? 0.86 : 0);
    drawWorld(this.bg, this.scale.width, this.scale.height, this.section, this.section === 1);
    if (this.section === 1) {
      drawBackgroundConceptVeil(this.bgVeil, this.scale.width, this.scale.height);
    } else if (this.section === 2) {
      drawChurchyardConceptVeil(this.bgVeil, this.scale.width, this.scale.height);
    } else if (this.section === 3) {
      drawForestConceptVeil(this.bgVeil, this.scale.width, this.scale.height);
    }
  }

  update(_, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.033);
    if (this.pausedForCard || this.pausedForMenu || this.pausedForSection || this.gameOver) return;

    this.readInput();
    updatePlayer(this.player, this.inputState, dt, BOUNDS);
    this.updateMouseAim();
    updateSpellCooldowns(this.spells, dt);
    this.staffAttackAnimTimer = Math.max(0, this.staffAttackAnimTimer - dt);
    this.castAnimTimer = Math.max(0, this.castAnimTimer - dt);
    this.updatePendingSpellReleases(dt);
    updateWaves(this.waves, dt, (type, x, y, options) => {
      const enemy = createEnemy(type, x, y, options);
      this.enemies.push(enemy);
      return enemy;
    });
    updateEnemies(this.enemies, this.player, dt, (amount) => this.hitPlayer(amount));

    this.handleActions();
    this.cleanupDeadEnemies();
    this.updatePickups(dt);
    this.checkRunEnd();
    this.updateEffects(dt);
    this.renderWorld();
    this.renderActors();
    this.checkCards();
    this.drawUi();
  }

  readInput() {
    this.inputState.up = this.heldKeys.has("w") || this.heldKeys.has("arrowup");
    this.inputState.left = this.heldKeys.has("a") || this.heldKeys.has("arrowleft");
    this.inputState.down = this.heldKeys.has("s") || this.heldKeys.has("arrowdown");
    this.inputState.right = this.heldKeys.has("d") || this.heldKeys.has("arrowright");
    this.inputState.dash = this.consumePressed(" ") || this.consumePressed("shift");
    if (this.consumePressed("f1")) this.debugView = !this.debugView;
  }

  handleActions() {
    if ((this.consumePressed("j") || this.consumePressed("mouseleft")) && canMelee(this.player)) {
      this.faceAim();
      const attack = performMelee(this.player);
      this.staffAttackAnimTimer = CONCEPT_PLAYER_STAFF_VISUAL_DURATION;
      this.restartStaffAttackAnim = true;
      if (attack.shape === "shockwave" && this.spells.traits.staffFinisherWave > 0) {
        attack.radius *= 1 + this.spells.traits.staffFinisherWave;
        attack.damage *= 1 + this.spells.traits.staffFinisherWave * 0.35;
      }
      let hits = 0;
      let manaHits = 0;
      for (const enemy of this.enemies) {
        if (staffAttackHits(attack, enemy)) {
          hits += 1;
          manaHits += manaHits < attack.manaHitCap ? 1 : 0;
          damageEnemy(enemy, getStaffDamage(enemy, attack.damage, this.spells), "staff");
          const entryFactor = enemy.entryStability > 0 ? 0.45 : 1;
          knockEnemy(enemy, attack.originX, attack.originY, attack.knockback * entryFactor);
          if (attack.stagger) staggerEnemy(enemy, attack.stagger * entryFactor);
          if (this.spells.traits.brittleIceShatterDamage > 0 && (enemy.slow > 0 || enemy.freeze > 0)) {
            this.applyBrittleIceShatter(enemy, this.spells.traits.brittleIceShatterDamage);
          }
        }
      }
      if (hits > 0) {
        const comboBonus = attack.comboStep === 3 ? this.spells.traits.fullStaffComboMana : 0;
        const gainedMana = (attack.manaGain * manaHits + attack.bonusManaOnHit + comboBonus) * this.spells.meleeManaMultiplier;
        this.player.mana = Math.min(this.player.maxMana, this.player.mana + gainedMana);
        if (attack.comboStep === 3 && this.spells.traits.nextSpellDiscountOnFullCombo > 0) {
          this.spells.nextSpellCostMultiplier = Math.min(this.spells.nextSpellCostMultiplier, 1 - this.spells.traits.nextSpellDiscountOnFullCombo);
        }
        if (this.spells.traits.staffDiscipline > 0) {
          reduceLastSpellCooldown(this.spells, Math.min(hits, 3) * this.spells.traits.staffDiscipline);
        }
      }
      this.effects.push({ kind: "staff", ...attack, hit: hits > 0, t: attack.attackDuration, max: attack.attackDuration });
    }

    if (this.consumePressed("1") || this.consumePressed("mouseright")) this.consumeSpell(castFireball(this.player, this.enemies, this.spells, this.getAimPoint()));
    if (this.consumePressed("2") || this.consumePressed("q")) this.consumeSpell(castLightning(this.player, this.enemies, this.spells, this.getAimPoint()));
    if (this.consumePressed("3") || this.consumePressed("e")) this.consumeSpell(castFrost(this.player, this.enemies, this.spells, this.getAimPoint()));
  }

  updateMouseAim() {
    const pointer = this.input.activePointer;
    if (!pointer) return;
    const x = pointer.worldX ?? pointer.x;
    const y = pointer.worldY ?? pointer.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < 0 || x > this.scale.width || y < 0 || y > this.scale.height) return;
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    this.usingMouseAim = Math.hypot(dx, dy) > 34;
    if (!this.usingMouseAim) return;
    this.aimPoint.x = Phaser.Math.Clamp(x, BOUNDS.left, BOUNDS.right + 190);
    this.aimPoint.y = Phaser.Math.Clamp(y, BOUNDS.top - 80, BOUNDS.bottom + 40);
    if (Math.abs(dx) > 18) this.player.facing = Math.sign(dx);
  }

  getAimPoint() {
    this.faceAim();
    return this.usingMouseAim ? this.aimPoint : null;
  }

  faceAim() {
    if (!this.usingMouseAim) return;
    const dx = this.aimPoint.x - this.player.x;
    if (Math.abs(dx) > 18) this.player.facing = Math.sign(dx);
  }

  consumePressed(key) {
    if (!this.pressedKeys.has(key)) return false;
    this.pressedKeys.delete(key);
    return true;
  }

  consumeSpell(result) {
    if (!result) {
      this.cameras.main.shake(80, 0.002);
      return;
    }
    this.castAnimTimer = CONCEPT_PLAYER_CAST_DURATION;
    this.restartCastAnim = true;
    this.pendingSpellReleases.push({
      result,
      delay: SPELL_RELEASE_DELAYS[result.kind] ?? 0.25,
    });
  }

  updatePendingSpellReleases(dt) {
    if (this.pendingSpellReleases.length === 0) return;
    const remaining = [];
    for (const pending of this.pendingSpellReleases) {
      pending.delay -= dt;
      if (pending.delay <= 0) {
        this.releaseSpellEffect(pending.result);
      } else {
        remaining.push(pending);
      }
    }
    this.pendingSpellReleases = remaining;
  }

  releaseSpellEffect(result) {
    if (result.kind === "fire") {
      this.launchFireProjectile(result.impact);
      this.effects.push({ kind: "fire", ...result.impact, delay: FIRE_PROJECTILE_TRAVEL_TIME * 0.72, t: 0.42, max: 0.42 });
      this.effects.push({ kind: "fireBurst", ...result.impact, delay: FIRE_PROJECTILE_TRAVEL_TIME * 0.86, t: 0.55, max: 0.55 });
      this.cameras.main.shake(130, 0.006);
    }
    if (result.kind === "lightning") {
      const targets = result.targets.map((e) => ({ x: e.x, y: e.y, r: e.radius }));
      this.launchLightningImpacts(result.start, targets);
      this.effects.push({ kind: "lightning", start: result.start, targets, t: 0.32, max: 0.32 });
      this.effects.push({ kind: "lightningBurst", start: result.start, targets, t: 0.34, max: 0.34 });
      this.cameras.main.shake(95, 0.004);
    }
    if (result.kind === "frost") {
      this.launchFrostArea(result.cone);
      this.effects.push({ kind: "frost", ...result.cone, t: 0.42, max: 0.42 });
      this.effects.push({ kind: "frostBloom", ...result.cone, t: 0.72, max: 0.72 });
    }
  }

  hitPlayer(amount) {
    if (this.player.invulnerable > 0) return;
    const stanceReduction = this.player.inStaffCombo ? this.spells.traits.staffComboDamageReduction : 0;
    this.player.hp -= amount * (1 - stanceReduction);
    this.player.invulnerable = 0.18;
    this.cameras.main.shake(90, 0.004);
    if (this.player.hp <= 0) this.endRun();
  }

  cleanupDeadEnemies() {
    const alive = [];
    for (const enemy of this.enemies) {
      if (enemy.hp > 0) {
        alive.push(enemy);
      } else {
        this.kills += 1;
        this.score += enemy.score;
        this.gold += getGoldValue(enemy);
        this.maybeDropHealth(enemy);
        if (enemy.isBoss) markBossDefeated(this.waves);
        const sprite = this.enemySprites.get(enemy);
        if (sprite) sprite.destroy();
        this.enemySprites.delete(enemy);
      }
    }
    this.enemies = alive;
  }

  maybeDropHealth(enemy) {
    if (enemy.state !== "active") return;
    const chance = enemy.isBoss ? 1 : enemy.type === "ogre" ? 0.38 : enemy.type === "ghoul" ? 0.08 : enemy.type === "zombie" ? 0.07 : 0.045;
    if (Math.random() > chance) return;
    const healPct = enemy.isBoss ? 0.28 : enemy.type === "ogre" ? 0.23 : 0.17 + Math.random() * 0.05;
    const position = getReachablePickupPosition(enemy.x, enemy.y, this.player);
    this.pickups.push({
      kind: "health",
      x: position.x,
      y: position.y,
      moved: position.moved,
      radius: 18,
      heal: Math.round(this.player.maxHp * healPct),
      ttl: enemy.isBoss ? 16 : 12,
      maxTtl: enemy.isBoss ? 16 : 12,
      pulse: Math.random() * 10,
    });
  }

  updatePickups(dt) {
    for (const pickup of this.pickups) {
      pickup.ttl -= dt;
      pickup.pulse += dt * 4;
      if (distance(this.player, pickup) < this.player.radius + pickup.radius) {
        const before = this.player.hp;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + pickup.heal);
        const healed = Math.round(this.player.hp - before);
        if (healed > 0) {
          this.effects.push({ kind: "heal", x: pickup.x, y: pickup.y, radius: 58, t: 0.5, max: 0.5 });
          this.addFloatText(`+${healed} HP`, pickup.x, pickup.y - 32, "#bdf6c8");
        }
        pickup.dead = true;
      }
    }
    this.pickups = this.pickups.filter((pickup) => pickup.ttl > 0 && !pickup.dead);
  }

  addFloatText(label, x, y, color) {
    const text = this.add.text(x, y, label, {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color,
      stroke: "#071009",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1200);
    this.floatTexts.push({ text, t: 0.9, max: 0.9, y });
  }

  checkRunEnd() {
    if (!this.waves.bossDefeated || this.victory) return;
    if (this.section < 3) {
      this.showSectionClear();
      return;
    }
    this.victory = true;
    this.showRunSummary("victory");
  }

  applyBrittleIceShatter(source, damage) {
    for (const enemy of this.enemies) {
      if (enemy === source || enemy.hp <= 0) continue;
      if (distance(source, enemy) < 74 + enemy.radius) {
        damageEnemy(enemy, damage, "frost");
        enemy.slow = Math.max(enemy.slow, 0.65);
      }
    }
    this.effects.push({ kind: "shatter", x: source.x, y: source.y, radius: 76, t: 0.22, max: 0.22 });
    this.emitIceShards(source.x, source.y - source.radius * 0.25, 12);
  }

  updateEffects(dt) {
    for (const effect of this.effects) {
      if (effect.delay > 0) {
        effect.delay -= dt;
        continue;
      }
      effect.t -= dt;
    }
    this.effects = this.effects.filter((effect) => effect.delay > 0 || effect.t > 0);
    for (const item of this.floatTexts) {
      item.t -= dt;
      item.text.setY(item.y - (1 - item.t / item.max) * 28);
      item.text.setAlpha(Math.max(0, item.t / item.max));
      if (item.t <= 0) item.text.destroy();
    }
    this.floatTexts = this.floatTexts.filter((item) => item.t > 0);
  }

  renderWorld() {
    this.previewLayer.clear();
    this.warningLayer.clear();
    this.ground.clear();
    this.activeInfoLayer.clear();
    this.pickupLayer.clear();
    drawGround(this.ground, this.section);
    drawZoneGuides(this.ground, this.debugView);
    drawPickups(this.pickupLayer, this.pickups, this.debugView);

    for (const item of this.waves.preview) {
      const progress = Phaser.Math.Clamp(1 - item.depth / 680, 0, 1);
      const warningProgress = Phaser.Math.Clamp((progress - 0.56) / 0.44, 0, 1);
      const isWarning = progress >= 0.56;
      const x = isWarning
        ? Phaser.Math.Linear(950, 795, warningProgress)
        : Phaser.Math.Linear(1190, 960, progress / 0.56);
      const y = item.y - (isWarning ? 30 * (1 - progress) : 105 * (1 - progress));
      const scale = item.scale * (isWarning
        ? Phaser.Math.Linear(0.94, 1.22, warningProgress)
        : Phaser.Math.Linear(0.48, 0.84, progress / 0.56));
      if (!isWarning) {
        drawPreviewSilhouette(this.previewLayer, item.type, x + Math.sin(item.wobble * 2) * 5, y, scale, 0.42, "background");
      } else {
        drawPreviewSilhouette(this.warningLayer, item.type, x + Math.sin(item.wobble * 3) * 3, y, scale, 0.7, "warning");
      }
    }

    for (const flank of this.waves.flankWarnings) {
      drawFlankWarning(this.warningLayer, flank);
    }
  }

  renderActors() {
    this.playerLayer.clear();
    drawAimGuide(this.playerLayer, this.player, this.aimPoint, this.usingMouseAim, this.time.now);
    drawPlayerReadability(this.playerLayer, this.player, this.time.now);
    updatePlayerSpriteAnimation(this, this.mage, this.inputState, this.mageTextureKey, this.player, this.restartStaffAttackAnim, this.staffAttackAnimTimer, this.castAnimTimer, this.restartCastAnim);
    this.restartStaffAttackAnim = false;
    this.restartCastAnim = false;
    applyPlayerSpritePose(this.mage, this.player, this.mage.texture.key);
    this.mage.setFlipX(this.player.facing < 0);
    this.mage.setAlpha(this.player.invulnerable > 0 ? 0.65 : 1);

    for (const enemy of this.enemies) {
      const textureKey = getEnemyTextureKey(this, enemy.type);
      let sprite = this.enemySprites.get(enemy);
      if (!sprite) {
        sprite = this.add.sprite(enemy.x, enemy.y, textureKey).setDepth(24);
        this.enemySprites.set(enemy, sprite);
      }
      if (sprite.texture.key !== textureKey) sprite.setTexture(textureKey);
      if (enemy.type === "skeleton" && sprite.anims.currentAnim?.key !== SKELETON_WALK_ANIM) {
        sprite.anims.play(SKELETON_WALK_ANIM, true);
      }
      const recoilLift = enemy.recoil > 0 ? Math.sin(enemy.recoil * 55) * 5 : 0;
      const usesConceptSprite = isConceptEnemyTexture(textureKey);
      applyEnemySpritePose(sprite, enemy, textureKey, usesConceptSprite, recoilLift);
      sprite.setDepth(20 + enemy.y * 0.02);
      sprite.setTint(getEnemyTint(enemy));
      sprite.setAlpha(1);
      drawActiveEnemyReadability(this.activeInfoLayer, enemy);
      drawActiveEnemyOverlay(this.activeInfoLayer, enemy, this.debugView);
      drawEnemyTelegraph(this.activeInfoLayer, enemy);
    }

    this.drawEffects();
  }

  drawEffects() {
    this.fxLayer.clear();
    for (const effect of this.effects) {
      if (effect.delay > 0) continue;
      const p = effect.t / effect.max;
      if (effect.kind === "fire") {
        const dir = Math.sign(effect.x - this.player.x) || this.player.facing || 1;
        drawFireCone(this.fxLayer, effect.x - dir * 120, effect.y, dir, effect.radius, 0.28 * p);
        this.fxLayer.fillStyle(0xff6226, 0.18 * p);
        this.fxLayer.fillCircle(effect.x, effect.y, effect.radius * (0.92 - p * 0.16));
        this.fxLayer.lineStyle(6, 0xffd174, 0.95 * p);
        this.fxLayer.strokeCircle(effect.x, effect.y, effect.radius * (1.08 - p * 0.2));
        this.fxLayer.lineStyle(2, 0xffa24a, 0.72 * p);
        for (let i = 0; i < 12; i += 1) {
          const a = (i / 12) * Math.PI * 2;
          const inner = effect.radius * 0.32;
          const outer = effect.radius * (1.05 - p * 0.22);
          this.fxLayer.lineBetween(
            effect.x + Math.cos(a) * inner,
            effect.y + Math.sin(a) * inner,
            effect.x + Math.cos(a) * outer,
            effect.y + Math.sin(a) * outer,
          );
        }
      }
      if (effect.kind === "fireBurst") {
        const q = 1 - p;
        const dir = Math.sign(effect.x - this.player.x) || this.player.facing || 1;
        this.fxLayer.fillStyle(0xff5b19, 0.22 * p);
        drawWideSpellCone(this.fxLayer, effect.x - dir * 160, effect.y, dir, effect.radius * (1.35 + q * 0.25), 0xff6d1f, 0.26 * p);
        this.fxLayer.fillStyle(0xffd16d, 0.14 * p);
        this.fxLayer.fillEllipse(effect.x - dir * effect.radius * 0.1, effect.y + 6, effect.radius * (1.1 + q * 0.55), effect.radius * (0.42 + q * 0.2));
        this.fxLayer.lineStyle(14, 0xffb23f, 0.52 * p);
        this.fxLayer.strokeCircle(effect.x, effect.y, effect.radius * (0.58 + q * 0.82));
        this.fxLayer.lineStyle(4, 0xfff0a6, 0.92 * p);
        this.fxLayer.strokeCircle(effect.x, effect.y, effect.radius * (0.36 + q * 1.05));
        for (let i = 0; i < 18; i += 1) {
          const a = (i / 18) * Math.PI * 2 + q * 0.45;
          const inner = effect.radius * (0.14 + q * 0.3);
          const outer = effect.radius * (0.74 + q * 0.98);
          this.fxLayer.lineStyle(i % 3 === 0 ? 5 : 2, i % 3 === 0 ? 0xfff0a6 : 0xff7a24, (0.86 - i * 0.018) * p);
          this.fxLayer.lineBetween(
            effect.x + Math.cos(a) * inner,
            effect.y + Math.sin(a) * inner * 0.72,
            effect.x + Math.cos(a) * outer,
            effect.y + Math.sin(a) * outer * 0.72,
          );
        }
        drawHeatRakes(this.fxLayer, effect.x, effect.y, dir, effect.radius, q, p);
      }
      if (effect.kind === "staff") {
        drawStaffEffect(this.fxLayer, effect, p, this.debugView);
      }
      if (effect.kind === "frost") {
        const dir = Math.sign(effect.x - this.player.x) || this.player.facing || 1;
        drawFrostCone(this.fxLayer, effect.x - dir * 72, effect.y, dir, effect.radius, 0.18 * p);
        this.fxLayer.fillStyle(0x9be7ff, 0.1 * p);
        this.fxLayer.fillCircle(effect.x, effect.y, effect.radius);
        this.fxLayer.lineStyle(3, 0xcaf7ff, 0.8 * p);
        this.fxLayer.strokeCircle(effect.x, effect.y, effect.radius * (1.1 - p * 0.2));
      }
      if (effect.kind === "frostBloom") {
        const q = 1 - p;
        this.fxLayer.fillStyle(0x80dfff, 0.11 * p);
        this.fxLayer.fillEllipse(effect.x, effect.y - 10, effect.radius * (1.55 + q * 1.05), effect.radius * (0.48 + q * 0.38));
        this.fxLayer.lineStyle(9, 0xaeefff, 0.36 * p);
        this.fxLayer.strokeEllipse(effect.x, effect.y - 8, effect.radius * (1.26 + q * 1.25), effect.radius * (0.42 + q * 0.5));
        this.fxLayer.lineStyle(3, 0xf1fdff, 0.86 * p);
        this.fxLayer.strokeEllipse(effect.x, effect.y - 8, effect.radius * (0.7 + q * 1.48), effect.radius * (0.22 + q * 0.62));
        drawFrostCracks(this.fxLayer, effect.x, effect.y - 8, effect.radius, q, p);
        for (let i = 0; i < 14; i += 1) {
          const a = (i / 14) * Math.PI * 2;
          const cx = effect.x + Math.cos(a) * effect.radius * (0.42 + q * 0.72);
          const cy = effect.y - 12 + Math.sin(a) * effect.radius * (0.14 + q * 0.28);
          drawSnowStar(this.fxLayer, cx, cy, 5 + (i % 3) * 2 + q * 3, 0xdffaff, 0.72 * p);
        }
      }
      if (effect.kind === "shatter") {
        this.fxLayer.fillStyle(0xa9edff, 0.12 * p);
        this.fxLayer.fillCircle(effect.x, effect.y, effect.radius);
        this.fxLayer.lineStyle(2, 0xd9fbff, 0.75 * p);
        this.fxLayer.strokeCircle(effect.x, effect.y, effect.radius * (1 - p * 0.25));
      }
      if (effect.kind === "heal") {
        this.fxLayer.fillStyle(0x9df7b2, 0.14 * p);
        this.fxLayer.fillCircle(effect.x, effect.y, effect.radius * (1.1 - p * 0.25));
        this.fxLayer.lineStyle(3, 0xcfffd7, 0.85 * p);
        this.fxLayer.strokeCircle(effect.x, effect.y, effect.radius * (1 - p * 0.2));
      }
      if (effect.kind === "lightning") {
        const jitter = Math.floor(this.time.now / 42) % 5;
        this.fxLayer.lineStyle(16, 0x1f3f83, 0.26 * p);
        drawLightningChain(this.fxLayer, effect.start, effect.targets, 30 + jitter * 3);
        this.fxLayer.lineStyle(12, 0x294f8f, 0.48 * p);
        drawLightningChain(this.fxLayer, effect.start, effect.targets, 18 - jitter * 2);
        this.fxLayer.lineStyle(6, 0x97dcff, 0.98 * p);
        drawJaggedLightningChain(this.fxLayer, effect.start, effect.targets, 0, jitter);
        this.fxLayer.lineStyle(1, 0xffffff, 0.95 * p);
        drawJaggedLightningChain(this.fxLayer, effect.start, effect.targets, -12, jitter + 2);
        drawLightningImpacts(this.fxLayer, effect.targets, p);
      }
      if (effect.kind === "lightningBurst") {
        const q = 1 - p;
        const jitter = Math.floor(this.time.now / 35) % 7;
        this.fxLayer.lineStyle(18, 0x356dff, 0.22 * p);
        drawJaggedLightningChain(this.fxLayer, effect.start, effect.targets, 42, jitter);
        this.fxLayer.lineStyle(9, 0x9be7ff, 0.72 * p);
        drawJaggedLightningChain(this.fxLayer, effect.start, effect.targets, -28, jitter + 3);
        this.fxLayer.lineStyle(3, 0xffffff, 0.95 * p);
        drawJaggedLightningChain(this.fxLayer, effect.start, effect.targets, 14, jitter + 5);
        for (const target of effect.targets) {
          this.fxLayer.fillStyle(0x8deaff, 0.18 * p);
          this.fxLayer.fillCircle(target.x, target.y - target.r * 0.35, target.r * (1.1 + q * 1.2));
          drawElectricStar(this.fxLayer, target.x, target.y - target.r * 0.35, target.r * (1.1 + q * 1.7), p);
        }
      }
    }
  }

  launchFireProjectile(impact) {
    if (!this.textures.exists("fireProjectileFx")) return;
    const dir = Math.sign(impact.x - this.player.x) || this.player.facing || 1;
    const startX = this.player.x + dir * 44;
    const startY = this.player.y - 34;
    const endX = impact.x - dir * Math.min(72, impact.radius * 0.42);
    const endY = impact.y - 22;
    const sprite = this.add.sprite(startX, startY, "fireProjectileFx").setDepth(62);
    sprite.setFlipX(dir < 0);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.setAlpha(0.95);
    sprite.setDisplaySize(impact.radius * 1.8, impact.radius * 1.02);
    sprite.anims.play(FIRE_PROJECTILE_ANIM, true);
    const trail = this.createFireTrail(sprite);
    this.tweens.add({
      targets: sprite,
      x: endX,
      y: endY,
      alpha: 0.25,
      duration: FIRE_PROJECTILE_TRAVEL_TIME * 1000,
      ease: "Cubic.easeOut",
      onComplete: () => {
        trail?.destroy();
        this.emitFireExplosion(endX, endY, impact.radius);
        sprite.destroy();
      },
    });
  }

  launchLightningImpacts(start, targets) {
    if (!this.textures.exists("lightningImpactFx")) return;
    let previous = start;
    for (const target of targets) {
      const dir = Math.sign(target.x - previous.x) || 1;
      const sprite = this.add.sprite(target.x, target.y - target.r * 0.35, "lightningImpactFx").setDepth(63);
      sprite.setOrigin(0.2, 0.5);
      sprite.setFlipX(dir < 0);
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setAlpha(0.94);
      const scale = Phaser.Math.Clamp(target.r / 22, 0.72, 1.25);
      sprite.setDisplaySize(150 * scale, 98 * scale);
      sprite.setAngle(Phaser.Math.Between(-8, 8));
      sprite.anims.play(LIGHTNING_IMPACT_ANIM, true);
      this.emitLightningSparks(target.x, target.y - target.r * 0.35, 10);
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: 240,
        delay: 95,
        ease: "Quad.easeIn",
        onComplete: () => sprite.destroy(),
      });
      previous = target;
    }
  }

  launchFrostArea(cone) {
    if (!this.textures.exists("frostAreaFx")) return;
    const sprite = this.add.sprite(cone.x, cone.y - 20, "frostAreaFx").setDepth(61);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.setAlpha(0.88);
    sprite.setDisplaySize(cone.radius * 2.18, cone.radius * 1.22);
    sprite.anims.play(FROST_AREA_ANIM, true);
    this.emitFrostMist(cone.x, cone.y, cone.radius);
    this.emitIceShards(cone.x, cone.y - 18, 10);
    this.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: 460,
      delay: 210,
      ease: "Quad.easeIn",
      onComplete: () => sprite.destroy(),
    });
  }

  createFireTrail(sprite) {
    if (!this.textures.exists("fireball")) return null;
    const trail = this.add.particles(0, 0, "fireball", {
      lifespan: { min: 180, max: 340 },
      speed: { min: 22, max: 78 },
      scale: { start: 0.42, end: 0 },
      alpha: { start: 0.92, end: 0 },
      frequency: 10,
      quantity: 2,
      tint: [0xffd16d, 0xff7a2a, 0x7b3b24],
      blendMode: Phaser.BlendModes.ADD,
      emitting: true,
    }).setDepth(61);
    trail.startFollow(sprite, -18, 0);
    return trail;
  }

  emitFireExplosion(x, y, radius) {
    if (!this.textures.exists("fireball")) return;
    this.createImpactFlash(x, y, radius * 1.55, 0xff7a24, 0.32, 260, 66);
    const burst = this.add.particles(x, y, "fireball", {
      lifespan: { min: 420, max: 760 },
      speed: { min: 150, max: 340 },
      angle: { min: 0, max: 360 },
      gravityY: 115,
      scale: { start: 0.62, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 34,
      maxParticles: 40,
      tint: [0xfff0a6, 0xff8a2d, 0x6e4637],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).setDepth(64);
    burst.explode(Phaser.Math.Clamp(Math.round(radius / 5), 26, 40), x, y);
    this.time.delayedCall(820, () => burst.destroy());
  }

  emitLightningSparks(x, y, count = 10) {
    if (!this.textures.exists("lightning")) return;
    this.createImpactFlash(x, y, 78, 0x8deaff, 0.28, 150, 67);
    const sparks = this.add.particles(x, y, "lightning", {
      lifespan: { min: 180, max: 330 },
      speed: { min: 170, max: 360 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: count + 8,
      maxParticles: count + 8,
      tint: [0xffffff, 0x9be7ff, 0x4aa8ff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).setDepth(65);
    sparks.explode(count + 8, x, y);
    this.time.delayedCall(380, () => sparks.destroy());
  }

  emitFrostMist(x, y, radius) {
    if (!this.textures.exists("frostRing")) return;
    this.createImpactFlash(x, y - 12, radius * 1.25, 0x8edfff, 0.22, 420, 60);
    const mist = this.add.particles(x, y - 12, "frostRing", {
      lifespan: { min: 720, max: 1120 },
      speed: { min: 18, max: 58 },
      angle: { min: 190, max: 350 },
      radial: false,
      gravityY: -18,
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Ellipse(0, 0, radius * 1.45, radius * 0.58),
      },
      scale: { start: 0.22, end: 0.62 },
      alpha: { start: 0.46, end: 0 },
      quantity: 24,
      maxParticles: 28,
      tint: [0xcdf7ff, 0x84d7ff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).setDepth(60);
    mist.explode(24, x, y - 12);
    this.time.delayedCall(1180, () => mist.destroy());
  }

  emitIceShards(x, y, count = 10) {
    if (!this.textures.exists("frostRing")) return;
    const shards = this.add.particles(x, y, "frostRing", {
      lifespan: { min: 240, max: 480 },
      speed: { min: 70, max: 170 },
      angle: { min: 205, max: 335 },
      gravityY: 35,
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.82, end: 0 },
      quantity: count,
      maxParticles: count,
      tint: [0xffffff, 0xaeefff, 0x6bbdff],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).setDepth(64);
    shards.explode(count, x, y);
    this.time.delayedCall(560, () => shards.destroy());
  }

  createImpactFlash(x, y, radius, color, alpha, duration, depth) {
    const flash = this.add.graphics().setDepth(depth);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.fillStyle(color, alpha);
    flash.fillCircle(x, y, radius * 0.22);
    flash.lineStyle(3, color, alpha * 1.2);
    flash.strokeCircle(x, y, radius * 0.36);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: "Quad.easeOut",
      onUpdate: (tween) => {
        const p = tween.progress;
        flash.clear();
        flash.fillStyle(color, alpha * (1 - p));
        flash.fillCircle(x, y, radius * (0.22 + p * 0.22));
        flash.lineStyle(4, color, alpha * (1 - p));
        flash.strokeCircle(x, y, radius * (0.36 + p * 0.58));
      },
      onComplete: () => flash.destroy(),
    });
  }

  checkCards() {
    if (this.waves.time >= this.nextCardAt) {
      this.pausedForCard = true;
      this.pendingSpellReleases = [];
      this.pressedKeys.clear();
      const cards = getCardChoices();
      createCardOverlay(this, cards, (card) => {
        card.apply(this.spells);
        this.cardsPicked += 1;
        this.nextCardAt += 60;
        this.pressedKeys.clear();
        this.pausedForCard = false;
      });
    }
  }

  drawUi() {
    const boss = this.enemies.find((enemy) => enemy.isBoss);
    drawHud(this.hud, {
      hp: Math.max(0, this.player.hp),
      maxHp: this.player.maxHp,
      mana: this.player.mana,
      maxMana: this.player.maxMana,
      gold: this.gold,
      wave: this.waves.wave,
      time: this.waves.time,
      phaseName: this.waves.phaseName,
      phaseEndsAt: this.waves.phaseEndsAt,
      boss: boss ? { hp: boss.hp, maxHp: boss.maxHp, name: boss.name } : null,
      previewPressure: this.waves.preview.length,
      ogreIncoming: this.waves.preview.some((item) => item.type === "ogre") || this.enemies.some((enemy) => enemy.type === "ogre" && enemy.x > 730),
      bossIncoming: this.waves.preview.some((item) => item.isBoss) || this.enemies.some((enemy) => enemy.isBoss),
      flankIncoming: this.waves.flankWarnings.length > 0,
      skills: getSkillbarState(this.spells, this.player),
      staff: {
        hotkey: "LMB/J",
        label: `Stab ${this.player.comboIndex + 1}`,
        canCast: this.player.staffCooldown <= 0,
        currentCooldown: this.player.staffCooldown,
        cooldown: 0.48,
        readyPulse: 0,
      },
      cardHint: this.spells.nextFireOverload ? "Naechster Feuerball: Katastrophe" : `Karte bei ${Math.max(0, Math.ceil(this.nextCardAt - this.waves.time))}s`,
    });
  }

  endRun() {
    if (this.gameOver) return;
    this.showRunSummary("defeat");
  }

  showSectionClear() {
    if (this.pausedForSection) return;
    this.pausedForSection = true;
    this.pendingSpellReleases = [];
    this.pressedKeys.clear();
    this.heldKeys.clear();
    const depth = 2500;
    const overlay = this.add.container(0, 0).setDepth(depth);
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x070607, 0.7);
    const g = this.add.graphics();
    drawSectionPanel(g);
    const nextSection = this.section + 1;
    const intermission = getIntermissionCopy(this.section);
    const title = this.add.text(640, 130, intermission.title, { fontFamily: "Georgia, serif", fontSize: "38px", color: "#f1dec0", stroke: "#070607", strokeThickness: 5 }).setOrigin(0.5);
    const body = this.add.text(640, 180, intermission.body, {
      fontFamily: "Arial, sans-serif",
      fontSize: "17px",
      color: "#cdbb9d",
      align: "center",
      wordWrap: { width: 480 },
    }).setOrigin(0.5);
    const stats = this.add.text(640, 232, `Zwischenstand: ${this.kills} Kills   ${this.gold} Gold   ${this.cardsPicked} Karten`, {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#d6bd91",
    }).setOrigin(0.5);
    const hint = this.add.text(640, 276, "Waehle eine Belohnung fuer den naechsten Abschnitt.", {
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
      color: "#bfa985",
      align: "center",
      wordWrap: { width: 520 },
    }).setOrigin(0.5);

    const healCost = 35;
    const options = [
      createIntermissionOption(this, 402, 366, "1", "Wunden binden", `${healCost} Gold`, `+45 HP vor Abschnitt ${nextSection}`, depth + 2, this.gold >= healCost, () => {
        this.gold -= healCost;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 45);
        overlay.destroy();
        this.startSection(nextSection);
      }),
      createIntermissionOption(this, 640, 366, "2", "Arkaner Atem", "frei", "Mana voll auffuellen", depth + 2, true, () => {
        this.player.mana = this.player.maxMana;
        overlay.destroy();
        this.startSection(nextSection);
      }),
      createIntermissionOption(this, 878, 366, "3", "Karte studieren", "frei", "Eine Karte waehlen", depth + 2, true, () => {
        overlay.destroy();
        this.openIntermissionCards();
      }),
    ];

    let selected = options[2].enabled ? 2 : options.findIndex((option) => option.enabled);
    if (selected < 0) selected = 0;
    const selectOption = (index) => {
      selected = index;
      options.forEach((option, optionIndex) => option.setSelected(optionIndex === selected));
    };
    selectOption(selected);
    const foot = this.add.text(640, 616, "Pfeile/A-D wechseln   Enter bestaetigt   1-3 Direktwahl", { fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#8f846f" }).setOrigin(0.5);
    overlay.add([dim, g, title, body, stats, hint, ...options.flatMap((option) => option.parts), foot]);
    const moveSelection = (dir) => {
      for (let step = 1; step <= options.length; step += 1) {
        const next = (selected + dir * step + options.length) % options.length;
        if (options[next].enabled) {
          selectOption(next);
          return;
        }
      }
    };
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        moveSelection(-1);
        event.preventDefault();
      }
      if (key === "arrowright" || key === "d") {
        moveSelection(1);
        event.preventDefault();
      }
      if (key === "enter" || key === " ") {
        options[selected]?.action();
        event.preventDefault();
      }
      if (["1", "2", "3"].includes(key)) {
        options[Number(key) - 1]?.action();
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    overlay.once("destroy", () => {
      window.removeEventListener("keydown", onKeyDown);
    });
  }

  openIntermissionCards() {
    this.pausedForCard = true;
    this.pendingSpellReleases = [];
    const cards = getCardChoices();
    createCardOverlay(this, cards, (card) => {
      card.apply(this.spells);
      this.cardsPicked += 1;
      this.pausedForCard = false;
      this.startSection(this.section + 1);
    });
  }

  startSection(sectionId) {
    this.pendingSpellReleases = [];
    this.pressedKeys.clear();
    this.heldKeys.clear();
    this.section = sectionId;
    this.pausedForSection = false;
    this.victory = false;
    this.waves = createWaveSystem(sectionId);
    this.nextCardAt = 45;
    this.player.x = 270;
    this.player.y = 520;
    this.player.hp = Math.min(this.player.maxHp, Math.max(this.player.hp, Math.floor(this.player.maxHp * 0.55)) + 28);
    this.player.mana = Math.min(this.player.maxMana, Math.max(this.player.mana, Math.floor(this.player.maxMana * 0.45)) + 18);
    this.player.invulnerable = 0.8;
    this.enemies = [];
    this.pickups = [];
    this.effects = [];
    for (const sprite of this.enemySprites.values()) sprite.destroy();
    this.enemySprites.clear();
    this.drawSectionBackdrop();
    this.addFloatText(`Abschnitt ${sectionId}: ${this.waves.sectionShortTitle}`, 640, 164, "#f3d69d");
  }

  togglePauseMenu(force) {
    if (this.gameOver || this.pausedForCard) return;
    const shouldPause = force ?? !this.pausedForMenu;
    if (shouldPause === this.pausedForMenu) return;
    this.pausedForMenu = shouldPause;
    this.pressedKeys.clear();
    this.heldKeys.clear();
    if (this.pausedForMenu) {
      this.pauseOverlay = createPauseOverlay(this, () => this.togglePauseMenu(false), () => this.scene.start("CharacterScene"));
    } else if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }

  showRunSummary(result) {
    this.gameOver = true;
    this.pendingSpellReleases = [];
    this.pausedForCard = false;
    this.pausedForSection = false;
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
    this.pausedForMenu = false;
    const summary = {
      result,
      time: Math.floor(this.waves.time),
      wave: this.waves.wave,
      section: this.section,
      phaseName: this.waves.phaseName,
      focusKey: this.startFocus,
      focusLabel: this.runFocusLabel,
      kills: this.kills,
      score: this.score,
      gold: this.gold,
      cardsPicked: this.cardsPicked,
      completedAt: Date.now(),
    };
    const progress = recordRunProgress(summary);
    const title = result === "victory" ? "BLACKHAVEN HAELT STAND" : "BLACKHAVEN FAELLT";
    const subtitle = result === "victory" ? `${this.waves.bossConfig.name} ist gefallen.` : getDefeatLine(this.waves.wave);
    const depth = 3000;
    this.add.rectangle(640, 360, 1280, 720, 0x070607, 0.76).setDepth(depth);
    const g = this.add.graphics().setDepth(depth + 1);
    drawEndPanel(g, result);

    this.add.text(640, 134, title, { fontFamily: "Georgia, serif", fontSize: "42px", color: "#f1dec0", stroke: "#070607", strokeThickness: 5 }).setOrigin(0.5).setDepth(depth + 2);
    this.add.text(640, 184, subtitle, { fontFamily: "Georgia, serif", fontSize: "18px", color: result === "victory" ? "#d8b976" : "#bfa985" }).setOrigin(0.5).setDepth(depth + 2);

    this.add.text(640, 222, this.waves.phaseName, { fontFamily: "Georgia, serif", fontSize: "15px", color: "#d6bd91" }).setOrigin(0.5).setDepth(depth + 2);
    const leftRows = [
      ["Ueberlebt", formatRunTime(summary.time)],
      ["Gegner besiegt", `${this.kills}`],
      ["Karten gewaehlt", `${this.cardsPicked}`],
    ];
    const rightRows = [
      ["Welle", `${this.waves.wave}`],
      ["Startfokus", this.runFocusLabel],
      ["Seelen", `${this.score}`],
      ["Gold", `${this.gold}`],
    ];
    leftRows.forEach(([label, value], index) => {
      const y = 268 + index * 42;
      this.add.text(420, y, label, { fontFamily: "Arial, sans-serif", fontSize: "15px", color: "#9f927b" }).setDepth(depth + 2);
      this.add.text(590, y, value, { fontFamily: "Georgia, serif", fontSize: "16px", color: "#f0d9b4" }).setDepth(depth + 2);
    });
    rightRows.forEach(([label, value], index) => {
      const y = 268 + index * 42;
      this.add.text(705, y, label, { fontFamily: "Arial, sans-serif", fontSize: "15px", color: "#9f927b" }).setDepth(depth + 2);
      this.add.text(884, y, value, { fontFamily: "Georgia, serif", fontSize: "16px", color: "#f0d9b4" }).setOrigin(1, 0).setDepth(depth + 2);
    });

    this.add.text(640, 472, `Runs: ${progress.totalRuns}   Gesammeltes Gold: ${progress.totalGold}   Bestmarke: ${formatRunTime(progress.bestRun.time)} / Welle ${progress.bestRun.wave}`, {
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      color: "#d2b982",
    }).setOrigin(0.5).setDepth(depth + 2);

    this.add.text(640, 512, result === "victory" ? "Naechster Testlauf: anderer Fokus, anderer Rhythmus." : "Nochmal rein, Fokus wechseln, Front anders lesen.", {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: "#bfa985",
    }).setOrigin(0.5).setDepth(depth + 2);

    const retry = createEndButton(this, 526, 574, "NOCHMAL", depth + 2, () => this.scene.restart({ startFocus: this.startFocus }));
    const prep = createEndButton(this, 754, 574, "VORBEREITUNG", depth + 2, () => this.scene.start("CharacterScene"));
    this.input.keyboard.once("keydown-R", () => retry.action());
    this.input.keyboard.once("keydown-ENTER", () => retry.action());
    this.input.keyboard.once("keydown-ESC", () => prep.action());
  }
}

function normalizeKey(key) {
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
}

function isGameKey(key) {
  return ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright", " ", "shift", "j", "q", "e", "1", "2", "3", "f1", "escape"].includes(key);
}

function createPauseOverlay(scene, onResume, onPrep) {
  const depth = 2600;
  const overlay = scene.add.container(0, 0).setDepth(depth);
  const dim = scene.add.rectangle(640, 360, 1280, 720, 0x070607, 0.7);
  const g = scene.add.graphics();
  drawPausePanel(g);
  const title = scene.add.text(640, 128, "PAUSE", { fontFamily: "Georgia, serif", fontSize: "42px", color: "#f1dec0", stroke: "#070607", strokeThickness: 4 }).setOrigin(0.5);
  const subtitle = scene.add.text(640, 176, "Blackhaven wartet. Atmen, lesen, weiterkaempfen.", { fontFamily: "Georgia, serif", fontSize: "17px", color: "#caa46c" }).setOrigin(0.5);

  const controls = [
    ["Bewegung", "WASD / Pfeile"],
    ["Dash", "Space / Shift"],
    ["Stabcombo", "Linksklick / J"],
    ["Zauber", "Rechtsklick Feuer   Q Blitz   E Frost"],
    ["Alternativ", "1 Feuer   2 Blitz   3 Frost"],
    ["Debug", "F1"],
  ];
  const roles = [
    ["Feuer", "Oger, Notfall, grosser Knockback"],
    ["Blitz", "Kleingegner ausduennen"],
    ["Frost", "Zeit kaufen, Gegner vorbereiten"],
    ["Stab", "Riskante Mana-Recovery und Raumkontrolle"],
    ["Dash", "Position retten, Flanken brechen"],
  ];
  const controlRows = addPauseRows(scene, controls, 420, 236);
  const roleRows = addPauseRows(scene, roles, 705, 236);
  const goal = scene.add.text(640, 470, "Ziel: Hordenvorschau lesen, Karten nutzen, Miniboss ueberstehen.", {
    fontFamily: "Arial, sans-serif",
    fontSize: "15px",
    color: "#bfa985",
  }).setOrigin(0.5);
  const resume = createEndButton(scene, 526, 566, "WEITER", depth + 2, onResume);
  const prep = createEndButton(scene, 754, 566, "RUN ABBRECHEN", depth + 2, onPrep);
  const hint = scene.add.text(640, 626, "Esc: weiter   Enter/R: weiter   Run abbrechen fuehrt zur Vorbereitung", { fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#8f846f" }).setOrigin(0.5);

  overlay.add([dim, g, title, subtitle, ...controlRows, ...roleRows, goal, hint, resume.button, resume.hit, prep.button, prep.hit]);
  const resumeKey = () => onResume();
  scene.input.keyboard.once("keydown-ENTER", resumeKey);
  scene.input.keyboard.once("keydown-R", resumeKey);
  overlay.once("destroy", () => {
    scene.input.keyboard.off("keydown-ENTER", resumeKey);
    scene.input.keyboard.off("keydown-R", resumeKey);
  });
  return overlay;
}

function drawPausePanel(g) {
  g.fillStyle(0x100e12, 0.94);
  g.lineStyle(2, 0x9d7442, 0.95);
  g.fillRoundedRect(350, 96, 580, 560, 5);
  g.strokeRoundedRect(350, 96, 580, 560, 5);
  g.fillStyle(0x161116, 0.76);
  g.fillRoundedRect(380, 214, 520, 224, 4);
  g.lineStyle(1, 0x6f5638, 0.75);
  g.strokeRoundedRect(380, 214, 520, 224, 4);
  g.lineStyle(1, 0x8f683b, 0.5);
  g.lineBetween(640, 230, 640, 420);
}

function drawSectionPanel(g) {
  g.fillStyle(0x100e12, 0.94);
  g.lineStyle(2, 0xd2a75e, 0.95);
  g.fillRoundedRect(330, 88, 620, 560, 5);
  g.strokeRoundedRect(330, 88, 620, 560, 5);
  g.fillStyle(0x1d1416, 0.76);
  g.fillRoundedRect(370, 296, 540, 204, 4);
  g.lineStyle(1, 0x6f5638, 0.75);
  g.strokeRoundedRect(370, 296, 540, 204, 4);
}

function createIntermissionOption(scene, x, y, hotkey, title, price, body, depth, enabled, action) {
  const g = scene.add.graphics().setDepth(depth);
  drawIntermissionOption(g, x, y, enabled, false);
  const keyText = scene.add.text(x - 86, y - 42, hotkey, { fontFamily: "Georgia, serif", fontSize: "16px", color: enabled ? "#e8c78f" : "#746958" }).setOrigin(0.5).setDepth(depth + 1);
  const titleText = scene.add.text(x, y - 42, title, { fontFamily: "Georgia, serif", fontSize: "17px", color: enabled ? "#f1dec0" : "#827667" }).setOrigin(0.5).setDepth(depth + 1);
  const priceText = scene.add.text(x, y - 12, price, { fontFamily: "Arial, sans-serif", fontSize: "13px", color: enabled ? "#caa46c" : "#746958" }).setOrigin(0.5).setDepth(depth + 1);
  const bodyText = scene.add.text(x, y + 17, enabled ? body : "Nicht genug Gold", {
    fontFamily: "Arial, sans-serif",
    fontSize: "13px",
    color: enabled ? "#a99b82" : "#746958",
    align: "center",
    wordWrap: { width: 150 },
  }).setOrigin(0.5).setDepth(depth + 1);
  const hit = scene.add.zone(x, y, 170, 116).setDepth(depth + 2).setInteractive({ useHandCursor: enabled });
  let selected = false;
  const redraw = (hover = false) => drawIntermissionOption(g, x, y, enabled, hover, selected);
  hit.on("pointerover", () => redraw(true));
  hit.on("pointerout", () => redraw(false));
  hit.on("pointerup", () => {
    if (enabled) action();
  });
  return {
    enabled,
    action: () => {
      if (enabled) action();
    },
    setSelected: (value) => {
      selected = value;
      redraw(false);
    },
    parts: [g, keyText, titleText, priceText, bodyText, hit],
  };
}

function drawIntermissionOption(g, x, y, enabled, hover, selected = false) {
  g.clear();
  g.fillStyle(enabled ? (hover || selected ? 0x24191d : 0x141116) : 0x0d0c10, enabled ? 0.96 : 0.72);
  g.lineStyle(selected ? 3 : hover ? 2 : 1, enabled ? (selected ? 0xffdf9d : hover ? 0xffd38d : 0x9d7442) : 0x4f4242, enabled ? 0.95 : 0.6);
  g.fillRoundedRect(x - 85, y - 58, 170, 116, 4);
  g.strokeRoundedRect(x - 85, y - 58, 170, 116, 4);
  if (selected && enabled) {
    g.fillStyle(0xffdf9d, 0.12);
    g.fillRoundedRect(x - 89, y - 62, 178, 124, 5);
  }
}

function addPauseRows(scene, rows, x, y) {
  const texts = [];
  rows.forEach(([label, value], index) => {
    const rowY = y + index * 36;
    texts.push(scene.add.text(x, rowY, label, { fontFamily: "Arial, sans-serif", fontSize: "14px", color: "#9f927b" }));
    texts.push(scene.add.text(x + 92, rowY, value, { fontFamily: "Georgia, serif", fontSize: "15px", color: "#f0d9b4" }));
  });
  return texts;
}

function drawEndPanel(g, result) {
  const border = result === "victory" ? 0xd2a75e : 0x9d7442;
  g.fillStyle(0x100e12, 0.94);
  g.lineStyle(2, border, 0.95);
  g.fillRoundedRect(350, 106, 580, 526, 5);
  g.strokeRoundedRect(350, 106, 580, 526, 5);
  g.fillStyle(result === "victory" ? 0x2b1d10 : 0x211114, 0.68);
  g.fillRoundedRect(380, 216, 520, 238, 4);
  g.lineStyle(1, 0x6f5638, 0.75);
  g.strokeRoundedRect(380, 216, 520, 238, 4);
  g.lineStyle(1, 0x8f683b, 0.5);
  g.lineBetween(640, 236, 640, 430);
}

function createEndButton(scene, x, y, label, depth, action) {
  const button = scene.add.container(x, y).setDepth(depth);
  const g = scene.add.graphics();
  g.fillStyle(0x1b1215, 0.98);
  g.lineStyle(2, 0xd29b55, 1);
  g.fillRoundedRect(-92, -24, 184, 48, 4);
  g.strokeRoundedRect(-92, -24, 184, 48, 4);
  const text = scene.add.text(0, 0, label, { fontFamily: "Georgia, serif", fontSize: "17px", color: "#ffe4ba" }).setOrigin(0.5);
  button.add([g, text]);
  const hit = scene.add.zone(x, y, 184, 48).setDepth(depth + 1).setInteractive({ useHandCursor: true });
  hit.on("pointerover", () => {
    g.clear();
    g.fillStyle(0x24191d, 0.98);
    g.lineStyle(2, 0xffd38d, 1);
    g.fillRoundedRect(-92, -24, 184, 48, 4);
    g.strokeRoundedRect(-92, -24, 184, 48, 4);
  });
  hit.on("pointerout", () => {
    g.clear();
    g.fillStyle(0x1b1215, 0.98);
    g.lineStyle(2, 0xd29b55, 1);
    g.fillRoundedRect(-92, -24, 184, 48, 4);
    g.strokeRoundedRect(-92, -24, 184, 48, 4);
  });
  hit.on("pointerup", action);
  return { button, hit, action };
}

function getDefeatLine(wave) {
  if (wave >= 4) return "Der Torbrecher hat die Linie gebrochen.";
  if (wave >= 3) return "Der Hof wurde ueberrannt.";
  if (wave >= 2) return "Die Gassen haben dich verschluckt.";
  return "Der Dorfplatz war noch nicht bereit.";
}

function drawWorld(g, w, h, section = 1, conceptUnderlay = false) {
  if (section === 2 || section === 3) {
    drawChapelWorld(g, w, h);
    return;
  }
  if (conceptUnderlay) {
    g.fillStyle(0x070607, 0.18);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x09090b, 0.28);
    for (let i = 0; i < 9; i += 1) {
      const x = i * 155 - 35;
      const roof = 320 + (i % 3) * 30;
      g.fillRect(x, roof, 76, 210);
      g.fillTriangle(x - 18, roof, x + 38, roof - 46, x + 94, roof);
    }
    return;
  }
  g.fillGradientStyle(0x08070a, 0x101018, 0x2b1112, 0x090808, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x351719, 0.75);
  g.fillCircle(960, 185, 210);
  g.fillStyle(0x5c1b13, 0.58);
  g.fillCircle(1030, 250, 260);
  g.fillStyle(0x09090b, 0.94);
  for (let i = 0; i < 12; i += 1) {
    const x = i * 120 - 20;
    const roof = 300 + (i % 3) * 28;
    g.fillRect(x, roof, 82, 220);
    g.fillTriangle(x - 18, roof, x + 41, roof - 44, x + 100, roof);
    g.fillStyle(0xe36a22, 0.45);
    g.fillRect(x + 18, roof + 48, 14, 25);
    g.fillStyle(0x09090b, 0.94);
  }
  g.fillStyle(0xd24d23, 0.38);
  for (let i = 0; i < 18; i += 1) {
    const x = 180 + i * 62;
    g.fillTriangle(x, 520, x + 18, 430 - (i % 4) * 20, x + 38, 520);
  }
}

function drawBackgroundConceptVeil(g, w, h) {
  g.fillStyle(0x050506, 0.24);
  g.fillRect(0, 0, w, h);
  g.fillGradientStyle(0x000000, 0x000000, 0x070607, 0x070607, 0, 0, 0.58, 0.58);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x070607, 0.34);
  g.fillRect(0, 560, w, 160);
  g.lineStyle(1, 0xd98a42, 0.22);
  g.lineBetween(70, 590, 1230, 548);
}

function drawChurchyardConceptVeil(g, w, h) {
  g.fillStyle(0x030406, 0.12);
  g.fillRect(0, 0, w, h);
  g.fillGradientStyle(0x020203, 0x020203, 0x060507, 0x060507, 0.08, 0.12, 0.58, 0.64);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x050607, 0.26);
  g.fillRect(0, 565, w, 155);
  g.lineStyle(1, 0xd0a76a, 0.18);
  g.lineBetween(70, 590, 1230, 548);
}

function drawForestConceptVeil(g, w, h) {
  g.fillStyle(0x020406, 0.1);
  g.fillRect(0, 0, w, h);
  g.fillGradientStyle(0x020304, 0x020304, 0x060507, 0x060507, 0.05, 0.14, 0.5, 0.62);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x030405, 0.24);
  g.fillRect(0, 565, w, 155);
  g.lineStyle(1, 0x9f8a62, 0.16);
  g.lineBetween(70, 590, 1230, 548);
}

function drawChapelWorld(g, w, h) {
  g.fillStyle(0x05070a, 0.28);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x06070a, 0.3);
  g.fillRect(0, 565, w, 155);
}

function getIntermissionCopy(section) {
  if (section === 2) {
    return {
      title: "KAPELLENTOR GESICHERT",
      body: "Der Kapellenwaechter bricht. Jenseits der Mauern fuehrt ein Waldweg tiefer in die brennende Nacht.",
    };
  }
  return {
    title: "DORFPLATZ GESICHERT",
    body: "Der Torbrecher liegt in der Asche. Hinter der Kapelle oeffnen sich neue Seitenwege.",
  };
}

function drawGround(g, section = 1) {
  const isLaterSection = section >= 2;
  if (!isLaterSection) {
    g.fillStyle(0x070607, 0.36);
    g.fillRect(0, 565, 1280, 155);
    g.fillStyle(0x171113, 0.34);
    g.fillEllipse(625, 620, 1120, 138);
    g.lineStyle(1, 0xd98a42, 0.18);
    g.lineBetween(70, 590, 1230, 548);
    g.lineBetween(120, 650, 1180, 606);
    return;
  }
  const isForest = section === 3;
  g.fillStyle(isForest ? 0x07090a : 0x090b10, 0.24);
  g.fillRect(0, 565, 1280, 155);
  g.fillStyle(isForest ? 0x10120f : 0x11141b, 0.26);
  g.fillEllipse(625, 620, 1120, 138);
  g.fillStyle(isForest ? 0x171813 : 0x1a1a23, 0.18);
  g.fillEllipse(360, 650, 520, 74);
  g.fillEllipse(890, 636, 520, 62);
  g.lineStyle(1, isForest ? 0x80704d : 0x6f6c82, 0.32);
  g.lineBetween(70, 590, 1230, 548);
  g.lineBetween(120, 650, 1180, 606);
  drawGroundStones(g, true);
  drawGroundProps(g, true);
  drawGroundEmbers(g, true);
}

function drawGroundStones(g, isChapel) {
  const stone = isChapel ? 0x283040 : 0x302021;
  const line = isChapel ? 0x6f6c82 : 0x704d35;
  const rows = [
    { y: 574, h: 18, offset: 20, count: 12, w: 92 },
    { y: 602, h: 20, offset: 74, count: 10, w: 104 },
    { y: 632, h: 22, offset: 16, count: 11, w: 98 },
  ];
  for (const row of rows) {
    for (let i = 0; i < row.count; i += 1) {
      const x = row.offset + i * (row.w + 22);
      const wobble = (i % 3) * 3;
      g.fillStyle(stone, 0.14);
      g.fillRoundedRect(x, row.y + wobble, row.w, row.h, 3);
      g.lineStyle(1, line, 0.12);
      g.strokeRoundedRect(x, row.y + wobble, row.w, row.h, 3);
    }
  }
  g.lineStyle(1, isChapel ? 0x8290aa : 0xb17742, 0.16);
  for (let i = 0; i < 9; i += 1) {
    const y = 584 + i * 12;
    g.lineBetween(180 + i * 11, y, 1120 - i * 18, y - 38);
  }
}

function drawGroundProps(g, isChapel) {
  const post = isChapel ? 0x11141a : 0x120c0d;
  const rim = isChapel ? 0x687389 : 0x7a4a2f;
  const props = [
    { x: 72, y: 598, h: 54 },
    { x: 118, y: 615, h: 38 },
    { x: 1166, y: 588, h: 58 },
    { x: 1220, y: 604, h: 44 },
  ];
  for (const prop of props) {
    g.fillStyle(post, 0.82);
    g.fillRect(prop.x, prop.y, 10, prop.h);
    g.lineStyle(2, rim, 0.24);
    g.lineBetween(prop.x + 5, prop.y + 3, prop.x + 5, prop.y + prop.h);
  }
  g.lineStyle(3, post, 0.72);
  g.lineBetween(70, 614, 154, 598);
  g.lineBetween(1138, 602, 1246, 624);
  g.lineStyle(1, rim, 0.22);
  g.lineBetween(74, 611, 155, 594);
  g.lineBetween(1139, 598, 1248, 619);

  g.fillStyle(post, 0.62);
  g.fillTriangle(230, 650, 252, 606, 278, 650);
  g.fillTriangle(1040, 654, 1060, 616, 1088, 654);
  g.lineStyle(1, rim, 0.18);
  g.lineBetween(252, 606, 246, 650);
  g.lineBetween(1060, 616, 1054, 654);
}

function drawGroundEmbers(g, isChapel) {
  if (isChapel) {
    g.fillStyle(0x86a6d8, 0.1);
    for (const [x, y, r] of [[282, 610, 5], [1018, 590, 4], [748, 646, 3], [1112, 628, 4]]) {
      g.fillCircle(x, y, r);
    }
    return;
  }
  const embers = [
    [168, 612, 4], [314, 642, 3], [456, 592, 3], [612, 650, 4],
    [742, 606, 3], [930, 632, 5], [1078, 586, 3], [1190, 642, 4],
  ];
  for (const [x, y, r] of embers) {
    g.fillStyle(0xe9782a, 0.18);
    g.fillCircle(x, y, r + 5);
    g.fillStyle(0xffb65c, 0.42);
    g.fillCircle(x, y, r);
  }
}

function drawZoneGuides(g, debugView) {
  g.fillStyle(0x070708, 0.28);
  g.fillRect(950, 320, 330, 290);
  g.fillStyle(0x4d3823, 0.15);
  g.fillRect(785, 360, 165, 275);
  g.lineStyle(2, 0x7b5c38, 0.28);
  g.lineBetween(785, 340, 785, 675);
  g.lineBetween(950, 310, 950, 660);
  if (!debugView) return;
  g.lineStyle(2, 0x35a4ff, 0.7);
  g.strokeRect(BOUNDS.left, BOUNDS.top, BOUNDS.right - BOUNDS.left, BOUNDS.bottom - BOUNDS.top);
  g.lineStyle(2, 0xd0a455, 0.7);
  g.strokeRect(785, 360, 165, 275);
  g.lineStyle(2, 0x77736c, 0.7);
  g.strokeRect(950, 320, 330, 290);
}

function drawPickups(g, pickups, debugView) {
  if (debugView) {
    g.lineStyle(2, 0x83f0a4, 0.55);
    g.strokeRect(PICKUP_BOUNDS.left, PICKUP_BOUNDS.top, PICKUP_BOUNDS.right - PICKUP_BOUNDS.left, PICKUP_BOUNDS.bottom - PICKUP_BOUNDS.top);
  }
  for (const pickup of pickups) {
    const life = Math.max(0, pickup.ttl / pickup.maxTtl);
    const pulse = 1 + Math.sin(pickup.pulse) * 0.08;
    const alpha = Math.min(0.9, 0.35 + life * 0.55);
    if (pickup.kind === "health") {
      g.fillStyle(0x16351f, alpha);
      g.fillCircle(pickup.x, pickup.y - 12, pickup.radius * pulse);
      g.lineStyle(2, 0xa9f2b8, alpha);
      g.strokeCircle(pickup.x, pickup.y - 12, pickup.radius * (1.1 + (1 - life) * 0.15));
      g.fillStyle(0xd8ffe0, alpha);
      g.fillRect(pickup.x - 3, pickup.y - 22, 6, 20);
      g.fillRect(pickup.x - 10, pickup.y - 15, 20, 6);
      if (debugView && pickup.moved) {
        g.lineStyle(1, 0xfff0a0, 0.8);
        g.strokeCircle(pickup.x, pickup.y - 12, pickup.radius + 8);
      }
    }
  }
}

function drawPreviewSilhouette(g, type, x, y, scale, alpha, zone) {
  const palette = {
    skeleton: zone === "warning" ? 0xcfc5a8 : 0x17171b,
    zombie: zone === "warning" ? 0x5d7653 : 0x172018,
    ghoul: zone === "warning" ? 0xa74970 : 0x240e19,
    ogre: zone === "warning" ? 0x493d34 : 0x100e0e,
  };
  const color = palette[type] ?? 0x18171a;
  const w = (type === "ogre" ? 86 : type === "zombie" ? 42 : type === "ghoul" ? 34 : 28) * scale;
  const h = (type === "ogre" ? 126 : type === "ghoul" ? 58 : type === "skeleton" ? 64 : 76) * scale;
  g.fillStyle(color, alpha);
  g.fillEllipse(x, y - h * 0.35, w * 0.62, h * 0.36);
  g.fillRoundedRect(x - w * 0.5, y - h * 0.2, w, h * 0.62, 8 * scale);
  g.fillEllipse(x, y + h * 0.42, w * 1.25, h * 0.16);
  if (zone === "warning") {
    g.lineStyle(Math.max(1, 2 * scale), 0xd1b17b, 0.2 + alpha * 0.35);
    g.strokeEllipse(x, y - h * 0.35, w * 0.68, h * 0.42);
  }
  if (type === "ogre") {
    g.lineStyle(6 * scale, 0x100d0d, alpha);
    g.lineBetween(x - w * 0.52, y - h * 0.02, x - w, y + h * 0.28);
    g.lineBetween(x + w * 0.52, y - h * 0.02, x + w, y + h * 0.28);
  }
}

function drawFlankWarning(g, flank) {
  const p = 1 - flank.timer / flank.maxTimer;
  const x = 116 + Math.sin(flank.wobble * 5) * 4;
  g.fillStyle(0x2a1013, 0.32 + p * 0.2);
  g.fillEllipse(x, flank.y, 92 + p * 18, 46 + p * 8);
  g.lineStyle(3, 0xd05a47, 0.42 + p * 0.42);
  g.strokeEllipse(x, flank.y, 90 + p * 16, 44 + p * 8);
  for (let i = 0; i < flank.enemies.length; i += 1) {
    drawPreviewSilhouette(g, flank.enemies[i], x - 26 + i * 24, flank.y + 18 + (i % 2) * 10, 0.52 + p * 0.18, 0.48 + p * 0.25, "warning");
  }
}

function drawPlayerReadability(g, player, now) {
  const pulse = 0.5 + Math.sin(now * 0.004) * 0.5;
  const breath = 0.5 + Math.sin(now * 0.0017) * 0.5;
  const x = player.x;
  const y = player.y;

  g.fillStyle(0x06121b, 0.72);
  g.fillEllipse(x, y + 15, 78, 22);

  g.fillStyle(0x70c8ff, 0.055 + pulse * 0.025);
  g.fillEllipse(x, y - 36, 86 + breath * 8, 126 + breath * 10);
  g.lineStyle(2, 0x8bd7ff, 0.26 + pulse * 0.12);
  g.strokeEllipse(x, y - 36, 58 + breath * 5, 104 + breath * 8);
  g.lineStyle(1, 0xd6b25e, 0.18 + pulse * 0.08);
  g.strokeEllipse(x + player.facing * 3, y - 32, 70 + breath * 6, 114 + breath * 8);

  g.lineStyle(2, 0x9edfff, 0.34 + pulse * 0.16);
  g.beginPath();
  g.arc(x, y + 8, 39 + pulse * 2, Phaser.Math.DegToRad(202), Phaser.Math.DegToRad(332));
  g.strokePath();
  g.lineStyle(1, 0xffdf9d, 0.38);
  g.beginPath();
  g.arc(x, y + 8, 31 + breath * 2, Phaser.Math.DegToRad(22), Phaser.Math.DegToRad(158));
  g.strokePath();

  const moteA = now * 0.002;
  for (let i = 0; i < 3; i += 1) {
    const a = moteA + i * 2.1;
    const mx = x + Math.cos(a) * (31 + i * 5);
    const my = y - 38 + Math.sin(a * 1.4) * (34 + i * 4);
    g.fillStyle(i === 1 ? 0xf5d89a : 0x9edfff, 0.55);
    g.fillCircle(mx, my, i === 1 ? 1.5 : 2);
  }
}

function drawAimGuide(g, player, aimPoint, enabled, now) {
  if (!enabled || !aimPoint) return;
  const dx = aimPoint.x - player.x;
  const dy = aimPoint.y - player.y;
  const len = Math.hypot(dx, dy);
  if (len < 36) return;
  const nx = dx / len;
  const ny = dy / len;
  const startX = player.x + nx * 38;
  const startY = player.y - 34 + ny * 24;
  const guideLen = Math.min(len, 310);
  const endX = player.x + nx * guideLen;
  const endY = player.y - 34 + ny * guideLen;
  const pulse = 0.5 + Math.sin(now * 0.009) * 0.5;
  g.lineStyle(2, 0x9edfff, 0.18 + pulse * 0.08);
  g.lineBetween(startX, startY, endX, endY);
  g.lineStyle(1, 0xf5d89a, 0.28);
  g.strokeCircle(endX, endY, 9 + pulse * 2);
  g.fillStyle(0x9edfff, 0.18 + pulse * 0.08);
  g.fillCircle(endX, endY, 3);
}

function createPlayerAnimations(scene) {
  if (scene.textures.exists(CONCEPT_PLAYER_TEXTURE) && !scene.anims.exists(CONCEPT_PLAYER_WALK_ANIM)) {
    scene.anims.create({
      key: CONCEPT_PLAYER_WALK_ANIM,
      frames: CONCEPT_PLAYER_WALK_FRAMES.map((frame) => ({ key: CONCEPT_PLAYER_TEXTURE, frame })),
      frameRate: 18,
      repeat: -1,
    });
  }
  if (scene.textures.exists(CONCEPT_PLAYER_IDLE_TEXTURE) && !scene.anims.exists(CONCEPT_PLAYER_IDLE_ANIM)) {
    scene.anims.create({
      key: CONCEPT_PLAYER_IDLE_ANIM,
      frames: CONCEPT_PLAYER_IDLE_FRAMES.map((frame) => ({ key: CONCEPT_PLAYER_IDLE_TEXTURE, frame })),
      frameRate: 5,
      repeat: -1,
    });
  }
  if (scene.textures.exists(CONCEPT_PLAYER_STAFF_TEXTURE) && !scene.anims.exists(CONCEPT_PLAYER_STAFF_ANIM)) {
    scene.anims.create({
      key: CONCEPT_PLAYER_STAFF_ANIM,
      frames: CONCEPT_PLAYER_STAFF_FRAMES.map((frame) => ({ key: CONCEPT_PLAYER_STAFF_TEXTURE, frame })),
      frameRate: 40,
      repeat: 0,
    });
  }
  if (scene.textures.exists(CONCEPT_PLAYER_CAST_TEXTURE) && !scene.anims.exists(CONCEPT_PLAYER_CAST_ANIM)) {
    scene.anims.create({
      key: CONCEPT_PLAYER_CAST_ANIM,
      frames: CONCEPT_PLAYER_CAST_FRAMES.map((frame) => ({ key: CONCEPT_PLAYER_CAST_TEXTURE, frame })),
      frameRate: 32,
      repeat: 0,
    });
  }
}

function createEnemyAnimations(scene) {
  if (scene.textures.exists("enemySkeletonWalk") && !scene.anims.exists(SKELETON_WALK_ANIM)) {
    scene.anims.create({
      key: SKELETON_WALK_ANIM,
      frames: SKELETON_WALK_FRAMES.map((frame) => ({ key: "enemySkeletonWalk", frame })),
      frameRate: 10,
      repeat: -1,
    });
  }
}

function createFxAnimations(scene) {
  if (scene.textures.exists("fireProjectileFx") && !scene.anims.exists(FIRE_PROJECTILE_ANIM)) {
    scene.anims.create({
      key: FIRE_PROJECTILE_ANIM,
      frames: FIRE_PROJECTILE_FRAMES.map((frame) => ({ key: "fireProjectileFx", frame })),
      frameRate: 26,
      repeat: 0,
    });
  }
  if (scene.textures.exists("lightningImpactFx") && !scene.anims.exists(LIGHTNING_IMPACT_ANIM)) {
    scene.anims.create({
      key: LIGHTNING_IMPACT_ANIM,
      frames: LIGHTNING_IMPACT_FRAMES.map((frame) => ({ key: "lightningImpactFx", frame })),
      frameRate: 30,
      repeat: 0,
    });
  }
  if (scene.textures.exists("frostAreaFx") && !scene.anims.exists(FROST_AREA_ANIM)) {
    scene.anims.create({
      key: FROST_AREA_ANIM,
      frames: FROST_AREA_FRAMES.map((frame) => ({ key: "frostAreaFx", frame })),
      frameRate: 18,
      repeat: 0,
    });
  }
}

function updatePlayerSpriteAnimation(scene, sprite, inputState, textureKey, player, restartStaffAttackAnim, staffAttackAnimTimer, castAnimTimer, restartCastAnim) {
  if (textureKey !== CONCEPT_PLAYER_TEXTURE && textureKey !== CONCEPT_PLAYER_IDLE_TEXTURE && textureKey !== CONCEPT_PLAYER_STAFF_TEXTURE && textureKey !== CONCEPT_PLAYER_CAST_TEXTURE) return;
  if (player.attackDuration > 0 || staffAttackAnimTimer > 0) {
    if (sprite.texture.key !== CONCEPT_PLAYER_STAFF_TEXTURE) sprite.setTexture(CONCEPT_PLAYER_STAFF_TEXTURE);
    if (sprite.anims.currentAnim?.key !== CONCEPT_PLAYER_STAFF_ANIM || !sprite.anims.isPlaying) {
      sprite.anims.play(CONCEPT_PLAYER_STAFF_ANIM, true);
    }
    return;
  }
  if (castAnimTimer > 0) {
    if (sprite.texture.key !== CONCEPT_PLAYER_CAST_TEXTURE) sprite.setTexture(CONCEPT_PLAYER_CAST_TEXTURE);
    if (restartCastAnim || sprite.anims.currentAnim?.key !== CONCEPT_PLAYER_CAST_ANIM) {
      sprite.anims.play(CONCEPT_PLAYER_CAST_ANIM, true);
    }
    return;
  }
  const moving = inputState.left || inputState.right || inputState.up || inputState.down;
  if (moving) {
    if (sprite.texture.key !== CONCEPT_PLAYER_TEXTURE) sprite.setTexture(CONCEPT_PLAYER_TEXTURE);
    sprite.anims.play(CONCEPT_PLAYER_WALK_ANIM, true);
    return;
  }
  sprite.anims.play(CONCEPT_PLAYER_IDLE_ANIM, true);
}

function applyPlayerSpritePose(sprite, player, textureKey) {
  if (textureKey !== CONCEPT_PLAYER_TEXTURE && textureKey !== CONCEPT_PLAYER_IDLE_TEXTURE && textureKey !== CONCEPT_PLAYER_STAFF_TEXTURE && textureKey !== CONCEPT_PLAYER_CAST_TEXTURE) {
    sprite.setOrigin(0.5, 0.5);
    sprite.setScale(1.08);
    sprite.setPosition(player.x, player.y - 44);
    return;
  }

  const source = sprite.texture.getSourceImage();
  const scaleMultiplier = CONCEPT_PLAYER_SCALE_MULTIPLIERS[textureKey] ?? 1;
  const scale = source?.height ? (CONCEPT_PLAYER_HEIGHT / source.height) * scaleMultiplier : scaleMultiplier;
  sprite.setOrigin(0.5, 1);
  sprite.setScale(scale);
  sprite.setPosition(player.x, player.y + 25);
}

function getEnemyTint(enemy) {
  if (enemy.hitFlash > 0) {
    if (enemy.hitKind === "fire") return 0xffc16f;
    if (enemy.hitKind === "lightning") return 0xc8f4ff;
    if (enemy.hitKind === "frost") return 0x9be7ff;
    if (enemy.hitKind === "staff") return 0xfff0c8;
    return 0xffffff;
  }
  if (enemy.burn > 0) return 0xffaa68;
  if (enemy.freeze > 0) return 0xb7f2ff;
  if (enemy.slow > 0) return 0x86c9e8;
  return 0xffffff;
}

function getEnemyTextureKey(scene, type) {
  const conceptKey = CONCEPT_ENEMY_TEXTURES[type];
  if (USE_CONCEPT_ENEMY_SPRITES && conceptKey && scene.textures.exists(conceptKey)) return conceptKey;
  return type;
}

function isConceptEnemyTexture(textureKey) {
  return Object.values(CONCEPT_ENEMY_TEXTURES).includes(textureKey);
}

function applyEnemySpritePose(sprite, enemy, textureKey, usesConceptSprite, recoilLift) {
  if (!usesConceptSprite) {
    sprite.setOrigin(0.5, 0.5);
    sprite.setScale(enemy.isBoss ? 1.28 : 1);
    sprite.setPosition(enemy.x, enemy.y - enemy.radius * 0.7 - recoilLift);
    sprite.setFlipX(false);
    return;
  }

  const source = sprite.texture.getSourceImage();
  const baseHeight = CONCEPT_ENEMY_HEIGHTS[enemy.type] ?? enemy.radius * 2.4;
  const targetHeight = baseHeight * (enemy.isBoss ? 1.22 : 1);
  const scale = source?.height ? targetHeight / source.height : 1;
  sprite.setOrigin(0.5, 1);
  sprite.setScale(scale);
  sprite.setPosition(enemy.x, enemy.y + enemy.radius * 0.35 - recoilLift);
  sprite.setFlipX(enemy.spawnPoint === "leftFlank");
}

function drawActiveEnemyReadability(g, enemy) {
  const color = getEnemyReadabilityColor(enemy);
  const width = enemy.isBoss ? 130 : enemy.type === "ogre" ? 104 : enemy.radius * 2.4;
  const height = enemy.isBoss ? 166 : enemy.type === "ogre" ? 136 : enemy.radius * 2.9;
  g.lineStyle(enemy.type === "ogre" ? 2 : 1, color, enemy.hitFlash > 0 ? 0.42 : 0.22);
  g.strokeEllipse(enemy.x, enemy.y - enemy.radius * 0.55, width, height);
  g.fillStyle(color, enemy.hitFlash > 0 ? 0.09 : 0.045);
  g.fillEllipse(enemy.x, enemy.y + enemy.radius * 0.32, width * 0.72, enemy.radius * 0.72);
}

function getEnemyReadabilityColor(enemy) {
  if (enemy.type === "skeleton") return 0xf0dfb8;
  if (enemy.type === "zombie") return 0x8db47b;
  if (enemy.type === "ghoul") return 0xd86da4;
  return 0xc0915c;
}

function drawFireCone(g, x, y, dir, radius, alpha) {
  const length = radius * 1.55;
  const width = radius * 1.0;
  g.fillStyle(0xff6b2a, alpha);
  g.fillTriangle(x, y - 32, x + dir * length, y - width * 0.5, x + dir * length, y + width * 0.5);
  g.fillStyle(0xffc46a, alpha * 0.55);
  g.fillTriangle(x + dir * 20, y - 14, x + dir * length * 0.78, y - width * 0.25, x + dir * length * 0.78, y + width * 0.25);
}

function drawWideSpellCone(g, x, y, dir, radius, color, alpha) {
  const length = radius * 1.9;
  const width = radius * 1.18;
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(x, y - 40);
  g.lineTo(x + dir * length * 0.58, y - width * 0.62);
  g.lineTo(x + dir * length, y - width * 0.36);
  g.lineTo(x + dir * length, y + width * 0.36);
  g.lineTo(x + dir * length * 0.58, y + width * 0.62);
  g.lineTo(x, y + 28);
  g.closePath();
  g.fillPath();
}

function drawFrostCone(g, x, y, dir, radius, alpha) {
  const length = radius * 1.25;
  const width = radius * 0.86;
  g.fillStyle(0x9be7ff, alpha);
  g.fillTriangle(x, y - 18, x + dir * length, y - width * 0.5, x + dir * length, y + width * 0.5);
  g.lineStyle(2, 0xd8fbff, alpha * 3);
  g.lineBetween(x, y - 18, x + dir * length, y - width * 0.5);
  g.lineBetween(x, y + 18, x + dir * length, y + width * 0.5);
}

function drawStaffEffect(g, attack, p, debugView) {
  if (attack.shape === "thrust") {
    const startX = attack.originX + attack.facing * 20;
    const endX = attack.originX + attack.facing * attack.width;
    g.lineStyle(7, 0xfff0c8, 0.95 * p);
    g.lineBetween(startX, attack.y - 6, endX, attack.y - 6);
    g.lineStyle(2, 0x81d6ff, 0.55 * p);
    g.lineBetween(startX, attack.y + 5, endX, attack.y + 5);
  }
  if (attack.shape === "arc") {
    g.lineStyle(7, 0xd7b466, 0.95 * p);
    drawMeleeArc(g, attack.originX, attack.originY, attack.facing, attack.radius * (1 - p * 0.15), p, 0.9);
  }
  if (attack.shape === "heavyArc") {
    g.lineStyle(9, 0x8f6d45, 0.95 * p);
    drawMeleeArc(g, attack.originX, attack.originY, attack.facing, attack.radius * (1 - p * 0.12), p, 1.2);
    g.lineStyle(3, 0xffe4a8, 0.45 * p);
    drawMeleeArc(g, attack.originX, attack.originY, attack.facing, attack.radius * 0.65, p, 1.0);
  }
  if (attack.shape === "shockwave") {
    g.fillStyle(0x6fcfff, 0.12 * p);
    g.fillCircle(attack.x, attack.y, attack.radius * (1.05 - p * 0.18));
    g.lineStyle(5, 0xffd982, 0.9 * p);
    g.strokeCircle(attack.x, attack.y, attack.radius * (1 - p * 0.18));
    g.lineStyle(2, 0xb9edff, 0.8 * p);
    g.strokeCircle(attack.x, attack.y, attack.radius * 0.62);
  }
  if (debugView) drawStaffDebug(g, attack);
}

function drawMeleeArc(g, x, y, dir, radius, p, spread = 0.95) {
  const start = dir > 0 ? -0.95 : Math.PI - 0.95;
  const end = dir > 0 ? spread : Math.PI + spread;
  g.beginPath();
  g.arc(x + dir * 18, y - 4, radius, dir > 0 ? -spread : Math.PI - spread, end);
  g.strokePath();
  g.lineStyle(2, 0xffe4a8, 0.45 * p);
  g.beginPath();
  g.arc(x + dir * 22, y - 4, radius * 0.72, dir > 0 ? -spread : Math.PI - spread, end);
  g.strokePath();
}

function drawStaffDebug(g, attack) {
  g.lineStyle(1, 0x55d1ff, 0.75);
  if (attack.shape === "thrust") {
    g.strokeRect(attack.x - attack.width / 2, attack.y - attack.height / 2, attack.width, attack.height);
    return;
  }
  g.strokeCircle(attack.x, attack.y, attack.radius);
}

function staffAttackHits(attack, enemy) {
  if (attack.shape === "thrust") {
    const halfW = attack.width / 2 + enemy.radius;
    const halfH = attack.height / 2 + enemy.radius;
    return Math.abs(enemy.x - attack.x) <= halfW && Math.abs(enemy.y - attack.y) <= halfH && isInFront(attack, enemy);
  }
  if (distance(attack, enemy) > attack.radius + enemy.radius) return false;
  if (attack.shape === "shockwave") return isInFrontCone(attack, enemy, 0.35);
  return isInFrontCone(attack, enemy, attack.shape === "heavyArc" ? -0.2 : 0.05);
}

function isInFront(attack, enemy) {
  return (enemy.x - attack.originX) * attack.facing > -8;
}

function isInFrontCone(attack, enemy, tolerance) {
  const dx = (enemy.x - attack.originX) * attack.facing;
  return dx > -attack.radius * tolerance;
}

function drawActiveEnemyOverlay(g, enemy, debugView) {
  const barW = enemy.isBoss ? 116 : enemy.type === "ogre" ? 76 : 42;
  const barY = enemy.y - enemy.radius * 2.45;
  const pct = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1);
  g.fillStyle(0x070708, 0.9);
  g.fillRect(enemy.x - barW / 2, barY, barW, 5);
  g.fillStyle(enemy.type === "ogre" ? 0x9b2e2a : 0xc6a15f, 1);
  g.fillRect(enemy.x - barW / 2, barY, barW * pct, 5);
  if (enemy.slow > 0 || enemy.freeze > 0) {
    g.lineStyle(2, 0x9be7ff, enemy.freeze > 0 ? 0.95 : 0.55);
    g.strokeCircle(enemy.x, enemy.y - enemy.radius * 0.2, enemy.radius + 7);
  }
  if (enemy.burn > 0) {
    g.lineStyle(2, 0xff8a3a, 0.45);
    g.strokeCircle(enemy.x, enemy.y - enemy.radius * 0.2, enemy.radius + 3);
  }
  if (!debugView) return;
  g.lineStyle(1, 0x55d1ff, 0.8);
  g.strokeCircle(enemy.x, enemy.y, enemy.radius);
}

function drawEnemyTelegraph(g, enemy) {
  if (enemy.specialState === "ghoulWindup") {
    const p = 1 - enemy.specialTimer / 0.58;
    g.lineStyle(3, 0xff5d8a, 0.35 + p * 0.45);
    g.lineBetween(enemy.x, enemy.y - 18, enemy.specialTargetX, enemy.specialTargetY - 10);
    g.fillStyle(0xff5d8a, 0.12 + p * 0.12);
    g.fillCircle(enemy.specialTargetX, enemy.specialTargetY - 10, 18 + p * 12);
  }
  if (enemy.specialState === "ghoulRecover") {
    g.lineStyle(2, 0xff9ab4, 0.35);
    g.strokeCircle(enemy.x, enemy.y - 12, enemy.radius + 8);
  }
  if (enemy.specialState === "ogreWindup") {
    const windup = enemy.isBoss ? 0.82 : 0.68;
    const p = 1 - enemy.specialTimer / windup;
    const radius = enemy.isBoss ? 96 : 78;
    g.fillStyle(0x9b2e2a, 0.09 + p * 0.12);
    g.fillCircle(enemy.specialTargetX, enemy.specialTargetY, radius);
    g.lineStyle(4, 0xd85a3a, 0.35 + p * 0.45);
    g.strokeCircle(enemy.specialTargetX, enemy.specialTargetY, radius * (0.7 + p * 0.3));
  }
  if (enemy.specialState === "ogreSlam") {
    const radius = enemy.isBoss ? 96 : 78;
    g.lineStyle(5, 0xffc06a, 0.6);
    g.strokeCircle(enemy.specialTargetX, enemy.specialTargetY, radius);
  }
}

function drawLightningChain(g, start, targets, offset) {
  let last = start;
  for (const target of targets) {
    const midX = (last.x + target.x) * 0.5;
    const midY = (last.y + target.y) * 0.5 + offset;
    g.lineBetween(last.x, last.y - 20, midX, midY - 25);
    g.lineBetween(midX, midY - 25, target.x, target.y - 25);
    const branchDir = target.x > last.x ? 1 : -1;
    g.lineBetween(midX, midY - 25, midX - branchDir * 24, midY - 48);
    g.lineBetween(midX, midY - 25, midX + branchDir * 18, midY + 8);
    last = target;
  }
}

function drawJaggedLightningChain(g, start, targets, offset, seed = 0) {
  let last = { x: start.x, y: start.y - 20 };
  for (let t = 0; t < targets.length; t += 1) {
    const target = { x: targets[t].x, y: targets[t].y - 25 };
    const dx = target.x - last.x;
    const dy = target.y - last.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    let px = last.x;
    let py = last.y;
    for (let i = 1; i <= 5; i += 1) {
      const phase = (seed + t * 11 + i * 5) % 9;
      const wobble = ((phase - 4) / 4) * (18 + Math.min(30, length * 0.05));
      const ratio = i / 5;
      const x = Phaser.Math.Linear(last.x, target.x, ratio) + nx * (wobble + offset * 0.25);
      const y = Phaser.Math.Linear(last.y, target.y, ratio) + ny * wobble + offset;
      g.lineBetween(px, py, x, y);
      if (i === 2 || i === 4) {
        const branch = i === 2 ? 1 : -1;
        g.lineBetween(x, y, x + nx * branch * 34 + dx * 0.08, y + ny * branch * 34 - 18);
      }
      px = x;
      py = y;
    }
    last = target;
  }
}

function drawLightningImpacts(g, targets, p) {
  for (const target of targets) {
    const radius = (target.r ?? 20) + 18;
    g.fillStyle(0x76d7ff, 0.1 * p);
    g.fillCircle(target.x, target.y - 18, radius);
    g.lineStyle(3, 0xbdf2ff, 0.85 * p);
    g.strokeCircle(target.x, target.y - 18, radius * (1 - p * 0.25));
    g.lineStyle(2, 0xffffff, 0.7 * p);
    g.lineBetween(target.x - radius * 0.55, target.y - 18, target.x + radius * 0.55, target.y - 18);
    g.lineBetween(target.x, target.y - 18 - radius * 0.55, target.x, target.y - 18 + radius * 0.55);
  }
}

function drawHeatRakes(g, x, y, dir, radius, q, p) {
  for (let i = 0; i < 7; i += 1) {
    const yy = y - radius * 0.34 + i * radius * 0.11;
    const startX = x - dir * radius * (0.62 - q * 0.15);
    const endX = x + dir * radius * (0.72 + q * 0.68);
    const bend = Math.sin(i * 1.7 + q * 3.2) * radius * 0.08;
    g.lineStyle(i % 2 === 0 ? 3 : 2, i % 2 === 0 ? 0xffd16d : 0xff5a1f, (0.46 - i * 0.035) * p);
    g.beginPath();
    g.moveTo(startX, yy);
    g.lineTo(x + dir * radius * 0.1, yy + bend);
    g.lineTo(endX, yy - bend * 0.55);
    g.strokePath();
  }
}

function drawFrostCracks(g, x, y, radius, q, p) {
  g.lineStyle(2, 0xe7fdff, 0.7 * p);
  for (let i = 0; i < 9; i += 1) {
    const a = -Math.PI * 0.92 + i * (Math.PI * 1.84 / 8);
    const inner = radius * (0.12 + q * 0.18);
    const mid = radius * (0.44 + q * 0.36);
    const outer = radius * (0.76 + q * 0.62);
    const sx = x + Math.cos(a) * inner;
    const sy = y + Math.sin(a) * inner * 0.34;
    const mx = x + Math.cos(a + 0.12 * (i % 2 ? 1 : -1)) * mid;
    const my = y + Math.sin(a) * mid * 0.31;
    const ex = x + Math.cos(a) * outer;
    const ey = y + Math.sin(a) * outer * 0.27;
    g.lineBetween(sx, sy, mx, my);
    g.lineBetween(mx, my, ex, ey);
  }
}

function drawSnowStar(g, x, y, radius, color, alpha) {
  g.lineStyle(2, color, alpha);
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI;
    g.lineBetween(x - Math.cos(a) * radius, y - Math.sin(a) * radius, x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
}

function drawElectricStar(g, x, y, radius, p) {
  g.lineStyle(4, 0xa9edff, 0.82 * p);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const mid = radius * (0.28 + (i % 2) * 0.18);
    const outer = radius * (0.8 + (i % 3) * 0.16);
    g.lineBetween(
      x + Math.cos(a) * mid,
      y + Math.sin(a) * mid,
      x + Math.cos(a + (i % 2 ? 0.08 : -0.08)) * outer,
      y + Math.sin(a + (i % 2 ? 0.08 : -0.08)) * outer,
    );
  }
  g.lineStyle(1, 0xffffff, 0.95 * p);
  g.strokeCircle(x, y, radius * 0.34);
}

function getGoldValue(enemy) {
  if (enemy.isBoss) return 35;
  if (enemy.type === "ogre") return 12;
  if (enemy.type === "ghoul") return 5;
  if (enemy.type === "zombie") return 4;
  return 3;
}

function getReachablePickupPosition(x, y, player) {
  const wasBeyondRight = x > PICKUP_BOUNDS.right;
  let orbX = wasBeyondRight ? PICKUP_BOUNDS.right - 70 : clamp(x, PICKUP_BOUNDS.left, PICKUP_BOUNDS.right);
  let orbY = clamp(y, PICKUP_BOUNDS.top, PICKUP_BOUNDS.bottom);
  let moved = wasBeyondRight || x !== orbX || y !== orbY;

  if (distance({ x: orbX, y: orbY }, player) < PICKUP_MIN_PLAYER_DISTANCE) {
    const preferredX = player.x > 520 ? player.x - PICKUP_MIN_PLAYER_DISTANCE : player.x + PICKUP_MIN_PLAYER_DISTANCE;
    const verticalNudge = player.y > (PICKUP_BOUNDS.top + PICKUP_BOUNDS.bottom) / 2 ? -72 : 72;
    orbX = clamp(preferredX, PICKUP_BOUNDS.left, PICKUP_BOUNDS.right - 40);
    orbY = clamp(player.y + verticalNudge, PICKUP_BOUNDS.top, PICKUP_BOUNDS.bottom);
    moved = true;
  }

  return { x: orbX, y: orbY, moved };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fitImageCover(image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  image.setScale(scale);
}
