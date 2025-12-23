/**
 * BBQ (Bird Battle Quest) - メインエントリーポイント
 * FF6 × オクトパストラベラー風 2D RPG
 */

import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

// ゲームインスタンスの作成
const game = new Phaser.Game(gameConfig);

// ローディング画面を非表示 & PWA Service Worker登録
window.addEventListener('load', () => {
    // ローディング画面削除
    const loading = document.getElementById('loading');
    if (loading) {
        setTimeout(() => {
            loading.classList.add('hidden');
            setTimeout(() => {
                loading.remove();
            }, 500);
        }, 500);
    }

    // Service Worker登録
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('SW registered: ', registration);

            // 更新チェック
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker == null) {
                    return;
                }
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            console.log('New content is available; please refresh.');
                            // ユーザーに更新を通知するUIを表示するなどの処理がここに入ります
                        } else {
                            console.log('Content is cached for offline use.');
                        }
                    }
                };
            };
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    }
});

// デバッグ用にグローバルに公開（開発時のみ）
if (process.env.NODE_ENV === 'development') {
    (window as any).game = game;
}

export default game;
