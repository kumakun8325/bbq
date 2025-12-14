/**
 * バトルシステムのユーティリティ関数
 */

import { WeaknessType } from '@/types';

/** 弱点タイプから表示用アイコン（日本語1文字）を取得 */
export function getWeaknessIcon(type: WeaknessType): string {
    const icons: Record<WeaknessType, string> = {
        sword: "剣",
        spear: "槍",
        dagger: "短",
        axe: "斧",
        bow: "弓",
        staff: "杖",
        fire: "火",
        ice: "氷",
        lightning: "雷",
        wind: "風",
        light: "光",
        dark: "闇",
    };
    return icons[type] || "?";
}

/** 弱点タイプから英語名を取得（ログ表示用） */
export function getWeaknessName(type: WeaknessType): string {
    const names: Record<WeaknessType, string> = {
        sword: "Sword",
        spear: "Spear",
        dagger: "Dagger",
        axe: "Axe",
        bow: "Bow",
        staff: "Staff",
        fire: "Fire",
        ice: "Ice",
        lightning: "Lightning",
        wind: "Wind",
        light: "Light",
        dark: "Dark",
    };
    return names[type] || "Unknown";
}

/** 弱点リストから表示文字列を生成 */
export function formatWeaknessDisplay(
    weaknesses: WeaknessType[],
    revealedWeaknesses: boolean[]
): string {
    return weaknesses
        .map((weakness, index) => {
            const isRevealed = revealedWeaknesses[index];
            const icon = getWeaknessIcon(weakness);
            return isRevealed ? `[${icon}]` : "[?]";
        })
        .join(" ");
}
