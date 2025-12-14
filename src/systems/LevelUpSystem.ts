/**
 * レベルアップシステム
 * 経験値計算、レベルアップ判定、ステータス成長を管理
 */

import { CharacterInstance, GrowthRates } from '@/types';

/**
 * 指定レベルに必要な累計経験値を計算
 * FF6風の計算式を使用
 */
export function getRequiredExpForLevel(level: number): number {
    if (level <= 1) return 0;
    // レベル2に必要: 16, レベル3: 64, ...
    return Math.floor(16 * (level - 1) ** 2);
}

/**
 * 次のレベルまでに必要な経験値を計算
 */
export function getExpToNextLevel(currentLevel: number, currentExp: number): number {
    const requiredExp = getRequiredExpForLevel(currentLevel + 1);
    return Math.max(0, requiredExp - currentExp);
}

/**
 * レベルアップ結果
 */
export interface LevelUpResult {
    levelsGained: number;    // 上昇したレベル数
    newLevel: number;        // 新しいレベル
    statGains: {            // 各ステータスの上昇量
        hp: number;
        mp: number;
        attack: number;
        defense: number;
        speed: number;
    };
}

/**
 * キャラクターに経験値を付与し、レベルアップ判定を行う
 * @param character キャラクターインスタンス
 * @param expGained 獲得経験値
 * @param growthRates 成長率
 * @returns レベルアップ結果（レベルアップしなかった場合はnull）
 */
export function applyExperience(
    character: CharacterInstance,
    expGained: number,
    growthRates: GrowthRates
): LevelUpResult | null {
    const oldLevel = character.currentStats.level;

    // 経験値を加算
    character.currentStats.exp += expGained;

    // レベルアップ判定
    let newLevel = oldLevel;
    while (true) {
        const requiredExp = getRequiredExpForLevel(newLevel + 1);
        if (character.currentStats.exp >= requiredExp) {
            newLevel++;
        } else {
            break;
        }
        // 安全のためレベル上限99
        if (newLevel >= 99) break;
    }

    // レベルが上がっていなければnullを返す
    if (newLevel === oldLevel) {
        return null;
    }

    const levelsGained = newLevel - oldLevel;

    // ステータス上昇量を計算
    const statGains = {
        hp: growthRates.hp * levelsGained,
        mp: growthRates.mp * levelsGained,
        attack: growthRates.attack * levelsGained,
        defense: growthRates.defense * levelsGained,
        speed: growthRates.speed * levelsGained
    };

    // ステータスを更新
    character.currentStats.level = newLevel;
    character.currentStats.maxHp += statGains.hp;
    character.currentStats.hp += statGains.hp;
    character.currentStats.maxMp += statGains.mp;
    character.currentStats.mp += statGains.mp;
    character.currentStats.attack += statGains.attack;
    character.currentStats.defense += statGains.defense;
    character.currentStats.speed += statGains.speed;

    // 現在HP/MPも全回復（レベルアップボーナス）
    character.currentHp = character.currentStats.maxHp;
    character.currentMp = character.currentStats.maxMp;

    return {
        levelsGained,
        newLevel,
        statGains
    };
}
