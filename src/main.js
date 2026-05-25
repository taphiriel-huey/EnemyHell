import { BootScene } from "./scenes/BootScene.js?v=section-layout-2";
import { MenuScene } from "./scenes/MenuScene.js?v=section-layout-2";
import { CharacterScene } from "./scenes/CharacterScene.js?v=section-layout-2";
import { GameScene } from "./scenes/GameScene.js?v=section-layout-2";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#070607",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  scene: [BootScene, MenuScene, CharacterScene, GameScene],
};

window.blackhavenGame = new Phaser.Game(config);
