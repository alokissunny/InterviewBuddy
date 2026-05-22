import React from 'react';
import { Info, Lightbulb, AlertTriangle, Skull, Target } from 'lucide-react';
import type { DeepBlock, DeepSection, CalloutKind } from '../data/interviewPrepData';
import { AnimatedArchDiagram } from './AnimatedArchDiagram';

// ── Inline markdown: **bold** and `code` ──────────────────────────

function renderInline(text: string): React.ReactNode[] {
  // Tokenize into runs of [text, bold, code]
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    // Match **bold**
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        out.push(<strong key={key++} className="font-semibold text-gray-900">{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    // Match `code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        out.push(
          <code key={key++} className="px-1.5 py-0.5 rounded bg-gray-100 text-[0.875em] font-mono text-rose-700 border border-gray-200">
            {text.slice(i + 1, end)}
          </code>
        );
        i = end + 1;
        continue;
      }
    }
    // Plain run — read until next special char
    let j = i;
    while (j < text.length && text[j] !== '*' && text[j] !== '`') j++;
    if (j > i) out.push(<React.Fragment key={key++}>{text.slice(i, j)}</React.Fragment>);
    if (j === i) j++; // safety: don't loop on a stray `*`
    i = j;
  }
  return out;
}

// ── Callout styling ───────────────────────────────────────────────

const CALLOUT_STYLE: Record<CalloutKind, {
  Icon: React.ElementType;
  bg: string; border: string; titleColor: string; iconColor: string;
  defaultTitle: string;
}> = {
  tip:       { Icon: Lightbulb,     bg: '#FEFCE8', border: '#FDE68A', titleColor: '#854D0E', iconColor: '#CA8A04', defaultTitle: 'Tip' },
  info:      { Icon: Info,          bg: '#EFF6FF', border: '#BFDBFE', titleColor: '#1E40AF', iconColor: '#2563EB', defaultTitle: 'Note' },
  warn:      { Icon: AlertTriangle, bg: '#FFF7ED', border: '#FED7AA', titleColor: '#9A3412', iconColor: '#EA580C', defaultTitle: 'Watch out' },
  pitfall:   { Icon: Skull,         bg: '#FEF2F2', border: '#FECACA', titleColor: '#991B1B', iconColor: '#DC2626', defaultTitle: 'Common pitfall' },
  interview: { Icon: Target,        bg: '#F5F3FF', border: '#DDD6FE', titleColor: '#5B21B6', iconColor: '#7C3AED', defaultTitle: 'In the interview' },
};

// ── Single block renderer ─────────────────────────────────────────

function Block({ block }: { block: DeepBlock }) {
  switch (block.type) {
    case 'p':
      return (
        <p className="text-[15px] leading-[1.7] text-gray-700">
          {renderInline(block.text)}
        </p>
      );

    case 'h':
      return (
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-2 leading-snug">
          {renderInline(block.text)}
        </h3>
      );

    case 'ul':
      return (
        <ul className="space-y-1.5 ml-1">
          {block.items.map((it, i) => (
            <li key={i} className="text-[15px] leading-[1.65] text-gray-700 flex gap-2.5">
              <span className="text-indigo-500 mt-1.5 shrink-0">•</span>
              <span className="flex-1">{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );

    case 'ol':
      return (
        <ol className="space-y-2 ml-1">
          {block.items.map((it, i) => (
            <li key={i} className="text-[15px] leading-[1.65] text-gray-700 flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="flex-1">{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      );

    case 'code':
      return (
        <pre className="rounded-xl bg-gray-900 text-gray-100 text-[12.5px] font-mono leading-relaxed overflow-x-auto p-4 border border-gray-800">
          {block.lang && (
            <div className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider font-sans">{block.lang}</div>
          )}
          <code>{block.code}</code>
        </pre>
      );

    case 'callout': {
      const s = CALLOUT_STYLE[block.kind];
      const Icon = s.Icon;
      const title = block.title || s.defaultTitle;
      return (
        <div className="rounded-xl px-4 py-3.5 border flex gap-3"
          style={{ background: s.bg, borderColor: s.border }}>
          <Icon size={16} className="shrink-0 mt-0.5" style={{ color: s.iconColor }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: s.titleColor }}>
              {title}
            </p>
            <p className="text-[14px] leading-[1.6] text-gray-800">{renderInline(block.text)}</p>
          </div>
        </div>
      );
    }

    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-gray-100 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-[13.5px] text-gray-700 leading-relaxed align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'compare':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5">
              {block.aTitle}
            </p>
            <ul className="space-y-1">
              {block.aPoints.map((p, i) => (
                <li key={i} className="text-[13.5px] text-indigo-950 leading-relaxed flex gap-1.5">
                  <span>•</span><span>{renderInline(p)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700 mb-1.5">
              {block.bTitle}
            </p>
            <ul className="space-y-1">
              {block.bPoints.map((p, i) => (
                <li key={i} className="text-[13.5px] text-violet-950 leading-relaxed flex gap-1.5">
                  <span>•</span><span>{renderInline(p)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );

    case 'kv':
      return (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {block.title && (
            <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-600 bg-gray-50 border-b border-gray-200">
              {block.title}
            </div>
          )}
          <div className="divide-y divide-gray-100">
            {block.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2">
                <span className="text-[13.5px] text-gray-700">{renderInline(it.k)}</span>
                <span className="text-[13px] font-bold text-gray-900 font-mono">{it.v}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'diagram':
      return (
        <div className="space-y-2">
          <AnimatedArchDiagram diagram={block.diagram} />
          {block.caption && (
            <p className="text-[11px] text-gray-500 italic text-center">{block.caption}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ── Section + full renderer ───────────────────────────────────────

export function DeepContentRenderer({ sections }: { sections: DeepSection[] }) {
  return (
    <div className="space-y-10">
      {sections.map(section => (
        <section key={section.id} id={section.id} className="space-y-4 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight pb-2 border-b border-gray-200">
            {section.title}
          </h2>
          <div className="space-y-4">
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Table of contents (sticky sidebar on desktop) ─────────────────

export function DeepContentTOC({ sections, activeId }: {
  sections: DeepSection[];
  activeId?: string;
}) {
  return (
    <nav className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-2">
        On this page
      </p>
      {sections.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`block px-2 py-1.5 text-[12.5px] rounded-md leading-snug transition-colors ${
            activeId === s.id
              ? 'bg-indigo-50 text-indigo-700 font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {s.title}
        </a>
      ))}
    </nav>
  );
}
