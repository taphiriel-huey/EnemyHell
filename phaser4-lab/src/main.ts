import Phaser from 'phaser';
import './styles.css';

const WIDTH = 960;
const HEIGHT = 540;

type EnemyView = {
  body: Phaser.GameObjects.Image;
  aura: Phaser.GameObjects.Image;
  speed: number;
  phase: number;
  baseX: number;
  baseY: number;
  frostFx?: any;
};

class LabScene extends Phaser.Scene {
  private wizard!: Phaser.GameObjects.Container;
  private enemies: EnemyView[] = [];
  private warningOverlay!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Graphics;
  private cycleTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('lab');
  }

  preload() {
    this.createGeneratedTextures();
  }

  create() {
    this.cameras.main.setBackgroundColor('#09070d');
    this.createBackground();
    this.createWizard();
    this.createEnemies();
    this.createOverlays();
    this.bindHud();

    this.cycleTimer = this.time.addEvent({
      delay: 1850,
      loop: true,
      callback: () => this.castNextSpell(),
    });

    this.time.delayedCall(400, () => this.castFire());
  }

  update(time: number, delta: number) {
    for (const enemy of this.enemies) {
      const slow = enemy.frostFx ? 0.28 : 1;
      enemy.phase += (delta / 1000) * enemy.speed * slow;
      enemy.body.x = enemy.baseX + Math.sin(enemy.phase) * 10;
      enemy.body.y = enemy.baseY + Math.cos(enemy.phase * 0.8) * 6;
      enemy.aura.setPosition(enemy.body.x, enemy.body.y);
    }

    this.wizard.y = 340 + Math.sin(time * 0.002) * 4;
  }

  private createGeneratedTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.clear();
    g.fillStyle(0x1b1025, 1);
    g.fillCircle(24, 25, 20);
    g.fillStyle(0x332052, 1);
    g.fillCircle(24, 20, 14);
    g.fillStyle(0x7f4fd4, 1);
    g.fillTriangle(24, 3, 10, 31, 38, 31);
    g.fillStyle(0xe7d4ff, 1);
    g.fillCircle(24, 23, 7);
    g.fillStyle(0xf5a742, 1);
    g.fillRect(22, 31, 4, 22);
    g.generateTexture('wizard', 48, 60);

    g.clear();
    g.fillStyle(0x15151d, 1);
    g.fillEllipse(20, 24, 32, 38);
    g.fillStyle(0x2c3540, 1);
    g.fillEllipse(20, 20, 20, 22);
    g.fillStyle(0xdd3655, 1);
    g.fillCircle(14, 20, 2);
    g.fillCircle(26, 20, 2);
    g.generateTexture('enemy', 40, 48);

    g.clear();
    g.fillStyle(0xff7a1a, 1);
    g.fillCircle(32, 32, 16);
    g.fillStyle(0xffd65a, 1);
    g.fillCircle(38, 28, 8);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(42, 25, 4);
    g.generateTexture('fire-orb', 64, 64);

    g.clear();
    g.lineStyle(6, 0xeef7ff, 1);
    g.beginPath();
    g.moveTo(8, 4);
    g.lineTo(30, 34);
    g.lineTo(22, 34);
    g.lineTo(50, 76);
    g.strokePath();
    g.lineStyle(15, 0x5ee7ff, 0.24);
    g.strokePath();
    g.generateTexture('bolt', 64, 84);

    g.clear();
    g.fillStyle(0x78dfff, 0.32);
    g.fillCircle(40, 40, 34);
    g.lineStyle(2, 0xd8fbff, 0.85);
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      g.lineBetween(40, 40, 40 + Math.cos(a) * 32, 40 + Math.sin(a) * 32);
    }
    g.generateTexture('frost-ring', 80, 80);

    g.destroy();
  }

  private createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x06050a, 0x120d1d, 0x111827, 0x05070a, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 70; i += 1) {
      const x = Phaser.Math.Between(0, WIDTH);
      const y = Phaser.Math.Between(8, 285);
      const alpha = Phaser.Math.FloatBetween(0.05, 0.22);
      bg.fillStyle(0x7b8da8, alpha);
      bg.fillCircle(x, y, Phaser.Math.FloatBetween(0.7, 1.8));
    }

    bg.fillStyle(0x151018, 1);
    bg.fillRect(0, 380, WIDTH, 160);
    bg.fillStyle(0x20162a, 1);
    bg.fillTriangle(0, 386, 180, 250, 360, 386);
    bg.fillTriangle(230, 388, 520, 205, 810, 388);
    bg.fillTriangle(590, 388, 790, 245, 1010, 388);

    const mist = this.add.rectangle(WIDTH / 2, 392, WIDTH, 72, 0x7a6a9e, 0.12);
    const glow = this.add.rectangle(WIDTH / 2, 400, WIDTH, 130, 0x2f1d36, 0.22);
    (mist as any).postFX?.addBlur?.(0, 2, 2, 1, 0xffffff, 4);
    (glow as any).postFX?.addGlow?.(0xa062ff, 0.45, 0, false, 0.05, 16);
  }

  private createWizard() {
    const shadow = this.add.ellipse(0, 50, 88, 22, 0x000000, 0.45);
    const sprite = this.add.image(0, 0, 'wizard').setScale(1.8);
    const staffGlow = this.add.circle(32, -29, 10, 0xffa12a, 0.8);
    (staffGlow as any).postFX?.addGlow?.(0xff7a18, 2.4, 0, false, 0.2, 18);
    (sprite as any).postFX?.addGlow?.(0x8466ff, 0.7, 0, false, 0.05, 10);
    this.wizard = this.add.container(145, 340, [shadow, sprite, staffGlow]);
  }

  private createEnemies() {
    for (let i = 0; i < 10; i += 1) {
      const x = 390 + (i % 5) * 102;
      const y = 290 + Math.floor(i / 5) * 82;
      const aura = this.add.image(x, y, 'enemy').setScale(1.45).setAlpha(0.18).setTint(0x7c1d32);
      const body = this.add.image(x, y, 'enemy').setScale(1.24);
      (aura as any).postFX?.addGlow?.(0xd83b64, 0.9, 0, false, 0.1, 12);
      this.enemies.push({
        body,
        aura,
        speed: Phaser.Math.FloatBetween(1.5, 2.6),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        baseX: x,
        baseY: y,
      });
    }
  }

  private createOverlays() {
    this.warningOverlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x8d1230, 0)
      .setDepth(100)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.vignette = this.add.graphics().setDepth(101).setAlpha(0);
    this.vignette.fillStyle(0x000000, 0.72);
    this.vignette.fillRect(0, 0, WIDTH, HEIGHT);
    this.vignette.fillStyle(0x000000, 0);
    this.vignette.fillEllipse(WIDTH / 2, HEIGHT / 2, WIDTH * 0.74, HEIGHT * 0.72);
  }

  private bindHud() {
    document.querySelectorAll<HTMLButtonElement>('[data-spell]').forEach((button) => {
      button.addEventListener('click', () => {
        const spell = button.dataset.spell;
        if (spell === 'fire') this.castFire();
        if (spell === 'lightning') this.castLightning();
        if (spell === 'frost') this.castFrost();
        if (spell === 'boss') this.bossWarning();
      });
    });
  }

  private castNextSpell() {
    const spells = [() => this.castFire(), () => this.castLightning(), () => this.castFrost(), () => this.bossWarning()];
    spells[Phaser.Math.Between(0, spells.length - 1)]();
  }

  private castFire() {
    const target = Phaser.Utils.Array.GetRandom(this.enemies);
    const orb = this.add.image(190, 310, 'fire-orb')
      .setDepth(30)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.65);
    (orb as any).postFX?.addGlow?.(0xff7a18, 3.2, 0, false, 0.3, 22);
    (orb as any).postFX?.addBloom?.(0xffc247, 1.4, 1.2, 1.2, 1.5);

    this.tweens.add({
      targets: orb,
      x: target.body.x,
      y: target.body.y,
      scale: 1.18,
      angle: 260,
      duration: 520,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.fireImpact(target.body.x, target.body.y);
        this.hitFlash(target, 0xfff0b0);
        orb.destroy();
      },
    });
  }

  private fireImpact(x: number, y: number) {
    const ring = this.add.circle(x, y, 18, 0xff7718, 0.75)
      .setDepth(25)
      .setBlendMode(Phaser.BlendModes.ADD);
    (ring as any).postFX?.addGlow?.(0xffb02e, 2.6, 0, false, 0.25, 24);
    this.tweens.add({
      targets: ring,
      radius: 72,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private castLightning() {
    const target = Phaser.Utils.Array.GetRandom(this.enemies);
    const bolt = this.add.image(target.body.x, 150, 'bolt')
      .setDepth(35)
      .setScale(1.5, 2.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    (bolt as any).postFX?.addGlow?.(0x84efff, 2.8, 0, false, 0.15, 24);

    this.tweens.add({
      targets: bolt,
      y: target.body.y - 18,
      alpha: { from: 1, to: 0 },
      scaleX: { from: 1.8, to: 1.25 },
      duration: 180,
      ease: 'Expo.easeOut',
      onComplete: () => bolt.destroy(),
    });

    this.hitFlash(target, 0xbdf8ff);
    this.cameras.main.shake(95, 0.006);
  }

  private castFrost() {
    const center = Phaser.Utils.Array.GetRandom(this.enemies);
    const ring = this.add.image(center.body.x, center.body.y, 'frost-ring')
      .setDepth(28)
      .setScale(0.4)
      .setBlendMode(Phaser.BlendModes.ADD);
    (ring as any).postFX?.addGlow?.(0x7be8ff, 1.9, 0, false, 0.2, 20);

    this.tweens.add({
      targets: ring,
      scale: 3.2,
      alpha: 0,
      angle: 80,
      duration: 760,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });

    for (const enemy of this.enemies) {
      if (Phaser.Math.Distance.Between(center.body.x, center.body.y, enemy.body.x, enemy.body.y) < 190) {
        enemy.body.setTint(0x84dfff).setTintMode(Phaser.TintModes.SCREEN);
        enemy.aura.setTint(0x44c8ff).setAlpha(0.3);
        enemy.frostFx = (enemy.body as any).postFX?.addColorMatrix?.();
        enemy.frostFx?.brightness?.(1.15);
        enemy.frostFx?.saturate?.(-0.35);
        enemy.frostFx?.hue?.(190);

        this.time.delayedCall(1200, () => {
          enemy.body.clearTint();
          enemy.body.setTintMode(Phaser.TintModes.MULTIPLY);
          enemy.aura.setTint(0x7c1d32).setAlpha(0.18);
          if (enemy.frostFx) {
            (enemy.body as any).postFX?.remove?.(enemy.frostFx);
            enemy.frostFx = undefined;
          }
        });
      }
    }
  }

  private hitFlash(enemy: EnemyView, color: number) {
    enemy.body.setTint(color).setTintMode(Phaser.TintModes.FILL);
    enemy.body.setBlendMode(Phaser.BlendModes.ADD);
    this.time.delayedCall(80, () => {
      enemy.body.clearTint();
      enemy.body.setTintMode(Phaser.TintModes.MULTIPLY);
      enemy.body.setBlendMode(Phaser.BlendModes.NORMAL);
    });
  }

  private bossWarning() {
    this.tweens.add({
      targets: this.warningOverlay,
      alpha: { from: 0.04, to: 0.32 },
      yoyo: true,
      repeat: 2,
      duration: 130,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.vignette,
      alpha: { from: 0, to: 0.82 },
      yoyo: true,
      duration: 420,
      ease: 'Sine.easeInOut',
    });
    this.cameras.main.flash(240, 160, 24, 48, true);
    this.cameras.main.shake(300, 0.004);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#08060b',
  scene: LabScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
});
