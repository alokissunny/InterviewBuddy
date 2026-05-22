import React, { useMemo } from 'react';
import {
  Smartphone, Globe, Server, Cog, Database, Zap,
  GitBranch, Cloud, HardDrive, Search, Activity, ExternalLink,
} from 'lucide-react';
import type { ArchDiagram, ArchNode, NodeKind } from '../data/systemDesignQuestions';

// ── Node visual config ──────────────────────────────────────────────

const NODE_STYLE: Record<NodeKind, {
  Icon: React.ElementType;
  fill: string;
  stroke: string;
  text: string;
}> = {
  client:   { Icon: Smartphone,   fill: '#EEF2FF', stroke: '#6366F1', text: '#3730A3' },
  cdn:      { Icon: Cloud,        fill: '#E0F2FE', stroke: '#0EA5E9', text: '#075985' },
  lb:       { Icon: Activity,     fill: '#F0F9FF', stroke: '#0284C7', text: '#075985' },
  api:      { Icon: Globe,        fill: '#FDF4FF', stroke: '#A855F7', text: '#6B21A8' },
  service:  { Icon: Cog,          fill: '#FEFCE8', stroke: '#CA8A04', text: '#854D0E' },
  queue:    { Icon: GitBranch,    fill: '#FFF7ED', stroke: '#EA580C', text: '#9A3412' },
  cache:    { Icon: Zap,          fill: '#FEF2F2', stroke: '#DC2626', text: '#991B1B' },
  db:       { Icon: Database,     fill: '#F0FDF4', stroke: '#16A34A', text: '#166534' },
  storage:  { Icon: HardDrive,    fill: '#ECFDF5', stroke: '#059669', text: '#065F46' },
  search:   { Icon: Search,       fill: '#F5F3FF', stroke: '#7C3AED', text: '#5B21B6' },
  stream:   { Icon: Server,       fill: '#FAF5FF', stroke: '#9333EA', text: '#6B21A8' },
  external: { Icon: ExternalLink, fill: '#F3F4F6', stroke: '#6B7280', text: '#374151' },
};

// ── Layout constants ────────────────────────────────────────────────

const NODE_W = 132;
const NODE_H = 56;
const COL_GAP = 60;
const ROW_GAP = 24;
const PAD_X = 24;
const PAD_Y = 28;

interface Props {
  diagram: ArchDiagram;
  /** Speed of flowing dashes (seconds for one full traversal). Lower = faster. */
  speed?: number;
}

interface PositionedNode extends ArchNode {
  x: number; y: number; col: number;
}

