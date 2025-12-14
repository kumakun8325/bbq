/**
 * バトルUI描画ヘルパー関数
 * FF6/SFC風のUIコンポーネント描画
 */

import Phaser from 'phaser';

/**
 * 標準的な青いウィンドウを描画（FF6風）
 * @param scene - Phaserシーン
 * @param x - X座標
 * @param y - Y座標
 * @param width - 幅
 * @param height - 高さ
 * @returns Graphics オブジェクト
 */
export function drawWindow(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();

    // 背景（暗い青）
    g.fillStyle(0x000044, 0.9);
    g.fillRect(x, y, width, height);

    // 外枠（白）
    g.lineStyle(4, 0xffffff, 1);
    g.strokeRect(x + 2, y + 2, width - 4, height - 4);

    // 内枠（グレー）
    g.lineStyle(2, 0xaaaaaa, 1);
    g.strokeRect(x + 6, y + 6, width - 12, height - 12);

    return g;
}

/**
 * HPバーを描画
 * HP残量に応じて色が変化（緑→黄→赤）
 */
export function drawHpBar(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    current: number,
    max: number,
    isEnemy: boolean = false,
): void {
    graphics.clear();

    const ratio = Math.max(0, current / max);
    const barWidth = width * ratio;

    // 色を決定（HP残量に応じて変化）
    let color: number;
    if (isEnemy) {
        color = 0xe94560; // 敵は赤
    } else {
        if (ratio > 0.5) {
            color = 0x4ade80; // 緑（50%以上）
        } else if (ratio > 0.25) {
            color = 0xfbbf24; // 黄（25%～50%）
        } else {
            color = 0xe94560; // 赤（25%未満）
        }
    }

    // HPバーを描画
    graphics.fillStyle(color, 1);
    graphics.fillRect(x, y, barWidth, height);

    // 光沢効果
    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillRect(x, y, barWidth, height / 3);
}

/**
 * ATBゲージを描画
 * 設計書3.5.7: 溜め中は白/薄いグレー、満タン時は黄色/オレンジ系に発光
 */
export function drawAtbBar(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    current: number,
    max: number,
): void {
    graphics.clear();

    const ratio = Math.max(0, Math.min(1, current / max));
    const barWidth = width * ratio;

    // 満タン判定
    const isFull = ratio >= 1;
    const baseColor = isFull ? 0xffcc00 : 0xffffff; // 満タン: 黄色, 途中: 白
    const glowColor = isFull ? 0xffffaa : 0xaaaaaa;

    if (barWidth > 0) {
        // ゲージ本体
        graphics.fillStyle(baseColor, 1);
        graphics.fillRect(x, y, barWidth, height);

        // 中心に光沢ラインを入れる
        graphics.fillStyle(glowColor, 0.8);
        graphics.fillRect(x, y + height / 2 - 1, barWidth, 2);
    }
}

/**
 * ATBゲージの枠を描画（初期化時に一度だけ呼ぶ）
 */
export function drawAtbFrame(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
): Phaser.GameObjects.Graphics {
    const frame = scene.add.graphics();

    // 背景色（暗い色）
    frame.fillStyle(0x222222, 1);
    frame.fillRoundedRect(x, y, width, height, 4);

    // 枠線（明るいグレー）
    frame.lineStyle(2, 0xaaaaaa, 1);
    frame.strokeRoundedRect(x, y, width, height, 4);

    return frame;
}
