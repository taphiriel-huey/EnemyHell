export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.createMageTexture();
    this.createEnemyTextures();
    this.createFxTextures();
  }

  create() {
    this.scene.start("MenuScene");
  }

  createMageTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x050506, 1);
    g.fillEllipse(32, 16, 20, 22);
    g.fillStyle(0x0a0a0d, 1);
    g.fillTriangle(10, 27, 52, 25, 62, 94);
    g.fillTriangle(20, 26, 3, 92, 39, 83);
    g.fillStyle(0x27232e, 1);
    g.fillRoundedRect(21, 26, 21, 46, 5);
    g.lineStyle(5, 0xd6b25e, 1);
    g.lineBetween(50, 22, 59, 84);
    g.fillStyle(0xb9332d, 0.9);
    g.fillCircle(60, 22, 5);
    g.lineStyle(2, 0xbfdfff, 0.45);
    g.strokeEllipse(32, 54, 48, 82);
    g.generateTexture("mage", 64, 96);
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