export function AnimatedArchDiagram({ diagram, speed = 2.2 }: Props) {
  const { positioned, width, height } = useMemo(() => {
    const positioned: Record<string, PositionedNode> = {};

    // Determine layout dimensions
    const maxRows = Math.max(...diagram.layers.map(l => l.length));
    const totalCols = diagram.layers.length;
    const w = PAD_X * 2 + totalCols * NODE_W + (totalCols - 1) * COL_GAP;
    const h = PAD_Y * 2 + maxRows * NODE_H + (maxRows - 1) * ROW_GAP;

    diagram.layers.forEach((layer, colIdx) => {
      const colX = PAD_X + colIdx * (NODE_W + COL_GAP);
      const layerHeight = layer.length * NODE_H + (layer.length - 1) * ROW_GAP;
      const startY = (h - layerHeight) / 2;
      layer.forEach((node, rowIdx) => {
        const y = startY + rowIdx * (NODE_H + ROW_GAP);
        positioned[node.id] = { ...node, x: colX, y, col: colIdx };
      });
    });

    return { positioned, width: w, height: h };
  }, [diagram]);

  return (
    <div className="relative w-full overflow-x-auto rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ minWidth: width, maxWidth: '100%', height: 'auto', display: 'block' }}
      >
        {/* Arrow marker defs */}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
          </marker>
          <marker id="arrow-dashed" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#CBD5E1" />
          </marker>
          <style>{`
            .flow-dash {
              stroke-dasharray: 6 6;
              animation: flow ${speed}s linear infinite;
            }
            .flow-dash-slow {
              stroke-dasharray: 4 8;
              animation: flow ${speed * 1.5}s linear infinite;
            }
            @keyframes flow {
              to { stroke-dashoffset: -120; }
            }
            .node-pulse {
              animation: nodePulse 2.8s ease-in-out infinite;
            }
            @keyframes nodePulse {
              0%, 100% { filter: drop-shadow(0 0 0 rgba(99,102,241,0)); }
              50%      { filter: drop-shadow(0 0 6px rgba(99,102,241,0.5)); }
            }
          `}</style>
        </defs>

        {/* Edges first (so they render under nodes) */}
        {diagram.edges.map((edge, i) => {
          const a = positioned[edge.from];
          const b = positioned[edge.to];
          if (!a || !b) return null;

          // Determine connection points
          const goingRight = b.x >= a.x;
          const sameCol    = a.col === b.col;

          let x1: number, y1: number, x2: number, y2: number;
          if (sameCol) {
            // vertical neighbours in same column
            const goingDown = b.y >= a.y;
            x1 = a.x + NODE_W / 2;
            y1 = a.y + (goingDown ? NODE_H : 0);
            x2 = b.x + NODE_W / 2;
            y2 = b.y + (goingDown ? 0 : NODE_H);
          } else if (goingRight) {
            x1 = a.x + NODE_W;
            y1 = a.y + NODE_H / 2;
            x2 = b.x;
            y2 = b.y + NODE_H / 2;
          } else {
            x1 = a.x;
            y1 = a.y + NODE_H / 2;
            x2 = b.x + NODE_W;
            y2 = b.y + NODE_H / 2;
          }

          // Use a smooth cubic curve
          const dx = (x2 - x1) * 0.5;
          const path = sameCol
            ? `M ${x1} ${y1} L ${x2} ${y2}`
            : `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

          const isDashed = !!edge.dashed;
          const stroke   = isDashed ? '#CBD5E1' : '#94A3B8';
          const marker   = isDashed ? 'url(#arrow-dashed)' : 'url(#arrow)';

          // Label position: midway along the path
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2 - 5;

          return (
            <g key={i}>
              {/* Static underlay (so the dashed flow shows on top of a thin line) */}
              <path d={path} fill="none" stroke={stroke} strokeWidth={1.4}
                opacity={0.35} markerEnd={marker} />
              {/* Animated flow */}
              <path d={path} fill="none"
                stroke={isDashed ? '#CBD5E1' : '#6366F1'}
                strokeWidth={isDashed ? 1.4 : 1.8}
                className={isDashed ? 'flow-dash-slow' : 'flow-dash'}
                opacity={isDashed ? 0.65 : 0.85}
              />
              {edge.label && (
                <g>
                  <rect
                    x={mx - (edge.label.length * 3.4 + 6)}
                    y={my - 7}
                    width={edge.label.length * 6.8 + 12}
                    height={14}
                    rx={4}
                    fill="white"
                    stroke="#E2E8F0"
                    strokeWidth={0.8}
                  />
                  <text x={mx} y={my + 3} fontSize={9} textAnchor="middle"
                    fill="#475569" fontWeight={600}>
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {Object.values(positioned).map((node, i) => {
          const style = NODE_STYLE[node.kind];
          const Icon = style.Icon;
          // Stagger pulse animation a little so they don't all blink in sync
          const delay = (i % 5) * 0.4;
          return (
            <g key={node.id} className="node-pulse" style={{ animationDelay: `${delay}s` }}>
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={1.4}
              />
              {/* Icon */}
              <foreignObject x={node.x + 8} y={node.y + (NODE_H - 22) / 2} width={22} height={22}>
                <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} style={{ color: style.stroke }} />
                </div>
              </foreignObject>
              {/* Label */}
              <text
                x={node.x + 36}
                y={node.sub ? node.y + 22 : node.y + NODE_H / 2 + 3}
                fontSize={11}
                fontWeight={700}
                fill={style.text}
              >
                {truncate(node.label, 16)}
              </text>
              {node.sub && (
                <text x={node.x + 36} y={node.y + 36} fontSize={9} fill={style.text} opacity={0.7}>
                  {truncate(node.sub, 18)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
