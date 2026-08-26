/**
 * 立绘层 — 手机端/桌面端共用
 *
 * 多角色同屏显示，根据 variant 切换布局策略
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils';
import { getTransitionConfig, type SceneCharacter } from '../../utils/gameConstants';

interface CharacterSpritesProps {
  characters: SceneCharacter[];
  /** 'mobile' = 上半视觉区内适配, 'desktop' = 全屏高度 */
  variant: 'mobile' | 'desktop';
}

export const CharacterSprites: React.FC<CharacterSpritesProps> = ({ characters, variant }) => {
  const isMobile = variant === 'mobile';

  return (
    <div className={cn(
      "absolute inset-0 pointer-events-none overflow-hidden",
      isMobile ? "z-15" : "z-15",
    )}>
      <AnimatePresence mode="popLayout">
        {characters.map((char) => (
          <motion.div
            key={char.speaker}
            className={cn(
              isMobile
                ? cn(
                    "absolute bottom-0 w-full h-full flex items-end justify-center transition-all duration-300 pointer-events-none",
                    characters.length >= 2 && char.position === 'center' && "justify-start pl-[3%]",
                    characters.length < 2 && char.position === 'center' && "justify-center",
                    char.position === 'left' && "justify-start pl-[3%]",
                    char.position === 'right' && "justify-end pr-[3%]",
                  )
                : cn(
                    "absolute bottom-0 h-full w-auto transition-all duration-300",
                    char.position === 'left' && "left-[5%]",
                    char.position === 'center' && "left-1/2 -translate-x-1/2",
                    char.position === 'right' && "right-[5%]",
                  ),
            )}
            style={{
              filter: char.isActive ? 'none' : 'brightness(0.55) grayscale(0.35)',
              zIndex: char.isActive ? 16 : 15,
              transform: char.isActive ? 'scale(1)' : 'scale(0.96)',
              transition: 'filter 0.3s ease, transform 0.3s ease',
            }}
            {...getTransitionConfig(char.emotion)}
          >
            {char.sprite && (
              <img src={char.sprite} alt={`${char.speaker}-${char.emotion}`}
                className={cn(
                  isMobile
                    ? cn(
                        "max-h-[80%] object-contain object-bottom",
                        characters.length <= 1 ? "max-w-full" : characters.length === 2 ? "max-w-[45%]" : "max-w-[31%]",
                      )
                    : "h-[85vh] max-h-250 w-auto object-contain object-bottom drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]",
                )}
                style={{
                  maskImage: `linear-gradient(to bottom, black ${isMobile ? '75%' : '80%'}, transparent 100%)`,
                  WebkitMaskImage: `linear-gradient(to bottom, black ${isMobile ? '75%' : '80%'}, transparent 100%)`,
                  ...(isMobile ? { filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' } : {}),
                }}
                loading="eager" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
