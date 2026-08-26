/**
 * 游戏共享常量与工具函数
 *
 * 从 GameScreen.tsx 提取，供手机端/桌面端布局共用
 */

import { SAMPLE_CHARACTERS } from '../data/sampleData';

// ── 场景角色信息（多角色同屏）──
export interface SceneCharacter {
  speaker: string;
  emotion: string;
  sprite: string;
  position: 'left' | 'center' | 'right';
  isActive: boolean;
}

/** 将 <user> 替换为显示名 */
export function displayName(name: string, playerName?: string): string {
  if (name === '<user>') return playerName || '我';
  return name;
}

/** 情绪对应的屏幕特效 */
export const EMOTION_EFFECTS: Record<string, {
  shake?: boolean;
  flashColor?: string;
  vignette?: string;
}> = {
  '生气': { shake: true, vignette: 'rgba(214,61,46,0.08)' },
  '惊讶': { shake: true, flashColor: 'rgba(255,255,255,0.2)' },
  '害羞': { vignette: 'rgba(232,112,96,0.1)' },
  '害怕': { vignette: 'rgba(0,0,0,0.25)' },
  '伤心': { vignette: 'rgba(10,10,10,0.15)' },
  '开心': { vignette: 'rgba(212,183,90,0.08)' },
  '吃醋': { vignette: 'rgba(184,45,32,0.1)' },
};

/** 获取切换动画配置 */
export function getTransitionConfig(emotion: string) {
  switch (emotion) {
    case '生气':
    case '惊讶':
      return {
        initial: { opacity: 0, scale: 1.08, x: 8 },
        animate: { opacity: 1, scale: 1, x: 0 },
        transition: { duration: 0.18, type: 'spring' as const, stiffness: 350 }
      };
    case '害羞':
    case '害怕':
      return {
        initial: { opacity: 0, scale: 0.96, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: 0.35, ease: 'easeOut' as const }
      };
    case '伤心':
      return {
        initial: { opacity: 0, y: 25 },
        animate: { opacity: 0.92, y: 0 },
        transition: { duration: 0.45 }
      };
    default:
      return {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28 }
      };
  }
}

/** 从角色名获取主题色（数据驱动：查 SAMPLE_CHARACTERS 的 themeColor） */
export function getCharacterThemeColor(speaker?: string): 'cyan' | 'vermilion' | 'gold' {
  if (!speaker) return 'cyan';
  for (const key of Object.keys(SAMPLE_CHARACTERS)) {
    const char = SAMPLE_CHARACTERS[key as keyof typeof SAMPLE_CHARACTERS];
    if (char.name === speaker) return char.themeColor === 'vermilion' ? 'vermilion' : 'cyan';
  }
  return 'cyan';
}
