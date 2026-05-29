export function createHud(scene) {
  const hud = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);
  const g = scene.add.graphics();
  hud.add(g);
  const frames = {
    hp: addFrame(scene, hud, "uiFrameHudWide", 24, 20, 300, 86, 0.78),
    wave: addFrame(scene, hud, "uiFrameHudWide", 492, 20, 296, 76, 0.78),
    boss: addFrame(scene, hud, "uiFrameHudWide", 430, 105, 420, 38, 0.72),
    skillbar: addFrame(scene, hud, "uiFrameHudWide", 350, 618, 580, 82, 0.72),
    hint: addFrame(scene, hud, "uiFrameButtonWide", 950, 590, 270, 60, 0.72),
    slots: [],
  };
  for (let i = 0; i < 5; i += 1) {
    frames.slots.push(addFrame(scene, hud, "uiFrameSkillSlot", 438 + i * 88, 632, 62, 48, 0.88));
  }

  const text = {
    wave: scene.add.text(640, 28, "", font(18, "#f3dec0")).setOrigin(0.5, 0),
    alert: scene.add.text(640, 88, "", font(16, "#e2b063")).setOrigin(0.5, 0),
    phase: scene.add.text(640, 55, "", font(14, "#bfa985")).setOrigin(0.5, 0),
    boss: scene.add.text(640, 111, "", font(14, "#e6c58e")).setOrigin(0.5, 0),
    gold: scene.add.text(260, 86, "", font(14, "#d9b76e")).setOrigin(0.5, 0),
    hint: scene.add.text(1085, 616, "", font(15, "#dbc59c")).setOrigin(0.5, 0.5),
    skills: scene.add.text(640, 688, "", font(13, "#bfa985")).setOrigin(0.5),
    slotLabels: [],
    cooldowns: [],
  };
  for (let i = 0; i < 5; i += 1) {
    text.slotLabels.push(scene.add.text(0, 0, "", font(12, "#e9d2a8")).setOrigin(0.5));
    text.cooldowns.push(scene.add.text(0, 0, "", font(18, "#fff0c8")).setOrigin(0.5));
  }
  hud.add([text.wave, text.alert, text.phase, text.boss, text.gold, text.hint, text.skills]);
  hud.add(text.slotLabels);
  hud.add(text.cooldowns);
  return { hud, g, text, frames };
}

export function drawHud(ui, state) {
  const { g, text, frames } = ui;
  g.clear();
  panel(g, 24, 20, 300, 86);
  g.fillStyle(0x111015, 1);
  g.fillCircle(68, 62, 30);
  g.lineStyle(2, 0xb98f55, 1);
  g.strokeCircle(68, 62, 30);
  g.fillStyle(0x09090b, 1);
  g.fillRect(110, 44, 180, 14);
  g.fillStyle(0x9f2727, 1);
  g.fillRect(110, 44, 180 * (state.hp / state.maxHp), 14);
  g.fillStyle(0x09090b, 1);
  g.fillRect(110, 70, 180, 14);
  g.fillStyle(0x2976c4, 1);
  g.fillRect(110, 70, 180 * (state.mana / state.maxMana), 14);
  text.gold.setText(`${state.gold ?? 0} Gold`);

  panel(g, 492, 20, 296, 76);
  text.wave.setText(`Welle ${state.wave}  |  ${Math.floor(state.time)}s`);
  text.phase.setText(state.phaseName ?? "");
  text.alert.setText(state.bossIncoming ? "Miniboss naehert sich" : state.flankIncoming ? "Flanke!" : state.ogreIncoming ? "Schwere Einheit naehert sich" : "");

  if (state.boss) {
    frames?.boss?.setVisible(true);
    panel(g, 430, 105, 420, 38);
    text.boss.setText(state.boss.name ?? "Miniboss");
    g.fillStyle(0x070708, 0.92);
    g.fillRect(458, 127, 364, 8);
    g.fillStyle(0x8f2d2a, 1);
    g.fillRect(458, 127, 364 * Math.max(0, state.boss.hp / state.boss.maxHp), 8);
  } else {
    frames?.boss?.setVisible(false);
    text.boss.setText("");
  }

  panel(g, 350, 618, 580, 82);
  const slots = state.skills ?? [];
  const utility = [
    state.staff ?? { hotkey: "LMB/J", label: "Stab", canCast: true, currentCooldown: 0, cooldown: 1, readyPulse: 0 },
    { hotkey: "Space/Shift", label: "Dash", canCast: true, currentCooldown: 0, cooldown: 1, readyPulse: 0 },
  ];
  const allSlots = [...slots, ...utility];
  for (let i = 0; i < 5; i += 1) {
    const x = 438 + i * 88;
    const slot = allSlots[i];
    const onCooldown = slot && slot.currentCooldown > 0;
    const lacksMana = slot && slot.currentCooldown <= 0 && !slot.canCast;
    const unavailable = onCooldown || lacksMana;
    const pulse = slot?.readyPulse ?? 0;
    g.fillStyle(0x070609, 0.42);
    g.fillRoundedRect(x + 6, 637, 50, 38, 3);
    if (pulse > 0) {
      g.lineStyle(2, 0xffe3a6, 0.85);
      g.strokeRoundedRect(x, 632, 62, 48, 3);
    }
    if (slot) {
      text.slotLabels[i].setPosition(x + 31, 646);
      text.slotLabels[i].setText(`${slot.hotkey}\n${slot.label}`);
      text.slotLabels[i].setColor(unavailable ? "#7d7568" : "#e9d2a8");
      text.cooldowns[i].setPosition(x + 31, 657);
      if (onCooldown) {
        const ratio = Math.min(1, slot.currentCooldown / slot.cooldown);
        g.fillStyle(0x030304, 0.68);
        g.fillRoundedRect(x, 632 + 48 * (1 - ratio), 62, 48 * ratio, 3);
        g.lineStyle(1, 0xffd07a, 0.55);
        g.strokeRoundedRect(x + 3, 635, 56, 42, 3);
        text.cooldowns[i].setText(Math.ceil(slot.currentCooldown).toString());
      } else {
        text.cooldowns[i].setText("");
      }
      if (lacksMana) {
        g.fillStyle(0x082746, 0.58);
        g.fillRoundedRect(x, 632, 62, 48, 3);
        g.lineStyle(1, 0x4b89c8, 0.75);
        g.strokeRoundedRect(x + 3, 635, 56, 42, 3);
      }
      if (pulse > 0) {
        g.fillStyle(0xffe3a6, Math.min(0.35, pulse));
        g.fillRoundedRect(x - 3, 629, 68, 54, 4);
      }
    }
  }
  text.skills.setText("F1 Debug");

  panel(g, 950, 590, 270, 60);
  text.hint.setText(state.cardHint);
}

