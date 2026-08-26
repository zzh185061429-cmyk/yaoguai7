/**
 * 选项面板 — 手机端/桌面端共用
 *
 * 全屏覆盖式选项列表，支持 Q 版小人
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '../../utils';

interface OptionsPanelProps {
  show: boolean;
  options: string[];
  optionChibis: string[];
  onDismiss: () => void;
  onSelect: (option: string) => void;
  /** 桌面端用更宽松的间距 */
  desktop?: boolean;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  show, options, optionChibis, onDismiss, onSelect, desktop = false,
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
          className="absolute inset-0 z-35 bg-ink-900/85 backdrop-blur-md flex items-center justify-center p-4">
          <button onClick={onDismiss}
            className={cn(
              "absolute top-4 right-4 z-40 p-2 bg-gold-500 hover:scale-110 transition-transform rounded-xs font-serif",
              desktop ? "text-ink-850" : "text-ink-900",
            )}
            title="关闭选项">
            <X className="w-5 h-5" />
          </button>
          <motion.div initial={{ scale: 0.85, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 200, delay: 0.1 }}
            className={cn(
              "w-full max-w-2xl flex flex-col relative z-10",
              desktop ? "gap-3" : "gap-2",
            )}>
            {options.map((option, i) => {
              const colorScheme = desktop
                ? (i % 2 === 0
                  ? "bg-ink-750/90 border-gold-700/70 text-gold-300"
                  : "bg-vermilion-900/90 border-vermilion-700/70 text-vermilion-300")
                : (i % 2 === 0
                  ? "bg-cyan-900/60 border-cyan-500/50 text-cyan-300"
                  : "bg-vermilion-900/60 border-vermilion-500/50 text-vermilion-300");
              return (
                <motion.button key={i} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, type: "spring", damping: 18 }}
                  onClick={() => onSelect(option)}
                  className={cn(
                    "flex items-center border-2 font-serif text-left rounded-xs",
                    desktop ? "gap-4 p-4" : "gap-3 p-3",
                    "hover:scale-[1.02] active:scale-95 transition-all duration-150 group relative overflow-hidden",
                    desktop ? "shadow-lg" : "",
                    colorScheme,
                  )}>
                  {optionChibis[i] && (
                    <div className={cn(
                      "relative z-10 shrink-0 flex items-center justify-center",
                      desktop ? "w-16 h-16 md:w-20 md:h-20" : "w-12 h-12",
                    )}>
                      <img src={optionChibis[i]} alt="chibi"
                        className="w-full h-full object-contain group-hover:scale-125 group-hover:-rotate-6 transition-transform drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
                        loading="eager" />
                    </div>
                  )}
                  <span className={cn(
                    "relative z-10 flex-1 leading-snug",
                    desktop ? "text-base md:text-xl" : "text-sm",
                  )}>{option}</span>
                  <ChevronRight className={cn(
                    "relative z-10 shrink-0 group-hover:translate-x-2 transition-transform",
                    desktop ? "w-6 h-6" : "w-5 h-5",
                  )} />
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
