import { toggleBlackhavenMusic } from "../systems/audio.js";

const START_CHOICES = [
  {
    id: 1,
    hotkey: "1",
    title: "Abschnitt 1",
    subtitle: "Blackhaven / Dorfplatz",
    note: "Run von vorne",
  },
  {
    id: 2,
    hotkey: "2",
    title: "Abschnitt 2",
    subtitle: "Kapellentor",
    note: "Direkter Leveltest",
  },
  {
    id: 3,
    hotkey: "3",
    title: "Abschnitt 3",
    subtitle: "Blutmondhain",
    note: "Spaeter Test",
  },
  {
    id: "horde",
    hotkey: "H",
    title: "Hordemodus",
    subtitle: "MUSS JA ;)",
    note: "Platzhalter",
    disabled: true,
  },
];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;
    this.selectedStartIndex = 0;
    this.startChoiceCards = [];
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

    this.drawStartChoicePanel(width, height);

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
    button.on("pointerdown", () => this.startGame());

    this.input.keyboard.on("keydown-ENTER", () => this.startGame());
    this.input.keyboard.on("keydown-LEFT", () => this.changeStartChoice(-1));
    this.input.keyboard.on("keydown-A", () => this.changeStartChoice(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.changeStartChoice(1));
    this.input.keyboard.on("keydown-D", () => this.changeStartChoice(1));
    this.input.keyboard.on("keydown-UP", () => this.changeStartChoice(-1));
    this.input.keyboard.on("keydown-W", () => this.changeStartChoice(-1));
    this.input.keyboard.on("keydown-DOWN", () => this.changeStartChoice(1));
    this.input.keyboard.on("keydown-S", () => this.changeStartChoice(1));
    this.input.keyboard.on("keydown-ONE", () => this.setStartChoice(0));
    this.input.keyboard.on("keydown-TWO", () => this.setStartChoice(1));
    this.input.keyboard.on("keydown-THREE", () => this.setStartChoice(2));
    this.input.keyboard.on("keydown-H", () => this.setStartChoice(3));
    this.input.keyboard.on("keydown-M", () => this.toggleMusic());

    this.musicHint = this.add.text(width * 0.08, height * 0.9, this.getMusicHintText(), {
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      color: "#b8ab94",
      stroke: "#050405",
      strokeThickness: 4,
    }).setOrigin(0, 0.5);

    this.add.text(width * 0.92, height * 0.9, "1-3 Abschnitt  |  Pfeile Auswahl  |  ENTER Start  |  WASD/Pfeile  |  RMB/1 Feuer  Q/2 Blitz  E/3 Frost  LMB/J Stab", {
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      color: "#b8ab94",
      stroke: "#050405",
      strokeThickness: 4,
    }).setOrigin(1, 0.5);
  }

  startGame() {
    const choice = START_CHOICES[this.selectedStartIndex];
    if (choice.disabled) return;
    this.scene.start("CharacterScene", { startSection: choice.id });
  }

  toggleMusic() {
    toggleBlackhavenMusic(this);
    this.musicHint?.setText(this.getMusicHintText());
  }

  getMusicHintText() {
    return `M Musik: fuer schnelle Tests deaktiviert`;
  }

  changeStartChoice(direction) {
    for (let step = 1; step <= START_CHOICES.length; step += 1) {
      const index = (this.selectedStartIndex + direction * step + START_CHOICES.length) % START_CHOICES.length;
      if (!START_CHOICES[index].disabled) {
        this.setStartChoice(index);
        return;
      }
    }
  }

  setStartChoice(index) {
    const choice = START_CHOICES[index];
    if (!choice || choice.disabled) return;
    this.selectedStartIndex = index;
    this.drawStartChoiceSelection();
  }

  drawStartChoicePanel(width, height) {
    this.add.text(width * 0.64, height * 0.51, "Starttest", {
      fontFamily: "Georgia, serif",
      fontSize: "24px",
      color: "#f1dec0",
      stroke: "#070607",
      strokeThickness: 5,
    }).setOrigin(0, 0.5);
    this.add.text(width * 0.64, height * 0.555, "Kapitel / Biom / Modus", {
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      color: "#bfa985",
      stroke: "#050405",
      strokeThickness: 4,
    }).setOrigin(0, 0.5);

    START_CHOICES.forEach((choice, index) => {
      const x = width * 0.64 + (index % 2) * 218;
      const y = height * 0.605 + Math.floor(index / 2) * 78;
      this.startChoiceCards.push(createStartChoiceCard(this, x, y, choice, index));
    });
    this.drawStartChoiceSelection();
  }

  drawStartChoiceSelection() {
    if (!this.startChoiceCards) return;
    this.startChoiceCards.forEach((card, index) => {
      card.redraw(index === this.selectedStartIndex);
    });
  }
}

function createStartChoiceCard(scene, x, y, choice, index) {
  const g = scene.add.graphics();
  const key = scene.add.text(x + 14, y + 10, choice.hotkey, {
    fontFamily: "Georgia, serif",
    fontSize: "13px",
    color: choice.disabled ? "#6c6254" : "#caa46c",
  });
  const title = scene.add.text(x + 40, y + 8, choice.title, {
    fontFamily: "Georgia, serif",
    fontSize: "15px",
    color: choice.disabled ? "#776d5f" : "#f0ddbd",
  });
  const subtitle = scene.add.text(x + 40, y + 29, choice.subtitle, {
    fontFamily: "Arial, sans-serif",
    fontSize: "11px",
    color: choice.disabled ? "#625a50" : "#bfa985",
  });
  const note = scene.add.text(x + 14, y + 50, choice.note, {
    fontFamily: "Arial, sans-serif",
    fontSize: "10px",
    color: choice.disabled ? "#5f584f" : "#8f846f",
  });
  const zone = scene.add.zone(x, y, 196, 66).setOrigin(0, 0);
  if (!choice.disabled) {
    zone.setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => scene.setStartChoice(index));
  }
  const redraw = (selected) => {
    g.clear();
    g.fillStyle(selected ? 0x211820 : 0x100e12, choice.disabled ? 0.42 : selected ? 0.96 : 0.78);
    g.lineStyle(selected ? 2 : 1, selected ? 0xffdf9d : 0x8f683b, choice.disabled ? 0.42 : selected ? 1 : 0.72);
    g.fillRoundedRect(x, y, 196, 66, 4);
    g.strokeRoundedRect(x, y, 196, 66, 4);
  };
  redraw(false);
  return { parts: [g, key, title, subtitle, note, zone], redraw };
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
