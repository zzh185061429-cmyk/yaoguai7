/**
 * 岁时历数据 — 节日、节气、动态宜忌
 *
 * 节日按农历日期配置（月-日），节气按公历近似日期配置。
 * 宜忌用日期做种子的伪随机生成：同一天结果稳定，但不写死。
 */

/** 农历节日 */
export interface FestivalInfo {
  /** 农历月 (1-12) */
  month: number;
  /** 农历日 (1-30) */
  day: number;
  /** 节日名 */
  name: string;
  /** 节日介绍 */
  desc: string;
}

/** 农历节日表 */
export const FESTIVALS: FestivalInfo[] = [
  { month: 1, day: 1, name: '春节', desc: '岁首正旦，万象更新。民间爆竹除旧、桃符换新，钦天监于此日颁历告朔。' },
  { month: 1, day: 15, name: '元宵', desc: '上元佳节，花灯遍市。天官赐福之辰，民间猜灯谜、食汤圆，夜禁放宽三日。' },
  { month: 2, day: 2, name: '龙抬头', desc: '仲春初二，苍龙七宿跃出东方。民间剃头迎吉，钦天监观星以候岁穰。' },
  { month: 3, day: 3, name: '上巳', desc: '三月三上巳节，古人水边祓禊。曲水流觞、踏青祛邪，春和景明之候。' },
  { month: 5, day: 5, name: '端午', desc: '五月初五端阳，悬艾草、佩香囊、食角黍。驱五毒、避瘟疫，民间赛龙舟。' },
  { month: 7, day: 7, name: '七夕', desc: '七巧之夜，牵牛织女渡鹊桥。民间女子拜月乞巧，钦天监录牵牛织女二星度数。' },
  { month: 7, day: 15, name: '中元', desc: '七月十五中元节，道教地官赦罪之辰。民间设盂兰盆会、焚纸祭先，夜半鬼门大开。' },
  { month: 8, day: 15, name: '中秋', desc: '八月十五仲秋，月最圆明。民间赏月、食月饼、团圆聚饮。钦天监测月行迟疾以校历法。' },
  { month: 9, day: 9, name: '重阳', desc: '九月初九重阳，登高望远、佩茱萸、饮菊酒。阳数极盛而衰，宜敬老慎终。' },
  { month: 10, day: 1, name: '寒衣', desc: '十月初一寒衣节，民间焚纸衣祭先祖，以御冥寒。北方始授衣。' },
  { month: 12, day: 8, name: '腊八', desc: '十二月初八，佛成道日。民间食腊八粥，钦天监于此日前后祭灶备岁。' },
  { month: 12, day: 23, name: '祭灶', desc: '腊月廿三小年，民间祭灶送神。糖瓜粘灶王嘴，使其上天言好事。' },
  { month: 12, day: 30, name: '除夕', desc: '岁末除夕，守岁除夜。爆竹辞旧、灯火通宵，一年至此终而复始。' },
];

/** 二十四节气（按公历近似日期） */
export interface SolarTermInfo {
  /** 公历月 (1-12) */
  month: number;
  /** 公历日（近似，误差 ±1-2 天） */
  day: number;
  /** 节气名 */
  name: string;
  /** 节气含义 */
  desc: string;
}

