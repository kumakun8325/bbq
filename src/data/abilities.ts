
import { AbilityDefinition } from '@/types';

export const ABILITIES: Record<string, AbilityDefinition> = {
    // とりくん用
    zenryoku: {
        id: 'zenryoku',
        name: 'ぜんりょく',
        description: '敵単体に1.5倍の物理ダメージ',
        mpCost: 5,
        targetScope: 'single_enemy',
        effectType: 'damage',
        power: 1.5
    },
    // だいちゃん用
    tatakiwaru: {
        id: 'tatakiwaru',
        name: 'たたきわる',
        description: '敵単体に1.2倍ダメージとシールド2削減',
        mpCost: 6,
        targetScope: 'single_enemy',
        effectType: 'special',
        power: 1.2,
        shieldDamage: 2
    },
    // しんいち用
    nerau: {
        id: 'nerau',
        name: 'ねらう',
        description: '敵単体に必中クリティカル攻撃',
        mpCost: 4,
        targetScope: 'single_enemy',
        effectType: 'damage',
        isCritical: true,
        power: 1.0 // 通常倍率だがクリティカルで1.5倍になる
    },
    // たいさ用
    inoru: {
        id: 'inoru',
        name: 'いのる',
        description: '味方全体のHPを30回復',
        mpCost: 8,
        targetScope: 'all_allies',
        effectType: 'heal_hp',
        power: 30 // 回復量として使用
    }
};
