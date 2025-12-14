/**
 * バトルシーンの定数・レイアウト設定
 * 設計書3.5.7準拠
 */

// 循環参照を避けるため、ゲーム解像度を直接定義
// gameConfig.ts と同じ値を維持すること
const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;

/** バトルUIレイアウト定数 */
export const BATTLE_UI = {
    /** UI開始Y位置（下部） */
    UI_Y: GAME_HEIGHT - 150,

    /** ウィンドウ高さ */
    WINDOW_HEIGHT: 140,

    /** マージン */
    MARGIN: 10,

    /** ウィンドウ間の隙間 */
    GAP: 4,

    /** 左ウィンドウ幅比率（敵名ウィンドウ） */
    ENEMY_WINDOW_RATIO: 0.35,

    /** 行の高さ */
    ROW_HEIGHT: 32,

    /** コマンド行の高さ */
    COMMAND_LINE_HEIGHT: 36,

    /** ATBゲージ */
    ATB: {
        WIDTH: 90,
        HEIGHT: 10,
        BAR_HEIGHT: 6,
        OFFSET_X: 350,
    },

    /** HPテキスト位置 */
    HP_OFFSET_X: 140,

    /** MPテキスト位置 */
    MP_OFFSET_X: 270,

    /** 名前テキスト位置 */
    NAME_OFFSET_X: 15,
} as const;

/** バトルシステム定数（設計書3.5.2準拠） */
export const BATTLE_SYSTEM = {
    /** ATB基本回復速度 */
    ATB_BASE_SPEED: 0.3,

    /** スピード値の除数 */
    ATB_SPEED_DIVISOR: 100,

    /** ATB最大値 */
    ATB_MAX: 100,

    /** ATB初期値範囲（通常エンカウント） */
    ATB_INITIAL_MIN: 30,
    ATB_INITIAL_MAX: 70,

    /** 弱点ダメージ倍率 */
    WEAKNESS_MULTIPLIER: 1.3,

    /** ブレイク中ダメージ倍率 */
    BREAK_MULTIPLIER: 2.0,

    /** クリティカル発生率 */
    CRITICAL_RATE: 0.15,

    /** クリティカルダメージ倍率 */
    CRITICAL_MULTIPLIER: 1.5,
} as const;

/** キャラクター配置（設計書3.5.8準拠） */
export const PARTY_LAYOUT = {
    /** パーティ開始X位置 */
    BASE_X: GAME_WIDTH * 0.62,

    /** パーティ開始Y位置 */
    BASE_Y: GAME_HEIGHT * 0.12,

    /** 各キャラの横オフセット */
    OFFSET_X: 28,

    /** 各キャラの縦オフセット */
    OFFSET_Y: 64,

    /** 深度ベース値（設計書3.5.8: 1人目70、以降+10） */
    DEPTH_BASE: 70,

    /** 深度増分 */
    DEPTH_INCREMENT: 10,
} as const;

/** 敵配置 */
export const ENEMY_LAYOUT = {
    /** 敵X位置 */
    X: GAME_WIDTH * 0.25,

    /** 敵Y位置 */
    Y: GAME_HEIGHT * 0.4,

    /** スプライトスケール */
    SCALE: 4,
} as const;

/** アニメーション時間 */
export const ANIMATION_DURATION = {
    /** 攻撃前進 */
    ATTACK_STEP: 150,

    /** ダメージポップアップ */
    DAMAGE_POPUP: 1000,

    /** フェードイン/アウト */
    FADE: 300,

    /** メッセージ表示 */
    MESSAGE_DELAY: 1500,

    /** ブレイクエフェクト */
    BREAK_EFFECT: 500,
} as const;
