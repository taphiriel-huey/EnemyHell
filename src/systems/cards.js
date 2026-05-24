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
    title: "Glutkern",
    body: "Feuer verursacht mehr Schaden. Stapelbar.",
    apply: (spells) => {
      spells.fireDamageMultiplier *= 1.16;
    },
  },
  {
    title: "Breiter Brand",
    body: "Feuer trifft groessere Flaechen, kostet etwas mehr Mana. Stapelbar.",
    apply: (spells) => {
      spells.fireSize += 0.12;
      spells.spells.fire.manaCost += 4;
    },
  },
  {
    title: "Druckwelle",
    body: "Feuer stoesst Gegner staerker zurueck. Stapelbar.",
    apply: (spells) => {
      spells.fireKnockbackMultiplier *= 1.14;
    },
  },
  {
    title: "Sparsame Zuendung",
    body: "Feuer kostet weniger Mana, verliert aber etwas Wucht. Stapelbar.",
    apply: (spells) => {
      spells.spells.fire.manaCost = Math.max(36, spells.spells.fire.manaCost - 7);
      spells.fireKnockbackMultiplier *= 0.96;
    },
  },
  {
    title: "Kurze Beschwoerung",
    body: "Feuer-Cooldown sinkt leicht. Stapelbar.",
    apply: (spells) => {
      spells.spells.fire.cooldown = Math.max(4.8, spells.spells.fire.cooldown * 0.9);
      spells.spells.fire.currentCooldown = Math.min(spells.spells.fire.currentCooldown, spells.spells.fire.cooldown);
    },
  },
  {
    title: "Nachbrand",
    body: "Brennende Gegner bleiben laenger brennbar. Stapelbar.",
    apply: (spells) => {
      spells.traits.burningDuration += 0.55;
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
    title: "Geladene Spitze",
    body: "Blitz verursacht mehr Hauptschaden. Stapelbar.",
    apply: (spells) => {
      spells.lightningDamageMultiplier *= 1.14;
    },
  },
  {
    title: "Springerfunken",
    body: "Blitz springt auf ein weiteres Ziel. Stapelbar.",
    apply: (spells) => {
      spells.chainTargets += 1;
    },
  },
  {
    title: "Seitenentladung",
    body: "Blitz-Splash gegen Kleingegner wird staerker. Stapelbar.",
    apply: (spells) => {
      spells.lightningSplashDamageMultiplier *= 1.25;
    },
  },
  {
    title: "Lange Leitung",
    body: "Blitz findet Ziele aus groesserer Entfernung. Stapelbar.",
    apply: (spells) => {
      spells.lightningRange += 42;
    },
  },
  {
    title: "Statische Formel",
    body: "Blitz-Cooldown sinkt leicht, Manakosten steigen etwas. Stapelbar.",
    apply: (spells) => {
      spells.spells.lightning.cooldown = Math.max(2.2, spells.spells.lightning.cooldown * 0.9);
      spells.spells.lightning.currentCooldown = Math.min(spells.spells.lightning.currentCooldown, spells.spells.lightning.cooldown);
      spells.spells.lightning.manaCost += 3;
    },
  },
  {
    title: "Duennere Ader",
    body: "Blitz kostet weniger Mana, verursacht etwas weniger Schaden. Stapelbar.",
    apply: (spells) => {
      spells.spells.lightning.manaCost = Math.max(18, spells.spells.lightning.manaCost - 4);
      spells.lightningDamageMultiplier *= 0.96;
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
    title: "Eissplitter",
    body: "Frost verursacht mehr Schaden. Stapelbar.",
    apply: (spells) => {
      spells.frostDamageMultiplier *= 1.22;
    },
  },
  {
    title: "Frostfront",
    body: "Frost trifft eine groessere Flaeche. Stapelbar.",
    apply: (spells) => {
      spells.frostRadius += 16;
    },
  },
  {
    title: "Tiefkaelte",
    body: "Frost verlangsamt und friert laenger. Stapelbar.",
    apply: (spells) => {
      spells.frostDuration += 0.38;
    },
  },
  {
    title: "Kalte Formel",
    body: "Frost kostet weniger Mana. Stapelbar.",
    apply: (spells) => {
      spells.spells.frost.manaCost = Math.max(16, spells.spells.frost.manaCost - 4);
    },
  },
  {
    title: "Schneller Winter",
    body: "Frost-Cooldown sinkt leicht. Stapelbar.",
    apply: (spells) => {
      spells.spells.frost.cooldown = Math.max(2.8, spells.spells.frost.cooldown * 0.9);
      spells.spells.frost.currentCooldown = Math.min(spells.spells.frost.currentCooldown, spells.spells.frost.cooldown);
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
    title: "Griffband",
    body: "Stabtreffer geben etwas mehr Mana. Stapelbar.",
    apply: (spells) => {
      spells.meleeManaMultiplier += 0.18;
    },
  },
  {
    title: "Ruhige Haende",
    body: "Stab-Finisher erzeugt etwas mehr arkanen Nachdruck. Stapelbar.",
    apply: (spells) => {
      spells.traits.staffFinisherWave += 0.12;
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
