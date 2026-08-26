/**
 * 思维链统一剥离工具
 *
 * 合并自 interaction.ts / scriptParser.ts / HistoryLogModal.tsx 三处不一致的实现。
 * 取并集：任一处出现过的标签都剥离，避免"正文残留 / 历史残留"不一致导致显示错乱。
 *
 * 处理范围：
 * - 成对标签 <thinking>、<Chain_of_Thought>、<draft>、<simple_thinking>（含内容整体移除）
 * - ⋘…</think> 混合标签（⋘ = U+22D8 开头，</think> 结尾）
 * - </konatan_planning~> 前缀截断：删除从开头到该结束标签的所有内容
 */

/** 成对的思维/规划标签（开/闭） */
const THINKING_PAIRS: [string, string][] = [
  ['<thinking>', '</thinking>'],
  ['<Chain_of_Thought>', '</Chain_of_Thought>'],
  ['<draft>', '</draft>'],
  ['<simple_thinking>', '</simple_thinking>'],
];

/** 转义正则特殊字符 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 剥离 AI 回复中的思维链 / 规划标签及其内容（大小写不敏感）
 */
export function stripThinking(raw: string): string {
  let text = raw;
  for (const [open, close] of THINKING_PAIRS) {
    const re = new RegExp(escapeRegExp(open) + '[\\s\\S]*?' + escapeRegExp(close), 'gi');
    text = text.replace(re, '');
  }
  // ⋘…</think> 混合标签（⋘ = U+22D8）
  text = text.replace(/\u22D8[\s\S]*?<\/think>/gi, '');
  // konatan_planning 前缀截断：删除从开头到结束标签的所有内容
  text = text.replace(/[\s\S]*?<\/konatan_planning~>/i, '');
  return text;
}
