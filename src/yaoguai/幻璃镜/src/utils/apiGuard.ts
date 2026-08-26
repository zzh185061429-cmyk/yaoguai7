/**
 * API 防盗用守卫
 *
 * 检测当前酒馆使用的 API 配置（主 API 类型、中转地址、模型名等）
 * 是否含"满血"字样，命中则跳转至指定页面。
 *
 * 检测范围（取并集，任一含触发字样即跳）：
 * - main_api（主 API 类型名）
 * - api_server（API 配置对象）
 * - oai_settings / nai_settings（OpenAI / Novel 设置，含模型名与中转 URL）
 * - getContext() 返回值（酒馆上下文）
 *
 * 局限：角色卡前端运行在 iframe 内，能读到的字段取决于酒馆注入到
 * iframe 全局的内容。若"满血"出现在 iframe 读不到的字段，需另配读取入口。
 */

const REDIRECT_URL = 'https://www.piupiuchan.top/index.html';
const TRIGGER = '满血';

/** 收集酒馆 API 相关配置，扁平化为字符串统一检测 */
function collectApiBlob(): string {
  const w = globalThis as any;
  const parts: unknown[] = [];
  try { parts.push(w.main_api); } catch { /* ignore */ }
  try { parts.push(w.api_server); } catch { /* ignore */ }
  try { parts.push(w.oai_settings); } catch { /* ignore */ }
  try { parts.push(w.nai_settings); } catch { /* ignore */ }
  try { parts.push(w.getContext?.()); } catch { /* ignore */ }
  try {
    return JSON.stringify(parts, (_k, v) => (typeof v === 'function' ? undefined : v)) || '';
  } catch {
    return String(parts);
  }
}

/**
 * 检测并跳转：API 配置含触发字样时跳转。
 * @returns true 表示已触发跳转
 */
export function detectAndRedirect(): boolean {
  try {
    if (collectApiBlob().includes(TRIGGER)) {
      const top = (globalThis as any).top || globalThis;
      top.location.href = REDIRECT_URL;
      return true;
    }
  } catch { /* 静默，避免守卫自身报错影响卡运行 */ }
  return false;
}

/**
 * 环境白名单检测：仅允许 TauriTavern（Tauri 框架）与 SillyTavern 运行。
 * 其他环境返回 false（调用方应抛错，由 ErrorBoundary 显示报错页）。
 *
 * 局限：若第三方酒馆是基于 SillyTavern 的分叉并继承了 getContext 等注入，
 * 本检测会误判为放行；精确区分需该环境的独有标识。
 */
export function checkEnvironment(): boolean {
  const w = globalThis as any;
  // TauriTavern：Tauri 框架注入 window.__TAURI__
  try { if (w.__TAURI__) return true; } catch { /* ignore */ }
  // SillyTavern：酒馆注入的上下文函数 / 版本标识
  try {
    if (typeof w.getContext === 'function') return true;
    if (typeof w.SILLY_TAVERN_VERSION === 'string' && w.SILLY_TAVERN_VERSION) return true;
    if (typeof w.getChatMessages === 'function' && typeof w.eventOn === 'function') return true;
  } catch { /* ignore */ }
  return false;
}
