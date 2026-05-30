import { formatRunTime, loadProgress } from "../systems/progress.js";
import { toggleBlackhavenMusic } from "../systems/audio.js";
import { createDefaultEquipment, getEquipmentCombatRows, getEquipmentQuickStats, getEquipmentSlotRows } from "../systems/equipment.js";

const SECTION_NAMES = {
  1: "Dorfplatz",
  2: "Kapellentor",
  3: "Blutmondhain",
};

const SECTION_BACKDROPS = {
  1: "blackhavenBackgroundConcept",
  2: "blackhavenChurchyardConcept",
  3: "blackhavenForestConcept",
};

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

  init(data) {
    this.startSectionId = data?.startSection ?? 1;
  }

  create() {
    this.selectedFocusIndex = 0;
    this.equipment = createDefaultEquipment();
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
    this.input.keyboard.on("keydown-M", () => toggleBlackhavenMusic(this));
    this.input.keyboard.on("keydown-LEFT", () => this.changeFocus(-1));
    this.input.keyboard.on("keydown-A", () => this.changeFocus(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.changeFocus(1));
    this.input.keyboard.on("keydown-D", () => this.changeFocus(1));
    this.input.keyboard.on("keydown-ONE", () => this.setFocus(0));
    this.input.keyboard.on("keydown-TWO", () => this.setFocus(1));
    this.input.keyboard.on("keydown-THREE", () => this.setFocus(2));
  }

  startRun() {
    this.scene.start("GameScene", {
      startFocus: START_FOCI[this.selectedFocusIndex].key,
      startSection: this.startSectionId,
      equipment: this.equipment,
    });
  }

  changeFocus(direction) {
    this.setFocus((this.selectedFocusIndex + direction + START_FOCI.length) % START_FOCI.length);
  }

  setFocus(index) {
    this.selectedFocusIndex = Phaser.Math.Clamp(index, 0, START_FOCI.length - 1);
    this.drawFocusSelection();
  }

  drawBackdrop(width, height) {
    const base = this.add.graphics();
    base.fillStyle(0x070607, 1);
    base.fillRect(0, 0, width, height);

    const backdropKey = SECTION_BACKDROPS[this.startSectionId] ?? SECTION_BACKDROPS[1];
    if (this.textures.exists(backdropKey)) {
      const image = this.add.image(width * 0.5, height * 0.5, backdropKey);
      fitImageCover(image, width, height);
      image.setAlpha(0.34);
    }

    const g = this.add.graphics();
    g.fillGradientStyle(0x040304, 0x040304, 0x090608, 0x090608, 0.88, 0.2, 0.18, 0.9);
    g.fillRect(0, 0, width, height);
    g.fillGradientStyle(0x050405, 0x050405, 0x050405, 0x050405, 0.0, 0.2, 0.82, 0.94);
    g.fillRect(0, height * 0.42, width, height * 0.58);
    g.fillStyle(0x140c0d, 0.52);
    g.fillRect(0, 0, 410, height);
    g.fillStyle(0x030203, 0.5);
    g.fillRect(910, 0, 370, height);
    g.lineStyle(1, 0xc29151, 0.25);
    g.lineBetween(55, 108, 1225, 92);
    g.lineBetween(70, 650, 1210, 610);
  }

  drawHeader() {
    this.add.text(78, 42, "MAGIER VON BLACKHAVEN", font(32, "#f2dec0")).setOrigin(0, 0);
    this.add.text(80, 84, `Run-Vorbereitung  |  ${SECTION_NAMES[this.startSectionId] ?? "Abschnitt"}`, font(15, "#c99f63")).setOrigin(0, 0);
    this.add.text(910, 46, "Startfokus waehlen", font(18, "#f2dec0")).setOrigin(0, 0);
    this.add.text(910, 75, "Kleine Run-Neigung, keine neue Mechanik.", {
      ...font(13, "#a99b82"),
      fontFamily: "Arial, sans-serif",
    }).setOrigin(0, 0);
  }

  drawMagePanel() {
    const g = this.add.graphics();
    g.fillStyle(0x060507, 0.58);
    g.fillEllipse(292, 586, 350, 78);
    g.lineStyle(2, 0x6ca8c9, 0.26);
    g.strokeEllipse(298, 428, 228, 340);
    g.lineStyle(1, 0xc29151, 0.32);
    g.strokeEllipse(294, 588, 310, 62);

    if (this.textures.exists("playerMageCast")) {
      const mage = this.add.sprite(304, 586, "playerMageCast", 0).setOrigin(0.5, 1);
      mage.setScale(1.22);
      mage.setAlpha(0.96);
    } else if (this.textures.exists("playerMageConcept")) {
      const mage = this.add.image(304, 586, "playerMageConcept").setOrigin(0.5, 1);
      mage.setDisplaySize(220, 340);
    }

    this.add.text(78, 528, "Arkaner Duellant", font(22, "#f4dfbd"));
    this.add.text(78, 560, "Magie als Kampfkunst. Kontrolle, Rhythmus, Dominanz.", {
      ...font(13, "#bfa985"),
      fontFamily: "Arial, sans-serif",
      wordWrap: { width: 300 },
    });
    this.drawRunMemory(78, 608);
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
    panel(g, 470, 128, 385, 424);
    this.add.text(502, 160, "Kampfwerte", font(22, "#f4dfbd"));
    this.add.text(502, 190, "Aktueller Prototyp-Stand", font(13, "#bfa985"));

    getEquipmentQuickStats(this.equipment).forEach(([label, value], index) => {
      const x = 502 + index * 84;
      g.fillStyle(0x171116, 0.82);
      g.lineStyle(1, 0x6f5638, 0.75);
      g.fillRoundedRect(x, 226, 70, 62, 4);
      g.strokeRoundedRect(x, 226, 70, 62, 4);
      this.add.text(x + 35, 236, value, font(15, "#f1dfbe")).setOrigin(0.5, 0);
      this.add.text(x + 35, 264, label, {
        ...font(10, "#a99b82"),
        fontFamily: "Arial, sans-serif",
      }).setOrigin(0.5, 0);
    });

    getEquipmentCombatRows(this.equipment).forEach(([label, value, note], index) => {
      const y = 326 + index * 45;
      g.fillStyle(0x0d0c10, 0.58);
      g.fillRoundedRect(502, y - 8, 310, 34, 3);
      this.add.text(516, y, label, font(13, "#dec69d"));
      this.add.text(802, y, value, font(13, "#f1dfbe")).setOrigin(1, 0);
      this.add.text(516, y + 17, note, {
        ...font(10, "#8f846f"),
        fontFamily: "Arial, sans-serif",
      });
    });
  }

  drawEquipmentPanel() {
    const g = this.add.graphics();
    panel(g, 470, 560, 385, 106);
    this.add.text(502, 582, "Ausruestung", font(16, "#f4dfbd"));

    getEquipmentSlotRows(this.equipment).forEach(([slot, item, bonus], index) => {
      const x = 502 + index * 84;
      const y = 610;
      g.fillStyle(0x111015, 0.92);
      g.lineStyle(1, 0x6f5638, 0.9);
      g.fillRoundedRect(x, y, 70, 24, 3);
      g.strokeRoundedRect(x, y, 70, 24, 3);
      this.add.text(x + 35, y + 5, slot, font(11, "#caa46c")).setOrigin(0.5, 0);
      this.add.text(x + 35, y + 30, item, {
        ...font(10, "#f0ddbd"),
        fontFamily: "Arial, sans-serif",
        wordWrap: { width: 74 },
        align: "center",
      }).setOrigin(0.5, 0);
    });
  }

  drawFocusPanel() {
    const g = this.add.graphics();
    panel(g, 900, 122, 310, 430);
    START_FOCI.forEach((focus, index) => {
      const y = 162 + index * 112;
      const card = this.add.graphics();
      this.focusCards.push(card);
      this.add.text(928, y + 12, `${index + 1}`, font(14, "#caa46c")).setOrigin(0.5, 0);
      this.add.text(956, y + 9, focus.title, font(17, "#e5c995"));
      this.add.text(956, y + 38, focus.short, {
        ...font(12, "#d0b487"),
        fontFamily: "Arial, sans-serif",
      });
      this.add.text(956, y + 58, focus.body, {
        ...font(11, "#918674"),
        fontFamily: "Arial, sans-serif",
        wordWrap: { width: 210 },
      });
      const hit = this.add.zone(920, y, 260, 92).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.setFocus(index));
    });
    this.drawFocusSelection();
  }

  drawFooter() {
    this.focusDescription = this.add.text(912, 575, "", {
      ...font(13, "#bfa985"),
      fontFamily: "Arial, sans-serif",
      wordWrap: { width: 290 },
      align: "left",
    });
    this.add.text(640, 690, "1-3 Fokus    Pfeile/A-D wechseln    Enter/Space Start    Esc Zurueck    M Musik", font(13, "#caa46c")).setOrigin(0.5);
    this.drawFocusSelection();
  }

  createStartButton() {
    const button = this.add.container(1058, 650);
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
      const y = 162 + index * 112;
      card.clear();
      card.fillStyle(index === this.selectedFocusIndex ? 0x211820 : 0x151116, index === this.selectedFocusIndex ? 0.96 : 0.72);
      card.lineStyle(index === this.selectedFocusIndex ? 2 : 1, index === this.selectedFocusIndex ? 0xffdf9d : 0x6f5638, index === this.selectedFocusIndex ? 1 : 0.65);
      card.fillRoundedRect(920, y, 260, 92, 4);
      card.strokeRoundedRect(920, y, 260, 92, 4);
    });
    if (this.focusDescription) {
      this.focusDescription.setText(`Gewaehlt: ${START_FOCI[this.selectedFocusIndex].title}`);
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

function fitImageCover(image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  image.setScale(scale);
}
