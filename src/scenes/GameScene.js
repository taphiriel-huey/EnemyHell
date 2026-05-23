import { createPlayer, performMelee, updatePlayer, canMelee } from "../systems/player.js";
import { createEnemy, damageEnemy, distance, knockEnemy, staggerEnemy, updateEnemies } from "../systems/enemies.js";
import { createWaveSystem, updateWaves, markBossDefeated } from "../systems/waves.js";
import { createSpellState, updateSpellCooldowns, castFireball, castLightning, castFrost, getSkillbarState, reduceLastSpellCooldown, getStaffDamage } from "../systems/spells.js";
import { getCardChoices } from "../systems/cards.js";
import { createHud, drawHud, createCardOverlay } from "../systems/ui.js";

const BOUNDS = { left: 90, right: 690, top: 380, bottom: 650 };
const PICKUP_BOUNDS = { left: 90, right: 660, top: 395, bottom: 635 };
const PICKUP_MIN_PLAYER_DISTANCE = 150;

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
  }

  create() {
    this.player = createPlayer();
    this.spells = createSpellState();
    this.waves = createWaveSystem();
    this.enemies = [];
    this.pickups = [];
    this.effects = [];
    this.floatTexts = [];
    this.kills = 0;
    this.score = 0;
    this.gold = 0;
    this.cardsPicked = 0;
    this.pausedForCard = false;
    this.nextCardAt = 60;
    this.gameOver = false;
    this.victory = false;
    this.debugView = false;
    this.runFocusLabel = applyStartFocus(this.startFocus, this.player, this.spells);

    this.createInput();
    this.createWorld();
    this.playerLayer = this.add.graphics().setDepth(29);
    this.mage = this.add.sprite(this.player.x, this.player.y - 34, "mage").setDepth(30);
    this.mage.setScale(1.16);
    this.enemySprites = new Map();
    this.hud = createHud(this);
    this.addFloatText(`Fokus: ${this.runFocusLabel}`, 640, 164, "#f3d69d");
  }

  createInput() {
    this.heldKeys = new Set();
    this.pressedKeys = new Set();
    this.onKeyDown = (event) => {
      const key = normalizeKey(event.key);
      if (isGameKey(key)) event.preventDefault();
      if (!event.repeat) this.pressedKeys.add(key);
      this.heldKeys.add(key);
    };
    this.onKeyUp = (event) => {
      this.heldKeys.delete(normalizeKey(event.key));
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
    });
    this.inputState = { up: false, left: false, down: false, right: false, dash: false };
  }

  createWorld() {
    this.bg = this.add.graphics().setDepth(0);
    this.previewLayer = this.add.graphics().setDepth(6);
    this.warningLayer = this.add.graphics().setDepth(12);
    this.ground = this.add.graphics().setDepth(18);
    this.activeInfoLayer = this.add.graphics().setDepth(58);
    this.pickupLayer = this.add.graphics().setDepth(27);
    this.fxLayer = this.add.graphics().setDepth(60);
    drawWorld(this.bg, this.scale.width, this.scale.height);
  }

  update(_, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.033);
    if (this.pausedForCard || this.gameOver) return;

    this.readInput();
    updatePlayer(this.player, this.inputState, dt, BOUNDS);
    updateSpellCooldowns(this.spells, dt);
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
    this.inputState.dash = this.consumePressed(" ");
    if (this.consumePressed("f1")) this.debugView = !this.debugView;
  }

  handleActions() {
    if (this.consumePressed("j") && canMelee(this.player)) {
      const attack = performMelee(this.player);
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

    if (this.consumePressed("1")) this.consumeSpell(castFireball(this.player, this.enemies, this.spells));
    if (this.consumePressed("2")) this.consumeSpell(castLightning(this.player, this.enemies, this.spells));
    if (this.consumePressed("3")) this.consumeSpell(castFrost(this.player, this.enemies, this.spells));
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
    if (result.kind === "fire") {
      this.effects.push({ kind: "fire", ...result.impact, t: 0.36, max: 0.36 });
      this.cameras.main.shake(130, 0.006);
    }
    if (result.kind === "lightning") {
      this.effects.push({ kind: "lightning", start: result.start, targets: result.targets.map((e) => ({ x: e.x, y: e.y, r: e.radius })), t: 0.32, max: 0.32 });
      this.cameras.main.shake(95, 0.004);
    }
    if (result.kind === "frost") {
      this.effects.push({ kind: "frost", ...result.cone, t: 0.42, max: 0.42 });
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
  }

  updateEffects(dt) {
    for (const effect of this.effects) effect.t -= dt;
    this.effects = this.effects.filter((effect) => effect.t > 0);
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
    drawGround(this.ground);
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
    drawPlayerReadability(this.playerLayer, this.player);
    this.mage.setPosition(this.player.x, this.player.y - 36);
    this.mage.setFlipX(this.player.facing < 0);
    this.mage.setAlpha(this.player.invulnerable > 0 ? 0.65 : 1);

    for (const enemy of this.enemies) {
      let sprite = this.enemySprites.get(enemy);
      if (!sprite) {
        sprite = this.add.sprite(enemy.x, enemy.y, enemy.type).setDepth(24);
        this.enemySprites.set(enemy, sprite);
      }
      sprite.setScale(enemy.isBoss ? 1.28 : 1);
      const recoilLift = enemy.recoil > 0 ? Math.sin(enemy.recoil * 55) * 5 : 0;
      sprite.setPosition(enemy.x, enemy.y - enemy.radius * 0.7 - recoilLift);
      sprite.setDepth(20 + enemy.y * 0.02);
      sprite.setTint(getEnemyTint(enemy));
      sprite.setAlpha(1);
      drawActiveEnemyOverlay(this.activeInfoLayer, enemy, this.debugView);
      drawEnemyTelegraph(this.activeInfoLayer, enemy);
    }

    this.drawEffects();
  }

  drawEffects() {
    this.fxLayer.clear();
    for (const effect of this.effects) {
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
        this.fxLayer.lineStyle(16, 0x1f3f83, 0.26 * p);
        drawLightningChain(this.fxLayer, effect.start, effect.targets, 30);
        this.fxLayer.lineStyle(12, 0x294f8f, 0.48 * p);
        drawLightningChain(this.fxLayer, effect.start, effect.targets, 18);
        this.fxLayer.lineStyle(6, 0x97dcff, 0.98 * p);
        drawLightningChain(this.fxLayer, effect.start, effect.targets, 0);
        this.fxLayer.lineStyle(1, 0xffffff, 0.95 * p);
        drawLightningChain(this.fxLayer, effect.start, effect.targets, -12);
        drawLightningImpacts(this.fxLayer, effect.targets, p);
      }
    }
  }

  checkCards() {
    if (this.waves.time >= this.nextCardAt) {
      this.pausedForCard = true;
      const cards = getCardChoices();
      createCardOverlay(this, cards, (card) => {
        card.apply(this.spells);
        this.cardsPicked += 1;
        this.nextCardAt += 60;
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
        hotkey: "J",
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

  showRunSummary(result) {
    this.gameOver = true;
    this.pausedForCard = false;
    const title = result === "victory" ? "BLACKHAVEN HAELT STAND" : "BLACKHAVEN FAELLT";
    const subtitle = result === "victory" ? "Der Torbrecher ist gefallen." : getDefeatLine(this.waves.wave);
    const depth = 3000;
    this.add.rectangle(640, 360, 1280, 720, 0x070607, 0.76).setDepth(depth);
    const g = this.add.graphics().setDepth(depth + 1);
    drawEndPanel(g, result);

    this.add.text(640, 134, title, { fontFamily: "Georgia, serif", fontSize: "42px", color: "#f1dec0", stroke: "#070607", strokeThickness: 5 }).setOrigin(0.5).setDepth(depth + 2);
    this.add.text(640, 184, subtitle, { fontFamily: "Georgia, serif", fontSize: "18px", color: result === "victory" ? "#d8b976" : "#bfa985" }).setOrigin(0.5).setDepth(depth + 2);

    this.add.text(640, 222, this.waves.phaseName, { fontFamily: "Georgia, serif", fontSize: "15px", color: "#d6bd91" }).setOrigin(0.5).setDepth(depth + 2);
    const leftRows = [
      ["Ueberlebt", formatTime(this.waves.time)],
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

    this.add.text(640, 504, result === "victory" ? "Naechster Testlauf: anderer Fokus, anderer Rhythmus." : "Nochmal rein, Fokus wechseln, Front anders lesen.", {
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
  return ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright", " ", "j", "1", "2", "3", "f1"].includes(key);
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
  button.setSize(184, 48).setInteractive({ useHandCursor: true });
  button.on("pointerdown", action);
  return { button, action };
}

function getDefeatLine(wave) {
  if (wave >= 4) return "Der Torbrecher hat die Linie gebrochen.";
  if (wave >= 3) return "Der Hof wurde ueberrannt.";
  if (wave >= 2) return "Die Gassen haben dich verschluckt.";
  return "Der Dorfplatz war noch nicht bereit.";
}

function formatTime(time) {
  const seconds = Math.max(0, Math.floor(time));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function drawWorld(g, w, h) {
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

function drawGround(g) {
  g.fillStyle(0x0d0c0d, 0.92);
  g.fillRect(0, 565, 1280, 155);
  g.fillStyle(0x171113, 0.96);
  g.fillEllipse(625, 620, 1120, 138);
  g.lineStyle(1, 0x6a4c36, 0.42);
  g.lineBetween(70, 590, 1230, 548);
  g.lineBetween(120, 650, 1180, 606);
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

function drawPlayerReadability(g, player) {
  g.fillStyle(0x70c8ff, 0.12);
  g.fillEllipse(player.x, player.y - 30, 86, 122);
  g.lineStyle(2, 0xd6b25e, 0.65);
  g.strokeEllipse(player.x, player.y - 30, 58, 100);
  g.fillStyle(0x050506, 0.78);
  g.fillEllipse(player.x, player.y + 12, 62, 18);
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

function drawFireCone(g, x, y, dir, radius, alpha) {
  const length = radius * 1.55;
  const width = radius * 1.0;
  g.fillStyle(0xff6b2a, alpha);
  g.fillTriangle(x, y - 32, x + dir * length, y - width * 0.5, x + dir * length, y + width * 0.5);
  g.fillStyle(0xffc46a, alpha * 0.55);
  g.fillTriangle(x + dir * 20, y - 14, x + dir * length * 0.78, y - width * 0.25, x + dir * length * 0.78, y + width * 0.25);
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
