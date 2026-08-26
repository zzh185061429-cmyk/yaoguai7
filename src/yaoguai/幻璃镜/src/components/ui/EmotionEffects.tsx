/**
 * 情绪特效层 — 手机端/桌面端共用
 *
 * 包含：屏幕抖动、暗角、闪光
 */

import React from 'react';
import { motion } from 'motion/react';

interface EmotionEffectsProps {
  shake?: boolean;
  flashColor?: string;
  vignette?: string;
}

export const EmotionEffects: React.FC<EmotionEffectsProps> = ({ shake, flashColor, vignette }) => {
  return (
    <div className="absolute inset-0 z-18 pointer-events-none">
      {shake && (
        <motion.div animate={{ x: [0, -4, 4, -4, 4, 0] }} transition={{ duration: 0.25 }} className="w-full h-full" />
      )}
      {vignette && (
        <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 200px ${vignette}` }} />
      )}
      {flashColor && (
        <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.25 }}
          className="absolute inset-0" style={{ backgroundColor: flashColor }} />
      )}
    </div>
  );
};
