const CARD_POOL = [
  {
    title: "Brandkreis",
    body: "Feuerball wird groesser, kostet aber mehr Mana.",
    apply: (spells) => {
      spells.fireSize += 0.22;
      spells.spells.fire.manaCost += 8;
    },
  },
  {
    title: "Kettenurteil",
    body: "Blitzkette springt auf zwei weitere Ziele.",
    apply: (spells) => {
      spells.chainTargets += 2;
    },
  },
  {
    title: "Stab der Asche",
    body: "Stabangriffe geben deutlich mehr Mana zurueck.",
    apply: (spells) => {
      spells.meleeManaMultiplier += 0.5;
    },
  },
  {
    title: "Wintergriff",
    body: "Frost verlangsamt und friert laenger.",
    apply: (spells) => {
      spells.frostDuration += 0.75;
    },
  },
  {
    title: "SO EIN FEUERBALL, JONGE",
    body: "Der naechste Feuerball ist brutal, leert aber dein Mana.",
    apply: (spells) => {
      spells.nextFireOverload = true;
    },
  },
  {
    title: "Schnelle Formel",
    body: "Feuer-Cooldown -20%, Manakosten +15%.",
    apply: (spells) => {
      spells.spells.fire.cooldown *= 0.8;
      spells.spells.fire.currentCooldown = Math.min(spells.spells.fire.currentCooldown, spells.spells.fire.cooldown);
      spells.spells.fire.manaCost = Math.ceil(spells.spells.fire.manaCost * 1.15);
    },
  },
  {
    title: "Konzentrierte Glut",
    body: "Feuer-Cooldown +25%, Feuerball groesser und staerker.",
    apply: (spells) => {
      spells.spells.fire.cooldown *= 1.25;
      spells.fireDamageMultiplier *= 1.35;
      spells.fireKnockbackMultiplier *= 1.35;
      spells.spells.fire.manaCost += 4;
    },
  },
  {
    title: "Sturmleitung",
    body: "Blitz-Cooldown sinkt leicht pro getroffenem Gegner.",
    apply: (spells) => {
      spells.traits.lightningRefundPerHit += 0.18;
    },
  },
  {
    title: "Frostreserve",
    body: "Frost-Cooldown sinkt, wenn mindestens sechs Gegner getroffen werden.",
    apply: (spells) => {
      spells.traits.frostRefundOnCrowd += 1.4;
    },
  },
  {
    title: "Stabdisziplin",
    body: "Stabtreffer reduzieren den zuletzt genutzten Zauber-Cooldown.",
    apply: (spells) => {
      spells.traits.staffDiscipline += 0.18;
    },
  },
  {
    title: "Sproedes Eis",
    body: "Stabtreffer gegen gefrostete Gegner erzeugen Splitterschaden.",
    apply: (spells) => {
      spells.traits.brittleIceStaffBonus += 0.25;
      spells.traits.brittleIceShatterDamage += 16;
    },
  },
  {
    title: "Leitende Asche",
    body: "Blitz springt weiter, wenn brennende Gegner in Reichweite sind.",
    apply: (spells) => {
      spells.traits.conductiveAshExtraTargets += 2;
    },
  },
  {
    title: "Branddruck",
    body: "Feuer stoesst verlangsamte oder gefrorene Gegner staerker zurueck.",
    apply: (spells) => {
      spells.traits.pressureVsSlowed += 0.45;
    },
  },
  {
    title: "Stabfokus",
    body: "Stabtreffer reduzieren den zuletzt gewirkten Zauber leicht.",
    apply: (spells) => {
      spells.traits.staffDiscipline += 0.28;
    },
  },
  {
    title: "Arkaner Rhythmus",
    body: "Drei verschiedene Zauber nacheinander verstaerken den naechsten Zauber.",
    apply: (spells) => {
      spells.traits.rhythmBonus += 0.3;
    },
  },
  {
    title: "Den spare ich mir auf",
    body: "Feuer wird staerker, je laenger es bereit ist und nicht genutzt wird.",
    apply: (spells) => {
      spells.traits.savedFireBonusPerSecond += 0.035;
      spells.traits.savedFireMaxBonus += 0.45;
    },
  },
  {
    title: "Arkaner Nachhall",
    body: "Der Stab-Finisher erzeugt eine groessere magische Welle.",
    apply: (spells) => {
      spells.traits.staffFinisherWave += 0.28;
    },
  },
  {
    title: "Disziplinierter Rhythmus",
    body: "Eine vollstaendige Stab-Combo gibt extra Mana.",
    apply: (spells) => {
      spells.traits.fullStaffComboMana += 12;
    },
  },
  {
    title: "Stock und Formel",
    body: "Nach einer vollen Stab-Combo ist der naechste Zauber guenstiger.",
    apply: (spells) => {
      spells.traits.nextSpellDiscountOnFullCombo = Math.max(spells.traits.nextSpellDiscountOnFullCombo, 0.25);
    },
  },
  {
    title: "Kampfhaltung",
    body: "Waehrend einer Stab-Combo nimmst du etwas weniger Schaden.",
    apply: (spells) => {
      spells.traits.staffComboDamageReduction = Math.min(0.35, spells.traits.staffComboDamageReduction + 0.18);
    },
  },
];

export function getCardChoices(count = 3) {
  return [...CARD_POOL].sort(() => Math.random() - 0.5).slice(0, count);
}
