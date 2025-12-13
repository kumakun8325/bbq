/**
 * ゲーム設定
 * Phaser 3 の設定オブジェクト
 */

import Phaser from 'phaser';
import { BootScene } from '@scenes/BootScene';
import { PreloadScene } from '@scenes/PreloadScene';
import { TitleScene } from '@scenes/TitleScene';
import { MapScene } from '@scenes/MapScene';
import { BattleScene } from '@scenes/BattleScene';

/** ゲームの基本解像度 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 320;

/** タイルサイズ */
export const TILE_SIZE = 16;

/** ゲーム設定 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: GAME_WIDTH / 2,
            height: GAME_HEIGHT / 2
        },
        max: {
            width: GAME_WIDTH * 3,
            height: GAME_HEIGHT * 3
        }
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: process.env.NODE_ENV === 'development'
        }
    },
    scene: [
        BootScene,
        PreloadScene,
        TitleScene,
        MapScene,
        BattleScene
    ],
    input: {
        keyboard: true,
        gamepad: true
    },
    audio: {
        disableWebAudio: false
    }
};
