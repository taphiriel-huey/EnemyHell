# EnemyHell Phaser 4 Techniktest

Separater Lab-Ordner fuer einen kleinen Phaser-4-FX-Test. Der bestehende Phaser-3-Prototyp bleibt unberuehrt.

## Start

```bash
cd phaser4-lab
npm install
npm run dev
```

## Inhalt der Demo

- Dunkler Fantasy-Hintergrund aus generierten Phaser-Primitives.
- Magier-Platzhalter mit Staff-Glow.
- 10 Gegner-Platzhalter mit leichtem Idle-Motion.
- Feuerzauber: additiver Projectile-Blend, Glow und Bloom-Post-FX.
- Blitz: additiver Bolt, kurzer Camera-Shake und heller Hitflash.
- Frost: blauer Tint im `SCREEN`-Tint-Modus, ColorMatrix-Post-FX und sichtbarer Slow im Enemy-Update.
- Hitflash: `setTint(...).setTintMode(Phaser.TintModes.FILL)` plus temporaerer Additive-Blend-Modus.
- Boss-Warnung: rote Additive-Overlay-Pulse, Vignette, Camera-Flash und Shake.

## Verwendete Phaser-4-Features

- `postFX.addGlow` fuer Sprite-, Projectile- und Aura-Leuchten.
- `postFX.addBloom` fuer den Feuerzauber.
- `postFX.addColorMatrix` fuer Frost-Farbverschiebung.
- `Phaser.BlendModes.ADD` fuer additive Spell- und Warn-Effekte.
- `setTint`, `setTintMode` mit `FILL`/`SCREEN`/`MULTIPLY` und `clearTint` fuer Frost und Hitflash.
- Kameraeffekte: `flash` und `shake`.
- Generierte Texturen via `Graphics.generateTexture`, damit das Lab keine Projektassets braucht.

## Erste Bewertung

Phaser 4 wirkt fuer EnemyHell bei Look und Spell-Feedback sinnvoll, wenn die Prioritaet auf sauberen Post-FX, additiven Spell-Layern und mehr visueller Lesbarkeit liegt. Besonders Feuer, Blitz und Boss-Warnungen profitieren sofort von Glow/Bloom/BlendModes ohne eigene Shader-Pipeline.

Eine Migration wirkt aber nur dann sinnvoll, wenn die bestehenden Gameplay-Systeme vorher stabil bleiben und Phaser 4 in den Zielbrowsern sauber laeuft. Fuer einen kompletten Umstieg wuerde ich zuerst ein zweites Lab mit echten EnemyHell-Sprites, Performance-Messung bei vielen Projektilen und Vergleich gegen den aktuellen Phaser-3-Look machen.
