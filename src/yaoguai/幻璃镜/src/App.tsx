/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { GameProvider, useGameContext } from './store/GameContext';
import { MainMenu } from './components/screens/MainMenu';
import { GameScreen } from './components/screens/GameScreen';
import { GalleryScreen } from './components/screens/GalleryScreen';
import { NotificationSystem } from './components/ui/NotificationSystem';
import { cn } from './utils';
import { useIsMobile, useMobileMode } from './hooks';
import { startIframeGuard, type GuardHandle } from './utils/iframeGuard';
import { detectAndRedirect, checkEnvironment } from './utils/apiGuard';

import { ErrorBoundary } from './components/ui/ErrorBoundary';

const AppContent: React.FC = () => {
  // 环境白名单：非 TauriTavern / SillyTavern 直接抛错，由 ErrorBoundary 显示报错页
  const [envOk] = useState(() => checkEnvironment());
  if (!envOk) {
    throw new Error('[幻璃镜] 当前运行环境不受支持，请在 TauriTavern 或 SillyTavern 中加载');
  }
  const { currentScreen } = useGameContext();
  const isMobile = useIsMobile();
  const mobileOverride = useMobileMode();
  // 仅当用户显式选择「手机模式」时显示手机边框（真实手机自动检测不显示边框）
  const isPhoneFrame = mobileOverride === true;

  // ── iframe 高度守卫（事件驱动，替代暴力定时器） ──
  const guardRef = useRef<GuardHandle | null>(null);

  useEffect(() => {
    // 清理旧守卫
    guardRef.current?.destroy();
    // 启动新守卫
    guardRef.current = startIframeGuard(isMobile);

    // 监听全屏退出事件，触发 burst 修复
    const onFullscreenExit = () => {
      if (!window.__mirageFullscreen) {
        guardRef.current?.burst();
      }
    };
    // 用 fullscreenchange 事件替代原来的 50ms 轮询
    document.addEventListener('fullscreenchange', onFullscreenExit);
    // 也监听自定义的全屏状态变化（组件内部设置 __mirageFullscreen）
    const prevFs = { value: window.__mirageFullscreen || false };
    const fsCheckTimer = window.setInterval(() => {
      const curFs = window.__mirageFullscreen || false;
      if (prevFs.value && !curFs) {
        guardRef.current?.burst();
      }
      prevFs.value = curFs;
    }, 200); // 降低到 200ms，仅作为 fallback

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenExit);
      window.clearInterval(fsCheckTimer);
      guardRef.current?.destroy();
      guardRef.current = null;
    };
  }, [isMobile]);

  // ── API 防盗用守卫：检测"满血"字样跳转（启动延迟 + 周期复检）──
  useEffect(() => {
    const t = setTimeout(detectAndRedirect, 2000);
    const iv = setInterval(detectAndRedirect, 5000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  return (
    <div
      className={cn(
        "w-full h-screen flex items-center justify-center overflow-hidden",
        isPhoneFrame && "phone-frame-outer",
      )}
      style={{ backgroundColor: 'ink-700' }}
    >
      <div
        className={cn(
          "flex flex-col bg-ink-900 overflow-hidden text-paper-100 selection:bg-cyan-500/30 font-sans relative transition-all duration-300 w-full h-full",
          isMobile && "max-w-107.5 mx-auto",
          isPhoneFrame && "phone-frame",
        )}
      >
        <NotificationSystem />
        <AnimatePresence mode="wait">
          {currentScreen === 'main-menu' && <MainMenu key="main-menu" />}
          {currentScreen === 'game' && <GameScreen key="game" />}
          {currentScreen === 'gallery' && <GalleryScreen key="gallery" />}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </ErrorBoundary>
  );
}