export function createCardOverlay(scene, cards, onPick) {
  const overlay = scene.add.container(0, 0).setDepth(2000).setScrollFactor(0);
  const dim = scene.add.rectangle(640, 360, 1280, 720, 0x070607, 0.72);
  overlay.add(dim);
  overlay.add(scene.add.text(640, 145, "Waehle eine Karte", font(32, "#f2dec0")).setOrigin(0.5));
  const inputHint = scene.add.text(640, 184, "Kurz sammeln... dann Enter / 1-3 / Mausklick", font(15, "#bfa985")).setOrigin(0.5);
  overlay.add(inputHint);
  const plates = [];
  let selected = 0;
  let inputLocked = true;
  let chosen = false;
  const unlockEvent = scene.time.delayedCall(650, () => {
    inputLocked = false;
    inputHint.setText("Pfeile/A-D waehlen   Enter oder 1-3 bestaetigen");
    drawSelection();
  });

  cards.forEach((card, index) => {
    const x = 360 + index * 280;
    const plate = scene.add.graphics();
    panel(plate, x - 110, 235, 220, 230);
    overlay.add(plate);
    const frame = addFrame(scene, overlay, "uiFrameCardPanel", x - 110, 235, 220, 230, 0.82);
    const title = scene.add.text(x, 276, card.title, font(21, "#f2dec0")).setOrigin(0.5, 0);
    const body = scene.add.text(x, 330, card.body, {
      ...font(16, "#cdbb9d"),
      fontFamily: "Arial, sans-serif",
      wordWrap: { width: 170 },
      align: "center",
    }).setOrigin(0.5, 0);
    const hit = scene.add.zone(x, 350, 220, 230).setInteractive({ useHandCursor: true });
    hit.on("pointerover", () => {
      if (inputLocked || chosen) return;
      selected = index;
      drawSelection();
    });
    hit.on("pointerdown", () => {
      choose(index);
    });
    plates.push({ plate, frame, x });
    overlay.add([title, body, hit]);
  });

  const onKeyDown = (event) => {
    const key = event.key.toLowerCase();
    if ([" ", "j"].includes(key)) {
      event.preventDefault();
      return;
    }
    if (inputLocked) {
      if (["arrowleft", "a", "arrowright", "d", "enter", "1", "2", "3"].includes(key)) event.preventDefault();
      return;
    }
    if (key === "arrowleft" || key === "a") {
      selected = (selected + cards.length - 1) % cards.length;
      drawSelection();
      event.preventDefault();
    }
    if (key === "arrowright" || key === "d") {
      selected = (selected + 1) % cards.length;
      drawSelection();
      event.preventDefault();
    }
    if (key === "enter") {
      choose(selected);
      event.preventDefault();
    }
    if (["1", "2", "3"].includes(key)) {
      choose(Number(key) - 1);
      event.preventDefault();
    }
  };
  window.addEventListener("keydown", onKeyDown);
  overlay.once("destroy", () => {
    window.removeEventListener("keydown", onKeyDown);
    unlockEvent.remove(false);
  });
  drawSelection();

  function choose(index) {
    if (inputLocked || chosen || !cards[index]) return;
    chosen = true;
    onPick(cards[index]);
    overlay.destroy();
  }

  function drawSelection() {
    plates.forEach(({ plate, frame, x }, index) => {
      const isSelected = !inputLocked && index === selected;
      plate.clear();
      panel(plate, x - 110, 235, 220, 230, isSelected);
      frame?.setAlpha(isSelected ? 1 : 0.82);
    });
  }

  return overlay;
}

function panel(g, x, y, w, h, selected = false) {
  g.fillStyle(0x08070a, selected ? 0.72 : 0.62);
  g.lineStyle(selected ? 3 : 1, selected ? 0xffdf9d : 0x9d7442, selected ? 0.95 : 0.28);
  g.fillRoundedRect(x, y, w, h, 5);
  g.strokeRoundedRect(x, y, w, h, 5);
}

function addFrame(scene, parent, key, x, y, w, h, alpha = 0.8) {
  if (!scene.textures.exists(key)) return null;
  const frame = scene.add.image(x, y, key).setOrigin(0, 0).setDisplaySize(w, h).setAlpha(alpha);
  frame.setTint(0xf0d19a);
  parent.add(frame);
  return frame;
}

function font(size, color) {
  return {
    fontFamily: "Georgia, serif",
    fontSize: `${size}px`,
    color,
  };
}
