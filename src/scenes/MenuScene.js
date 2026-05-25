export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#08070a");
    drawMenuBackdrop(this, width, height);

    this.add.text(width * 0.08, height * 0.08, "BLACKHAVEN", {
      fontFamily: "Georgia, serif",
      fontSize: "54px",
      color: "#f1dec0",
      stroke: "#070607",
      strokeThickness: 8,
      letterSpacing: 0,
    }).setOrigin(0, 0.5);

    this.add.text(width * 0.082, height * 0.16, "Burning Village Enemyhell", {
      fontFamily: "Georgia, serif",
      fontSize: "21px",
      color: "#cfa66a",
      stroke: "#070607",
      strokeThickness: 4,
    }).setOrigin(0, 0.5);

    this.add.text(width * 0.08, height * 0.71, "Magie ist Kampfkunst. Halte die Linie, lies die Horde, spare den großen Zauber.", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#d8c6aa",
      stroke: "#070607",
      strokeThickness: 5,
      wordWrap: { width: 520 },
      lineSpacing: 4,
    }).setOrigin(0, 0.5);

    const button = this.add.container(width * 0.08 + 140, height * 0.82);
    const plate = this.add.graphics();
    plate.fillStyle(0x140e12, 0.86);
    plate.lineStyle(2, 0xc8964d, 1);
    plate.fillRoundedRect(-140, -29, 280, 58, 4);
    plate.strokeRoundedRect(-140, -29, 280, 58, 4);
    const label = this.add.text(0, 0, "RUN VORBEREITEN", {
      fontFamily: "Georgia, serif",
      fontSize: "19px",
      color: "#f5e8ce",
    }).setOrigin(0.5);
    button.add([plate, label]);
    button.setSize(280, 58).setInteractive({ useHandCursor: true });
    button.on("pointerover", () => {
      plate.clear();
      plate.fillStyle(0x21151a, 0.94);
      plate.lineStyle(2, 0xf0c06f, 1);
      plate.fillRoundedRect(-140, -29, 280, 58, 4);
      plate.strokeRoundedRect(-140, -29, 280, 58, 4);
      label.setColor("#fff3d8");
    });
    button.on("pointerout", () => {
      plate.clear();
      plate.fillStyle(0x140e12, 0.86);
      plate.lineStyle(2, 0xc8964d, 1);
      plate.fillRoundedRect(-140, -29, 280, 58, 4);
      plate.strokeRoundedRect(-140, -29, 280, 58, 4);
      label.setColor("#f5e8ce");
    });
    button.on("pointerdown", () => this.scene.start("CharacterScene"));

    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("CharacterScene"));

    this.add.text(width * 0.92, height * 0.9, "ENTER Start  |  WASD/Pfeile  |  RMB/1 Feuer  Q/2 Blitz  E/3 Frost  LMB/J Stab", {
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      color: "#b8ab94",
      stroke: "#050405",
      strokeThickness: 4,
    }).setOrigin(1, 0.5);
  }
}

function drawMenuBackdrop(scene, width, height) {
  if (scene.textures.exists("blackhavenStartArt")) {
    const wash = scene.add.image(width * 0.5, height * 0.52, "blackhavenStartArt");
    wash.setScale(Math.max(width / wash.width, height / wash.height));
    wash.setAlpha(0.28);
    const image = scene.add.image(width * 0.5, height * 0.26, "blackhavenStartArt");
    const scale = width / image.width;
    image.setScale(scale);
  }
  const g = scene.add.graphics();
  if (!scene.textures.exists("blackhavenStartArt")) {
    g.fillGradientStyle(0x0b0a0e, 0x130d12, 0x251315, 0x09080b, 1);
    g.fillRect(0, 0, width, height);
  }
  g.fillGradientStyle(0x050507, 0x050507, 0x080608, 0x080608, 0.12, 0.08, 0.76, 0.5);
  g.fillRect(0, 0, width, height);
  g.fillGradientStyle(0x050507, 0x050507, 0x0c0809, 0x0c0809, 0.06, 0.06, 0.96, 0.98);
  g.fillRect(0, height * 0.42, width, height * 0.58);
  g.fillGradientStyle(0x040305, 0x040305, 0x040305, 0x040305, 0.72, 0.1, 0.1, 0.5);
  g.fillRect(0, 0, width * 0.45, height);
  g.fillGradientStyle(0x020202, 0x020202, 0x020202, 0x020202, 0.0, 0.0, 0.9, 0.9);
  g.fillRect(0, height * 0.36, width, height * 0.2);
  g.lineStyle(2, 0xb88a46, 0.3);
  g.lineBetween(width * 0.08, height * 0.22, width * 0.38, height * 0.22);
  g.lineBetween(width * 0.08, height * 0.89, width * 0.43, height * 0.89);
  if (scene.textures.exists("blackhavenStartArt")) return;
  g.fillGradientStyle(0x0b0a0e, 0x130d12, 0x251315, 0x09080b, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(0x611b13, 0.55);
  for (let i = 0; i < 11; i += 1) {
    const x = i * 135 - 60;
    g.fillTriangle(x, height * 0.7, x + 60, height * 0.34, x + 130, height * 0.7);
  }
  g.fillStyle(0x0a090a, 0.92);
  for (let i = 0; i < 8; i += 1) {
    const x = i * 180 + 20;
    g.fillRect(x, height * 0.56 - i % 2 * 25, 70, 140);
    g.fillTriangle(x - 15, height * 0.56 - i % 2 * 25, x + 35, height * 0.5 - i % 2 * 25, x + 85, height * 0.56 - i % 2 * 25);
  }
}
