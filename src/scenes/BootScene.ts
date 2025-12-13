/**
 * BootScene - 最小限のアセットをロードする初期シーン
 */

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload(): void {
        // ローディングバー用の最小限アセットをここでロード
        // 現時点では何もロードしない（プレースホルダー）
    }

    create(): void {
        console.log('BootScene: Starting...');

        // PreloadSceneへ遷移
        this.scene.start('PreloadScene');
    }
}
