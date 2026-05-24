import { formatRunTime, loadProgress } from "../systems/progress.js";

const STAT_ROWS = [
  ["Vitalitaet", "160 HP", "Fehler werden ueberlebt, aber nicht vergeben."],
  ["Manareserve", "100", "Grosse Zauber bleiben bewusste Momente."],
  ["Bewegung", "235", "Dash und Raumkontrolle entscheiden den Run."],
  ["Stabkunst", "4er-Combo", "Notfall, Kontrolle und Mana-Rueckgewinnung."],
  ["Feuer", "68 Mana / 8.5s", "Ogerbrecher und Panikknopf."],
  ["Blitz", "34 Mana / 4.0s", "Kleinvieh ausduennen, Ketten nutzen."],
  ["Frost", "30 Mana / 5.0s", "Zeit kaufen, Gegner vorbereiten."],
];

const EQUIPMENT_SLOTS = [
  ["Stab", "Aschestab", "+ Mana durch Treffer"],
  ["Robe", "Schwarze Robe", "+ klare Silhouette"],
  ["Fokus", "Gebrochener Ring", "+ Zauberkontrolle"],
  ["Relikt", "Leere Fassung", "Spaeter: Run-Boni"],
];

const START_FOCI = [
  {
    key: "pyromantic",
    title: "Pyromantisch",
    body: "Feuer trifft haerter und schiebt staerker, kostet aber mehr Mana.",
    short: "+12% Feuer, +8 Mana-Kosten",
  },
  {
    key: "storm",
    title: "Sturmleiter",
    body: "Blitz springt auf ein weiteres Ziel, deine Manareserve ist kleiner.",
    short: "+1 Blitzziel, -8 Max-Mana",
  },
  {
    key: "staff",
    title: "Kampfmagier",
    body: "Stabtreffer geben etwas mehr Mana, Feuer braucht laenger.",
    short: "+15% Stabmana, +0.7s Feuer-CD",
  },
];

export class CharacterScene extends Phaser.Scene {
  constructor() {
    super("CharacterScene");
  }

  create() {
    this.selectedFocusIndex = 0;
    this.focusCards = [];
    this.progress = loadProgress();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#070607");
    this.drawBackdrop(width, height);
    this.drawHeader();
    this.drawMagePanel();
    this.drawStatsPanel();
    this.drawEquipmentPanel();
    this.drawFocusPanel();
    this.drawFooter();
    this.createStartButton();

    this.input.keyboard.on("keydown-ENTER", () => this.startRun());
    this.input.keyboard.on("keydown-SPACE", () => this.startRun());
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("MenuScene"));
    this.input.keyboard.on("keydown-LEFT", () => this.changeFocus(-1));
    this.input.keyboard.on("keydown-A", () => this.changeFocus(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.changeFocus(1));
    this.input.keyboard.on("keydown-D", () => this.changeFocus(1));
    this.input.keyboard.on("keydown-ONE", () => this.setFocus(0));
    this.input.keyboard.on("keydown-TWO", () => this.setFocus(1));
    this.input.keyboard.on("keydown-THREE", () => this.setFocus(2));
  }

  startRun() {
    this.scene.start("GameScene", { startFocus: START_FOCI[this.selectedFocusIndex].key });
  }

  changeFocus(direction) {
    this.setFocus((this.selectedFocusIndex + direction + START_FOCI.length) % START_FOCI.length);
  }

  setFocus(index) {
    this.selectedFocusIndex = Phaser.Math.Clamp(index, 0, START_FOCI.length - 1);
    this.drawFocusSelection();
  }

