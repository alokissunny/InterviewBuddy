import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { CandidateProfile } from '../types';

// ─── Design tokens ─────────────────────── JobCracker Light (parchment + emerald)
const T = {
  bg:        '#f7f4ec',   // warm parchment
  bg2:       '#fbf9f3',   // card
  bg3:       '#ffffff',
  line:      '#e4dfd0',
  line2:     '#d2cdbd',
  ink:       '#14130f',
  ink2:      '#3a3933',
  inkDim:    '#6e6c61',
  inkFaint:  '#a09e90',
  accent:    '#1f5b3f',   // deep emerald
  accentInk: '#f7f4ec',
  accentDim: 'rgba(31,91,63,0.08)',
  accentLine:'rgba(31,91,63,0.22)',
  mono:      '"JetBrains Mono", ui-monospace, monospace',
  sans:      '"Manrope", system-ui, sans-serif',
  serif:     '"Newsreader", Georgia, serif',
};

// ─── Global keyframes ─────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes jc-pulse  { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes jc-wave   { 0%,100%{height:3px} 50%{height:11px} }
@keyframes spin      { to{transform:rotate(360deg)} }

@media (max-width: 880px) {
  .jc-nav            { padding: 16px 22px !important; }
  .jc-nav-links      { display: none !important; }

  .jc-hero-section   { padding: 56px 0 48px !important; }
  .jc-hero-grid      { grid-template-columns: 1fr !important; gap: 40px !important; padding: 0 22px !important; }
  .jc-hero-card      { display: none !important; }
  .jc-hero-meta      { gap: 20px 28px !important; flex-wrap: wrap !important; }

  .jc-strip-grid     { grid-template-columns: 1fr 1fr !important; padding: 0 !important; }
  .jc-strip-cell:nth-child(2) { border-right: none !important; }
  .jc-strip-cell     { padding: 14px 18px !important; font-size: 11px !important; }

  .jc-features-section { padding: 72px 0 !important; }
  .jc-feat-container { padding: 0 22px !important; }
  .jc-section-head   { margin-bottom: 40px !important; }
  .jc-feature        { grid-template-columns: 1fr !important; gap: 20px !important; padding: 32px 0 !important; }
  .jc-feat-num       { display: none !important; }

  .jc-how-section    { padding-bottom: 72px !important; }
  .jc-how-container  { padding: 0 22px !important; }
  .jc-steps-grid     { grid-template-columns: 1fr !important; border-radius: 8px !important; }
  .jc-step           { min-height: auto !important; padding: 24px 20px !important; }

  .jc-cta-outer      { margin: 24px 16px 48px !important; }
  .jc-cta-box        { padding: 48px 28px !important; }

  .jc-foot           { padding: 32px 22px !important; }
  .jc-foot-grid      { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
  .jc-foot-brand     { grid-column: span 2 !important; }
  .jc-foot-bot       { flex-direction: column !important; gap: 8px !important; }
}
`;

function InjectStyles() {
  useEffect(() => {
    const id = 'jc-kf2';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id; s.textContent = KEYFRAMES;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
function BtnPrimary({ href, children, onClick }: { href?: string; children: React.ReactNode; onClick?: () => void }) {
  const style: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 18px', borderRadius: 999,
    background: T.ink, color: T.bg,
    fontSize: 14, fontWeight: 500, fontFamily: T.sans,
    whiteSpace: 'nowrap', cursor: 'pointer', border: 'none',
    textDecoration: 'none', transition: 'background .18s ease',
  };
  if (href) return (
    <a href={href} style={style} onClick={(e) => { e.preventDefault(); window.location.href = href; }}>{children}</a>
  );
  return <button style={style} onClick={onClick}>{children}</button>;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ onBrowseLearn }: { onBrowseLearn?: () => void }) {
  return (
    <nav className="jc-nav" style={{
      position: 'relative', zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '22px 32px',
      borderBottom: `1px solid ${T.line}`,
      fontSize: 14, fontFamily: T.sans,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, letterSpacing: '-0.02em', fontSize: 18 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, display: 'inline-block', flexShrink: 0 }} />
        JobCracker
      </div>

      {/* Nav links */}
      <div className="jc-nav-links" style={{ display: 'flex', gap: 28, color: T.inkDim, fontSize: 14, alignItems: 'center' }}>
        {[['Features','#features'],['How it works','#how']].map(([l, h]) => (
          <a key={l} href={h} style={{ color: T.inkDim, textDecoration: 'none' }}>{l}</a>
        ))}
        {onBrowseLearn && (
          <button
            onClick={onBrowseLearn}
            style={{ color: T.inkDim, background: 'none', border: 'none', padding: 0, fontFamily: T.sans, fontSize: 14, cursor: 'pointer' }}
          >
            Learn
          </button>
        )}
        <span style={{ color: T.inkDim }}>Pricing</span>
      </div>

      {/* Nav right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <a href="/auth/linkedin" style={{
          color: T.inkDim, fontSize: 14, fontFamily: T.sans, textDecoration: 'none',
          padding: '10px 4px', cursor: 'pointer',
        }}>Sign in</a>
        <BtnPrimary href="/auth/linkedin">Get started <span>→</span></BtnPrimary>
      </div>
    </nav>
  );
}

// ─── Hero whisper card ────────────────────────────────────────────────────────
function HeroWhisperCard() {
  return (
    <aside className="jc-hero-card" style={{
      background: T.bg3,
      border: `1px solid ${T.line}`,
      borderRadius: 14,
      padding: 28,
      boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 48px -28px rgba(20,19,15,0.18), 0 2px 8px -2px rgba(20,19,15,0.06)',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 11, color: T.inkDim, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
        <span>LIVE INTERVIEW · 03:42</span>
        <span style={{ color: T.accent, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, display: 'inline-block', animation: 'jc-pulse 1.6s infinite' }} />
          REC
        </span>
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.inkFaint, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>They just asked</div>
      <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 22, lineHeight: 1.3, color: T.ink, letterSpacing: '-0.01em' }}>
        "Tell me about a time you handled a difficult stakeholder."
      </div>
      <hr style={{ border: 0, borderTop: `1px dashed ${T.line2}` }} />
      <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.accent, letterSpacing: '0.06em', textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', gap: 8 }}>
        ▸ Whisper · drawn from your CV
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: T.ink2, margin: 0 }}>
        Try your{' '}
        <span style={{ background: T.accentDim, color: T.accent, padding: '1px 5px', borderRadius: 4, fontWeight: 500 }}>Q3 API migration at Stripe</span>
        . Use STAR — anchor on the{' '}
        <span style={{ background: T.accentDim, color: T.accent, padding: '1px 5px', borderRadius: 4, fontWeight: 500 }}>data review</span>
        , end on{' '}
        <span style={{ background: T.accentDim, color: T.accent, padding: '1px 5px', borderRadius: 4, fontWeight: 500 }}>zero churn</span>
        .
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 10.5, color: T.inkFaint, letterSpacing: '0.04em', paddingTop: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <kbd style={{ fontFamily: T.mono, fontSize: 10, border: `1px solid ${T.line2}`, padding: '2px 6px', borderRadius: 4, color: T.inkDim, background: T.bg }}>⌘</kbd>
          <kbd style={{ fontFamily: T.mono, fontSize: 10, border: `1px solid ${T.line2}`, padding: '2px 6px', borderRadius: 4, color: T.inkDim, background: T.bg }}>K</kbd>
          <span style={{ margin: '0 4px' }}>rephrase</span>
          <span>·</span>
          <kbd style={{ fontFamily: T.mono, fontSize: 10, border: `1px solid ${T.line2}`, padding: '2px 6px', borderRadius: 4, color: T.inkDim, background: T.bg }}>⌘</kbd>
          <kbd style={{ fontFamily: T.mono, fontSize: 10, border: `1px solid ${T.line2}`, padding: '2px 6px', borderRadius: 4, color: T.inkDim, background: T.bg }}>L</kbd>
          <span>shorter</span>
        </div>
        <div>● undetectable</div>
      </div>
    </aside>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────
function Strip() {
  const cells = [
    'Works on Zoom, Meet, Teams',
    'Reads your CV & the JD',
    'Adaptive to your pace',
    'Private · zero retention',
  ];
  return (
    <div style={{ borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, background: T.bg2 }}>
      <div className="jc-strip-grid" style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', fontFamily: T.mono, fontSize: 12 }}>
        {cells.map((c, i) => (
          <div key={i} className="jc-strip-cell" style={{
            padding: '22px 32px', borderRight: i < 3 ? `1px solid ${T.line}` : 'none',
            color: T.inkDim, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.accent, display: 'inline-block', flexShrink: 0 }} />
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature visuals (light theme) ───────────────────────────────────────────
function VisLearn() {
  const modules = [
    { title: 'System Design — fundamentals', meta: '8 chapters · 1h 20m', pct: 78 },
    { title: 'Behavioural — STAR mastery',   meta: '6 chapters · 55m',   pct: 100 },
    { title: 'Negotiation playbook',          meta: '4 chapters · 30m',   pct: 22 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: T.inkDim, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
        <span>YOUR LIBRARY</span><span>120 MODULES</span>
      </div>
      {modules.map(m => (
        <div key={m.title} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '10px 4px', borderBottom: `1px dashed ${T.line}` }}>
          <div>
            <div style={{ color: T.ink, fontFamily: T.sans, fontSize: 12 }}>{m.title}</div>
            <div style={{ fontSize: 10.5, color: T.inkDim, marginTop: 2, fontFamily: T.mono }}>{m.meta}</div>
          </div>
          {m.pct === 100
            ? <span style={{ color: T.accent, fontSize: 11 }}>✓</span>
            : <div style={{ width: 60, height: 4, borderRadius: 2, background: T.line, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${m.pct}%`, background: T.accent }} />
              </div>
          }
        </div>
      ))}
    </div>
  );
}

function VisMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: T.inkDim, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
        <span>ROUND 2 · BEHAVIORAL</span>
        <span style={{ color: T.accent }}>SCORED</span>
      </div>
      <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 16, color: T.ink, lineHeight: 1.35 }}>
        "Walk me through a time you said no to a senior leader."
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, paddingTop: 12, borderTop: `1px dashed ${T.line}`, marginTop: 'auto' }}>
        {[['8.4','Clarity'],['9.1','STAR'],['7.2','Signal']].map(([v, l]) => (
          <div key={l}>
            <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 24, color: T.ink, letterSpacing: '-0.01em' }}>
              {v}<span style={{ fontFamily: T.mono, fontSize: 10, fontStyle: 'normal', color: T.inkFaint, marginLeft: 2 }}>/10</span>
            </div>
            <div style={{ fontSize: 10, color: T.inkDim, letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisCV() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: T.sans, fontSize: 14, color: T.ink, fontWeight: 500 }}>Alex Chen</div>
        <div style={{ fontSize: 10, color: T.accent, border: `1px solid ${T.accentLine}`, background: T.accentDim, padding: '2px 7px', borderRadius: 999, letterSpacing: '0.05em' }}>v3 · 95% ATS</div>
      </div>
      <div style={{ fontSize: 10.5, color: T.inkDim }}>Tailored for: Anthropic · Staff PM, Platform</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, margin: '6px 0' }}>
        {[null,'short','hl',null,'short','hl2'].map((cls, i) => (
          <div key={i} style={{
            height: 3, borderRadius: 2,
            background: cls === 'hl' ? T.accent : cls === 'hl2' ? `${T.accent}60` : T.line,
            width: cls === 'short' ? '60%' : cls === 'hl' ? '45%' : '100%',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, paddingTop: 8, borderTop: `1px dashed ${T.line}`, marginTop: 'auto' }}>
        {['Anthropic','Linear','Figma','+12'].map((c, i) => (
          <span key={c} style={{
            fontSize: 10.5, padding: '3px 9px', border: `1px solid ${i === 0 ? T.accentLine : T.line2}`, borderRadius: 999,
            color: i === 0 ? T.accent : T.inkDim,
            background: i === 0 ? T.accentDim : 'transparent',
          }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

function VisLinkedIn() {
  const rows = [
    { name: 'Maya Singh', sub: 'Head of PM · Anthropic', stat: '↩ replied', cls: 'reply' },
    { name: 'Theo Park',  sub: 'VP Eng · Linear',        stat: '✓ sent',   cls: 'sent' },
    { name: 'Priya Rao',  sub: 'Recruiter · Figma',      stat: '✓ sent',   cls: 'sent' },
    { name: 'Jordan Lee', sub: 'CPO · Notion',            stat: '⧖ queued', cls: 'queue' },
  ];
  const statStyle = (cls: string): React.CSSProperties => {
    if (cls === 'sent')  return { color: T.accent, border: `1px solid ${T.accentLine}` };
    if (cls === 'reply') return { color: T.ink, border: `1px solid ${T.inkDim}`, background: T.bg2 };
    return { color: T.inkDim, border: `1px solid ${T.line2}` };
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map(r => (
        <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px dashed ${T.line}` }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.bg2, border: `1px solid ${T.line2}` }} />
          <div>
            <div style={{ color: T.ink, fontFamily: T.sans, fontSize: 12 }}>{r.name}</div>
            <div style={{ color: T.inkDim, fontSize: 10, fontFamily: T.mono, marginTop: 1 }}>{r.sub}</div>
          </div>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em', ...statStyle(r.cls) }}>{r.stat}</span>
        </div>
      ))}
    </div>
  );
}

function VisCopilot() {
  const waveDelays = Array.from({ length: 24 }, (_, i) => i * 0.08);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: T.inkDim, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
        <span style={{ color: T.accent }}>▸ WHISPER · 0.4s</span>
        <span>96% match</span>
      </div>
      <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: T.ink, lineHeight: 1.4 }}>
        "Why this company, specifically?"
      </div>
      <div style={{ paddingTop: 10, marginTop: 4, borderTop: `1px dashed ${T.line}`, fontFamily: T.sans, fontSize: 13, lineHeight: 1.55, color: T.ink2 }}>
        Pull from your{' '}
        <span style={{ color: T.accent, background: T.accentDim, padding: '0 4px', borderRadius: 3 }}>RLHF side project</span>
        . Mention the{' '}
        <span style={{ color: T.accent, background: T.accentDim, padding: '0 4px', borderRadius: 3 }}>alignment essay</span>
        . Keep it under 90 seconds.
      </div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 12, marginTop: 4 }}>
        {waveDelays.map((d, i) => (
          <i key={i} style={{ display: 'block', width: 2, background: T.accent, borderRadius: 1, animation: `jc-wave 1.4s ease-in-out ${d}s infinite`, opacity: .8 }} />
        ))}
      </div>
    </div>
  );
}

function VisAdaptive() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 10.5, color: T.inkDim, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>Mock interview · score over time</div>
      <div style={{ position: 'relative', height: 80, margin: '8px 0 14px' }}>
        <svg viewBox="0 0 300 80" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
          <line x1="0" y1="22" x2="300" y2="22" stroke={T.inkFaint} strokeWidth="1" strokeDasharray="3 4" />
          <path d="M0,68 C30,64 50,58 75,52 C100,46 120,44 150,38 C180,32 210,28 240,24 C265,21 285,20 300,18"
            fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
          {[{cx:0,cy:68},{cx:75,cy:52},{cx:150,cy:38},{cx:225,cy:25},{cx:300,cy:18}].map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={i===4?3:2.5} fill={T.accent} />
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 18, fontFamily: T.mono, fontSize: 10.5, color: T.inkDim, paddingTop: 8, borderTop: `1px dashed ${T.line}` }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 2, verticalAlign: 'middle', marginRight: 6, background: T.accent }} />You · loop 12</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 2, verticalAlign: 'middle', marginRight: 6, background: T.inkFaint }} />Target band</span>
      </div>
    </div>
  );
}

// ─── Features section (vertical editorial list) ───────────────────────────────
const FEATURES = [
  {
    num: '01', tag: '// LEARNING LIBRARY', free: true,
    title: <>A detailed library of <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>everything</em> you need to know.</>,
    desc: 'System design, behavioural frameworks, product cases, DSA, negotiation, salary bands. Short readable modules with worked examples — and the whole library is free, always.',
    vis: <VisLearn />,
  },
  {
    num: '02', tag: '// MOCK INTERVIEWS', free: false,
    title: <>Practice with an AI that knows <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>your CV</em> and the job.</>,
    desc: 'Drop in the job description; we run a realistic loop — behavioural, technical, system design — with follow-ups grounded in what you\'ve actually done. Scored line-by-line, with a transcript to review.',
    vis: <VisMock />,
  },
  {
    num: '03', tag: '// CUSTOM CV', free: false,
    title: <>A bespoke CV for every job, in <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>one click.</em></>,
    desc: 'Reads the job description, re-orders your bullets, tunes the language, and hits ATS — without inventing anything. Export to PDF, .docx, or paste straight into the form.',
    vis: <VisCV />,
  },
  {
    num: '04', tag: '// LINKEDIN OUTREACH', free: false,
    title: <>Warm intros to the right people, on <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>autopilot.</em></>,
    desc: 'Finds hiring managers in your network, drafts a personal note based on their recent posts, and sends on a human cadence. You approve in bulk; replies land in your inbox.',
    vis: <VisLinkedIn />,
  },
  {
    num: '05', tag: '// INTERVIEW COPILOT', free: false,
    title: <>A quiet whisper, drawn from <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>your own experience.</em></>,
    desc: 'During the interview, Copilot listens and surfaces short pointers — not scripts. They reference your actual projects, numbers, and language, so what you say is recognisably yours.',
    vis: <VisCopilot />,
  },
  {
    num: '06', tag: '// ADAPTIVE SYSTEM', free: false,
    title: <>Learns your pace. <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>Tunes itself</em> after every loop.</>,
    desc: 'Every module you read and every mock you run feeds back into a quiet model of where you are. The library reshuffles, mocks get harder where it matters, and the Copilot\'s whispers shift to the gaps you still have.',
    vis: <VisAdaptive />,
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="jc-features-section" style={{ padding: '128px 0' }}>
      <div className="jc-feat-container" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px' }}>
        <div className="jc-section-head" style={{ marginBottom: 80, maxWidth: 760 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 11.5, color: T.inkDim,
            letterSpacing: '0.05em', marginBottom: 22,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ width: 18, height: 1, background: T.accent, display: 'inline-block' }} />
            <span style={{ color: T.accent }}>01</span> · WHAT'S INSIDE
          </div>
          <h2 style={{
            fontSize: 'clamp(36px,4.8vw,60px)', lineHeight: 1.04,
            letterSpacing: '-0.032em', fontWeight: 400, marginBottom: 22,
            fontFamily: T.sans, color: T.ink,
          }}>
            Six tools. One <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>thread</em><br />of context.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: T.inkDim, maxWidth: '58ch' }}>
            JobCracker holds a single picture of you — your CV, your goals, the loops you've already run — and threads it through every step from the first chapter you read to the offer you sign.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FEATURES.map((f, idx) => (
            <article key={f.num} className="jc-feature" style={{
              display: 'grid', gridTemplateColumns: '64px 1fr 320px',
              gap: 48, padding: '56px 0',
              borderTop: `1px solid ${T.line}`,
              borderBottom: idx === FEATURES.length - 1 ? `1px solid ${T.line}` : 'none',
              alignItems: 'start',
            }}>
              {/* Number */}
              <div className="jc-feat-num" style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkFaint, letterSpacing: '0.06em', paddingTop: 8 }}>{f.num}</div>

              {/* Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: '46ch' }}>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{f.tag}</span>
                <h3 style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: '-0.022em', fontWeight: 400, fontFamily: T.sans, color: T.ink }}>{f.title}</h3>
                <p style={{ fontSize: 15.5, lineHeight: 1.6, color: T.inkDim }}>{f.desc}</p>
                {f.free && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.06em',
                    border: `1px solid ${T.accentLine}`, padding: '4px 10px', borderRadius: 999,
                    background: T.accentDim, width: 'fit-content', marginTop: 4,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
                    Free forever
                  </span>
                )}
              </div>

              {/* Visual */}
              <div style={{
                background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 10,
                padding: 18, fontFamily: T.mono, fontSize: 12,
                minHeight: 180, display: 'flex', flexDirection: 'column', gap: 12,
                boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset',
              }}>
                {f.vis}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: 'STEP 01', t: <>Drop in your <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>CV</em> &amp; pick a goal.</>, d: "We parse your experience and target roles in a minute. From here, every output stays anchored to your real story — no hallucinations, no fluff." },
    { n: 'STEP 02', t: <>Read, <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>practice</em>, and reach out.</>, d: "Work through the library at your pace, run mocks against the JD, send tailored CVs, and let outreach run warm in the background." },
    { n: 'STEP 03', t: <>Open Copilot. <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>Walk in calm.</em></>, d: "When the call starts, Copilot listens and offers gentle pointers from your own work. You sound prepared because you actually are." },
  ];
  return (
    <section id="how" className="jc-how-section" style={{ paddingBottom: 128 }}>
      <div className="jc-how-container" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px' }}>
        <div className="jc-section-head" style={{ marginBottom: 64, maxWidth: 760 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkDim, letterSpacing: '0.05em', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 18, height: 1, background: T.accent, display: 'inline-block' }} />
            <span style={{ color: T.accent }}>02</span> · HOW IT WORKS
          </div>
          <h2 style={{ fontSize: 'clamp(36px,4.8vw,60px)', lineHeight: 1.04, letterSpacing: '-0.032em', fontWeight: 400, fontFamily: T.sans, color: T.ink }}>
            Set it up <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>once.</em><br />Run every loop on rails.
          </h2>
        </div>
        <div className="jc-steps-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 1, background: T.line, border: `1px solid ${T.line}`,
          borderRadius: 12, overflow: 'hidden',
        }}>
          {steps.map(s => (
            <div key={s.n} className="jc-step" style={{ background: T.bg2, padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 240 }}>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.06em' }}>{s.n}</div>
              <div style={{ fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.018em', fontWeight: 400, fontFamily: T.sans, color: T.ink }}>{s.t}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.55, color: T.inkDim, marginTop: 'auto' }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTASection({ onBrowseLearn }: { onBrowseLearn?: () => void }) {
  return (
    <div className="jc-cta-outer" style={{ margin: '40px 32px 80px' }}>
      <div className="jc-cta-box" style={{
        border: `1px solid ${T.line}`, borderRadius: 16,
        background: T.bg2, padding: '88px 56px',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${T.line} 1px, transparent 1px), linear-gradient(90deg, ${T.line} 1px, transparent 1px)`,
          backgroundSize: '56px 56px', opacity: .45,
          maskImage: 'radial-gradient(ellipse 50% 80% at 100% 50%, black 10%, transparent 75%)',
        }} />
        <div style={{ position: 'relative', maxWidth: 640 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkDim, letterSpacing: '0.05em', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: T.accent }}>→</span> READY?
          </div>
          <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', lineHeight: 1.0, letterSpacing: '-0.035em', fontWeight: 400, marginBottom: 22, fontFamily: T.sans, color: T.ink }}>
            Your next interview is{' '}
            <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400, color: T.accent }}>days</span>{' '}
            away.<br />Walk in prepared.
          </h2>
          <p style={{ fontSize: 17, color: T.inkDim, lineHeight: 1.55, marginBottom: 36, maxWidth: '52ch' }}>
            Free trial · no card required. The learning library is free forever. Mocks, CV tailoring, outreach, and Copilot included in the trial.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <BtnPrimary href="/auth/linkedin">Start free <span>→</span></BtnPrimary>
            {onBrowseLearn && (
              <button
                onClick={onBrowseLearn}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 999,
                  background: 'transparent', color: T.ink,
                  fontSize: 14, fontWeight: 500, fontFamily: T.sans,
                  whiteSpace: 'nowrap', cursor: 'pointer',
                  border: `1px solid ${T.line2}`,
                }}
              >
                Book a 15-min walkthrough
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ onBrowseLearn }: { onBrowseLearn?: () => void }) {
  return (
    <footer className="jc-foot" style={{ borderTop: `1px solid ${T.line}`, padding: '48px 32px 40px' }}>
      <div className="jc-foot-grid" style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48 }}>
        <div className="jc-foot-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, letterSpacing: '-0.02em', fontSize: 18, fontFamily: T.sans, marginBottom: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
            JobCracker
          </div>
          <p style={{ color: T.inkDim, lineHeight: 1.55, fontFamily: T.sans, fontSize: 13.5, maxWidth: '36ch' }}>
            A quiet co-pilot for the whole job hunt — learning, practice, applications, outreach, and the interview itself.
          </p>
        </div>
        <div>
          <h4 style={{ fontFamily: T.sans, fontSize: 11, color: T.inkDim, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 16, fontWeight: 500 }}>Product</h4>
          {(['Learning library','Mock interviews','CV tailoring','LinkedIn outreach','Interview Copilot'] as const).map(l => (
            <span key={l} style={{ display: 'block', color: T.ink2, padding: '5px 0', fontSize: 13.5 }}>{l}</span>
          ))}
        </div>
        <div>
          <h4 style={{ fontFamily: T.sans, fontSize: 11, color: T.inkDim, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 16, fontWeight: 500 }}>Resources</h4>
          {['Changelog','Docs','Blog','STAR templates'].map(l => (
            <span key={l} style={{ display: 'block', color: T.ink2, padding: '5px 0', fontSize: 13.5 }}>{l}</span>
          ))}
        </div>
        <div>
          <h4 style={{ fontFamily: T.sans, fontSize: 11, color: T.inkDim, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 16, fontWeight: 500 }}>Company</h4>
          {['Pricing','About','Privacy','Terms','hello@jobcracker.app'].map(l => (
            <span key={l} style={{ display: 'block', color: T.ink2, padding: '5px 0', fontSize: 13.5 }}>{l}</span>
          ))}
        </div>
      </div>
      <div className="jc-foot-bot" style={{ maxWidth: 1180, margin: '48px auto 0', paddingTop: 28, borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 11.5, color: T.inkDim }}>
        <div>© 2026 JobCracker · all rights reserved</div>
        <div><span style={{ color: T.accent }}>●</span> operational · 99.98% uptime · 30d</div>
      </div>
    </footer>
  );
}

// ─── Login Page (full landing) ─────────────────────────────────────────────────
interface LoginPageProps {
  linkedinError?: string | null;
  onClearLinkedinError?: () => void;
  onBrowseLearn?: () => void;
}

export function LoginPage({ linkedinError, onClearLinkedinError, onBrowseLearn }: LoginPageProps) {
  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.sans, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden', minHeight: '100vh' }}>
      <InjectStyles />

      <Nav onBrowseLearn={onBrowseLearn} />

      {/* Hero */}
      <section className="jc-hero-section" style={{ padding: '96px 0 80px' }}>
        <div className="jc-hero-grid" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 64, alignItems: 'center' }}>
          <div>
            {/* Eyebrow */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: T.mono, fontSize: 11.5, color: T.inkDim, marginBottom: 32, letterSpacing: '0.04em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, display: 'inline-block', animation: 'jc-pulse 2.2s ease-in-out infinite' }} />
              INTERVIEW COPILOT · v2.0 · NOW WITH ADAPTIVE LEARNING
            </div>

            {linkedinError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', marginBottom: 24, borderRadius: 8, background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.25)', maxWidth: 520 }}>
                <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: '#dc2626', fontSize: 14, flex: 1, lineHeight: 1.5 }}>{linkedinError}</p>
                <button onClick={onClearLinkedinError} style={{ color: '#ef4444', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
              </div>
            )}

            {/* h1 */}
            <h1 style={{
              fontFamily: T.sans, fontSize: 'clamp(48px,7.4vw,96px)',
              lineHeight: 1.0, letterSpacing: '-0.038em', fontWeight: 400,
              marginBottom: 32, maxWidth: '13ch', color: T.ink,
            }}>
              Crack Jobs<br />
              with <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400, color: T.accent }}>AI.</span>
            </h1>

            <p style={{ fontSize: 18, lineHeight: 1.55, color: T.inkDim, maxWidth: '50ch', marginBottom: 40, fontWeight: 400 }}>
              JobCracker is your <strong style={{ color: T.ink, fontWeight: 500 }}>quiet co-pilot</strong> through the whole hunt — a free learning library, mock interviews shaped by your CV, tailored resumes, automated LinkedIn outreach, and a live whisper that nudges you with pointers drawn from <em style={{ fontFamily: T.serif, fontStyle: 'italic' }}>your own experience.</em>
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 56 }}>
              <BtnPrimary href="/auth/linkedin">Start free <span>→</span></BtnPrimary>
              {onBrowseLearn && (
                <button
                  onClick={onBrowseLearn}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', borderRadius: 999,
                    color: T.accent, background: T.accentDim,
                    border: `1px solid ${T.accentLine}`,
                    fontSize: 14, fontWeight: 500, fontFamily: T.sans,
                    whiteSpace: 'nowrap', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '2px 7px', borderRadius: 999, background: T.accent, color: T.accentInk, marginRight: 2 }}>Free</span>
                  Browse the learning library <span>→</span>
                </button>
              )}
              <button
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 999,
                  color: T.ink, background: 'transparent',
                  border: `1px solid ${T.line2}`,
                  fontSize: 14, fontWeight: 500, fontFamily: T.sans,
                  whiteSpace: 'nowrap', cursor: 'pointer',
                }}
              >
                Watch the 90-second tour
              </button>
            </div>

            {/* Stat strip */}
            <div className="jc-hero-meta" style={{
              display: 'flex', gap: 40, fontFamily: T.mono, fontSize: 11.5, color: T.inkDim,
              paddingTop: 28, borderTop: `1px solid ${T.line}`,
            }}>
              {[['free','learning library'],['0.4s','whisper latency'],['adaptive','to your pace']].map(([v, l]) => (
                <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: T.ink, fontSize: 22, fontWeight: 400, fontFamily: T.serif, fontStyle: 'italic', letterSpacing: '-0.01em' }}>{v}</span>
                  <span style={{ letterSpacing: '0.04em' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <HeroWhisperCard />
        </div>
      </section>

      <Strip />
      <FeaturesSection />
      <HowItWorks />
      <CTASection onBrowseLearn={onBrowseLearn} />
      <Footer onBrowseLearn={onBrowseLearn} />
    </div>
  );
}

// ─── CV Onboarding Page ────────────────────────────────────────────────────────

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

interface CVOnboardingPageProps {
  profile: CandidateProfile;
  onComplete: (enriched: CandidateProfile) => void;
}

const CV_BENEFITS = [
  { icon: '🎙', label: 'Interview Assist',  desc: 'Real-time AI answers tailored to your exact background' },
  { icon: '🎯', label: 'Job Matching',      desc: 'Surface roles that fit your skills & seniority' },
  { icon: '✨', label: 'Smart Suggestions', desc: 'Context-aware tips based on your experience' },
  { icon: '🤝', label: 'Network Outreach',  desc: 'Personalised messages that reference your story' },
];

export function CVOnboardingPage({ profile, onComplete }: CVOnboardingPageProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setUploadState('uploading');
    setErrorMsg('');
    try {
      const form = new FormData();
      form.append('cv', file);
      const res = await fetch('/api/cv/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadState('success');
      const enriched: CandidateProfile = {
        ...profile, ...data.profile,
        name:     data.profile.name     || profile.name,
        email:    data.profile.email    || profile.email,
        photoUrl: profile.photoUrl      || data.profile.photoUrl,
      };
      setTimeout(() => onComplete(enriched), 800);
    } catch (err) {
      setUploadState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed — please try again');
    }
  }, [profile, onComplete]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setUploadState('idle');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const dropBorder = uploadState === 'dragging'  ? T.accent :
                     uploadState === 'success'   ? '#34d399' :
                     uploadState === 'uploading' ? T.line2 :
                     uploadState === 'error'     ? 'rgba(239,68,68,.5)' :
                     T.line2;
  const dropBg = uploadState === 'dragging'  ? 'rgba(184,233,134,0.05)' :
                 uploadState === 'success'   ? 'rgba(52,211,153,.04)' :
                 uploadState === 'uploading' ? T.bg3 :
                 uploadState === 'error'     ? 'rgba(239,68,68,.04)' :
                 T.bg2;

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.sans, WebkitFontSmoothing: 'antialiased', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <InjectStyles />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontFamily: T.sans, fontSize: 18, letterSpacing: '-0.02em' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
          JobCracker
        </div>

        {/* Welcome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt={profile.name}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${T.accent}` }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `2px solid ${T.accent}`, background: T.accentDim, color: T.accent, fontWeight: 700, fontSize: 16 }}>
              {initials}
            </div>
          )}
          <div>
            <p style={{ color: T.ink, fontWeight: 600 }}>Welcome, {profile.name.split(' ')[0]}</p>
            <p style={{ color: T.inkDim, fontSize: 13 }}>Signed in with LinkedIn</p>
          </div>
        </div>

        {/* Card */}
        <div style={{ width: '100%', borderRadius: 14, padding: 32, border: `1px solid ${T.line2}`, background: T.bg2, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: T.ink, marginBottom: 8, fontFamily: T.sans }}>One last step — upload your CV</h2>
            <p style={{ color: T.inkDim, fontSize: 14, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
              Your CV unlocks truly personalised AI assistance across every feature — from real-time interview coaching to smart job matching.
            </p>
          </div>

          {/* Benefits */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 28 }}>
            {CV_BENEFITS.map(({ icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 8, border: `1px solid ${T.line2}`, background: T.bg3 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ color: T.ink, fontSize: 12, fontWeight: 600, fontFamily: T.mono }}>{label}</p>
                  <p style={{ color: T.inkDim, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setUploadState('dragging'); }}
            onDragLeave={() => setUploadState('idle')}
            onDrop={onDrop}
            onClick={() => (uploadState === 'idle' || uploadState === 'error') && fileInputRef.current?.click()}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, borderRadius: 10, border: `2px dashed ${dropBorder}`,
              padding: '40px 24px', cursor: uploadState === 'uploading' ? 'wait' : uploadState === 'success' ? 'default' : 'pointer',
              background: dropBg, transition: 'all .2s ease',
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={onFileChange} />

            {uploadState === 'uploading' && (
              <>
                <Loader2 size={32} style={{ color: T.accent, animation: 'spin 1s linear infinite' }} />
                <p style={{ color: T.ink, fontWeight: 500, fontSize: 14 }}>Parsing your CV…</p>
                <p style={{ color: T.inkDim, fontSize: 13 }}>Extracting skills, experience &amp; education</p>
              </>
            )}
            {uploadState === 'success' && (
              <>
                <CheckCircle2 size={32} style={{ color: '#34d399' }} />
                <p style={{ color: '#34d399', fontWeight: 600, fontSize: 14 }}>CV uploaded successfully!</p>
                <p style={{ color: T.inkDim, fontSize: 13 }}>Taking you to your dashboard…</p>
              </>
            )}
            {uploadState === 'error' && (
              <>
                <AlertCircle size={32} style={{ color: '#f87171' }} />
                <p style={{ color: '#fca5a5', fontWeight: 500, fontSize: 14 }}>{errorMsg}</p>
                <p style={{ color: T.inkDim, fontSize: 13 }}>Click to try again</p>
              </>
            )}
            {(uploadState === 'idle' || uploadState === 'dragging') && (
              <>
                <div style={{ width: 56, height: 56, borderRadius: 12, display: 'grid', placeItems: 'center', background: uploadState === 'dragging' ? T.accentDim : T.bg3, border: `1px solid ${uploadState === 'dragging' ? T.accent : T.line2}` }}>
                  {uploadState === 'dragging'
                    ? <Upload size={24} style={{ color: T.accent }} />
                    : <FileText size={24} style={{ color: T.inkDim }} />
                  }
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: T.ink, fontWeight: 500, fontSize: 14 }}>{uploadState === 'dragging' ? 'Drop to upload' : 'Drag & drop your CV here'}</p>
                  <p style={{ color: T.inkDim, fontSize: 13, marginTop: 4 }}>or click to browse · PDF, Word, or TXT</p>
                </div>
              </>
            )}
          </div>
        </div>

        <p style={{ color: T.inkFaint, fontSize: 12, textAlign: 'center', maxWidth: 360, fontFamily: T.mono }}>
          Your CV is used only to personalise AI responses within this app. We do not share or store it externally.
        </p>
      </div>
    </div>
  );
}

// ─── SetupPage ────────────────────────────────────────────────────────────────
interface SetupPageProps {
  onProfileReady: (profile: CandidateProfile) => void;
  savedProfile: CandidateProfile | null;
  linkedinError?: string | null;
  onClearLinkedinError?: () => void;
  linkedinProfile?: CandidateProfile | null;
  onLinkedinProfileAccept?: (profile: CandidateProfile) => void;
  onLinkedinProfileDismiss?: () => void;
}

export function SetupPage({ linkedinError, onClearLinkedinError }: SetupPageProps) {
  return <LoginPage linkedinError={linkedinError} onClearLinkedinError={onClearLinkedinError} />;
}
