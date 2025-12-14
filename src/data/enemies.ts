/**
 * 敵データベース
 */

import { EnemyBattleData } from '@/types';

/** 敵データベース（バトル用） */
export const ENEMY_DATABASE: Record<string, EnemyBattleData> = {
    slime: {
        name: "スライム",
        hp: 50,  // テスト用に低く設定（本来500）
        maxHp: 50,
        attack: 10,
        defense: 2,
        speed: 20, // 低速な敵
        atb: 0,
        maxAtb: 100,
        color: 0xe94560,
        width: 32,
        height: 32,
        spriteKey: "enemy-slime",
        shield: 4,
        maxShield: 4,
        weaknesses: ["sword", "fire"],
        revealedWeaknesses: [false, false],
        isBroken: false,
        breakStartTurn: 0,
        expReward: 15,
    },
    bat: {
        name: "コウモリ",
        hp: 35,  // テスト用に低く設定（本来350）
        maxHp: 35,
        attack: 15,
        defense: 1,
        speed: 60, // 素早い敵
        atb: 0,
        maxAtb: 100,
        color: 0x8b5cf6,
        width: 32,
        height: 32,
        spriteKey: "enemy-bat",
        shield: 3,
        maxShield: 3,
        weaknesses: ["bow", "wind"],
        revealedWeaknesses: [false, false],
        isBroken: false,
        breakStartTurn: 0,
        expReward: 12,
    },
    goblin: {
        name: "ゴブリン",
        hp: 80,  // テスト用に低く設定（本来800）
        maxHp: 80,
        attack: 20,
        defense: 5,
        speed: 35, // 中速な敵
        atb: 0,
        maxAtb: 100,
        color: 0xf59e0b,
        width: 32,
        height: 32,
        spriteKey: "enemy-goblin",
        shield: 5,
        maxShield: 5,
        weaknesses: ["sword", "spear", "fire"],
        revealedWeaknesses: [false, false, false],
        isBroken: false,
        breakStartTurn: 0,
        expReward: 25,
    },
};

/**
 * 指定したタイプの敵データのコピーを取得
 */
export function getEnemyData(enemyType: string): EnemyBattleData {
    const template = ENEMY_DATABASE[enemyType] || ENEMY_DATABASE.slime;
    return { ...template };
}
