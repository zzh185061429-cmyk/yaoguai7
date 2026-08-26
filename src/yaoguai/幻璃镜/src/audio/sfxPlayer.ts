/**
 * SFX 音效引擎 — 已停用（空壳）
 *
 * 原程序化合成音效（点击/翻页/确认/情绪/blip）已全部移除。
 * 保留此模块作为空壳，使现有调用点（sfx.play 等）不报错。
 *
 * 音乐悬浮球保留 UI 壳，后续接入真实音乐资源时再恢复播放逻辑。
 * 如需彻底删除调用点与设置 UI，需逐个清理引用此模块的文件。
 */

export type SfxId = string;

class SfxEngine {
  init() { /* no-op：不再创建 AudioContext */ }
  getAudioContext(): AudioContext | null { return null; }

  getVolume() { return 0; }
  isMuted() { return true; }
  isBlipEnabled() { return false; }
  getBlipInterval() { return 3; }

  setVolume(_v: number) { /* no-op */ }
  setMuted(_m: boolean) { /* no-op */ }
  toggleMute() { return true; }
  setBlipEnabled(_e: boolean) { /* no-op */ }
  setBlipInterval(_i: number) { /* no-op */ }

  play(_soundId: SfxId) { /* no-op */ }
  playBlip(_speaker?: string) { /* no-op */ }
  playEmotion(_emotion: string) { /* no-op */ }
}

export const sfx = new SfxEngine();
