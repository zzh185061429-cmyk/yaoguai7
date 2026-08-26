import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Clock, CloudRain, Moon, ChevronLeft, ChevronRight, Compass, Sparkles, Shield, Sun } from 'lucide-react';
import { cn } from '../../utils';
import { getDailyYiJi, findSolarTerm, findFestival, type SolarTermInfo, type FestivalInfo } from '../../data/calendarData';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 十二时辰详细配置
const SHICHEN_MAP: { range: [number, number]; name: string; period: string; element: string; organ: string }[] = [
  { range: [23, 1], name: '子时', period: '夜半', element: '水', organ: '胆经' },
  { range: [1, 3], name: '丑时', period: '鸡鸣', element: '土', organ: '肝经' },
  { range: [3, 5], name: '寅时', period: '平旦', element: '木', organ: '肺经' },
  { range: [5, 7], name: '卯时', period: '日出', element: '木', organ: '大肠' },
  { range: [7, 9], name: '辰时', period: '食时', element: '土', organ: '胃经' },
  { range: [9, 11], name: '巳时', period: '隅中', element: '火', organ: '脾经' },
  { range: [11, 13], name: '午时', period: '日中', element: '火', organ: '心经' },
  { range: [13, 15], name: '未时', period: '日昳', element: '土', organ: '小肠' },
  { range: [15, 17], name: '申时', period: '晡时', element: '金', organ: '膀胱' },
  { range: [17, 19], name: '酉时', period: '日入', element: '金', organ: '肾经' },
  { range: [19, 21], name: '戌时', period: '黄昏', element: '土', organ: '心包' },
  { range: [21, 23], name: '亥时', period: '人定', element: '水', organ: '三焦' },
];