  drawBackdrop(width, height) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x09080b, 0x120d12, 0x211114, 0x070607, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x5d1711, 0.34);
    g.fillCircle(980, 270, 220);
    g.fillStyle(0x0a090a, 0.92);
    for (let i = 0; i < 9; i += 1) {
      const x = 60 + i * 145;
      const roofY = 505 + (i % 3) * 18;
      g.fillRect(x, roofY, 58, 120);
      g.fillTriangle(x - 16, roofY, x + 29, roofY - 56, x + 74, roofY);
    }
    g.fillStyle(0x7c3618, 0.45);
    for (let i = 0; i < 7; i += 1) {
      const x = 170 + i * 155;
      g.fillTriangle(x, 640, x + 28, 520 - (i % 2) * 45, x + 58, 640);
    }
    g.lineStyle(1, 0xb88a46, 0.24);
    g.beginPath();
    g.moveTo(100, 656);
    g.lineTo(1180, 612);
    g.strokePath();
  }

  drawHeader() {
    this.add.text(640, 38, "MAGIER VON BLACKHAVEN", font(34, "#f2dec0")).setOrigin(0.5, 0);
    this.add.text(640, 82, "Run-Vorbereitung", font(16, "#c99f63")).setOrigin(0.5, 0);
  }

  drawMagePanel() {
    const g = this.add.graphics();
    panel(g, 60, 128, 335, 456);
    this.add.text(92, 160, "Kampfprofil", font(22, "#f4dfbd"));
    this.add.text(92, 195, "Arkaner Duellant", font(16, "#cdb896"));

    const silhouette = this.add.graphics();
    silhouette.fillStyle(0x08080b, 1);
    silhouette.fillEllipse(230, 310, 58, 72);
    silhouette.fillStyle(0x111018, 1);
    silhouette.fillRoundedRect(196, 348, 68, 118, 16);
    silhouette.fillStyle(0x09090d, 1);
    silhouette.fillTriangle(182, 350, 150, 505, 225, 488);
    silhouette.fillTriangle(264, 350, 316, 505, 235, 488);
    silhouette.lineStyle(4, 0xb98f55, 0.85);
    silhouette.beginPath();
    silhouette.moveTo(282, 340);
    silhouette.lineTo(318, 505);
    silhouette.strokePath();
    silhouette.lineStyle(5, 0x4da3ff, 0.32);
    silhouette.strokeCircle(230, 386, 86);

    chip(this, 92, 502, "Chronik");
    this.drawRunMemory(92, 532);
  }

  drawRunMemory(x, y) {
    const progress = this.progress;
    const last = progress.lastRun;
    const best = progress.bestRun;
    this.add.text(x, y, `Runs ${progress.totalRuns}   Gesamtgold ${progress.totalGold}`, {
      ...font(12, "#caa46c"),
      fontFamily: "Arial, sans-serif",
    });
    this.add.text(x, y + 18, last ? `Letzter: ${formatRunTime(last.time)} / W${last.wave} / ${last.gold} Gold` : "Letzter: noch keiner", {
      ...font(12, "#a99b82"),
      fontFamily: "Arial, sans-serif",
    });
    this.add.text(x, y + 35, best ? `Bestmarke: ${formatRunTime(best.time)} / W${best.wave} / ${best.kills} Kills` : "Bestmarke: offen", {
      ...font(12, "#a99b82"),
      fontFamily: "Arial, sans-serif",
    });
  }

  drawStatsPanel() {
    const g = this.add.graphics();
    panel(g, 430, 128, 370, 456);
    this.add.text(462, 160, "Werte", font(22, "#f4dfbd"));
    this.add.text(462, 195, "Aktueller Prototyp-Stand", font(14, "#bfa985"));

    STAT_ROWS.forEach(([label, value, note], index) => {
      const y = 230 + index * 45;
      g.fillStyle(index % 2 === 0 ? 0x151116 : 0x0d0c10, 0.72);
      g.fillRoundedRect(456, y - 8, 312, 36, 3);
      this.add.text(470, y, label, font(14, "#dec69d"));
      this.add.text(760, y, value, font(14, "#f1dfbe")).setOrigin(1, 0);
      this.add.text(470, y + 17, note, {
        ...font(11, "#8f846f"),
        fontFamily: "Arial, sans-serif",
      });
    });
  }

  drawEquipmentPanel() {
    const g = this.add.graphics();
    panel(g, 835, 128, 385, 245);
    this.add.text(867, 160, "Ausruestung", font(22, "#f4dfbd"));
    this.add.text(867, 195, "Grundsteine fuer spaetere Run-Progression", font(13, "#bfa985"));

    EQUIPMENT_SLOTS.forEach(([slot, item, bonus], index) => {
      const x = 867 + (index % 2) * 172;
      const y = 232 + Math.floor(index / 2) * 76;
      g.fillStyle(0x111015, 0.92);
      g.lineStyle(1, 0x6f5638, 0.9);
      g.fillRoundedRect(x, y, 142, 56, 4);
      g.strokeRoundedRect(x, y, 142, 56, 4);
      this.add.text(x + 12, y + 8, slot, font(12, "#caa46c"));
      this.add.text(x + 12, y + 24, item, {
        ...font(12, "#f0ddbd"),
        fontFamily: "Arial, sans-serif",
        wordWrap: { width: 118 },
      });
      this.add.text(x + 12, y + 40, bonus, {
        ...font(10, "#8f846f"),
        fontFamily: "Arial, sans-serif",
      });
    });
  }

  drawFocusPanel() {
    const g = this.add.graphics();
    panel(g, 835, 400, 385, 184);
    this.add.text(867, 430, "Startfokus", font(22, "#f4dfbd"));
    this.add.text(867, 458, "Kleine Run-Neigung, keine neue Mechanik.", {
      ...font(12, "#a99b82"),
      fontFamily: "Arial, sans-serif",
    });
    START_FOCI.forEach((focus, index) => {
      const y = 488 + index * 29;
      const card = this.add.graphics();
      this.focusCards.push(card);
      this.add.text(882, y + 4, `${index + 1}`, font(11, "#caa46c")).setOrigin(0.5, 0);
      this.add.text(902, y, focus.title, font(13, "#e5c995"));
      this.add.text(1002, y, focus.short, {
        ...font(11, "#a99b82"),
        fontFamily: "Arial, sans-serif",
      });
      const hit = this.add.zone(867, y - 4, 315, 27).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.setFocus(index));
    });
    this.drawFocusSelection();
  }

  drawFooter() {
    this.focusDescription = this.add.text(640, 610, "", {
      ...font(14, "#a99b82"),
      fontFamily: "Arial, sans-serif",
      wordWrap: { width: 540 },
      align: "center",
    }).setOrigin(0.5);
    this.add.text(640, 642, "1-3 Fokus waehlen    Pfeile/A-D wechseln    Enter/Space: Run starten    Esc: Zurueck", font(14, "#caa46c")).setOrigin(0.5);
    this.drawFocusSelection();
  }

  createStartButton() {
    const button = this.add.container(640, 682);
    const g = this.add.graphics();
    g.fillStyle(0x1b1215, 0.98);
    g.lineStyle(2, 0xd29b55, 1);
    g.fillRoundedRect(-112, -24, 224, 48, 4);
    g.strokeRoundedRect(-112, -24, 224, 48, 4);
    const label = this.add.text(0, 0, "RUN STARTEN", font(18, "#ffe4ba")).setOrigin(0.5);
    button.add([g, label]);
    button.setSize(224, 48).setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => this.startRun());
  }

  drawFocusSelection() {
    if (!this.focusCards) return;
    this.focusCards.forEach((card, index) => {
      const y = 484 + index * 29;
      card.clear();
      card.fillStyle(index === this.selectedFocusIndex ? 0x211820 : 0x151116, index === this.selectedFocusIndex ? 0.96 : 0.58);
      card.lineStyle(index === this.selectedFocusIndex ? 2 : 1, index === this.selectedFocusIndex ? 0xffdf9d : 0x6f5638, index === this.selectedFocusIndex ? 1 : 0.65);
      card.fillRoundedRect(867, y, 315, 27, 3);
      card.strokeRoundedRect(867, y, 315, 27, 3);
    });
    if (this.focusDescription) {
      this.focusDescription.setText(START_FOCI[this.selectedFocusIndex].body);
    }
  }
}

function panel(g, x, y, w, h) {
  g.fillStyle(0x100e12, 0.9);
  g.lineStyle(1, 0x9d7442, 0.86);
  g.fillRoundedRect(x, y, w, h, 5);
  g.strokeRoundedRect(x, y, w, h, 5);
}

function chip(scene, x, y, label) {
  const g = scene.add.graphics();
  g.fillStyle(0x191215, 0.92);
  g.lineStyle(1, 0x8f683b, 0.85);
  g.fillRoundedRect(x, y, 84, 24, 3);
  g.strokeRoundedRect(x, y, 84, 24, 3);
  scene.add.text(x + 42, y + 5, label, font(12, "#e7cca1")).setOrigin(0.5, 0);
}

function font(size, color) {
  return {
    fontFamily: "Georgia, serif",
    fontSize: `${size}px`,
    color,
  };
}
