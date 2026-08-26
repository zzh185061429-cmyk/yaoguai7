import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, Repeat, Repeat1, Shuffle, Volume2, VolumeX, Disc3, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { bgmBridge, useBgmSettings, getEffectiveBgmVolume } from '../../audio/bgmBridge';
import { sfx } from '../../audio/sfxPlayer';
import { useIsMobile } from '../../hooks';
import { cn } from '../../utils';

type PlayMode = 'list' | 'loop' | 'shuffle';

const MUSIC_POS_KEY = 'mirage-music-pos';
const BALL_SIZE = 48; // 悬浮球尺寸上限（用于边界 clamp）

/** 读取已保存的悬浮球位置，没有则返回右下默认 */
function loadMusicPos(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(MUSIC_POS_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      if (typeof p?.x === 'number' && typeof p?.y === 'number') return p;
    }
  } catch { /* ignore */ }
  const w = typeof window !== 'undefined' ? window.innerWidth : 800;
  const h = typeof window !== 'undefined' ? window.innerHeight : 600;
  // 默认接近原固定位置：右下，距底约 210px、距右约 12px
  return { x: w - BALL_SIZE - 12, y: h - BALL_SIZE - 210 };
}

/** 将位置限制在视口内 */
function clampMusicPos(p: { x: number; y: number }): { x: number; y: number } {
  const w = typeof window !== 'undefined' ? window.innerWidth : 800;
  const h = typeof window !== 'undefined' ? window.innerHeight : 600;
  return {
    x: Math.max(0, Math.min(p.x, w - BALL_SIZE)),
    y: Math.max(0, Math.min(p.y, h - BALL_SIZE)),
  };
}

// ── 明代五音雅乐曲目列表 ──
const ANCIENT_TRACKS = [
  { id: 't1', title: '月落秦淮 · 琵琶夜引', mode: '羽调 · 幽思清越', scale: [440, 493.88, 554.37, 659.25, 739.99, 880], speed: 1.2 },
  { id: 't2', title: '古刹夜雨 · 幽篁独坐', mode: '角调 · 细雨禅心', scale: [329.63, 392.00, 440.00, 493.88, 587.33, 659.25], speed: 0.9 },
  { id: 't3', title: '司天夜观 · 七曜巡天', mode: '商调 · 浩瀚星汉', scale: [293.66, 329.63, 392.00, 440.00, 523.25, 587.33], speed: 1.5 },
  { id: 't4', title: '金陵风物 · 闹市花灯', mode: '宫调 · 繁华市井', scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], speed: 1.8 },
  { id: 't5', title: '玄狐窃玉 · 迷雾初显', mode: '徵调 · 志怪疑云', scale: [392.00, 440.00, 493.88, 587.33, 659.25, 784.00], speed: 1.1 }
];

