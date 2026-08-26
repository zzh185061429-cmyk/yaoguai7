import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameContext } from '../../store/GameContext';
import { GameModals, type ModalType } from '../ui/GameModals';
import { OptionsPanel } from '../ui/OptionsPanel';
import { EmotionEffects } from '../ui/EmotionEffects';
import { CharacterSprites } from '../ui/CharacterSprites';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Play, Pause, Zap, FastForward, History, Search, Send, Loader } from 'lucide-react';
import { AtmosphereEffect } from '../ui/AtmosphereEffect';
import { TextSelectionClue } from '../ui/TextSelectionClue';
import { MusicPlayerWidget } from '../ui/MusicPlayerWidget';
import { ChatInputWidget } from '../ui/ChatInputWidget';
import { HUD } from '../ui/HUD';
import { cn } from '../../utils';
import { useIsMobile } from '../../hooks';
import { sfx } from '../../audio/sfxPlayer';
import { textSettings, useTextSettings, getTextDelay } from '../../audio/textSettings';
import { parseScriptContent, parseOptions, parseParallelEvents, parseSceneImageTag, ScriptLine, ParallelEvent } from '../../scriptParser';
import { getAssistantFloors } from '../../utils/floorNav';
import { regenerateCurrentFloor } from '../../utils/interaction';
import { getParentJQuery, getSelfIframe, restoreIframeHeight } from '../../utils/iframeGuard';
import { SAMPLE_CHARACTERS } from '../../data/sampleData';
import { displayName, EMOTION_EFFECTS, getCharacterThemeColor, type SceneCharacter } from '../../utils/gameConstants';
import { getLocationImageSmart } from '../../data/locationImages';

// ── 场景角色信息、常量和工具函数已提取到 utils/gameConstants.ts ──

