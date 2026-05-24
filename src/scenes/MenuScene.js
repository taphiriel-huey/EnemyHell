export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#08070a");
    drawMenuBackdrop(this, width, height);

    this.add.text(width * 0.5, height * 0.26, "BLACKHAVEN", {
      fontFamily: "Georgia, serif",
      fontSize: "72px",
      color: "#f1dec0",
      stroke: "#070607",
      strokeThickness: 8,
      letterSpacing: 0,
    }).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.37, "Burning Village Enemyhell", {
      fontFamily: "Georgia, serif",
      fontSize: "24px",
      color: "#cfa66a",
    }).setOrigin(0.5);

    const button = this.add.container(width * 0.5, height * 0.6);
    const plate = this.add.graphics();
    plate.fillStyle(0x191215, 0.95);
    plate.lineStyle(2, 0xb88a46, 1);
    plate.fillRoundedRect(-120, -28, 240, 56, 4);
    plate.strokeRoundedRect(-120, -28, 240, 56, 4);
    const label = this.add.text(0, 0, "RUN VORBEREITEN", {
      fontFamily: "Georgia, serif",
      fontSize: "19px",
      color: "#f5e8ce",
    }).setOrigin(0.5);
    button.add([plate, label]);
    button.setSize(240, 56).setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => this.scene.start("CharacterScene"));

    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("CharacterScene"));

    this.add.text(width * 0.5, height * 0.78, "WASD/Pfeile bewegen  |  Leertaste Dash  |  J Stab  |  1 Feuer  2 Blitz  3 Frost", {
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
      color: "#b8ab94",
    }).setOrigin(0.5);
  }
}

function drawMenuBackdrop(scene, width, height) {
  const g = scene.add.graphics();
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
