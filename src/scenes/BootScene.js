export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.image("blackhavenBackgroundConcept", "assets/concept/blackhaven-background-concept.png");
    this.load.image("blackhavenChurchyardConcept", "assets/concept/blackhaven-churchyard-concept.png");
    this.load.image("blackhavenForestConcept", "assets/concept/blackhaven-forest-concept.png");
    this.load.image("blackhavenGroundConcept", "assets/concept/blackhaven-ground-strip-concept.png");
    this.load.image("blackhavenChurchyardGroundConcept", "assets/concept/blackhaven-churchyard-ground-strip.png");
    this.load.image("blackhavenForestGroundConcept", "assets/concept/blackhaven-forest-ground-strip.png");
    this.load.image("blackhavenStartArt", "assets/concept/start-screen-art.png");
    this.load.image("uiFrameHudWide", "assets/ui/frame-hud-wide.png");
    this.load.image("uiFrameSkillSlot", "assets/ui/frame-skill-slot.png");
    this.load.image("uiFrameCardPanel", "assets/ui/frame-card-panel.png");
    this.load.image("uiFrameButtonWide", "assets/ui/frame-button-wide.png");
    this.load.image("playerMageConcept", "assets/sprites/player/mage-concept.png");
    this.load.spritesheet("playerMageIdleStable", "assets/sprites/player/mage-idle-from-cast.png", { frameWidth: 468, frameHeight: 280 });
    this.load.spritesheet("playerMageWalk", "assets/sprites/player/mage-walk.png", { frameWidth: 320, frameHeight: 254 });
    this.load.spritesheet("playerMageStaffAttack", "assets/sprites/player/mage-staff-attack-v2.png", { frameWidth: 360, frameHeight: 280 });
    this.load.spritesheet("playerMageCast", "assets/sprites/player/mage-cast.png", { frameWidth: 468, frameHeight: 280 });
    this.load.spritesheet("fireProjectileFx", "assets/sprites/fx/fire-projectile.png", { frameWidth: 320, frameHeight: 180 });
    this.load.spritesheet("lightningImpactFx", "assets/sprites/fx/lightning-impact.png", { frameWidth: 340, frameHeight: 220 });
    this.load.spritesheet("frostAreaFx", "assets/sprites/fx/frost-area.png", { frameWidth: 340, frameHeight: 220 });
    this.load.spritesheet("enemySkeletonWalk", "assets/sprites/enemies/skeleton-walk.png", { frameWidth: 220, frameHeight: 180 });
    this.load.spritesheet("enemyZombieWalk", "assets/sprites/enemies/zombie-walk.png", { frameWidth: 314, frameHeight: 209, spacing: 4 });
    this.load.spritesheet("enemyGhoulWalk", "assets/sprites/enemies/ghoul-walk.png", { frameWidth: 314, frameHeight: 180, spacing: 4 });
    this.load.audio("sfxFireball", "assets/audio/fx/fireball.mp3");
    this.load.audio("sfxShock", "assets/audio/fx/shock1.mp3");
    this.load.audio("sfxFrost", "assets/audio/fx/frost1.mp3");
    this.load.audio("sfxStaff", "assets/audio/fx/stab1.mp3");
    this.load.image("enemySkeletonConcept", "assets/sprites/enemies/skeleton-concept.png");
    this.load.image("enemyZombieConcept", "assets/sprites/enemies/zombie-concept.png");
    this.load.image("enemyGhoulConcept", "assets/sprites/enemies/ghoul-concept.png");
    this.load.image("enemyOgreConcept", "assets/sprites/enemies/ogre-concept.png");
    this.createMageTexture();
    this.createEnemyTextures();
    this.createFxTextures();
  }

  create() {
    this.scene.start("MenuScene");
  }

  createMageTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x03111b, 0.34);
    g.fillEllipse(41, 63, 66, 104);
    g.fillStyle(0x050506, 1);
    g.fillEllipse(42, 16, 19, 22);
    g.fillStyle(0x08080b, 1);
    g.fillTriangle(20, 28, 57, 25, 73, 108);
    g.fillTriangle(30, 27, 3, 105, 45, 91);
    g.fillTriangle(55, 30, 82, 102, 48, 94);
    g.fillStyle(0x181621, 1);
    g.fillRoundedRect(31, 28, 23, 50, 6);
    g.fillStyle(0x2d2735, 0.95);
    g.fillRoundedRect(35, 35, 14, 38, 4);
    g.lineStyle(3, 0x7fc7ff, 0.62);
    g.beginPath();
    g.moveTo(17, 38);
    g.lineTo(8, 78);
    g.lineTo(26, 91);
    g.strokePath();
    g.lineStyle(3, 0xd6b25e, 0.9);
    g.lineBetween(61, 22, 70, 93);
    g.lineStyle(2, 0xffe0a2, 0.72);
    g.lineBetween(65, 20, 74, 91);
    g.fillStyle(0xb9332d, 0.9);
    g.fillCircle(71, 22, 5);
    g.fillStyle(0x9edfff, 0.88);
    g.fillCircle(21, 41, 4);
    g.lineStyle(2, 0xbfdfff, 0.7);
    g.strokeEllipse(41, 58, 56, 92);
    g.lineStyle(2, 0xf0d29a, 0.45);
    g.lineBetween(32, 30, 26, 78);
    g.generateTexture("mage", 84, 112);
    g.destroy();
  }

  createEnemyTextures() {
    const defs = [
      ["skeleton", 38, 58, 0xe2d8bd, 0x242227],
      ["zombie", 58, 74, 0x5f7a55, 0x1d261c],
      ["ghoul", 48, 56, 0xb64b73, 0x21131b],
      ["ogre", 112, 138, 0x40372f, 0x121010],
    ];

    for (const [key, w, h, body, shadow] of defs) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(shadow, 0.95);
      g.fillEllipse(w / 2, h - 8, w * 0.8, h * 0.24);
      g.fillStyle(body, 0.95);
      g.fillEllipse(w / 2, h * 0.25, w * 0.42, h * 0.3);
      g.fillRoundedRect(w * 0.25, h * 0.36, w * 0.5, h * 0.42, 7);
      g.lineStyle(Math.max(3, w * 0.05), body, 0.9);
      g.lineBetween(w * 0.26, h * 0.48, w * 0.08, h * 0.7);
      g.lineBetween(w * 0.74, h * 0.48, w * 0.94, h * 0.7);
      g.lineBetween(w * 0.38, h * 0.76, w * 0.3, h);
      g.lineBetween(w * 0.62, h * 0.76, w * 0.72, h);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  createFxTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xff6d2f, 1);
    g.fillCircle(24, 24, 22);
    g.fillStyle(0xffd36d, 0.8);
    g.fillCircle(18, 18, 10);
    g.generateTexture("fireball", 48, 48);
    g.clear();
    g.lineStyle(6, 0x8bd7ff, 1);
    g.lineBetween(4, 24, 20, 10);
    g.lineBetween(20, 10, 28, 33);
    g.lineBetween(28, 33, 44, 16);
    g.generateTexture("lightning", 48, 48);
    g.clear();
    g.lineStyle(5, 0xb7f2ff, 0.9);
    g.strokeCircle(32, 32, 27);
    g.generateTexture("frostRing", 64, 64);
    g.destroy();
  }
}
