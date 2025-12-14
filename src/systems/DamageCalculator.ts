/**
 * ダメージ計算システム
 * 設計書3.5.12（FF6準拠・参考）に基づく
 */

import { DamageResult } from '@/types';

/** ダメージ計算オプション */
export interface DamageCalculationOptions {
    attack: number;
    defense: number;
    isDefending?: boolean;
    weaknessMultiplier?: number;
    isBroken?: boolean;
    forceCritical?: boolean;
}

/**
 * ダメージ計算（MVP版）
 * - 基本ダメージ = 攻撃力 - 防御力/2
 * - 乱数 0.9〜1.1倍
 * - クリティカル 15%で1.5倍
 * - ブレイク中は2倍
 * - 防御中は半減
 */
export function calculateDamage(options: DamageCalculationOptions): DamageResult {
    const {
        attack,
        defense,
        isDefending = false,
        weaknessMultiplier = 1.0,
        isBroken = false,
        forceCritical = false,
    } = options;

    // 基本ダメージ
    let baseDamage = attack - Math.floor(defense / 2);

    // 乱数（0.9〜1.1倍）
    const randomMultiplier = 0.9 + Math.random() * 0.2;
    baseDamage = Math.floor(baseDamage * randomMultiplier);

    // 弱点ボーナス
    baseDamage = Math.floor(baseDamage * weaknessMultiplier);

    // クリティカル判定（15%）
    const isCritical = forceCritical || Math.random() < 0.15;
    if (isCritical) {
        baseDamage = Math.floor(baseDamage * 1.5);
    }

    // ブレイクボーナス（2倍）
    if (isBroken) {
        baseDamage = Math.floor(baseDamage * 2.0);
    }

    // 防御中は半減
    if (isDefending) {
        baseDamage = Math.floor(baseDamage / 2);
    }

    // 最低1ダメージ保証
    const damage = Math.max(1, baseDamage);

    return { damage, isCritical };
}

/**
 * 回復量計算
 */
export function calculateHeal(baseValue: number): number {
    // 乱数（0.9〜1.1倍）
    const randomMultiplier = 0.9 + Math.random() * 0.2;
    return Math.floor(baseValue * randomMultiplier);
}
