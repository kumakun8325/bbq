/**
 * ゲーム設定
 * Phaser 3 の設定オブジェクト
 */

import Phaser from 'phaser';
import { BootScene } from '@scenes/BootScene';
import { PreloadScene } from '@scenes/PreloadScene';
import { TitleScene } from '@scenes/TitleScene';
import { SaveLoadScene } from '@scenes/SaveLoadScene';
import { MapScene } from '@scenes/MapScene';
import { BattleScene } from '@scenes/BattleScene';

/** ゲームの基本解像度（スマホ横持ち20:9に最適化） */
export const GAME_WIDTH = 1600;
export const GAME_HEIGHT = 720;

/** タイルサイズ */
export const TILE_SIZE = 16;

/** ゲーム設定 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
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
        SaveLoadScene,
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