export const SOLAR_TERMS: SolarTermInfo[] = [
  { month: 2, day: 4, name: '立春', desc: '春季开始，万物复苏。东风解冻，蛰虫始振。' },
  { month: 2, day: 19, name: '雨水', desc: '降水增多，气温回升。草木萌动，春耕始兴。' },
  { month: 3, day: 6, name: '惊蛰', desc: '春雷初鸣，蛰虫惊醒。桃始华，仓庚鸣。' },
  { month: 3, day: 21, name: '春分', desc: '昼夜平分，春暖花开。玄鸟至，雷乃发声。' },
  { month: 4, day: 5, name: '清明', desc: '天清地明，气温回升。桐始华，虹始见。' },
  { month: 4, day: 20, name: '谷雨', desc: '雨生百谷，播种时节。萍始生，戴胜降于桑。' },
  { month: 5, day: 6, name: '立夏', desc: '夏季开始，气温渐热。蝼蝈鸣，蚯蚓出。' },
  { month: 5, day: 21, name: '小满', desc: '麦粒渐满，未全熟。苦菜秀，靡草死。' },
  { month: 6, day: 6, name: '芒种', desc: '有芒之谷可种。螳螂生，鵙始鸣。' },
  { month: 6, day: 21, name: '夏至', desc: '白昼最长，阳气极盛。鹿角解，蝉始鸣。' },
  { month: 7, day: 7, name: '小暑', desc: '气候炎热，尚未极热。温风至，蟋蟀居壁。' },
  { month: 7, day: 23, name: '大暑', desc: '一年最热。腐草为萤，土润溽暑。' },
  { month: 8, day: 8, name: '立秋', desc: '秋季开始，暑去凉来。凉风至，白露降。' },
  { month: 8, day: 23, name: '处暑', desc: '暑气止息，天气转凉。鹰祭鸟，天地始肃。' },
  { month: 9, day: 8, name: '白露', desc: '露凝而白，天气转凉。鸿雁来，玄鸟归。' },
  { month: 9, day: 23, name: '秋分', desc: '昼夜平分，秋凉渐深。雷始收声，水始涸。' },
  { month: 10, day: 8, name: '寒露', desc: '露寒将凝。鸿雁来宾，菊有黄华。' },
  { month: 10, day: 24, name: '霜降', desc: '初霜降，草木黄落。豺祭兽，蛰虫咸俯。' },
  { month: 11, day: 8, name: '立冬', desc: '冬季开始，万物收藏。水始冰，地始冻。' },
  { month: 11, day: 22, name: '小雪', desc: '始降雪，尚未大。虹藏不见，闭塞成冬。' },
  { month: 12, day: 7, name: '大雪', desc: '雪量大增。鹖鴠不鸣，虎始交。' },
  { month: 12, day: 22, name: '冬至', desc: '白昼最短，阴极阳生。蚯蚓结，麋角解。' },
  { month: 1, day: 6, name: '小寒', desc: '气候寒冷，尚未极寒。雁北乡，鹊始巢。' },
  { month: 1, day: 20, name: '大寒', desc: '一年最冷。鸡始乳，征鸟厉疾。' },
];

/** 宜忌候选词库 */
const YI_POOL = ['勘案理绪', '访友求卜', '密札合券', '调息静坐', '观星望气', '整理卷宗', '出行访查', '推演推理', '修缮器物', '静心读书'];
const JI_POOL = ['涉险渡江', '轻启封印', '喧嚣动土', '贪功冒进', '夜行荒野', '妄动干戈', '独入险地', '轻信谗言', '暴怒伤神', '酩酊大醉'];

/**
 * 基于日期的伪随机：同一天永远返回同样的宜忌
 * 用 month*100+day 做种子，从词库中各取 3 条
 */
export function getDailyYiJi(year: number, month: number, day: number): { yi: string[]; ji: string[] } {
  const seed = year * 10000 + month * 100 + day;
  // 简单线性同余生成器
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pick = (pool: string[], n: number) => {
    const copy = [...pool];
    const result: string[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = Math.floor(rand() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  };
  return { yi: pick(YI_POOL, 3), ji: pick(JI_POOL, 3) };
}

/** 查找某公历日期对应的节气（±2天容差） */
export function findSolarTerm(month: number, day: number): SolarTermInfo | null {
  return SOLAR_TERMS.find(t => t.month === month && Math.abs(t.day - day) <= 2) || null;
}

/** 查找某农历日期对应的节日 */
export function findFestival(lunarMonth: number, lunarDay: number): FestivalInfo | null {
  return FESTIVALS.find(f => f.month === lunarMonth && f.day === lunarDay) || null;
}
