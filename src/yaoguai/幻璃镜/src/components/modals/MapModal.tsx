import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import {
  MapPin,
  Sparkles,
  User,
  Info,
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
  Layers,
  Navigation,
  Compass,
  ZoomIn,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils';
import { useGameContext } from '../../store/GameContext';
import { sfx } from '../../audio/sfxPlayer';
import {
  REALM_REGIONS,
  RealmRegion,
  LocationNode,
  findLocationWithAncestors,
} from '../../data/locationHierarchy';
import { getLocationImageSmart } from '../../data/locationImages';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── 深度相关的纯函数：提到模块顶层，避免每节点每渲染重建 ──
function getDepthStyle(depth: number, isSelected: boolean): string {
  if (isSelected) {
    if (depth === 0) return "text-sm font-bold text-gold-200";
    if (depth === 1) return "text-[13px] font-bold text-gold-300";
    if (depth === 2) return "text-xs font-bold text-gold-300";
    return "text-[11px] font-bold text-gold-300";
  }
  if (depth === 0) return "text-sm font-bold text-gold-400";
  if (depth === 1) return "text-[13px] font-semibold text-gold-500";
  if (depth === 2) return "text-xs font-normal text-paper-300";
  return "text-[11px] font-normal text-paper-500";
}

function getDepthIcon(depth: number): number {
  if (depth === 0) return 16;
  if (depth === 1) return 14;
  return 12;
}

function getDepthPadding(depth: number): number {
  if (depth === 0) return 8;
  return depth * 16 + 8;
}

/**
 * 递归树节点（memo 化）
 * 从 renderTreeNode 渲染函数提取而来：展开/折叠任一节点时，
 * 只重渲染受影响节点而非整棵树重建闭包。
 */
const TreeNode = React.memo(function TreeNode({
  node, depth, expandedNodeIds, selectedNodeId, onSelect,
}: {
  node: LocationNode;
  depth: number;
  expandedNodeIds: Record<string, boolean>;
  selectedNodeId: string;
  onSelect: (node: LocationNode) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = !!expandedNodeIds[node.id];
  const isSelected = selectedNodeId === node.id;
  const iconSize = getDepthIcon(depth);

  return (
    <div className="relative">
      <div
        onClick={() => onSelect(node)}
        style={{ paddingLeft: `${getDepthPadding(depth)}px` }}
        className={cn(
          "group flex items-center justify-between rounded-xs transition-all cursor-pointer border font-serif my-0.5",
          isSelected
            ? "bg-ink-800 border-gold-500 shadow-md"
            : depth === 0
              ? "bg-ink-900/80 border-gold-850/60 hover:border-gold-700 hover:bg-ink-850"
              : depth === 1
                ? "bg-ink-900/60 border-transparent hover:border-gold-850 hover:bg-ink-850"
                : "bg-ink-900/40 border-transparent hover:border-gold-850/50 hover:bg-ink-850/80",
          depth === 0 ? "py-2 pr-2.5" : "py-1.5 pr-2.5",
          getDepthStyle(depth, isSelected),
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {hasChildren ? (
            <span
              className="flex items-center justify-center text-gold-600 transition-colors shrink-0"
              style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
            >
              {isExpanded ? <ChevronDown size={iconSize} /> : <ChevronRight size={iconSize} />}
            </span>
          ) : (
            <span
              className="flex items-center justify-center text-gold-700 shrink-0"
              style={{ width: `${iconSize}px`, height: `${iconSize}px`, fontSize: `${Math.max(8, 11 - depth)}px` }}
            >
              ❖
            </span>
          )}
          <span className={cn(
            "truncate tracking-wide",
            depth === 0 && "tracking-[0.15em]",
          )}>
            {node.name}
          </span>
        </div>

        {node.children && node.children.length > 0 && (
          <span className={cn(
            "px-1 rounded-xs border shrink-0",
            depth === 0
              ? "text-[10px] text-gold-600 bg-ink-850 border-gold-850"
              : "text-[9px] text-gold-700 bg-ink-850/80 border-gold-850/60",
          )}>
            {node.children.length}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className={cn(
          "relative border-l my-0.5",
          depth === 0 ? "border-gold-700/60 ml-4" : "border-gold-850/50 ml-3.5",
        )}>
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodeIds={expandedNodeIds}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose }) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>(
    REALM_REGIONS[0]?.id ?? '',
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({});
  const [previewCG, setPreviewCG] = useState<{ url: string; title: string } | null>(null);
  const { addNotification } = useGameContext();

  // ── 空数据兜底 ──
  const hasRegions = REALM_REGIONS.length > 0;

  // 当前大区
  const currentRegion = useMemo(() => {
    return REALM_REGIONS.find(r => r.id === selectedRegionId) || REALM_REGIONS[0];
  }, [selectedRegionId]);

  // 寻找当前选中的地点节点以及其祖先链路
  const selectionInfo = useMemo(() => {
    if (!hasRegions || !currentRegion) return null;

    // 先在当前大区找
    let result = findLocationWithAncestors(currentRegion.roots, selectedNodeId);
    if (!result) {
      // 找不到则去所有大区遍历
      for (const reg of REALM_REGIONS) {
        const found = findLocationWithAncestors(reg.roots, selectedNodeId);
        if (found) {
          result = found;
          break;
        }
      }
    }
    // 兜底：当前大区第一个根节点的第一个子节点或根节点
    if (!result) {
      const fallbackRoot = currentRegion.roots[0];
      if (!fallbackRoot) return null;
      const fallbackTarget = fallbackRoot.children?.[0] || fallbackRoot;
      result = { node: fallbackTarget, path: [fallbackRoot, fallbackTarget].filter(Boolean) as LocationNode[] };
    }
    return result;
  }, [currentRegion, selectedNodeId, hasRegions]);

  // ── 从图床数据中查找当前地点的 CG 图片（须在早返回之前调用，满足 Hooks 规则）──
  const nodeFullPath = useMemo(() => {
    const path = selectionInfo?.path ?? [];
    return [currentRegion?.name, ...path.map(n => n.name)].join('/');
  }, [selectionInfo, currentRegion]);

  const nodeImageUrl = useMemo(() => {
    const node = selectionInfo?.node;
    if (!node) return undefined;
    if (node.children && node.children.length > 0) return undefined;
    if (node.imageUrl) return node.imageUrl;
    if (!nodeFullPath) return undefined;
    return getLocationImageSmart(nodeFullPath, 'sunny', 'day');
  }, [selectionInfo, nodeFullPath]);

  // ── 切换大区 ──
  const handleSelectRegion = (region: RealmRegion) => {
    sfx.play('click');
    setSelectedRegionId(region.id);
    const firstRoot = region.roots[0];
    const defaultNode = firstRoot?.children?.[0] || firstRoot;
    if (defaultNode) setSelectedNodeId(defaultNode.id);
  };

  // ── 选中某个具体节点（同时展开/收起子节点） ──
  const handleSelectNode = (node: LocationNode) => {
    sfx.play('click');
    setSelectedNodeId(node.id);
    // 如果有子节点，同时切换展开/收起状态
    if (node.children && node.children.length > 0) {
      setExpandedNodeIds(prev => ({
        ...prev,
        [node.id]: !prev[node.id],
      }));
    }
  };

  // ── 空状态：无大区数据 ──
  if (!hasRegions) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="八 荒 四 海 · 乾 坤 舆 图 志" id="map-modal" fullScreen>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-gold-650 bg-ink-850 flex items-center justify-center text-gold-500">
            <MapPin size={32} />
          </div>
          <div className="text-lg font-serif font-bold text-gold-300 tracking-widest">
            ❖ 舆图尚待绘制 ❖
          </div>
          <div className="text-sm text-paper-500 max-w-md leading-relaxed font-serif">
            八荒四海之地理尚未录入。
            请在 <code className="text-gold-400 text-xs px-1 py-0.5 bg-ink-850 rounded border border-gold-850">locationHierarchy.ts</code> 的 <code className="text-gold-400 text-xs px-1 py-0.5 bg-ink-850 rounded border border-gold-850">REALM_REGIONS</code> 数组中添加大区与地点数据。
          </div>
        </div>
      </Modal>
    );
  }

  const activeNode = selectionInfo!.node;
  const breadcrumbPath = selectionInfo!.path;

  // 是否为最小节点（无子地点）——只有最小节点才有立绘
  const isLeafNode = !activeNode.children || activeNode.children.length === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="八 荒 四 海 · 乾 坤 舆 图 志" id="map-modal" fullScreen>
      <div className="flex flex-col h-[80vh] text-paper-100 gap-3 font-serif">
        
        {/* ════ 顶栏：大区地域罗盘选签 ════ */}
        <div className="flex items-center gap-2 border-b border-gold-850 pb-2.5 overflow-x-auto custom-scrollbar shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {REALM_REGIONS.map((region) => {
              const isCurrent = region.id === currentRegion.id;
              return (
                <button
                  key={region.id}
                  onClick={() => handleSelectRegion(region)}
                  className={cn(
                    "relative px-3 sm:px-4 py-1.5 rounded-xs text-xs sm:text-sm tracking-widest border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                    isCurrent
                      ? "bg-ink-800 border-gold-500 text-gold-300 font-bold shadow-[0_0_12px_rgba(197,164,63,0.3)]"
                      : "bg-ink-900 border-gold-850 text-paper-500 hover:text-gold-300 hover:border-gold-650",
                  )}
                >
                  <span className={cn(
                    "text-[10px] px-1 py-0.2 rounded-xs border font-bold",
                    isCurrent
                      ? "bg-vermilion-900 border-vermilion-700 text-paper-50"
                      : "bg-ink-850 border-gold-850 text-gold-700",
                  )}>
                    {region.seal}
                  </span>
                  <span>{region.name}</span>
                </button>
              );
            })}
          </div>

          {/* 折子目录标识 */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2 ml-auto">
            <span className="px-2.5 py-1 text-xs rounded-xs border bg-ink-800 border-gold-500 text-gold-300 flex items-center gap-1">
              <Layers size={13} />
              <span className="hidden sm:inline">卷轴折签</span>
            </span>
          </div>
        </div>

        {/* ════ 主体区域 ════ */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden min-h-0">
          
          {/* ── 左侧：层级树 ── */}
          <div className="w-full lg:w-[45%] flex flex-col bg-ink-900 border border-gold-850 rounded-xs overflow-hidden shadow-inner shrink-0">
            {/* 左侧顶栏描述 */}
            <div className="p-2.5 bg-ink-850 border-b border-gold-850 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold tracking-widest text-gold-300">
                ❖ {currentRegion.name} · 地脉名录
              </span>
              <span className="text-[11px] text-gold-700 tracking-wider">
                {currentRegion.pinyin}
              </span>
            </div>

            {/* 折子树 */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
              <div className="text-[11px] text-paper-500 px-2 py-1 mb-1 leading-relaxed italic bg-ink-850 border border-gold-850 rounded-xs">
                {currentRegion.description}
              </div>
              {currentRegion.roots.map(rootNode => (
                <TreeNode
                  key={rootNode.id}
                  node={rootNode}
                  depth={0}
                  expandedNodeIds={expandedNodeIds}
                  selectedNodeId={selectionInfo?.node.id ?? ''}
                  onSelect={handleSelectNode}
                />
              ))}
            </div>
          </div>

          {/* ── 右侧：地点大图与胜景详考 ── */}
          <div className="flex-1 flex flex-col bg-ink-850 border border-gold-850 rounded-xs p-3.5 sm:p-4 justify-between overflow-y-auto custom-scrollbar shadow-lg">
            <div className="space-y-3.5">
              
              {/* 顶部古典面包屑层级路径 */}
              <div className="flex items-center gap-1 flex-wrap text-xs text-paper-500 pb-2 border-b border-gold-850">
                <span className="text-paper-400 font-bold">{currentRegion.name}</span>
                {breadcrumbPath.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <ChevronRight size={12} className="text-gold-850 shrink-0" />
                    <button
                      onClick={() => handleSelectNode(item)}
                      className={cn(
                        "hover:text-gold-300 transition-colors cursor-pointer tracking-wider",
                        idx === breadcrumbPath.length - 1
                          ? "text-gold-300 font-bold"
                          : "text-paper-400",
                      )}
                    >
                      {item.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* 地点标题与危险/类型标识 */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-paper-100 tracking-widest flex items-center gap-2">
                    <span>{activeNode.name}</span>
                    {activeNode.category && (
                      <span className="text-[11px] font-normal px-2 py-0.5 border border-gold-700 text-gold-300 bg-ink-800 rounded-xs">
                        {activeNode.category}
                      </span>
                    )}
                  </h2>
                  {activeNode.ancientTitle && (
                    <p className="text-xs text-paper-500 tracking-wider mt-1">
                      【 {activeNode.ancientTitle} 】
                    </p>
                  )}
                </div>

                {activeNode.dangerLevel && (
                  <span className={cn(
                    "px-2.5 py-1 text-xs rounded-xs border font-bold shrink-0",
                    activeNode.dangerLevel === '死地'
                      ? "border-vermilion-800 text-vermilion-400 bg-vermilion-950"
                      : activeNode.dangerLevel === '凶险'
                        ? "border-vermilion-700 text-vermilion-400 bg-vermilion-900"
                        : activeNode.dangerLevel === '微澜'
                          ? "border-gold-700 text-gold-300 bg-ink-850"
                          : "border-emerald-700 text-emerald-400 bg-emerald-950",
                  )}>
                    {activeNode.dangerLevel}
                  </span>
                )}
              </div>

              {/* ════ 地点大图场景 CG 展示（仅最小节点才有立绘，父节点不显示） ════ */}
              {isLeafNode && (
              <div className="relative aspect-video w-full rounded-xs overflow-hidden border border-gold-850 bg-ink-900 group shadow-md">
                {nodeImageUrl ? (
                  <div
                    onClick={() => {
                      sfx.play('pageTurn');
                      setPreviewCG({ url: nodeImageUrl, title: `${activeNode.name} · 场景绘卷` });
                    }}
                    className="w-full h-full cursor-pointer relative"
                  >
                    <img
                      src={nodeImageUrl}
                      alt={activeNode.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-transparent to-transparent opacity-75" />
                    
                    <div className="absolute bottom-2 right-2 text-xs text-paper-100 bg-ink-900/90 px-2.5 py-1 border border-gold-650 rounded-xs flex items-center gap-1.5 shadow-md">
                      <ZoomIn size={13} className="text-gold-300" />
                      <span>全屏鉴赏</span>
                    </div>
                  </div>
                ) : (
                  /* 优雅古风占位框 */
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2 border border-dashed border-gold-850">
                    <div className="w-10 h-10 rounded-full border border-gold-650 bg-ink-850 flex items-center justify-center text-gold-300">
                      <ImageIcon size={20} />
                    </div>
                    <div className="text-sm font-bold text-paper-400 tracking-widest">
                      ❖ {activeNode.name} · 胜景绘卷 ❖
                    </div>
                    <div className="text-xs text-paper-500 max-w-sm leading-relaxed">
                      （此处预留地点插图，后续可通过 LLM 或画像系统动态注入场景 CG）
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* 地点环境描写 */}
              {activeNode.description && (
                <div className="bg-ink-850/90 border border-gold-850 p-3 rounded-xs text-xs sm:text-sm leading-relaxed text-paper-400 shadow-sm">
                  {activeNode.description}
                </div>
              )}

              {/* 氛围气息 */}
              {activeNode.atmosphere && (
                <div className="flex items-center gap-2 text-xs text-paper-500 bg-ink-900 p-2 rounded-xs border border-gold-850">
                  <Sparkles size={13} className="text-gold-300 shrink-0" />
                  <span>气韵氛围：<strong className="text-paper-400 font-normal">{activeNode.atmosphere}</strong></span>
                </div>
              )}

              {/* ══ 可深入探访的子地点 ══ */}
              {activeNode.children && activeNode.children.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gold-300">
                    <Navigation size={13} />
                    <span>可深入探访之所（{activeNode.children.length}）</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeNode.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => handleSelectNode(child)}
                        className="p-2 bg-ink-800 hover:bg-ink-750 border border-gold-850 hover:border-gold-500 text-paper-400 hover:text-paper-100 rounded-xs text-left text-xs transition-all flex items-center justify-between group cursor-pointer shadow-sm"
                      >
                        <span className="truncate font-bold">{child.name}</span>
                        <ChevronRight size={13} className="text-gold-850 group-hover:text-gold-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 常驻人物 */}
              {activeNode.characters && activeNode.characters.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gold-300">
                    <User size={13} />
                    <span>驻留人物</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeNode.characters.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs bg-ink-800 border border-gold-850 text-paper-100 rounded-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 勘得线索 */}
              {activeNode.cluesHere && activeNode.cluesHere.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-vermilion-400">
                    <Info size={13} />
                    <span>物证与秘录</span>
                  </div>
                  <div className="space-y-1">
                    {activeNode.cluesHere.map((clue, idx) => (
                      <div key={idx} className="text-xs text-paper-400 bg-vermilion-950/40 border border-vermilion-900/40 p-1.5 rounded-xs flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-vermilion-500 shrink-0" />
                        <span>{clue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 底栏：起驾前往按钮 */}
            <div className="pt-3 border-t border-gold-850 mt-4 flex items-center gap-2">
              <button
                onClick={() => {
                  sfx.play('confirm');
                  addNotification(`已起驾前往【${activeNode.name}】`, 'success');
                  onClose();
                }}
                className="w-full py-2.5 bg-vermilion-800 hover:bg-vermilion-700 border border-vermilion-600 text-paper-50 font-serif text-sm font-bold tracking-[0.3em] rounded-xs transition-all shadow-md cursor-pointer pl-[0.3em] flex items-center justify-center gap-2"
              >
                <Compass size={15} />
                <span>起 驾 · 移 步 该 处</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ════ CG 大图全屏鉴赏弹窗 ════ */}
      <AnimatePresence>
        {previewCG && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-975/95 backdrop-blur-md p-4">
            <button
              className="absolute top-6 right-6 text-paper-400 hover:text-vermilion-400 p-2 rounded-xs border border-gold-850 bg-ink-850 transition-colors z-50 cursor-pointer"
              onClick={() => setPreviewCG(null)}
            >
              <X size={24} />
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl max-h-[85vh] flex flex-col items-center"
            >
              <img
                src={previewCG.url}
                alt={previewCG.title}
                className="max-h-[75vh] object-contain rounded-xs border-2 border-gold-650 shadow-[0_0_50px_rgba(0,0,0,0.95)]"
              />
              <h3 className="font-serif text-lg sm:text-xl font-bold text-gold-300 tracking-widest mt-3">
                {previewCG.title}
              </h3>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Modal>
  );
};