/** 场景背景层（memo 化）：背景 CG + 渐变遮罩 + 粒子，合并手机/桌面重复 JSX */
const SceneBackground = React.memo(function SceneBackground({
  bgUrl, locationName, showParticles, fallbackTextSize,
}: {
  bgUrl?: string;
  locationName: string;
  showParticles: boolean;
  fallbackTextSize: string;
}) {
  return (
    <>
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {bgUrl ? (
            <motion.img key={bgUrl} src={bgUrl} alt={locationName}
              initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full h-full object-cover" />
          ) : (
            <motion.div key="fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full h-full bg-ink-900 flex items-center justify-center">
              <div className={cn('text-paper-200/20 font-serif tracking-[0.3em]', fallbackTextSize)}>{locationName}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="absolute inset-0 bg-linear-to-t from-ink-900 via-ink-900/30 to-transparent z-10 pointer-events-none" />
      {showParticles && <AtmosphereEffect />}
    </>
  );
});

/** 平行事件面板（memo 化）：合并手机/桌面 4 份重复 JSX */
const ParallelEventsPanel = React.memo(function ParallelEventsPanel({
  events, expanded, variant, onToggle,
}: {
  events: ParallelEvent[];
  expanded: boolean;
  variant: 'mobile' | 'desktop';
  onToggle: (v: boolean) => void;
}) {
  const isMobile = variant === 'mobile';
  const posCls = isMobile ? 'absolute top-2 left-2 z-30 max-w-64' : 'absolute top-16 left-4 z-30 max-w-72';
  const padCls = isMobile ? 'px-2.5 py-1' : 'px-3 py-2';
  const bodyPadCls = isMobile ? 'p-2 space-y-2 max-h-48' : 'p-3 space-y-2.5 max-h-80';
  const titleCls = isMobile ? 'text-xs' : 'font-serif text-sm';
  const closeSize = isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const collapsePadCls = isMobile ? 'px-2 py-1' : 'px-2.5 py-1.5';
  const collapseLabel = isMobile ? '异闻' : '八荒异闻';
  const tagCls = isMobile
    ? 'text-[10px] text-paper-600'
    : 'text-[10px] text-paper-600 bg-ink-825 px-1.5 py-0.2 border border-gold-850 rounded-xs';
  const tagText = isMobile ? '【异动】' : '异动演化';

  return (
    <AnimatePresence mode="wait">
      {events.length > 0 && expanded && (
        <motion.div
          key={isMobile ? 'pe-m-expanded' : 'pe-expanded'}
          initial={{ x: isMobile ? -200 : -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isMobile ? -200 : -300, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(posCls, 'pointer-events-auto')}
        >
          <div className="bg-ink-825/95 backdrop-blur-md border border-gold-750 rounded-xs shadow-2xl overflow-hidden font-serif">
            <div className={cn('flex items-center justify-between bg-ink-825 border-b border-gold-850', padCls)}>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
                <span className={cn('text-gold-300 font-bold tracking-widest', titleCls)}>八荒异闻 · 同时演进</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onToggle(false); }}
                className="text-paper-400 hover:text-vermilion-400 transition-colors p-0.5 cursor-pointer">
                <X className={closeSize} />
              </button>
            </div>
            <div className={cn(bodyPadCls, 'overflow-y-auto custom-scrollbar')}>
              {events.map((evt, i) => (
                <div key={i} className="border-l-2 border-vermilion-800 bg-ink-825/80 rounded-xs border-r border-t border-b border-ink-800">
                  <div className={cn('text-gold-300 text-xs font-bold tracking-wider mb-0.5 flex items-center justify-between', !isMobile && 'font-serif leading-tight mb-1')}>
                    <span>{evt.location}</span>
                    <span className={tagCls}>{tagText}</span>
                  </div>
                  <div className={cn('text-paper-400 text-xs leading-relaxed', isMobile ? '' : 'font-serif', isMobile ? 'pl-2 p-1.5' : 'pl-2.5 p-2')}>{evt.event}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      {events.length > 0 && !expanded && (
        <motion.button
          key={isMobile ? 'pe-m-collapsed' : 'pe-collapsed'}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          onClick={(e) => { e.stopPropagation(); onToggle(true); }}
          className={cn(posCls, 'bg-ink-750/95 border border-gold-700 rounded-xs hover:scale-105 active:scale-95 transition-all pointer-events-auto flex items-center gap-1 text-gold-300 text-xs font-serif shadow-md cursor-pointer', collapsePadCls)}
          title="展开八荒异闻"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
          <span className={cn('tracking-wider', !isMobile && 'font-bold')}>{collapseLabel}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
});

export const GameScreen: React.FC = () => {
  const {
    setCurrentScreen, addNotification, setGalleryTab,
    startGenerating, finishGenerating,
    viewingFloorId, setViewingFloor, lastAssistantFloorId,
    isGenerating, generatingFloorId,
    setPendingMessage, pendingMessage, setScriptCharacterLocations,
    playerName,
    weatherParticlesEnabled,
    isInvestigating, setIsInvestigating,
    setGameTime, storyVersion,
    gameTime,
  } = useGameContext();
  const isMobile = useIsMobile();
  const { textSpeed, autoWaitMultiplier } = useTextSettings();

  // ── 全屏状态 ──
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // ── 剧本播放状态 ──
  const [script, setScript] = useState<ScriptLine[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [showBacklog, setShowBacklog] = useState(false);
  const [sceneCharacters, setSceneCharacters] = useState<SceneCharacter[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [optionsDismissed, setOptionsDismissed] = useState(false);
  const [parallelEvents, setParallelEvents] = useState<ParallelEvent[]>([]);
  const [showParallelEvents, setShowParallelEvents] = useState(true);
  const [isTextBoxCollapsed, setIsTextBoxCollapsed] = useState(false);
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sceneImageInfo, setSceneImageInfo] = useState<{ path?: string; weather: 'sunny' | 'cloudy'; time: 'day' | 'night' } | undefined>();
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null);

  const skipTypingRef = useRef(false);
  const prevLocationKeyRef = useRef<string | null>(null);
  const touchStartRef = useRef<number | null>(null);

  // ── 恢复 iframe 撑大高度（委托给 iframeGuard 工具函数） ──
  const restoreHeight = useCallback(() => {
    restoreIframeHeight(isMobile);
  }, [isMobile]);

  // ── 全屏：安全尝试操作父页面 DOM ──
  const toggleFullscreen = useCallback(async () => {
    const parent$ = getParentJQuery();

    try {
      if (!parent$) {
        if (!isFullscreen) {
          try {
            if (document.documentElement.requestFullscreen) {
              await document.documentElement.requestFullscreen();
            }
          } catch (e) {
            console.warn('[幻璃镜] 浏览器原生全屏失败，使用窗口最大化', e);
          }
          setIsFullscreen(true);
        } else {
          try {
            if (document.fullscreenElement && document.exitFullscreen) {
              await document.exitFullscreen();
            }
          } catch (e) {
            console.warn('[幻璃镜] 退出全屏失败', e);
          }
          setIsFullscreen(false);
        }
        return;
      }

      const iframe = getSelfIframe();

      const $mes = iframe ? parent$(iframe).closest('.mes') : parent$('#chat .mes').last();
      if (!isFullscreen) {
        let hideStyle = parent$('#tavern-mirage-fs-hide');
        if (hideStyle.length === 0) {
          hideStyle = parent$('<style id="tavern-mirage-fs-hide"></style>').appendTo('head');
        }
        const floorId = $mes.attr('mesid');
        hideStyle.text(floorId
          ? `#chat .mes:not([mesid="${floorId}"]) { display: none !important; }`
          : `#chat .mes { display: none !important; }`);
        $mes.css({ position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', 'z-index': '99999', 'max-width': 'none', 'max-height': 'none' });
        if (iframe) parent$(iframe).css({ width: '100%', height: '100%' });
        (window as any).__mirageFullscreen = true;
        setIsFullscreen(true);
        console.info('[幻璃镜] 已进入全屏模式');
        try { await document.documentElement.requestFullscreen(); } catch (e) { console.warn('[幻璃镜] 浏览器原生全屏失败，使用伪全屏', e); }
      } else {
        try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { console.warn('[幻璃镜] 退出浏览器全屏失败', e); }
        $mes.css({ position: '', top: '', left: '', width: '', height: '', 'z-index': '', 'max-width': '', 'max-height': '' });
        parent$('#tavern-mirage-fs-hide').remove();
        (window as any).__mirageFullscreen = false;
        setIsFullscreen(false);
        // 退出全屏后重新撑大 iframe 高度
        restoreHeight();
        console.info('[幻璃镜] 已退出全屏模式');
      }
    } catch (err) {
      console.warn('[幻璃镜] 全屏切换异常:', err);
    }
  }, [isFullscreen, restoreHeight]);

  useEffect(() => {
    const onFsChange = async () => {
      try {
        if (!document.fullscreenElement && isFullscreen) {
          const parent$ = getParentJQuery();
          if (!parent$) {
            setIsFullscreen(false);
            return;
          }
          const iframe = getSelfIframe();
          const $mes = iframe ? parent$(iframe).closest('.mes') : parent$('#chat .mes').last();
          $mes.css({ position: '', top: '', left: '', width: '', height: '', 'z-index': '', 'max-width': '', 'max-height': '' });
          parent$('#tavern-mirage-fs-hide').remove();
          (window as any).__mirageFullscreen = false;
          setIsFullscreen(false);
          // 浏览器全屏退出后重新撑大 iframe 高度
          restoreHeight();
          console.info('[幻璃镜] 浏览器全屏退出，已同步退出伪全屏');
        }
      } catch (err) {
        console.warn('[幻璃镜] 同步全屏状态异常:', err);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      try {
        const parent$ = getParentJQuery();
        if (!parent$) return;
        const iframe = getSelfIframe();
        const $mes = iframe ? parent$(iframe).closest('.mes') : parent$('#chat .mes').last();
        $mes.css({ position: '', top: '', left: '', width: '', height: '', 'z-index': '', 'max-width': '', 'max-height': '' });
        if (iframe) parent$(iframe).css({ width: '', height: '' });
        parent$('#tavern-mirage-fs-hide').remove();
      } catch {
        // ignore safely
      }
    };
  }, []);

  // ── 读取酒馆楼层消息 ──
  const targetFloorId = viewingFloorId ?? lastAssistantFloorId;

  const [floors, setFloors] = useState<number[]>([]);
  useEffect(() => { setFloors(getAssistantFloors()); }, [lastAssistantFloorId, isGenerating, generatingFloorId]);

  const availableFloors = useMemo(() => {
    if (isGenerating && generatingFloorId != null) return floors.filter(f => f < generatingFloorId);
    return floors;
  }, [floors, isGenerating, generatingFloorId]);

  const navFloor = viewingFloorId ?? (isGenerating ? lastAssistantFloorId : (generatingFloorId ?? lastAssistantFloorId));
  const navIndex = navFloor != null ? availableFloors.indexOf(navFloor) : -1;
  const canPrevFloor = navIndex > 0;
  const canNextFloor = navIndex >= 0 && navIndex < availableFloors.length - 1;

  const showOptions = options.length > 0 && !optionsDismissed && currentIndex >= script.length - 1 && !isTyping;

  const optionChibis = useMemo(() => {
    if (options.length === 0) return [];
    // Q版小人从角色数据取（xiao-ren sprite），多角色时轮换
    const chibis = Object.values(SAMPLE_CHARACTERS)
      .map(c => c.sprites?.['xiao-ren'])
      .filter((url): url is string => !!url);
    if (chibis.length === 0) return [];
    return options.map((_, i) => chibis[i % chibis.length]);
  }, [options]);

  const sceneLocation = useMemo(() => {
    const line = script[currentIndex];
    if (line?.location) return { path: line.location.path, displayName: line.location.displayName };
    return { path: '未知', displayName: '未知' };
  }, [script, currentIndex]);

  // ── 场景背景 CG 图 ──
  const sceneBgUrl = useMemo(() => {
    // 优先用 sceneImageInfo 的 path，退回到 sceneLocation.path
    const locPath = sceneImageInfo?.path || sceneLocation.path;
    if (!locPath || locPath === '未知') return undefined;
    // 智能查找：室内场景只查昼/夜，室外场景按晴阴雪×昼夜查找
    const isNight = sceneImageInfo ? sceneImageInfo.time === 'night' : gameTime >= 18 || gameTime < 6;
    const weather = sceneImageInfo ? (sceneImageInfo.weather === 'cloudy' ? 'cloudy' : 'sunny') : 'sunny';
    const time = isNight ? 'night' : 'day';
    return getLocationImageSmart(locPath, weather, time);
  }, [sceneImageInfo, sceneLocation.path, gameTime]);

  // ── 楼层切换时解析剧本 ──
  useEffect(() => {
    if (targetFloorId == null) {
      setScript([]);
      setOptions([]);
      setParallelEvents([]);
      setCurrentIndex(0);
      setSceneCharacters([]);
      prevLocationKeyRef.current = null;
      setSceneImageInfo(undefined);
      return;
    }
    try {
      const msg = getChatMessages(targetFloorId)[0];
      if (msg) {
        const parsed = parseScriptContent(msg.message, playerName);
        const parsedOptions = parseOptions(msg.message);
        const parsedParallelEvents = parseParallelEvents(msg.message);
        setScript(parsed);
        setOptions(parsedOptions);
        setOptionsDismissed(false);
        setParallelEvents(parsedParallelEvents);
        setShowParallelEvents(true);
        setCurrentIndex(0);
        setSceneCharacters([]);
        prevLocationKeyRef.current = null;
        // 场景图片标签 → 昼夜时间 + 天气 + 路径（驱动背景CG + 氛围特效）
        const sceneImage = parseSceneImageTag(msg.message);
        if (sceneImage?.time) setGameTime(sceneImage.time === 'night' ? 21 : 12);
        setSceneImageInfo(sceneImage);
        parsed.forEach(line => { if (line.sprite) { const img = new Image(); img.src = line.sprite; } });
      } else {
        setScript([]);
        setOptions([]);
        setParallelEvents([]);
        setCurrentIndex(0);
        setSceneCharacters([]);
        prevLocationKeyRef.current = null;
        setSceneImageInfo(undefined);
      }
    } catch {
      console.warn('StoryView: 无法读取楼层', targetFloorId, '的消息文本');
      setScript([]);
      setOptions([]);
      setParallelEvents([]);
      setCurrentIndex(0);
      setSceneCharacters([]);
      prevLocationKeyRef.current = null;
    }
  }, [targetFloorId, playerName, storyVersion, setGameTime]);

  const currentLine = script[currentIndex];

  // ── 从剧本中提取角色位置 ──
  useEffect(() => {
    if (script.length === 0) return;
    const charLocs: Record<string, string> = {};
    const endIdx = Math.min(currentIndex, script.length - 1);
    for (let i = 0; i <= endIdx; i++) {
      const line = script[i];
      if (!line.speaker || line.speaker === '<user>' || line.speaker === '我') continue;
      if (line.location) {
        const loc = line.location.path;
        if (loc) charLocs[line.speaker] = loc;
      }
    }
    if (Object.keys(charLocs).length > 0) setScriptCharacterLocations(charLocs);
  }, [script, currentIndex, setScriptCharacterLocations]);

  // ── 更新场景角色（多角色同屏） ──
  useEffect(() => {
    const loc = currentLine?.location;
    const currentLocationKey = loc ? loc.path : null;
    const locationChanged = currentLocationKey !== prevLocationKeyRef.current;
    prevLocationKeyRef.current = currentLocationKey;

    if (!currentLine?.speaker || currentLine.type === 'narrator') {
      if (locationChanged) setSceneCharacters([]);
      else setSceneCharacters(prev => prev.map(c => ({ ...c, isActive: false })));
      return;
    }
    const emotion = currentLine.emotion || '默认';
    const sprite = currentLine.sprite || '';
    if (locationChanged) {
      setSceneCharacters([{ speaker: currentLine.speaker!, emotion, sprite, position: 'center', isActive: true }]);
      return;
    }
    setSceneCharacters(prev => {
      const existingIndex = prev.findIndex(c => c.speaker === currentLine.speaker);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], emotion, sprite: sprite || updated[existingIndex].sprite, isActive: true };
        return updated.map((c, i) => ({ ...c, isActive: i === existingIndex }));
      } else {
        const newChar: SceneCharacter = { speaker: currentLine.speaker!, emotion, sprite, position: prev.length === 0 ? 'center' : prev.length === 1 ? 'right' : 'left', isActive: true };
        const next = [...prev.filter(c => c.position !== newChar.position), newChar];
        const sliced = next.slice(-3);
        return sliced.map((c, i) => ({ ...c, isActive: i === sliced.length - 1 }));
      }
    });
  }, [currentLine]);

  // ── 情绪音效 ──
  useEffect(() => {
    if (!currentLine || currentLine.type === 'narrator') return;
    if (currentLine.emotion && currentLine.emotion !== '默认') sfx.playEmotion(currentLine.emotion);
  }, [currentLine]);

  // ── 打字机效果 ──
  useEffect(() => {
    let rafId: number;
    let cancelled = false;
    skipTypingRef.current = false;
    if (currentLine && currentIndex < script.length) {
      if (textSpeed === 0 || isSkipping) { setDisplayedText(currentLine.text); setIsTyping(false); return; }
      setIsTyping(true); setDisplayedText("");
      const fullText = currentLine.text;
      let i = 0;
      const delay = getTextDelay(textSpeed);
      let lastTime = performance.now();
      const typeChar = (timestamp: number) => {
        if (cancelled || skipTypingRef.current) { if (!cancelled) { setDisplayedText(fullText); setIsTyping(false); } return; }
        const elapsed = timestamp - lastTime;
        if (elapsed < delay) { rafId = requestAnimationFrame(typeChar); return; }
        lastTime = timestamp;
        if (i < fullText.length) {
          const batchSize = textSpeed >= 3 ? 3 : 1;
          const endIndex = Math.min(i + batchSize, fullText.length);
          setDisplayedText(fullText.substring(0, endIndex));
          if (currentLine.type !== 'narrator') sfx.playBlip(currentLine.speaker);
          i = endIndex;
          rafId = requestAnimationFrame(typeChar);
        } else { setIsTyping(false); }
      };
      rafId = requestAnimationFrame(typeChar);
    }
    return () => { cancelled = true; if (rafId) cancelAnimationFrame(rafId); };
  }, [currentIndex, currentLine, script.length, textSpeed, isSkipping]);

  // Auto 模式
  useEffect(() => {
    if (isAutoMode && !isTyping && currentIndex < script.length - 1) {
      const baseWait = Math.min(3000, Math.max(1000, (currentLine?.text.length || 0) * 100));
      const timer = setTimeout(() => setCurrentIndex(prev => prev + 1), baseWait * autoWaitMultiplier);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isAutoMode, isTyping, currentIndex, script.length, currentLine, autoWaitMultiplier]);

  // Skip 模式
  useEffect(() => {
    if (isSkipping && !isTyping && !showOptions && !showBacklog && !isTextBoxCollapsed) {
      const timer = setTimeout(() => {
        if (currentIndex < script.length - 1) setCurrentIndex(prev => prev + 1);
        else if (canNextFloor && navIndex >= 0) {
          sfx.play('pageTurn');
          if (navIndex + 1 === availableFloors.length - 1) setViewingFloor(null);
          else setViewingFloor(availableFloors[navIndex + 1]);
        } else setIsSkipping(false);
      }, 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isSkipping, isTyping, showOptions, showBacklog, isTextBoxCollapsed, currentIndex, script.length, canNextFloor, navIndex, availableFloors, setViewingFloor]);

  const handleNext = useCallback(() => {
    if (!currentLine) return;
    // 调查模式开启时，点击文本不翻页（允许选择文本）
    if (isInvestigating) return;
    if (isTyping) { skipTypingRef.current = true; setDisplayedText(currentLine.text); setIsTyping(false); }
    else {
      sfx.play('click');
      if (currentIndex < script.length - 1) setCurrentIndex(prev => prev + 1);
      else if (canNextFloor && navIndex >= 0) {
        sfx.play('pageTurn');
        if (navIndex + 1 === availableFloors.length - 1) setViewingFloor(null);
        else setViewingFloor(availableFloors[navIndex + 1]);
      }
    }
  }, [currentLine, isInvestigating, isTyping, currentIndex, script.length, canNextFloor, navIndex, availableFloors, setViewingFloor]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) { sfx.play('click'); setCurrentIndex(prev => prev - 1); }
    else if (canPrevFloor && navIndex > 0) { sfx.play('pageTurn'); setViewingFloor(availableFloors[navIndex - 1]); }
  }, [currentIndex, canPrevFloor, navIndex, availableFloors, setViewingFloor]);

  // ── 键盘映射 ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (showOptions || showBacklog || isTextBoxCollapsed || activeModal) return;
      if (e.key === 'Control') {
        if (!isSkipping) { e.preventDefault(); setIsSkipping(true); if (isTyping && currentLine) { skipTypingRef.current = true; setDisplayedText(currentLine.text); setIsTyping(false); } }
        return;
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        if (e.repeat) return; e.preventDefault(); setIsSkipping(false); handleNext(); return;
      }
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        if (e.repeat) return; e.preventDefault(); setIsSkipping(false); handlePrev(); return;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') setIsSkipping(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [showOptions, showBacklog, isTextBoxCollapsed, activeModal, isSkipping, isTyping, currentLine, currentIndex, script.length, handleNext, handlePrev]);

  // ── 鼠标滚轮翻页 ──
  const wheelLockRef = useRef(false);
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.overflow-y-auto') || target.closest('.overflow-auto')) return;
      if (showOptions || showBacklog || isTextBoxCollapsed || activeModal) return;
      if (!isFullscreen) return;
      e.preventDefault();
      if (wheelLockRef.current) return;
      wheelLockRef.current = true;
      setTimeout(() => { wheelLockRef.current = false; }, 200);
      setIsSkipping(false);
      if (e.deltaY > 0) handleNext(); else if (e.deltaY < 0) handlePrev();
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [showOptions, showBacklog, isTextBoxCollapsed, activeModal, isFullscreen, handleNext, handlePrev]);

  const handlePrevFloor = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canPrevFloor && navIndex > 0) { sfx.play('pageTurn'); setViewingFloor(availableFloors[navIndex - 1]); }
  }, [canPrevFloor, navIndex, availableFloors, setViewingFloor]);

  const handleNextFloor = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canNextFloor && navIndex >= 0) {
      sfx.play('pageTurn');
      if (navIndex + 1 === availableFloors.length - 1) setViewingFloor(null);
      else setViewingFloor(availableFloors[navIndex + 1]);
    }
  }, [canNextFloor, navIndex, availableFloors, setViewingFloor]);

  const handleSelectOption = useCallback((option: string) => {
    sfx.play('confirm'); setPendingMessage(option); setOptionsDismissed(true);
  }, [setPendingMessage]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true); startGenerating();
    console.info('[幻璃镜] 开始重新生成...');
    const result = await regenerateCurrentFloor(targetFloorId);
    if (result.success) {
      addNotification('已重新生成当前楼层', 'success');
    } else if ('error' in result && result.error) {
      addNotification(result.error, 'warning');
    }
    setRegenerating(false); finishGenerating();
  }, [startGenerating, targetFloorId, regenerateCurrentFloor, addNotification, finishGenerating]);

  // ── 内嵌输入模式：文本区切换为输入框 ──
  const handleEnterInputMode = useCallback(() => {
    if (isGenerating) return;
    setIsInputMode(true);
    requestAnimationFrame(() => inputTextareaRef.current?.focus());
  }, [isGenerating]);

  const handleExitInputMode = useCallback(() => {
    setIsInputMode(false);
    setInputText('');
  }, []);

  const handleSendInput = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isGenerating) return;

    setInputText('');
    setIsInputMode(false);
    sfx.play('confirm');
    startGenerating();

    try {
      await triggerSlash('/send ' + trimmed);
      console.info('[幻璃镜] user 案录已创建');
      await triggerSlash('/trigger await=true');
      console.info('[幻璃镜] 断案演化生成完成');
    } catch (err: any) {
      console.error('[幻璃镜] 发送/演化失败:', err?.message || err);
      sfx.play('error');
      setInputText(trimmed);
      setIsInputMode(true);
    } finally {
      finishGenerating();
    }
  }, [inputText, isGenerating, startGenerating, finishGenerating]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (isGenerating) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendInput();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleExitInputMode();
    }
  };

  // pendingMessage 联动：地图/选项写入时自动进入输入模式
  useEffect(() => {
    if (pendingMessage) {
      setInputText(pendingMessage);
      setIsInputMode(true);
      setPendingMessage(null);
      requestAnimationFrame(() => inputTextareaRef.current?.focus());
    }
  }, [pendingMessage, setPendingMessage]);

  const currentEmotion = currentLine?.emotion || '默认';
  const screenEffect = EMOTION_EFFECTS[currentEmotion];
  const displayLocationName = useMemo(() => {
    if (currentLine?.location) {
      return currentLine.location.displayName;
    }
    return '幻璃镜';
  }, [currentLine]);

  // ── HUD 处理器记忆化：HUD 已包 React.memo，handler stable 后打字/楼层未变时 HUD 跳过重渲染 ──
  const openHarem = useCallback(() => {
    setGalleryTab('characters');
    setCurrentScreen('gallery');
  }, [setGalleryTab, setCurrentScreen]);

  const hudHandlers = useMemo(() => ({
    onToggleFullscreen: toggleFullscreen,
    onOpenThinking: () => setActiveModal('thinking'),
    onOpenVariables: () => setActiveModal('variables'),
    onOpenReading: () => setActiveModal('history'),
    onOpenDelete: () => setActiveModal('delete'),
    onOpenSettings: () => setActiveModal('settings'),
    onOpenManual: () => setActiveModal('manual'),
    onOpenCalendar: () => setActiveModal('calendar'),
    onOpenMap: () => setActiveModal('map'),
    onOpenClues: () => setActiveModal('clues'),
    onRegenerate: handleRegenerate,
  }), [toggleFullscreen, handleRegenerate, setActiveModal]);

  // GameModals 关闭回调（3 处共用，避免内联闭包）
  const handleCloseModal = useCallback(() => setActiveModal(null), []);

  // 空状态
  if (!currentLine && script.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="relative w-full h-screen bg-ink-900 overflow-hidden flex flex-col" id="screen-game">
        <HUD isFullscreen={isFullscreen} regenerating={regenerating} {...hudHandlers} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-paper-200/50 text-xl font-serif tracking-widest">等待剧情内容...</p>
        </div>
        <GameModals activeModal={activeModal} onClose={handleCloseModal} />
<MusicPlayerWidget />
      </motion.div>
    );
  }

  const isCyan = getCharacterThemeColor(currentLine?.speaker) === 'cyan';
  const themeTextClass = isCyan ? 'text-cyan-300' : 'text-vermilion-300';
  const themeBorderClass = isCyan ? 'border-cyan-500/50' : 'border-vermilion-500/50';
  const themeBgClass = isCyan ? 'bg-cyan-900/40' : 'bg-vermilion-900/40';

  // ════════════════════════════════════════════════════════════════
  // ── 手机端布局：GBF 式上下分区（视觉区60% + 操作区40%）──
  // ════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, filter: 'blur(10px)', scale: 1.02 }}
        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
        exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col w-full h-full overflow-hidden bg-ink-900"
        id="screen-game-mobile"
      >
        {/* ════ HUD ════ */}
        <HUD isFullscreen={isFullscreen} regenerating={regenerating} onOpenHarem={openHarem} {...hudHandlers} />

        {/* ════ 上半视觉区 (60%) ════ */}
        <div
          className="relative h-[60%] overflow-hidden shrink-0"
          onTouchStart={(e) => { touchStartRef.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartRef.current == null) return;
            const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
            const threshold = 50;
            touchStartRef.current = null;
            if (showOptions || showBacklog || isTextBoxCollapsed || activeModal) return;
            if (deltaX < -threshold) {
              // 左滑 = 前进
              if (isTyping && currentLine) {
                skipTypingRef.current = true;
                setDisplayedText(currentLine.text);
                setIsTyping(false);
              } else {
                handleNext();
              }
            } else if (deltaX > threshold) {
              // 右滑 = 后退
              handlePrev();
            }
          }}
        >
          {/* 背景层 */}
          <SceneBackground bgUrl={sceneBgUrl} locationName={displayLocationName} showParticles={weatherParticlesEnabled} fallbackTextSize="text-2xl" />

          {/* 立绘层 — 限制在上半区内 */}
          <CharacterSprites characters={sceneCharacters} variant="mobile" />

          {/* 情绪特效 */}
          <EmotionEffects shake={screenEffect?.shake} flashColor={screenEffect?.flashColor} vignette={screenEffect?.vignette} />

          {/* 平行事件面板 — 手机端古典木签版 */}
          <ParallelEventsPanel events={parallelEvents} expanded={showParallelEvents} variant="mobile" onToggle={setShowParallelEvents} />

          {/* 视觉区底部渐变 */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-linear-to-t from-ink-900 to-transparent z-19 pointer-events-none" />
        </div>

        {/* ════ 下半操作区 ════ */}
        <div className="flex-1 bg-ink-900 flex flex-col relative overflow-hidden min-h-0">
          {/* 文字区 — 点击翻页 */}
          <div
            className="flex-1 flex flex-col px-3 pt-2 pb-1 cursor-pointer min-h-0"
            onClick={() => handleNext()}
          >
            {/* 名字标签 */}
            <AnimatePresence mode="wait">
              {currentLine.type !== 'narrator' && (
                <motion.div key={currentLine.speaker} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                  className="flex items-center gap-2 mb-1 shrink-0">
                  {currentLine.avatar && (
                    <div className={`w-9 h-9 bg-ink-800 border-2 flex items-center justify-center overflow-hidden relative transform -skew-x-3 ${isCyan ? 'border-cyan-700' : 'border-vermilion-700'}`}>
                      <img src={currentLine.avatar} alt="avatar" className="w-full h-full object-cover object-top scale-110" />
                    </div>
                  )}
                  <div className={`px-3 py-0.5 border-2 ${themeBorderClass} ${themeBgClass} text-lg font-serif italic -skew-x-3 ${themeTextClass} shadow-[2px_2px_0_rgba(0,0,0,0.6)]`}>
                    {displayName(currentLine.speaker!, playerName)}
                    {currentLine.emotion && currentLine.emotion !== '默认' && (
                      <span className="ml-1 text-xs font-sans opacity-70">[{currentLine.emotion}]</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 调查模式提示 */}
            {isInvestigating && (
              <div className="text-gold-400 font-sans text-xs tracking-widest animate-pulse mb-1 shrink-0">
                调查模式已开启，请长按或滑动选择文本
              </div>
            )}
            {/* 文字内容 — 可滚动 */}
            <div
              className={`flex-1 overflow-y-auto hide-scrollbar text-lg font-sans tracking-wide leading-relaxed min-h-0 ${currentLine.type === 'thought' ? 'text-gold-300 italic' : 'text-paper-100'} ${isInvestigating ? 'select-text cursor-text' : 'select-none'}`}
              style={isInvestigating ? { WebkitTouchCallout: 'default', WebkitUserSelect: 'text', userSelect: 'text' } : {}}
            >
              {displayedText}
              {isTyping && <span className={`inline-block w-2 h-4 animate-pulse ml-1 align-middle ${currentLine.type === 'thought' ? 'bg-gold-300' : 'bg-paper-100'}`} />}
            </div>
          </div>

          {/* 按钮组 — 横向可滚动 */}
          <div className="flex items-center gap-1 px-2 pb-2 pt-1 shrink-0 overflow-x-auto hide-scrollbar">
            <button onClick={(e) => { e.stopPropagation(); setShowBacklog(true); }}
              className="flex items-center gap-1 px-2 py-1 bg-ink-800/60 border border-ink-700/50 text-paper-200 hover:text-gold-300 hover:border-gold-500/50 transition-colors rounded-xs text-xs shrink-0">
              <History className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} disabled={currentIndex === 0}
              className="flex items-center gap-1 px-2 py-1 bg-ink-800/60 border border-ink-700/50 text-paper-200 hover:text-gold-300 hover:border-gold-500/50 transition-colors rounded-xs text-xs disabled:opacity-30 shrink-0">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsAutoMode(prev => !prev); }}
              className={`flex items-center gap-1 px-2 py-1 border transition-colors rounded-xs text-xs shrink-0 ${isAutoMode ? 'bg-gold-850 border-gold-500 text-gold-300' : 'bg-ink-800/60 border-ink-700/50 text-paper-200 hover:text-gold-300 hover:border-gold-500/50'}`}
              title={isAutoMode ? '关闭 Auto' : '开启 Auto'}>
              {isAutoMode ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); const next = textSpeed >= 3 ? 1 : textSpeed + 1; textSettings.setTextSpeed(next); }}
              className="flex items-center gap-1 px-2 py-1 bg-ink-800/60 border border-ink-700/50 text-paper-200 hover:text-gold-300 hover:border-gold-500/50 transition-colors rounded-xs text-xs shrink-0"
              title={`速度: ${textSpeed === 0 ? '瞬间' : textSpeed === 1 ? '慢' : textSpeed === 2 ? '普通' : '快'}`}>
              {textSpeed >= 3 ? <Zap className="w-3.5 h-3.5 text-gold-400" /> : <FastForward className="w-3.5 h-3.5" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsInvestigating(!isInvestigating); }}
              className={`flex items-center gap-1 px-2 py-1 border transition-colors rounded-xs text-xs shrink-0 ${isInvestigating ? 'bg-gold-900/60 border-gold-500 text-gold-300' : 'bg-ink-800/60 border-ink-700/50 text-paper-200 hover:text-gold-400 hover:border-gold-500/50'}`}
              title={isInvestigating ? '关闭调查' : '开启调查'}>
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* 楼层翻页 — 靠右 */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <button onClick={(e) => { e.stopPropagation(); if (canPrevFloor && navIndex > 0) { sfx.play('pageTurn'); setViewingFloor(availableFloors[navIndex - 1]); } }} disabled={!canPrevFloor}
                className={`flex items-center gap-1 px-2 py-1 border transition-colors rounded-xs text-xs shrink-0 ${canPrevFloor ? 'bg-ink-800/60 border-ink-700/50 text-paper-200 hover:text-gold-300 hover:border-gold-500/50' : 'bg-ink-800/30 border-ink-700/30 text-ink-500 cursor-not-allowed'}`}
                title="上一楼层">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (canNextFloor && navIndex >= 0) { sfx.play('pageTurn'); if (navIndex + 1 === availableFloors.length - 1) setViewingFloor(null); else setViewingFloor(availableFloors[navIndex + 1]); } }} disabled={!canNextFloor}
                className={`flex items-center gap-1 px-2 py-1 border transition-colors rounded-xs text-xs shrink-0 ${canNextFloor ? 'bg-ink-800/60 border-ink-700/50 text-paper-200 hover:text-gold-300 hover:border-gold-500/50' : 'bg-ink-800/30 border-ink-700/30 text-ink-500 cursor-not-allowed'}`}
                title="下一楼层">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {!isTyping && (
                <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="shrink-0">
                  <ChevronRight className="w-5 h-5 text-gold-400" />
                </motion.div>
              )}
            </div>
          </div>

          {/* ════ 对话输入栏 — 内嵌在 flex 流中，不遮挡内容 ════ */}
          <ChatInputWidget />
        </div>

        {/* 选项面板 — 全屏覆盖 */}
        <OptionsPanel
          show={showOptions}
          options={options}
          optionChibis={optionChibis}
          onDismiss={() => setOptionsDismissed(true)}
          onSelect={handleSelectOption}
        />

        {/* 历史记录侧边栏 — 全屏覆盖 */}
        <AnimatePresence>
          {showBacklog && (
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-full bg-ink-900/95 backdrop-blur-md z-50 flex flex-col border-r-2 border-cyan-900/50">
              <div className="p-4 bg-cyan-900/40 text-cyan-300 font-serif text-lg flex justify-between items-center border-b border-ink-700">
                <span className="tracking-widest">回忆记录</span>
                <button onClick={() => setShowBacklog(false)}
                  className="text-2xl hover:scale-110 active:scale-90 transition-transform text-paper-200 hover:text-vermilion-400">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {script.slice(0, currentIndex).map((log, idx) => (
                  <div key={idx} className="space-y-1 border-b border-ink-700/50 pb-3 relative">
                    {log.type === 'narrator' ? (
                      <div className="text-paper-200/70 text-sm bg-ink-800/50 p-2 rounded border border-ink-700/50 font-serif italic">{log.text}</div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          {log.avatar && <img src={log.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover object-top border border-ink-700" />}
                          <div className={`font-serif text-xs px-2 py-0.5 -skew-x-6 ${getCharacterThemeColor(log.speaker) === 'cyan' ? 'bg-cyan-900/60 text-cyan-300' : 'bg-vermilion-900/60 text-vermilion-300'}`}>
                            {displayName(log.speaker!, playerName)}
                            {log.emotion && log.emotion !== '默认' && <span className="ml-1 opacity-70">[{log.emotion}]</span>}
                          </div>
                        </div>
                        <div className={`text-sm font-serif pl-9 ${log.type === 'thought' ? 'text-cyan-400/80 italic' : 'text-paper-200'}`}>{log.text}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 模态框 */}
        <GameModals activeModal={activeModal} onClose={handleCloseModal} />

<TextSelectionClue />
<MusicPlayerWidget />
      </motion.div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ── 桌面端布局 ──
  // ════════════════════════════════════════════════════════════════
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(10px)', scale: 1.02 }}
      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative w-full h-screen bg-ink-900 overflow-hidden" id="screen-game"
    >
      {/* ════ 背景层 ════ */}
      <SceneBackground bgUrl={sceneBgUrl} locationName={displayLocationName} showParticles={weatherParticlesEnabled} fallbackTextSize="text-3xl" />

      {/* ════ HUD ════ */}
      <HUD isFullscreen={isFullscreen} regenerating={regenerating} onOpenHarem={openHarem} {...hudHandlers} />

      {/* ════ 立绘层（多角色同屏） ════ */}
      <CharacterSprites characters={sceneCharacters} variant="desktop" />

      {/* ════ 情绪特效 ════ */}
      <EmotionEffects shake={screenEffect?.shake} flashColor={screenEffect?.flashColor} vignette={screenEffect?.vignette} />

      {/* ════ 平行事件面板 ════ */}
      <ParallelEventsPanel events={parallelEvents} expanded={showParallelEvents} variant="desktop" onToggle={setShowParallelEvents} />

      {/* ════ 文本框 ════ */}
      <AnimatePresence mode="wait">
        {isTextBoxCollapsed ? (
          <motion.div key="collapsed" initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }} className="fixed bottom-4 right-4 z-30">
            <button onClick={() => setIsTextBoxCollapsed(false)}
              className="p-2 bg-ink-800/90 border border-gold-750 text-gold-300 hover:bg-ink-800 transition-colors rounded-xs"
              title="展开文本框">
              <ChevronUp className="w-5 h-5" />
            </button>
          </motion.div>
        ) : (
          <motion.div key="expanded" initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }} className="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-8 cursor-pointer"
            onClick={handleNext}>
            {/* 折叠按钮 */}
            <div className="absolute -top-3 right-6 md:right-12 z-40">
              <button onClick={(e) => { e.stopPropagation(); setIsTextBoxCollapsed(true); }}
                className="p-1 bg-ink-800/90 text-paper-200 hover:bg-ink-800 transition-colors rounded-xs border border-gold-850"
                title="折叠文本框">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* 名字标签 + 头像 */}
            <AnimatePresence mode="wait">
              {currentLine.type !== 'narrator' && (
                <motion.div key={currentLine.speaker} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                  className="absolute -top-12 md:-top-16 left-6 md:left-12 z-30 flex items-end gap-3 drop-shadow-[4px_4px_0_rgba(0,0,0,0.6)]">
                  {currentLine.avatar && (
                    <div className={`w-16 h-16 md:w-20 md:h-20 bg-ink-800 border-2 flex items-center justify-center overflow-hidden relative transform -skew-x-3 ${isCyan ? 'border-cyan-700' : 'border-vermilion-700'}`}>
                      <img src={currentLine.avatar} alt="avatar" className="w-full h-full object-cover object-top scale-110" />
                    </div>
                  )}
                  <div className={`px-4 md:px-6 py-1 md:py-2 border-2 ${themeBorderClass} ${themeBgClass} text-xl md:text-2xl font-serif italic -skew-x-3 ${themeTextClass} mb-1 shadow-[2px_2px_0_rgba(0,0,0,0.6)]`}>
                    {displayName(currentLine.speaker!, playerName)}
                    {currentLine.emotion && currentLine.emotion !== '默认' && (
                      <span className="ml-2 text-sm font-sans opacity-70">[{currentLine.emotion}]</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 主文本框 */}
            <div className="h-full w-full relative flex flex-col p-4 bg-ink-850/85 border border-gold-800 rounded-xs shadow-2xl backdrop-blur-md"
              style={{ paddingTop: currentLine.type === 'narrator' ? '1.5rem' : '3.5rem' }}>
              {/* 调查模式提示 */}
              {isInvestigating && !isInputMode && (
                <div className="text-gold-400 font-sans text-xs tracking-widest animate-pulse mb-2 z-10">
                  调查模式已开启，请长按或滑动选择文本
                </div>
              )}
              {isInputMode ? (
                /* ── 输入模式：文本区变为输入框 ── */
                <div className="flex-1 flex flex-col min-h-0 z-10" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    ref={inputTextareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder={isGenerating ? '❖ 灵枢运转 · 案情推演中...' : '起草言行...（Enter 发送，Esc 收合）'}
                    disabled={isGenerating}
                    autoComplete="off"
                    autoCapitalize="sentences"
                    autoCorrect="off"
                    spellCheck={false}
                    className="flex-1 w-full bg-ink-825/90 text-paper-100 font-serif p-3 border border-gold-800 resize-none
                               placeholder:text-paper-600 placeholder:font-serif focus:outline-none focus:border-gold-500
                               transition-all rounded-xs text-base md:text-lg leading-relaxed shadow-inner
                               disabled:opacity-50 custom-scrollbar"
                  />
                </div>
              ) : (
                /* ── 显示模式：剧情文本 ── */
                <div
                  className={`flex-1 overflow-y-auto hide-scrollbar text-xl md:text-[26px] font-serif tracking-[0.08em] leading-loose z-10 ${currentLine.type === 'thought' ? 'text-gold-300 italic' : 'text-paper-100'} ${isInvestigating ? 'select-text cursor-text' : 'select-none'}`}
                  style={isInvestigating ? { WebkitTouchCallout: 'default', WebkitUserSelect: 'text', userSelect: 'text', willChange: 'contents' } : { willChange: 'contents' }}
                >
                  {displayedText}
                  {isTyping && <span className={`inline-block w-3 h-6 animate-pulse ml-1 align-middle ${currentLine.type === 'thought' ? 'bg-gold-300' : 'bg-paper-50'}`} />}
                </div>
              )}

              {/* 按钮组 */}
              <div className="flex justify-between items-end mt-4 z-10">
                {isInputMode ? (
                  /* ── 输入模式：发送 / 收合 ── */
                  <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <button onClick={handleSendInput} disabled={!inputText.trim() || isGenerating}
                      className="flex items-center gap-1 px-3 py-1.5 bg-vermilion-800 hover:bg-vermilion-700 border border-vermilion-600 text-paper-50 rounded-xs text-xs sm:text-sm font-serif font-bold tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                      {isGenerating ? <Loader className="w-3.5 h-3.5 animate-spin text-gold-300" /> : <Send className="w-3.5 h-3.5 text-gold-300" />}
                      发 送
                    </button>
                    <button onClick={handleExitInputMode} disabled={isGenerating}
                      className="flex items-center gap-1 px-3 py-1.5 bg-ink-825/90 border border-gold-800 text-paper-400 hover:text-paper-50 hover:border-gold-700 transition-all rounded-xs text-xs sm:text-sm font-serif cursor-pointer disabled:opacity-30">
                      <X className="w-3.5 h-3.5" /> 收合
                    </button>
                  </div>
                ) : (
                  /* ── 显示模式：原有按钮 ── */
                <div className="flex gap-2 flex-wrap">
                  <button onClick={(e) => { e.stopPropagation(); setShowBacklog(true); }}
                    id="btn-dialogue-backlog"
                    className="flex items-center gap-1 px-3 py-1.5 bg-ink-750/90 border border-gold-750 text-gold-300 hover:text-paper-50 hover:border-gold-500 hover:bg-ink-750 transition-all rounded-xs text-xs sm:text-sm font-serif cursor-pointer shadow-sm">
                    <History className="w-3.5 h-3.5" /> 案录
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} disabled={currentIndex === 0}
                    className="flex items-center gap-1 px-3 py-1.5 bg-ink-825/90 border border-gold-800 text-paper-400 hover:text-paper-50 hover:border-gold-700 transition-all rounded-xs text-xs sm:text-sm font-serif disabled:opacity-30 cursor-pointer">
                    <ChevronLeft className="w-3.5 h-3.5" /> 上句
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setIsAutoMode(prev => !prev); }}
                    className={`flex items-center gap-1 px-3 py-1.5 border transition-all rounded-xs text-xs sm:text-sm font-serif cursor-pointer ${isAutoMode ? 'bg-vermilion-800 border-vermilion-600 text-paper-50 shadow-sm font-bold' : 'bg-ink-825/90 border border-gold-800 text-paper-400 hover:text-paper-50 hover:border-gold-700'}`}
                    title={isAutoMode ? '关闭 自动' : '开启 自动'}>
                    {isAutoMode ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">自动</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); const next = textSpeed >= 3 ? 1 : textSpeed + 1; textSettings.setTextSpeed(next); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-ink-825/90 border border-gold-800 text-paper-400 hover:text-paper-50 hover:border-gold-700 transition-all rounded-xs text-xs sm:text-sm font-serif cursor-pointer"
                    title={`语速: ${textSpeed === 0 ? '瞬发' : textSpeed === 1 ? '舒缓' : textSpeed === 2 ? '适中' : '迅疾'}`}>
                    {textSpeed >= 3 ? <Zap className="w-3.5 h-3.5 text-gold-300" /> : <FastForward className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{textSpeed === 0 ? '瞬发' : textSpeed === 1 ? '舒缓' : textSpeed === 2 ? '适中' : '迅疾'}</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setIsInvestigating(!isInvestigating); }}
                    className={`flex items-center gap-1 px-3 py-1.5 border transition-all rounded-xs text-xs sm:text-sm font-serif cursor-pointer ${isInvestigating ? 'bg-vermilion-800 border-vermilion-400 text-paper-50 font-bold shadow-md' : 'bg-ink-825/90 border border-gold-800 text-paper-400 hover:text-paper-50 hover:border-gold-700'}`}
                    title={isInvestigating ? '收合勘验' : '开启勘验'}>
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">勘验</span>
                  </button>
                  {/* 发送按钮 — 切换到输入模式 */}
                  <button onClick={(e) => { e.stopPropagation(); handleEnterInputMode(); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-vermilion-800 border border-vermilion-600 text-paper-50 hover:bg-vermilion-700 transition-all rounded-xs text-xs sm:text-sm font-serif font-bold tracking-widest cursor-pointer shadow-sm"
                    title="起草奏呈">
                    <Send className="w-3.5 h-3.5 text-gold-300" />
                    <span>发 送</span>
                  </button>
                </div>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={handlePrevFloor} disabled={!canPrevFloor}
                    className={`flex items-center gap-1 px-2.5 py-1.5 border transition-all rounded-xs text-xs font-serif ${canPrevFloor ? 'bg-ink-825/90 border-gold-800 text-paper-400 hover:text-paper-50 hover:border-gold-700 cursor-pointer' : 'bg-ink-850/50 border-gold-850/40 text-ink-600 cursor-not-allowed'}`}
                    title="翻阅上卷">
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">上卷</span>
                  </button>
                  <button onClick={handleNextFloor} disabled={!canNextFloor}
                    className={`flex items-center gap-1 px-2.5 py-1.5 border transition-all rounded-xs text-xs font-serif ${canNextFloor ? 'bg-ink-825/90 border-gold-800 text-paper-400 hover:text-paper-50 hover:border-gold-700 cursor-pointer' : 'bg-ink-850/50 border-gold-850/40 text-ink-600 cursor-not-allowed'}`}
                    title="翻阅下卷">
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">下卷</span>
                  </button>
                  {!isTyping && (
                    <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
                      <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-gold-300" />
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ 选项面板 ════ */}
      <OptionsPanel
        show={showOptions}
        options={options}
        optionChibis={optionChibis}
        onDismiss={() => setOptionsDismissed(true)}
        onSelect={handleSelectOption}
        desktop
      />

      {/* ════ 历史记录竖屏折卷展开（非侧边栏，竖向铺展长卷） ════ */}
      <AnimatePresence>
        {showBacklog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-ink-975/85 backdrop-blur-md">
            {/* 点击背景关闭 */}
            <div className="absolute inset-0" onClick={() => setShowBacklog(false)} />

            {/* 竖屏展开的宣纸卷轴折子 */}
            <motion.div
              initial={{ opacity: 0, scaleY: 0.85, y: 30 }}
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              exit={{ opacity: 0, scaleY: 0.85, y: 30 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-2xl h-[88vh] bg-ink-825/98 border-2 border-gold-650 rounded-xs shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden font-serif z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 四角仿古铜包角 */}
              <div className="absolute top-1 left-1 w-5 h-5 border-t-2 border-l-2 border-gold-500 pointer-events-none z-20" />
              <div className="absolute top-1 right-1 w-5 h-5 border-t-2 border-r-2 border-gold-500 pointer-events-none z-20" />
              <div className="absolute bottom-1 left-1 w-5 h-5 border-b-2 border-l-2 border-gold-500 pointer-events-none z-20" />
              <div className="absolute bottom-1 right-1 w-5 h-5 border-b-2 border-r-2 border-gold-500 pointer-events-none z-20" />

              {/* 顶栏木匾标题 */}
              <div className="relative px-6 py-4 bg-ink-750 border-b border-gold-800 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-vermilion-800 border border-vermilion-600" />
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-[0.3em] text-paper-50">
                      案 卷 溯 回 · 对 白 录
                    </h2>
                    <p className="text-[11px] text-paper-400 tracking-wider mt-0.5">
                      共 {script.slice(0, currentIndex).length} 条案牍对白 · 竖屏卷轴
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBacklog(false)}
                    className="px-3.5 py-1 bg-ink-750 hover:bg-gold-850 border border-gold-650 text-gold-300 hover:text-paper-50 rounded-xs text-xs tracking-widest transition-all cursor-pointer"
                  >
                    收合案录
                  </button>
                </div>
              </div>

              {/* 竖向卷轴正文内容 */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-[radial-gradient(ellipse_at_top,rgba(35,24,15,0.4)_0%,transparent_80%)] select-text">
                {script.slice(0, currentIndex).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-paper-600 tracking-widest text-sm space-y-2 py-16">
                    <span>❖ 暂无前尘案情 ❖</span>
                    <span className="text-xs text-gold-750">请继续推进断案</span>
                  </div>
                ) : (
                  script.slice(0, currentIndex).map((log, idx) => {
                    const isUser = log.speaker === 'user' || log.speaker === playerName;
                    const isNarrator = log.type === 'narrator';
                    const isThought = log.type === 'thought';

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                        className={cn(
                          "relative rounded-xs p-3.5 border transition-all",
                          isNarrator
                            ? "bg-ink-800/60 border-gold-850 text-paper-400 italic text-sm leading-relaxed"
                            : isUser
                              ? "bg-ink-750/90 border-gold-650/80 ml-4 sm:ml-10"
                              : "bg-ink-825/90 border-gold-850 mr-4 sm:mr-10"
                        )}
                      >
                        {/* 说话者标贴 */}
                        {!isNarrator && (
                          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gold-850">
                            {log.avatar ? (
                              <img
                                src={log.avatar}
                                alt={log.speaker}
                                className="w-6 h-6 rounded-full object-cover object-top border border-gold-650"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-ink-750 border border-gold-650 flex items-center justify-center text-[10px] text-gold-300">
                                {log.speaker?.[0] || '人'}
                              </div>
                            )}
                            <span className={cn(
                              "text-xs font-bold tracking-wider",
                              isUser ? "text-vermilion-400" : "text-gold-300"
                            )}>
                              {displayName(log.speaker!, playerName)}
                            </span>
                            {log.emotion && log.emotion !== '默认' && (
                              <span className="text-[10px] text-paper-500 px-1.5 py-0.2 bg-ink-850 border border-gold-850 rounded-xs">
                                {log.emotion}
                              </span>
                            )}
                            <span className="ml-auto text-[10px] text-gold-750 font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                        )}

                        {/* 对白正文 */}
                        <div className={cn(
                          "font-serif tracking-wide leading-relaxed text-sm sm:text-base",
                          isNarrator
                            ? "text-paper-400"
                            : isThought
                              ? "text-gold-300/90 italic pl-1"
                              : "text-paper-50"
                        )}>
                          {log.text}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* 底栏状态与便捷跳至最新 */}
              <div className="px-6 py-2.5 bg-ink-825 border-t border-gold-850 flex items-center justify-between shrink-0 text-xs text-paper-600">
                <span>按序翻阅 · 竖屏长卷折子</span>
                <button
                  onClick={() => setShowBacklog(false)}
                  className="text-gold-300 hover:text-paper-50 tracking-wider transition-colors cursor-pointer"
                >
                  返回当下 ↵
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════ 模态框 ════ */}
      <GameModals activeModal={activeModal} onClose={handleCloseModal} />

<TextSelectionClue />
<MusicPlayerWidget />
    </motion.div>
  );
};