export const MusicPlayerWidget: React.FC = () => {
  const isMobile = useIsMobile();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>('list');
  const [currentTrack, setCurrentTrack] = useState(0);

  const bgmAudio = useBgmSettings();
  const synthIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // ── 悬浮球可拖拽位置 ──
  const [ballPos, setBallPos] = useState(loadMusicPos);
  const dragRef = useRef<{ startX: number; startY: number; startPos: { x: number; y: number }; moved: boolean } | null>(null);
  useEffect(() => {
    try { localStorage.setItem(MUSIC_POS_KEY, JSON.stringify(ballPos)); } catch { /* ignore */ }
  }, [ballPos]);

  // 初始化合成音频环境：复用 sfxPlayer 的共享 AudioContext，避免创建第二个 AudioContext
  const initSynth = useCallback(() => {
    sfx.init();
    const ctx = sfx.getAudioContext();
    if (ctx) {
      audioCtxRef.current = ctx;
      if (!gainNodeRef.current) {
        const gain = ctx.createGain();
        gain.gain.value = getEffectiveBgmVolume() * 0.25;
        gain.connect(ctx.destination);
        gainNodeRef.current = gain;
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    }
  }, []);

  // ── 悬浮球拖拽：按下记起点；移动超 6px 视为拖动；松开若未拖动则展开/收起面板 ──
  const onBallPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPos: { ...ballPos }, moved: false };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onBallPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) d.moved = true;
    if (d.moved) setBallPos(clampMusicPos({ x: d.startPos.x + dx, y: d.startPos.y + dy }));
  };
  const onBallPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved) {
      initSynth();
      setIsExpanded(v => !v);
    }
  };

  // 播放单音古典拨弦
  const pluckTone = useCallback((freq: number, dur: number = 2.5) => {
    if (!audioCtxRef.current || !gainNodeRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // 泛音模拟琴弦共振
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.35, now + 0.03);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(noteGain);
    osc2.connect(noteGain);
    noteGain.connect(gainNodeRef.current);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + dur);
    osc2.stop(now + dur);
  }, []);

  // 音律循环发生器
  useEffect(() => {
    if (isPlaying) {
      initSynth();
      const track = ANCIENT_TRACKS[currentTrack];
      let step = 0;

      if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);

      synthIntervalRef.current = window.setInterval(() => {
        const scale = track.scale;
        const note = scale[step % scale.length];
        const octaveShift = Math.random() > 0.6 ? 2 : 1;
        pluckTone(note * octaveShift, 2.0);
        step = (step + Math.floor(Math.random() * 3) + 1);
      }, 1000 / track.speed);
    } else {
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
        synthIntervalRef.current = null;
      }
    }

    return () => {
      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
      }
    };
  }, [isPlaying, currentTrack, initSynth, pluckTone]);

  // 同步音量
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      const vol = getEffectiveBgmVolume() * 0.25;
      gainNodeRef.current.gain.setValueAtTime(vol, audioCtxRef.current.currentTime);
    }
  }, [bgmAudio.volume, bgmAudio.muted]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    initSynth();
    setIsPlaying(!isPlaying);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playMode === 'shuffle') {
      setCurrentTrack(Math.floor(Math.random() * ANCIENT_TRACKS.length));
    } else {
      setCurrentTrack((prev) => (prev + 1) % ANCIENT_TRACKS.length);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playMode === 'shuffle') {
      setCurrentTrack(Math.floor(Math.random() * ANCIENT_TRACKS.length));
    } else {
      setCurrentTrack((prev) => (prev - 1 + ANCIENT_TRACKS.length) % ANCIENT_TRACKS.length);
    }
  };

  const togglePlayMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: PlayMode[] = ['list', 'loop', 'shuffle'];
    setPlayMode(modes[(modes.indexOf(playMode) + 1) % modes.length]);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    bgmBridge.toggleMuted();
  };

  const ModeIcon = playMode === 'list' ? Repeat : playMode === 'loop' ? Repeat1 : Shuffle;
  const modeLabel = playMode === 'list' ? '宫商顺奏' : playMode === 'loop' ? '独曲回环' : '随性雅兴';

  return (
    <div className="fixed z-50 pointer-events-none flex flex-col-reverse items-end gap-2" style={{ left: ballPos.x, top: ballPos.y }} id="music-player-widget">
      {/* 展开/折叠浮动按钮 */}
      <button
        id="btn-toggle-music-panel"
        onPointerDown={onBallPointerDown}
        onPointerMove={onBallPointerMove}
        onPointerUp={onBallPointerUp}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-ink-800/90 backdrop-blur-md border border-gold-500/60 flex items-center justify-center text-gold-300 shadow-[0_0_20px_rgba(197,164,63,0.3)] hover:scale-105 transition-all pointer-events-auto group relative overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
        title="雅乐司 · 丝竹音律（可拖动）"
      >
        {isPlaying && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-t-gold-500 border-r-transparent border-b-transparent border-l-transparent opacity-80"
          />
        )}
        <div className="relative z-10 flex flex-col items-center">
          {isPlaying ? <Disc3 size={isMobile ? 18 : 20} className="text-gold-300 animate-spin" style={{ animationDuration: '6s' }} /> : <Music size={isMobile ? 17 : 19} className="text-paper-400 group-hover:text-gold-300" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="bg-ink-800/95 backdrop-blur-md border border-paper-550/60 rounded-sm p-3 sm:p-4 w-[calc(100vw-1.5rem)] sm:w-72 shadow-[0_15px_40px_rgba(0,0,0,0.8)] pointer-events-auto border-gold-ornate"
          >
            {/* 顶栏 */}
            <div className="flex flex-col gap-2.5 mb-3">
              <div className="flex items-center justify-between border-b border-gold-850 pb-2">
                <div className="flex items-center gap-1.5 text-gold-300">
                  <Sparkles size={isMobile ? 12 : 14} className="text-gold-500 shrink-0" />
                  <span className="text-[11px] sm:text-[13px] font-serif font-bold tracking-[0.15em] sm:tracking-[0.2em] truncate">雅乐司 · 丝竹雅集</span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-paper-500 font-serif border border-gold-800 px-1.5 py-0.5 rounded-xs shrink-0">
                  {ANCIENT_TRACKS[currentTrack].mode.split(' · ')[0]}
                </span>
              </div>

              {/* 当前曲目 */}
              <div className="bg-ink-750 p-2 sm:p-2.5 rounded-xs border border-gold-850">
                <p className="text-[12px] sm:text-[13px] font-serif font-semibold text-paper-100 truncate tracking-wide">
                  {ANCIENT_TRACKS[currentTrack].title}
                </p>
                <p className="text-[10px] sm:text-[11px] font-serif text-gold-500 mt-0.5 tracking-widest">
                  {ANCIENT_TRACKS[currentTrack].mode}
                </p>
              </div>

              {/* 控制按钮区 */}
              <div className="flex items-center justify-between text-paper-400 pt-1 gap-1">
                <button
                  id="btn-music-mode"
                  onClick={togglePlayMode}
                  className="hover:text-gold-300 transition-colors p-1"
                  title={modeLabel}
                >
                  <ModeIcon size={isMobile ? 14 : 15} />
                </button>
                <div className="flex items-center gap-2 sm:gap-3 text-paper-100">
                  <button id="btn-music-prev" onClick={handlePrev} className="hover:text-gold-300 transition-colors p-1" title="上一曲">
                    <SkipBack size={isMobile ? 15 : 16} />
                  </button>
                  <button
                    id="btn-music-play"
                    onClick={togglePlay}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-vermilion-600 hover:bg-vermilion-500 rounded-full transition-colors text-paper-50 shadow-md"
                    title={isPlaying ? "暂停" : "奏乐"}
                  >
                    {isPlaying ? <Pause size={isMobile ? 13 : 14} /> : <Play size={isMobile ? 13 : 14} className="translate-x-0.5" />}
                  </button>
                  <button id="btn-music-next" onClick={handleNext} className="hover:text-gold-300 transition-colors p-1" title="下一曲">
                    <SkipForward size={isMobile ? 15 : 16} />
                  </button>
                </div>
                <button
                  id="btn-music-mute"
                  onClick={toggleMute}
                  className={cn('hover:text-gold-300 transition-colors p-1', bgmAudio.muted && 'text-vermilion-500')}
                  title={bgmAudio.muted ? '取消静音' : '静音'}
                >
                  {bgmAudio.muted ? <VolumeX size={isMobile ? 14 : 15} /> : <Volume2 size={isMobile ? 14 : 15} />}
                </button>
              </div>

              {/* 音量滑条 */}
              <div className="flex items-center gap-1.5 sm:gap-2 pt-1">
                <Volume2 size={isMobile ? 10 : 11} className={cn('shrink-0', bgmAudio.muted ? 'text-ink-500' : 'text-gold-500')} />
                <div className="flex-1 relative h-3 flex items-center">
                  <div className="absolute inset-x-0 h-1 bg-ink-750 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-gold-700 to-gold-300 transition-[width] duration-100"
                      style={{ width: `${bgmAudio.muted ? 0 : bgmAudio.volume * 100}%` }}
                    />
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={bgmAudio.muted ? 0 : bgmAudio.volume}
                    onChange={(e) => bgmBridge.setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    title="音律响度"
                  />
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono text-gold-300 tabular-nums w-5 text-right">
                  {bgmAudio.muted ? '静' : Math.round(bgmAudio.volume * 100)}
                </span>
              </div>
            </div>

            {/* 曲目列表 */}
            <div className="flex flex-col gap-1 max-h-32 sm:max-h-40 overflow-y-auto pr-1 custom-scrollbar border-t border-gold-850 pt-2">
              {ANCIENT_TRACKS.map((track, idx) => (
                <button
                  key={track.id}
                  id={`btn-track-${track.id}`}
                  onClick={() => {
                    initSynth();
                    setCurrentTrack(idx);
                    if (!isPlaying) setIsPlaying(true);
                  }}
                  className={cn(
                    "flex flex-col items-start px-2 sm:px-2.5 py-1.5 rounded-xs text-left transition-colors",
                    idx === currentTrack
                      ? 'bg-ink-750 border border-paper-550'
                      : 'hover:bg-ink-750 border border-transparent'
                  )}
                >
                  <span className={cn(
                    "text-[10px] sm:text-[11px] font-serif tracking-wide truncate w-full",
                    idx === currentTrack ? 'text-gold-300 font-bold' : 'text-paper-200'
                  )}>
                    {track.title}
                  </span>
                  <span className={cn(
                    "text-[8px] sm:text-[9px] font-serif tracking-widest",
                    idx === currentTrack ? 'text-gold-500' : 'text-paper-600'
                  )}>
                    {track.mode}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
