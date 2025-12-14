
import { ItemDefinition } from '@/types';

export const ITEMS: Record<string, ItemDefinition> = {
    potion: {
        id: 'potion',
        name: 'ポーション',
        description: '味方単体のHPを50回復',
        type: 'consumable',
        targetScope: 'single_ally',
        effectType: 'heal_hp',
        effectValue: 50,
        price: 50
    },
    high_potion: {
        id: 'high_potion',
        name: 'ハイポーション',
        description: '味方単体のHPを200回復',
        type: 'consumable',
        targetScope: 'single_ally',
        effectType: 'heal_hp',
        effectValue: 200,
        price: 200
    },
    ether: {
        id: 'ether',
        name: 'エーテル',
        description: '味方単体のMPを20回復',
        type: 'consumable',
        targetScope: 'single_ally',
        effectType: 'heal_mp',
        effectValue: 20,
        price: 500
    }
};
