/**
 * BBQ (Bird Battle Quest) - メインエントリーポイント
 * FF6 × オクトパストラベラー風 2D RPG
 */

import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

// ゲームインスタンスの作成
const game = new Phaser.Game(gameConfig);

// ローディング画面を非表示
window.addEventListener('load', () => {
    const loading = document.getElementById('loading');
    if (loading) {
        setTimeout(() => {
            loading.classList.add('hidden');
            setTimeout(() => {
                loading.remove();
            }, 500);
        }, 500);
    }
});

// デバッグ用にグローバルに公開（開発時のみ）
if (process.env.NODE_ENV === 'development') {
    (window as any).game = game;
}

export default game;