function getShichen(hour: number) {
  const found = SHICHEN_MAP.find(s => {
    if (s.range[0] > s.range[1]) {
      return hour >= s.range[0] || hour < s.range[1];
    }
    return hour >= s.range[0] && hour < s.range[1];
  });
  return found || { name: '子时', period: '夜半', element: '水', organ: '胆经' };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const ANCIENT_MONTHS = ['孟春·端月', '仲春·花月', '季春·桃月', '孟夏·梅月', '仲夏·蒲月', '季夏·荷月', '孟秋·兰月', '仲秋·桂月', '季秋·菊月', '孟冬·葭月', '仲冬·畅月', '季冬·冰月'];
const LUNAR_DAY_NAMES = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
const WEEKDAYS_ANCIENT = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

const GAME_TIME = {
  era: '大雍·永安',
  ganzhiYear: '甲辰年',
  ganzhiMonth: '壬申月',
  ganzhiDay: '丙戌日',
  solarTerm: '白露将至 · 荧惑守心',
  year: 23,
  month: 7, // 0-indexed => 8月
  day: 15,
  hour: 19,
  minute: 0,
  weekday: 4,
  weather: '夜雨微凉',
};

const MIN_ERA_YEAR = 1;

export const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose }) => {
  const shichen = getShichen(GAME_TIME.hour);
  const [viewEraYear, setViewEraYear] = useState(GAME_TIME.year);
  const [viewMonth, setViewMonth] = useState(GAME_TIME.month);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const isCurrentMonth = viewEraYear === GAME_TIME.year && viewMonth === GAME_TIME.month;

  const baseYear = 2000 + GAME_TIME.year;
  const calcYear = baseYear + (viewEraYear - GAME_TIME.year);
  const calcMonth = viewMonth;

  const daysInMonth = useMemo(() => getDaysInMonth(calcYear, calcMonth), [calcYear, calcMonth]);
  const firstDayOffset = useMemo(() => getFirstDayOfMonth(calcYear, calcMonth), [calcYear, calcMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      if (viewEraYear <= MIN_ERA_YEAR) return;
      setViewMonth(11);
      setViewEraYear(y => Math.max(MIN_ERA_YEAR, y - 1));
    } else {
      setViewMonth(m => m - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewEraYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
    setSelectedDay(null);
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: firstDayOffset }, (_, i) => i);

  // 选中日期的信息（节日/节气/宜忌）
  const selectedDayInfo = useMemo(() => {
    if (!selectedDay) return null;
    const solarTerm = findSolarTerm(calcMonth + 1, selectedDay);
    // 农历日简化：公历日直接当农历日用（游戏内简化）
    const festival = findFestival(calcMonth + 1, selectedDay);
    const yiJi = getDailyYiJi(calcYear, calcMonth + 1, selectedDay);
    return { solarTerm, festival, yiJi };
  }, [selectedDay, calcMonth, calcYear]);

  // 今日宜忌（动态生成）
  const todayYiJi = useMemo(() => getDailyYiJi(baseYear, GAME_TIME.month + 1, GAME_TIME.day), [baseYear]);
  const todaySolarTerm = findSolarTerm(GAME_TIME.month + 1, GAME_TIME.day);
  const todayFestival = findFestival(GAME_TIME.month + 1, GAME_TIME.day);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="岁 时 历 · 节 气 通 书" id="calendar-modal">
      <div className="flex flex-col gap-5 text-paper-100">
        {/* 顶部天象牌匾 */}
        <div className="bg-ink-850 border border-gold-750 rounded-xs p-3 sm:p-5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            {/* 左侧：纪年与干支 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-serif border border-vermilion-700 text-vermilion-400 bg-vermilion-900 rounded-xs">
                  钦天监颁历
                </span>
                <span className="text-[12px] font-serif text-paper-400">
                  {todaySolarTerm ? todaySolarTerm.name : GAME_TIME.solarTerm}
                  {todayFestival && ` · ${todayFestival.name}`}
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-2xl tracking-[0.15em] sm:tracking-[0.2em] text-gold-300 font-bold mt-1">
                {GAME_TIME.era}{viewEraYear}年 · {ANCIENT_MONTHS[viewMonth]}
              </h3>
              <p className="font-serif text-xs text-paper-500 tracking-widest">
                岁次 {GAME_TIME.ganzhiYear} 【{GAME_TIME.ganzhiMonth}】 {GAME_TIME.ganzhiDay} · {WEEKDAYS_ANCIENT[GAME_TIME.weekday]}
              </p>
            </div>

            {/* 右侧：时辰天机盘 */}
            <div className="flex items-center gap-2 sm:gap-4 bg-ink-750 border border-gold-800 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xs shrink-0">
              <div className="flex flex-col items-center">
                <CloudRain size={16} className="text-cyan-300 sm:w-5 sm:h-5" />
                <span className="font-serif text-[10px] sm:text-[11px] text-paper-400 mt-0.5 sm:mt-1">{GAME_TIME.weather}</span>
              </div>
              <div className="w-px h-6 sm:h-8 bg-gold-850" />
              <div className="flex flex-col items-center">
                <Moon size={16} className="text-gold-300 sm:w-5 sm:h-5" />
                <span className="font-serif text-xs sm:text-[13px] font-bold text-gold-300 mt-0.5">{shichen.name}（{shichen.period}）</span>
                <span className="font-serif text-[9px] sm:text-[10px] text-paper-500">{shichen.element}行 · 司{shichen.organ}</span>
              </div>
            </div>
          </div>

          {/* 今日宜忌（动态） */}
          <div className="mt-4 pt-3 border-t border-gold-850 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-serif">
            <div className="flex items-center gap-2 bg-cyan-900/60 px-3 py-1.5 border border-jade-500/40 rounded-xs">
              <span className="px-1.5 py-0.5 text-[10px] bg-jade-500 text-white font-bold rounded-xs">宜</span>
              <span className="text-paper-400 tracking-wider">{todayYiJi.yi.join(' · ')}</span>
            </div>
            <div className="flex items-center gap-2 bg-ink-825/60 px-3 py-1.5 border border-vermilion-700/40 rounded-xs">
              <span className="px-1.5 py-0.5 text-[10px] bg-vermilion-700 text-white font-bold rounded-xs">忌</span>
              <span className="text-paper-400 tracking-wider">{todayYiJi.ji.join(' · ')}</span>
            </div>
          </div>
        </div>

        {/* 皇极经世日历网格 */}
        <div className="bg-ink-800 border border-gold-750 rounded-xs p-3 sm:p-5 flex flex-col">
          {/* 月份切换 */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gold-850">
            <button 
              id="btn-calendar-prev-month"
              onClick={handlePrevMonth} 
              className="p-1.5 text-paper-400 hover:text-gold-300 bg-ink-750 border border-gold-800 rounded-xs transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="text-center">
              <span className="font-serif text-base font-bold text-gold-300 tracking-widest">
                {ANCIENT_MONTHS[viewMonth]}（农历{calcMonth + 1}月）
              </span>
            </div>

            <button 
              id="btn-calendar-next-month"
              onClick={handleNextMonth} 
              className="p-1.5 text-paper-400 hover:text-gold-300 bg-ink-750 border border-gold-800 rounded-xs transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2 text-center font-serif text-paper-500 text-[10px] sm:text-xs">
            <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
          </div>

          {/* 日子矩阵 */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {emptySlots.map((_, i) => (
              <div key={`empty-${i}`} className="h-10 sm:h-14 opacity-20 border border-transparent" />
            ))}
            
            {days.map(day => {
              const isToday = isCurrentMonth && day === GAME_TIME.day;
              const lunarName = LUNAR_DAY_NAMES[(day - 1) % 30] || '初一';
              const daySolarTerm = findSolarTerm(calcMonth + 1, day);
              const dayFestival = findFestival(calcMonth + 1, day);
              const isSelected = selectedDay === day;
              const hasMarker = !!(daySolarTerm || dayFestival);
              return (
                <div 
                  key={day} 
                  id={`calendar-day-${day}`}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    "h-10 sm:h-14 flex flex-col items-center justify-center rounded-xs border transition-all relative cursor-pointer group",
                    isToday 
                      ? 'bg-gold-850 border-gold-500 text-paper-50 shadow-[0_0_15px_rgba(197,164,63,0.3)]' 
                      : isSelected
                        ? 'bg-cyan-900 border-cyan-500 text-cyan-100 shadow-[0_0_12px_rgba(50,135,135,0.25)]'
                        : 'bg-ink-750 border-gold-850 text-paper-400 hover:border-paper-550 hover:bg-ink-800'
                  )}
                >
                  <span className="font-serif text-sm font-bold">{day}</span>
                  <span className={cn(
                    "font-serif text-[10px] tracking-wider truncate max-w-full px-0.5",
                    isToday ? "text-gold-300 font-bold" : dayFestival ? "text-vermilion-400" : daySolarTerm ? "text-cyan-400" : "text-paper-600"
                  )}>
                    {dayFestival ? dayFestival.name : daySolarTerm ? daySolarTerm.name : isToday ? '今夕' : lunarName}
                  </span>
                  {/* 节日/节气标记点 */}
                  {hasMarker && !isToday && (
                    <div className={cn(
                      "absolute top-1 right-1 w-1.5 h-1.5 rounded-full",
                      dayFestival ? "bg-vermilion-400" : "bg-cyan-400"
                    )} />
                  )}
                  {isToday && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-vermilion-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 选中日期详情 */}
        {selectedDayInfo && (
          <div className="bg-ink-850 border border-gold-750 rounded-xs p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-2 border-b border-gold-850">
              <Compass size={16} className="text-gold-400 shrink-0" />
              <h4 className="font-serif text-sm font-bold text-gold-300 tracking-widest">
                {viewEraYear}年{ANCIENT_MONTHS[viewMonth]}·{selectedDay}日
              </h4>
            </div>

            {/* 节日 */}
            {selectedDayInfo.festival && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-vermilion-400 shrink-0" />
                  <span className="font-serif text-xs font-bold text-vermilion-300 tracking-wider">{selectedDayInfo.festival.name}</span>
                </div>
                <p className="text-xs text-paper-400 leading-relaxed pl-5">{selectedDayInfo.festival.desc}</p>
              </div>
            )}

            {/* 节气 */}
            {selectedDayInfo.solarTerm && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Sun size={13} className="text-cyan-400 shrink-0" />
                  <span className="font-serif text-xs font-bold text-cyan-300 tracking-wider">{selectedDayInfo.solarTerm.name}</span>
                </div>
                <p className="text-xs text-paper-400 leading-relaxed pl-5">{selectedDayInfo.solarTerm.desc}</p>
              </div>
            )}

            {/* 无节日节气时的提示 */}
            {!selectedDayInfo.festival && !selectedDayInfo.solarTerm && (
              <p className="text-xs text-paper-500 leading-relaxed">此日无特别节候，平常之日。</p>
            )}

            {/* 当日宜忌 */}
            <div className="pt-2 border-t border-gold-850 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-serif">
              <div className="flex items-center gap-2 bg-cyan-900/60 px-3 py-1.5 border border-jade-500/40 rounded-xs">
                <span className="px-1.5 py-0.5 text-[10px] bg-jade-500 text-white font-bold rounded-xs shrink-0">宜</span>
                <span className="text-paper-400 tracking-wider">{selectedDayInfo.yiJi.yi.join(' · ')}</span>
              </div>
              <div className="flex items-center gap-2 bg-ink-825/60 px-3 py-1.5 border border-vermilion-700/40 rounded-xs">
                <span className="px-1.5 py-0.5 text-[10px] bg-vermilion-700 text-white font-bold rounded-xs shrink-0">忌</span>
                <span className="text-paper-400 tracking-wider">{selectedDayInfo.yiJi.ji.join(' · ')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
