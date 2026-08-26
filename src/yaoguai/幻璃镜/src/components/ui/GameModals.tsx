/**
 * 游戏模态框集合 — 统一挂载点
 *
 * 将 7+1 个模态框的挂载逻辑从 GameScreen 的 3 处重复代码提取为单一组件
 *
 * MapModal 改为懒加载：仅在打开地图时挂载，使庞大的地点层级数据
 * (locationHierarchy.ts) 进入独立 chunk，首屏不再背负该数据。
 */

import React, { Suspense, lazy } from 'react';
import { SettingsModal } from '../modals/SettingsModal';
import { HistoryLogModal } from '../modals/HistoryLogModal';
import { ClueNotebookModal } from '../modals/ClueNotebookModal';
import { CalendarModal } from '../modals/CalendarModal';
import { ThinkingModal } from '../modals/ThinkingModal';
import { VariablesModal } from '../modals/VariablesModal';
import { ManualModal } from '../modals/ManualModal';
import { DeleteFloorModal } from '../modals/DeleteFloorModal';

const MapModal = lazy(() => import('../modals/MapModal').then(m => ({ default: m.MapModal })));

export type ModalType = 'settings' | 'history' | 'clues' | 'calendar' | 'thinking' | 'variables' | 'delete' | 'manual' | 'map' | null;

interface GameModalsProps {
  activeModal: ModalType;
  onClose: () => void;
}

/** 统一挂载所有游戏模态框 */
export const GameModals: React.FC<GameModalsProps> = ({ activeModal, onClose }) => {
  return (
    <>
      <SettingsModal isOpen={activeModal === 'settings'} onClose={onClose} />
      <HistoryLogModal isOpen={activeModal === 'history'} onClose={onClose} />
      <ClueNotebookModal isOpen={activeModal === 'clues'} onClose={onClose} />
      <CalendarModal isOpen={activeModal === 'calendar'} onClose={onClose} />
      <ThinkingModal isOpen={activeModal === 'thinking'} onClose={onClose} />
      <VariablesModal isOpen={activeModal === 'variables'} onClose={onClose} />
      <ManualModal isOpen={activeModal === 'manual'} onClose={onClose} />
      <DeleteFloorModal isOpen={activeModal === 'delete'} onClose={onClose} />
      {activeModal === 'map' && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-975/95 backdrop-blur-md">
            <span className="text-gold-400 font-serif tracking-[0.3em] animate-pulse text-sm">舆 图 载 入 中</span>
          </div>
        }>
          <MapModal isOpen onClose={onClose} />
        </Suspense>
      )}
    </>
  );
};
