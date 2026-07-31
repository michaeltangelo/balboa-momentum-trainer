import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH, tuning } from './game/config/tuning';
import { createDebugPanel } from './game/debug/debugPanel';
import { GameScene } from './game/scenes/GameScene';
import './styles/main.css';

const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
const updateDebug = debugEnabled ? createDebugPanel(tuning) : undefined;
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  backgroundColor: '#070b18',
  render: {
    antialias: true,
    roundPixels: false,
    pixelArt: false,
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  },
  scene: [new GameScene(updateDebug)],
  input: { activePointers: 1 },
  banner: false,
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.loop.sleep();
  } else {
    game.loop.wake();
    window.dispatchEvent(new Event('balboa-resume'));
  }
});
