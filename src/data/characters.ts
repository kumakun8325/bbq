
import { CharacterDefinition } from '@/types';

export const PLAYABLE_CHARACTERS: Record<string, CharacterDefinition> = {
    torikun: {
        id: 'torikun',
        name: 'とりくん',
        spriteKey: 'player',
        battleSpriteKey: 'player-battle',
        defaultWeapon: 'sword',
        specialCommandName: 'ぜんりょく',
        initialStats: {
            hp: 100,
            maxHp: 100,
            mp: 20,
            maxMp: 20,
            attack: 15,
            defense: 5,
            speed: 40,
            level: 1,
            exp: 0
        }
    },
    daichan: {
        id: 'daichan',
        name: 'だいちゃん',
        spriteKey: 'player',
        battleSpriteKey: 'daichan-battle',
        defaultWeapon: 'axe',
        specialCommandName: 'たたきわる',
        initialStats: {
            hp: 80,
            maxHp: 80,
            mp: 10,
            maxMp: 10,
            attack: 20,
            defense: 3,
            speed: 50,
            level: 1,
            exp: 0
        }
    },
    shinichi: {
        id: 'shinichi',
        name: 'しんいち',
        spriteKey: 'player',
        battleSpriteKey: 'shinichi-battle',
        defaultWeapon: 'bow',
        specialCommandName: 'ねらう',
        initialStats: {
            hp: 90,
            maxHp: 90,
            mp: 15,
            maxMp: 15,
            attack: 12,
            defense: 8,
            speed: 30,
            level: 1,
            exp: 0
        }
    },
    taisa: {
        id: 'taisa',
        name: 'たいさ',
        spriteKey: 'player',
        battleSpriteKey: 'taisa-battle',
        defaultWeapon: 'staff',
        specialCommandName: 'いのる',
        initialStats: {
            hp: 120,
            maxHp: 120,
            mp: 30,
            maxMp: 30,
            attack: 18,
            defense: 6,
            speed: 25,
            level: 1,
            exp: 0
        }
    }
};
