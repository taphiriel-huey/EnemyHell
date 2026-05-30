export const EQUIPMENT_SLOTS = ["staff", "robe", "focus", "relic"];

export const EQUIPMENT_ITEMS = {
  ashStaff: {
    slot: "staff",
    slotLabel: "Stab",
    name: "Aschestab",
    bonus: "+ Mana durch Treffer",
    apply({ spells }) {
      spells.meleeManaMultiplier += 0.08;
    },
  },
  blackRobe: {
    slot: "robe",
    slotLabel: "Robe",
    name: "Schwarze Robe",
    bonus: "+10 HP, +5 Tempo",
    apply({ player }) {
      player.maxHp += 10;
      player.hp = player.maxHp;
      player.speed += 5;
    },
  },
  crackedRing: {
    slot: "focus",
    slotLabel: "Fokus",
    name: "Gebrochener Ring",
    bonus: "+ Zauberkontrolle",
    apply({ spells }) {
      spells.lightningRange += 20;
      spells.frostRadius += 8;
    },
  },
  emptySocket: {
    slot: "relic",
    slotLabel: "Relikt",
    name: "Leere Fassung",
    bonus: "Spaeter: Run-Boni",
    apply() {},
  },
};

export const DEFAULT_EQUIPMENT = {
  staff: "ashStaff",
  robe: "blackRobe",
  focus: "crackedRing",
  relic: "emptySocket",
};

export function createDefaultEquipment() {
  return { ...DEFAULT_EQUIPMENT };
}

export function getEquippedItems(equipment = DEFAULT_EQUIPMENT) {
  return EQUIPMENT_SLOTS
    .map((slot) => EQUIPMENT_ITEMS[equipment[slot]])
    .filter(Boolean);
}

export function getEquipmentSlotRows(equipment = DEFAULT_EQUIPMENT) {
  return getEquippedItems(equipment).map((item) => [item.slotLabel, item.name, item.bonus]);
}

export function applyEquipment(player, spells, equipment = DEFAULT_EQUIPMENT) {
  for (const item of getEquippedItems(equipment)) {
    item.apply({ player, spells });
  }
  player.hp = Math.min(player.hp, player.maxHp);
  player.mana = Math.min(player.mana, player.maxMana);
}

export function getEquipmentQuickStats(equipment = DEFAULT_EQUIPMENT) {
  const stats = { hp: 160, mana: 100, speed: 235, staff: "4er Combo" };
  if (equipment.robe === "blackRobe") {
    stats.hp += 10;
    stats.speed += 5;
  }
  return [
    ["HP", `${stats.hp}`],
    ["Mana", `${stats.mana}`],
    ["Tempo", `${stats.speed}`],
    ["Stab", stats.staff],
  ];
}

export function getEquipmentCombatRows(equipment = DEFAULT_EQUIPMENT) {
  const rows = [
    ["Stabkunst", "4er-Combo", "Notfall, Kontrolle und Mana-Rueckgewinnung."],
    ["Feuer", "68 Mana / 8.5s", "Ogerbrecher und Panikknopf."],
    ["Blitz", "34 Mana / 4.0s", "Kleinvieh ausduennen, Ketten nutzen."],
    ["Frost", "30 Mana / 5.0s", "Zeit kaufen, Gegner vorbereiten."],
  ];
  if (equipment.staff === "ashStaff") rows[0][1] = "4er-Combo + Mana";
  if (equipment.focus === "crackedRing") {
    rows[2][2] = "Etwas mehr Reichweite fuer saubere Ketten.";
    rows[3][2] = "Etwas groesserer Kontrollkreis.";
  }
  return rows;
}
