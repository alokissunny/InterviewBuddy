import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { CandidateProfile } from '../types';

// ─── Design tokens ─────────────────────────────────────── Light page theme ──
const T = {
  bg:        '#FFFFFF',
  bg2:       '#F8FAFC',
  bg3:       '#F1F5F9',
  line:      '#E2E8F0',
  line2:     '#CBD5E1',
  ink:       '#0F172A',
  ink2:      '#334155',
  inkDim:    '#64748B',
  inkFaint:  '#94A3B8',
  accent:    '#4F46E5',
  accentInk: '#FFFFFF',
  accentDim: 'rgba(79,70,229,0.07)',
  accentLine:'rgba(79,70,229,0.22)',
  mono:      '"JetBrains Mono", ui-monospace, monospace',
  sans:      '"Manrope", system-ui, sans-serif',
  serif:     '"Newsreader", Georgia, serif',
};

// ─── Dark-mock tokens ──────────────────── used only in UI demo panels ───────
const DM = {
  bg:        '#0D1117',
  bg2:       '#161B27',
  bg3:       '#1E2736',
  line:      '#21283A',
  line2:     '#2D3748',
  ink:       '#E8E4D8',
  ink2:      '#B0BBCF',
  inkDim:    '#6B7A99',
  inkFaint:  '#3D4A60',
  accent:    '#818CF8',
  accentDim: 'rgba(129,140,248,0.08)',
  accentLine:'rgba(129,140,248,0.22)',
  mono:      '"JetBrains Mono", ui-monospace, monospace',
  sans:      '"Manrope", system-ui, sans-serif',
  serif:     '"Newsreader", Georgia, serif',
};

// ─── Global keyframes ─────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes jc-pulse  { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes jc-wave   { 0%,100%{height:3px} 50%{height:12px} }
@keyframes jc-scroll { to{transform:translateX(-50%)} }
@keyframes spin      { to{transform:rotate(360deg)} }

@media (max-width: 768px) {
  .jc-nav            { padding: 14px 20px !important; }
  .jc-nav-links      { display: none !important; }
  .jc-nav-meta       { display: none !important; }

  .jc-hero-section   { padding: 36px 0 28px !important; }
  .jc-hero-grid      { grid-template-columns: 1fr !important; gap: 0 !important; padding: 0 20px !important; }
  .jc-editor-mock    { display: none !important; }
  .jc-hero-meta      { gap: 20px 28px !important; flex-wrap: wrap !important; }

  .jc-strip-grid     { grid-template-columns: 1fr 1fr !important; padding: 0 20px !important; }
  .jc-strip-cell:nth-child(even) { border-right: none !important; }
  .jc-strip-cell     { padding: 14px 16px !important; font-size: 11px !important; }

  .jc-features-section { padding: 56px 0 !important; }
  .jc-feat-container { padding: 0 20px !important; }
  .jc-section-head   { margin-bottom: 36px !important; }
  .jc-feature        { grid-template-columns: 1fr !important; gap: 16px !important; padding: 28px 0 !important; }
  .jc-feat-num       { display: none !important; }

  .jc-how-section    { padding-bottom: 56px !important; }
  .jc-how-container  { padding: 0 20px !important; }
  .jc-steps-grid     { grid-template-columns: 1fr !important; border-radius: 8px !important; }
  .jc-step           { min-height: auto !important; padding: 24px 20px !important; }

  .jc-cta-outer      { margin: 20px 16px 40px !important; }
  .jc-cta-box        { padding: 40px 24px !important; }

  .jc-foot           { padding: 32px 20px !important; }
  .jc-foot-grid      { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
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

// ─── Ambient bg ───────────────────────────────────────────────────────────────
function Ambient() {
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(79,70,229,0.04), transparent 70%),
          radial-gradient(ellipse 60% 40% at 100% 100%, rgba(99,102,241,0.02), transparent 60%)
        `,
      }} />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        opacity: 0.025, mixBlendMode: 'overlay' as const,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      }} />
    </>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
function BtnPrimary({ href, children, onClick }: { href?: string; children: React.ReactNode; onClick?: () => void }) {
  const style: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '9px 16px', borderRadius: 6,
    background: T.accent, color: T.accentInk,
    fontSize: 13.5, fontWeight: 500, fontFamily: T.sans,
    whiteSpace: 'nowrap', cursor: 'pointer', border: 'none',
    textDecoration: 'none', transition: 'transform .15s ease',
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontWeight: 600, letterSpacing: '-0.02em', fontSize: 17 }}>
        JobCracker
        <span style={{
          fontFamily: T.mono, fontSize: 11, fontWeight: 600,
          color: T.inkDim, letterSpacing: 0,
          border: `1px solid ${T.line2}`, padding: '2px 6px', borderRadius: 4,
        }}>v2.0</span>
      </div>

      {/* Nav links */}
      <div className="jc-nav-links" style={{ display: 'flex', gap: 28, color: T.inkDim, fontSize: 13.5, alignItems: 'center' }}>
        {[['Features','#features'],['How it works','#how']].map(([l, h]) => (
          <a key={l} href={h} style={{ color: T.inkDim, textDecoration: 'none' }}>{l}</a>
        ))}
        {onBrowseLearn && (
          <button
            onClick={onBrowseLearn}
            style={{
              color: T.ink, textDecoration: 'none', background: 'none', border: 'none',
              padding: 0, margin: 0, fontFamily: T.sans, fontSize: 13.5, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            Learn
            <span style={{
              fontFamily: T.mono, fontSize: 9.5, fontWeight: 600,
              color: T.accent, letterSpacing: 0,
              border: `1px solid ${T.accent}40`, padding: '1px 5px', borderRadius: 3,
              background: `${T.accent}10`,
            }}>FREE</span>
          </button>
        )}
      </div>

      {/* Nav right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="jc-nav-meta" style={{
          fontFamily: T.mono, fontSize: 11.5, color: T.inkDim,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent, display: 'inline-block', animation: 'jc-pulse 2.4s ease-in-out infinite' }} />
          14k offers · this month
        </span>
        <BtnPrimary href="/auth/linkedin">Get started <span>→</span></BtnPrimary>
      </div>
    </nav>
  );
}

// ─── Editor mock (hero right) ─────────────────────────────────────────────────
function EditorMock() {
  const codeColors = { com: DM.inkFaint, kw: '#c597e8', fn: DM.accent, str: '#e8c986', var: DM.ink, num: '#86c7e8', ind: DM.inkFaint };
  const lines = [
    <span style={{ color: codeColors.com }}>{'// listening · transcribing · matching context'}</span>,
    <><span style={{ color: codeColors.kw }}>const</span>{' '}<span style={{ color: codeColors.var }}>interview</span>{' = '}<span style={{ color: codeColors.fn }}>jobcracker</span>{'.'}<span style={{ color: codeColors.fn }}>join</span>{'('}<span style={{ color: codeColors.str }}>"zoom-call.001"</span>{')'}</>,
    <>&nbsp;</>,
    <span style={{ color: codeColors.com }}>{'// they just asked:'}</span>,
    <><span style={{ color: codeColors.ind }}>{'┃'}</span>{' '}<span style={{ color: codeColors.str }}>{'"Tell me about a stakeholder'}</span></>,
    <><span style={{ color: codeColors.ind }}>{'┃'}</span>{' '}<span style={{ color: codeColors.str }}>{'conflict you handled."'}</span></>,
    <>&nbsp;</>,
    <><span style={{ color: codeColors.kw }}>{'await'}</span>{' '}<span style={{ color: codeColors.var }}>copilot</span>{'.'}<span style={{ color: codeColors.fn }}>whisper</span>{'({ '}<span style={{ color: codeColors.var }}>format</span>{': '}<span style={{ color: codeColors.str }}>"STAR"</span>{' })'}</>,
  ];
  const curLine = 8;

  return (
    <div className="jc-editor-mock" style={{
      background: DM.bg2, border: `1px solid ${DM.line}`, borderRadius: 10,
      fontFamily: DM.mono, fontSize: 13, overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(0,0,0,.25), 0 1px 0 rgba(255,255,255,.02) inset',
    }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        borderBottom: `1px solid ${DM.line}`, fontSize: 11.5, color: DM.inkDim,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['','',''].map((_, i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: DM.line2, display: 'inline-block' }} />
          ))}
        </div>
        <span style={{ flex: 1 }}>
          <span style={{ color: DM.inkFaint }}>{'~/interview/'}</span>
          <span style={{ color: DM.ink2 }}>anthropic.staff-pm.live</span>
        </span>
        <span style={{ color: DM.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: DM.accent, display: 'inline-block', animation: 'jc-pulse 1.6s infinite' }} />
          REC 03:42
        </span>
      </div>

      {/* Code body */}
      <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr' }}>
        {/* Gutter */}
        <div style={{ padding: '14px 0', textAlign: 'right', color: DM.inkFaint, fontSize: 11.5, lineHeight: 1.85, borderRight: `1px solid ${DM.line}`, userSelect: 'none' }}>
          {lines.map((_, i) => (
            <span key={i} style={{
              display: 'block', padding: '0 10px 0 0',
              color: i + 1 === curLine ? DM.accent : DM.inkFaint,
              background: i + 1 === curLine ? DM.accentDim : 'transparent',
            }}>{i + 1}</span>
          ))}
        </div>
        {/* Code */}
        <div style={{ padding: '14px 16px', fontSize: 12.5, lineHeight: 1.85 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ whiteSpace: 'nowrap' }}>{l}</div>
          ))}
        </div>
      </div>

      {/* Whisper card */}
      <div style={{
        borderTop: `1px dashed ${DM.line2}`, padding: '14px 16px',
        background: `linear-gradient(180deg, transparent, ${DM.accentDim})`,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: DM.mono, fontSize: 10.5, color: DM.inkDim,
          letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 10,
        }}>
          <span style={{ color: DM.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
            ▸ SUGGESTED · STAR · 0.42s
          </span>
          <span>conf 96%</span>
        </div>
        <div style={{ fontSize: 12.5, color: DM.inkDim, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 10, fontFamily: DM.serif }}>
          "Tell me about a stakeholder conflict you handled."
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: DM.ink }}>
          Lead with your <span style={{ color: DM.accent }}>Q3 legacy-API sunset</span> at Stripe — Eng Lead pushed back, you ran a data review, found <span style={{ color: DM.accent }}>3.2% revenue at risk</span>, proposed a phased plan. Result: shipped on time, <span style={{ color: DM.accent }}>zero churn</span>.
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${DM.line}`, padding: '8px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, color: DM.inkDim,
      }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {[['⌘K','rephrase'],['⌘L','shorter'],['⌘↵','next']].map(([k, l]) => (
            <span key={k}>
              <kbd style={{ fontFamily: DM.mono, fontSize: 10.5, border: `1px solid ${DM.line2}`, padding: '1px 5px', borderRadius: 3, color: DM.ink2, marginRight: 2 }}>{k}</kbd>
              {l}
            </span>
          ))}
        </div>
        <div>● undetectable</div>
      </div>
    </div>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────
function Strip() {
  const cells = [
    'Works on Zoom · Meet · Teams',
    'Reads your CV + the JD',
    'STAR / CIRCLES / Levels',
    'SOC2 · GDPR · zero retention',
  ];
  return (
    <div style={{ position: 'relative', zIndex: 2, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, background: T.bg2 }}>
      <div className="jc-strip-grid" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', fontFamily: T.mono, fontSize: 12 }}>
        {cells.map((c, i) => (
          <div key={i} className="jc-strip-cell" style={{
            padding: '18px 24px', borderRight: i < 3 ? `1px solid ${T.line}` : 'none',
            color: T.inkDim, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ color: T.accent }}>▸</span> {c}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature visuals ──────────────────────────────────────────────────────────
function VisCopilot() {
  const delays = Array.from({ length: 28 }, (_, i) => i * 0.08);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: DM.inkDim, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
        <span style={{ color: DM.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: DM.accent, display: 'inline-block', animation: 'jc-pulse 1.5s infinite' }} />
          LIVE · 03:42
        </span>
        <span>ZOOM</span>
      </div>
      <div style={{ color: DM.inkDim, fontStyle: 'italic', fontFamily: DM.serif, fontSize: 13.5, lineHeight: 1.4 }}>
        "Why do you want to work at Anthropic specifically?"
      </div>
      <div style={{ color: DM.ink, fontSize: 12.5, lineHeight: 1.55, paddingTop: 8, borderTop: `1px dashed ${DM.line2}` }}>
        {'→ Lead with your '}<span style={{ color: DM.accent }}>RLHF side project</span>{'. Mention the '}<span style={{ color: DM.accent }}>Claude 4 launch</span>{' as catalyst. Tie to your '}<span style={{ color: DM.accent }}>alignment essay</span>.
      </div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 14 }}>
        {delays.map((d, i) => (
          <i key={i} style={{ display: 'block', width: 2, background: DM.accent, borderRadius: 1, animation: `jc-wave 1.4s ease-in-out ${d}s infinite`, opacity: .7 }} />
        ))}
      </div>
    </div>
  );
}

function VisMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: DM.inkDim, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
        <span>ROUND 2 · BEHAVIORAL</span>
        <span style={{ color: DM.accent }}>SCORED</span>
      </div>
      <div style={{ fontFamily: DM.serif, fontStyle: 'italic', fontSize: 14, color: DM.ink, lineHeight: 1.4 }}>
        "Walk me through a time you said no to a senior leader."
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, paddingTop: 12, borderTop: `1px dashed ${DM.line2}` }}>
        {[['8.4','Clarity'],['9.1','STAR'],['7.2','Signal']].map(([v, l]) => (
          <div key={l}>
            <div style={{ fontFamily: DM.sans, fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: DM.ink }}>
              {v}<span style={{ fontSize: 11, color: DM.inkFaint, marginLeft: 2 }}>/10</span>
            </div>
            <div style={{ fontSize: 10, color: DM.inkDim, letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisJobs() {
  const jobs = [
    { letter: 'A', role: 'Staff PM, Platform',    meta: 'Anthropic · SF · $310–380k',   match: '95%', top: true },
    { letter: 'L', role: 'Senior PM, AI Products', meta: 'Linear · Remote · $240–290k',  match: '88%', top: false },
    { letter: 'F', role: 'Group PM, Growth',       meta: 'Figma · NYC · $260–320k',      match: '82%', top: false },
    { letter: 'N', role: 'Principal PM',           meta: 'Notion · Remote · $280–340k',  match: '79%', top: false },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {jobs.map(j => (
        <div key={j.role} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px dashed ${DM.line}`, fontSize: 11.5 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 4, background: DM.bg3,
            border: `1px solid ${j.top ? DM.accentLine : DM.line2}`,
            display: 'grid', placeItems: 'center', fontSize: 10,
            color: j.top ? DM.accent : DM.ink2, fontWeight: 600,
          }}>{j.letter}</div>
          <div>
            <div style={{ color: DM.ink, fontFamily: DM.sans, fontSize: 12 }}>{j.role}</div>
            <div style={{ color: DM.inkDim, fontSize: 10.5, fontFamily: DM.mono, marginTop: 1 }}>{j.meta}</div>
          </div>
          <div style={{ color: DM.accent, fontWeight: 600, fontSize: 11 }}>{j.match}</div>
        </div>
      ))}
    </div>
  );
}

function VisCV() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: DM.sans, fontSize: 14, color: DM.ink, fontWeight: 500 }}>Alex Chen</div>
        <div style={{ fontSize: 10, color: DM.accent, border: `1px solid ${DM.accentLine}`, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.06em' }}>v3 · 95% ATS</div>
      </div>
      <div style={{ fontSize: 10.5, color: DM.inkDim }}>Tailored for: Anthropic · Staff PM, Platform</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '8px 0' }}>
        {[null, 'short', 'hl', null, 'short', 'hl2', null].map((cls, i) => (
          <div key={i} style={{
            height: 3, borderRadius: 2,
            background: cls === 'hl' ? DM.accent : cls === 'hl2' ? `${DM.accent}80` : DM.line2,
            width: cls === 'short' ? '60%' : cls === 'hl' ? '45%' : cls === 'hl2' ? '55%' : '100%',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, paddingTop: 8, borderTop: `1px dashed ${DM.line2}` }}>
        {['Anthropic', 'Linear', 'Figma', '+12'].map((c, i) => (
          <span key={c} style={{
            padding: '3px 8px', border: `1px solid ${i === 0 ? DM.accentLine : DM.line2}`,
            borderRadius: 999, fontSize: 10,
            color: i === 0 ? DM.accent : DM.inkDim,
            background: i === 0 ? DM.accentDim : 'transparent',
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
    if (cls === 'sent')  return { color: DM.accent, border: `1px solid ${DM.accentLine}` };
    if (cls === 'reply') return { color: DM.ink, border: `1px solid ${DM.inkDim}`, background: DM.bg3 };
    return { color: DM.inkDim, border: `1px solid ${DM.line2}` };
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map(r => (
        <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px dashed ${DM.line}`, fontSize: 11.5 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: DM.bg3, border: `1px solid ${DM.line2}` }} />
          <div>
            <div style={{ color: DM.ink, fontFamily: DM.sans, fontSize: 12 }}>{r.name}</div>
            <div style={{ color: DM.inkDim, fontSize: 10, fontFamily: DM.mono }}>{r.sub}</div>
          </div>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.04em', ...statStyle(r.cls) }}>{r.stat}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Features section (vertical editorial list) ───────────────────────────────
const FEATURES = [
  {
    num: '01', tag: '// INTERVIEW COPILOT',
    title: <>Whispers the right answer. <em style={{ fontFamily: 'inherit', fontStyle: 'italic', fontWeight: 400 }}>Before they finish asking.</em></>,
    desc: 'A transparent overlay that joins your call. Listens, transcribes, matches against your context, and surfaces a STAR-formatted answer in 0.4s. Invisible to the interviewer.',
    bullets: ['Sub-second latency · streaming', 'Drawn from your CV + JD + company', 'Click-to-rephrase · shorten · pivot'],
    vis: <VisCopilot />,
  },
  {
    num: '02', tag: '// MOCK INTERVIEW',
    title: <>Practice with an AI that asks <em style={{ fontFamily: 'inherit', fontStyle: 'italic', fontWeight: 400 }}>like a hiring manager.</em></>,
    desc: 'Behavioural, technical, system design. Realistic follow-ups. Scored on STAR coverage, clarity, signal density — with a transcript you can review line-by-line.',
    bullets: ['500+ rubrics from real loops', 'Adjustable difficulty · pace · accent', 'Full transcript · timestamped feedback'],
    vis: <VisMock />,
  },
  {
    num: '03', tag: '// SMART JOB SEARCH',
    title: <>Roles that fit. <em style={{ fontFamily: 'inherit', fontStyle: 'italic', fontWeight: 400 }}>Surfaced before they trend.</em></>,
    desc: 'We index 1.2M openings a week, score them against your CV, and filter for visa, comp band, remote, stage. No more keyword roulette.',
    bullets: ['Match score from your full context', 'Comp + visa + remote · pre-filtered', 'Watchlists · weekly digest · Slack'],
    vis: <VisJobs />,
  },
  {
    num: '04', tag: '// CUSTOM CV',
    title: <>A bespoke CV per job. <em style={{ fontFamily: 'inherit', fontStyle: 'italic', fontWeight: 400 }}>In one click.</em></>,
    desc: 'Reads the JD, re-orders bullets, swaps keywords, hits ATS — and never lies. Export PDF, .docx, or paste straight into the form.',
    bullets: ['ATS score · keyword diff · readability', 'Versioned · diff against last submit', 'PDF · .docx · LaTeX · plain'],
    vis: <VisCV />,
  },
  {
    num: '05', tag: '// LINKEDIN AUTOPILOT',
    title: <>200 warm intros a week. <em style={{ fontFamily: 'inherit', fontStyle: 'italic', fontWeight: 400 }}>While you sleep.</em></>,
    desc: 'Finds hiring managers. Drafts personalised notes from their last 5 posts. Sends on a human cadence. Surfaces replies in your inbox.',
    bullets: ['People-graph · seniority · target list', 'Per-recipient draft · approve in bulk', 'Throttled · jittered · safe by default'],
    vis: <VisLinkedIn />,
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="jc-features-section" style={{ position: 'relative', zIndex: 2, padding: '120px 0' }}>
      <div className="jc-feat-container" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px' }}>
        <div className="jc-section-head" style={{ marginBottom: 64, maxWidth: 720 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 11.5, color: T.inkDim,
            letterSpacing: '0.04em', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ width: 16, height: 1, background: T.accent, display: 'inline-block' }} />
            <span style={{ color: T.accent }}>01</span> · FEATURES
          </div>
          <h2 style={{
            fontSize: 'clamp(32px,4.5vw,56px)', lineHeight: 1.05,
            letterSpacing: '-0.032em', fontWeight: 500, marginBottom: 20,
            fontFamily: T.sans, color: T.ink,
          }}>
            Five tools. One <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>thread</em> of context.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: T.inkDim, maxWidth: '58ch' }}>
            Most products solve one piece of the funnel. JobCracker keeps a single context — your CV, your goals, your last 12 interviews — and threads it through every step from cold-apply to signed offer.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FEATURES.map(f => (
            <article key={f.num} className="jc-feature" style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 1fr',
              gap: 40, padding: '56px 0',
              borderTop: `1px solid ${T.line}`,
              alignItems: 'start',
            }}>
              {/* Number */}
              <div className="jc-feat-num" style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkFaint, letterSpacing: '0.05em', paddingTop: 6 }}>{f.num}</div>

              {/* Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: '44ch' }}>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{f.tag}</span>
                <h3 style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.022em', fontWeight: 500, fontFamily: T.sans, color: T.ink }}>{f.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: T.inkDim }}>{f.desc}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontFamily: T.mono, fontSize: 11.5, color: T.inkDim }}>
                  {f.bullets.map(b => (
                    <li key={b} style={{ paddingLeft: 16, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: T.inkFaint }}>—</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual */}
              <div style={{
                background: DM.bg2, border: `1px solid ${DM.line}`, borderRadius: 8,
                padding: 18, fontFamily: DM.mono, fontSize: 12,
                minHeight: 200, position: 'relative', overflow: 'hidden',
              }}>
                {f.vis}
              </div>
            </article>
          ))}
          {/* Bottom border on last feature */}
          <div style={{ borderTop: `1px solid ${T.line}` }} />
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: 'STEP 01', t: <>Drop in your <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>CV</em> &amp; goals.</>, d: "We parse your experience, target roles, and preferences once. From here, every output stays anchored to your real story — no hallucinations, no fluff." },
    { n: 'STEP 02', t: <>Find roles. <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>Apply.</em> Practice.</>, d: "Smart search surfaces fits. Custom CV tailors per JD. Mock interview drills the rubric. LinkedIn autopilot warms the manager. All wired to one context." },
    { n: 'STEP 03', t: <>Open Copilot. <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>Crack it.</em></>, d: "When the call starts, Copilot listens and feeds you structured answers in real time. You sound prepared because you actually are." },
  ];
  return (
    <section id="how" className="jc-how-section" style={{ position: 'relative', zIndex: 2, paddingBottom: 120 }}>
      <div className="jc-how-container" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px' }}>
        <div className="jc-section-head" style={{ marginBottom: 64, maxWidth: 720 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkDim, letterSpacing: '0.04em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 16, height: 1, background: T.accent, display: 'inline-block' }} />
            <span style={{ color: T.accent }}>02</span> · HOW IT WORKS
          </div>
          <h2 style={{ fontSize: 'clamp(32px,4.5vw,56px)', lineHeight: 1.05, letterSpacing: '-0.032em', fontWeight: 500, fontFamily: T.sans, color: T.ink }}>
            Set it up <em style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>once.</em><br />Run every loop on rails.
          </h2>
        </div>
        <div className="jc-steps-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 1, background: T.line, border: `1px solid ${T.line}`,
          borderRadius: 10, overflow: 'hidden',
        }}>
          {steps.map(s => (
            <div key={s.n} className="jc-step" style={{ background: '#FFFFFF', padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 240 }}>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.05em' }}>{s.n}</div>
              <div style={{ fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.02em', fontWeight: 500, fontFamily: T.sans, color: T.ink }}>{s.t}</div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: T.inkDim, marginTop: 'auto' }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <div className="jc-cta-outer" style={{ position: 'relative', zIndex: 2, margin: '40px 32px 60px' }}>
      <div className="jc-cta-box" style={{
        border: `1px solid ${T.line}`, borderRadius: 14,
        background: T.bg2, padding: '80px 56px',
        overflow: 'hidden', position: 'relative',
        maxWidth: 1240 - 64, marginLeft: 'auto', marginRight: 'auto',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${T.line} 1px, transparent 1px), linear-gradient(90deg, ${T.line} 1px, transparent 1px)`,
          backgroundSize: '48px 48px', opacity: .4,
          maskImage: 'radial-gradient(ellipse 50% 70% at 100% 50%, black 20%, transparent 75%)',
        }} />
        <div style={{ position: 'relative', maxWidth: 640 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.inkDim, letterSpacing: '0.04em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 16, height: 1, background: T.accent, display: 'inline-block' }} />
            <span style={{ color: T.accent }}>→</span> READY?
          </div>
          <h2 style={{ fontSize: 'clamp(36px,5vw,64px)', lineHeight: 1.0, letterSpacing: '-0.035em', fontWeight: 500, marginBottom: 18, fontFamily: T.sans, color: T.ink }}>
            Your next interview is <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400, color: T.accent }}>days</span> away.<br />Walk in prepared.
          </h2>
          <p style={{ fontSize: 17, color: T.inkDim, lineHeight: 1.55, marginBottom: 32, maxWidth: '50ch' }}>
            Free trial · no card required. Works on Zoom, Meet, Teams. Mock interviews, smart search, custom CV, and LinkedIn outreach included.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <BtnPrimary href="/auth/linkedin">Start cracking <span>→</span></BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="jc-foot" style={{ position: 'relative', zIndex: 2, borderTop: `1px solid ${T.line}`, padding: '40px 32px' }}>
      <div className="jc-foot-grid" style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, fontFamily: T.mono, fontSize: 12 }}>
        <div className="jc-foot-brand">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontWeight: 600, letterSpacing: '-0.02em', fontSize: 17, fontFamily: T.sans, marginBottom: 14 }}>
            JobCracker
            <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.inkDim, border: `1px solid ${T.line2}`, padding: '2px 6px', borderRadius: 4 }}>v2.0</span>
          </div>
          <p style={{ color: T.inkDim, lineHeight: 1.55, fontFamily: T.sans, fontSize: 13 }}>
            The interview copilot for everyone who has ever frozen on a STAR question. Built quietly, in San Francisco.
          </p>
        </div>
        {[
          { head: 'Product', links: ['Copilot','Mock Interview','Job Search','CV Builder','LinkedIn'] },
          { head: 'Resources', links: ['Changelog','Docs','Blog','STAR templates','Discord'] },
          { head: 'Company', links: ['About','Privacy','Terms','hello@jobcracker.app'] },
        ].map(col => (
          <div key={col.head}>
            <h4 style={{ fontFamily: T.sans, fontSize: 11, color: T.inkDim, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 14, fontWeight: 500 }}>{col.head}</h4>
            {col.links.map(l => (
              <span key={l} style={{ display: 'block', color: T.ink2, padding: '4px 0' }}>{l}</span>
            ))}
          </div>
        ))}
      </div>
      <div className="jc-foot-bot" style={{ maxWidth: 1240, margin: '40px auto 0', paddingTop: 24, borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 11.5, color: T.inkDim }}>
        <div>© 2026 JobCracker · all rights reserved</div>
        <div>● operational · 99.98% uptime · 30d</div>
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
      <Ambient />

      <Nav onBrowseLearn={onBrowseLearn} />

      {/* Hero */}
      <section className="jc-hero-section" style={{ position: 'relative', zIndex: 2, padding: '80px 0 60px' }}>
        <div className="jc-hero-grid" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 56, alignItems: 'center' }}>
          <div>
            {/* Eyebrow */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: T.mono, fontSize: 11.5, color: T.inkDim, marginBottom: 28, letterSpacing: '0.02em' }}>
              <span style={{ color: T.accent }}>●</span>
              AI LEARNING PLATFORM · v2.0
              <span style={{ color: T.inkFaint, margin: '0 2px' }}>/</span>
              system design · behavioural · prep
            </div>

            {linkedinError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', marginBottom: 24, borderRadius: 8, background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.25)', maxWidth: 520 }}>
                <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: '#fca5a5', fontSize: 14, flex: 1, lineHeight: 1.5 }}>{linkedinError}</p>
                <button onClick={onClearLinkedinError} style={{ color: '#f87171', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
              </div>
            )}

            {/* h1 */}
            <h1 style={{
              fontFamily: T.sans, fontSize: 'clamp(44px,7vw,92px)',
              lineHeight: 1.0, letterSpacing: '-0.038em', fontWeight: 500,
              marginBottom: 28, maxWidth: '14ch', color: T.ink,
            }}>
              Learn. Practice.<br />
              <span style={{ color: T.accent, fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 }}>Land the offer.</span>
            </h1>

            <p style={{ fontSize: 18, lineHeight: 1.55, color: T.inkDim, maxWidth: '52ch', marginBottom: 36, fontWeight: 400 }}>
              A structured learning platform for senior engineering interviews. Deep-dive system design, AI mock practice with real-time scoring, and a live interview copilot — all <strong style={{ color: T.ink, fontWeight: 500 }}>personalised to your CV and target role.</strong>{' '}
              <em style={{ fontFamily: T.serif, fontStyle: 'italic' }}>From first study to signed offer.</em>
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 40 }}>
              <BtnPrimary href="/auth/linkedin">Start free <span>→</span></BtnPrimary>
              {onBrowseLearn && (
                <button
                  onClick={onBrowseLearn}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '9px 16px', borderRadius: 6,
                    background: 'transparent', color: T.ink,
                    fontSize: 13.5, fontWeight: 500, fontFamily: T.sans,
                    whiteSpace: 'nowrap', cursor: 'pointer',
                    border: `1px solid ${T.line2}`,
                    transition: 'background .15s ease, border-color .15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  Browse Learn — no signup <span style={{ color: T.accent }}>↗</span>
                </button>
              )}
            </div>

            {/* Stat strip */}
            <div className="jc-hero-meta" style={{
              display: 'flex', gap: 32, fontFamily: T.mono, fontSize: 11.5, color: T.inkDim,
              paddingTop: 24, borderTop: `1px solid ${T.line}`,
            }}>
              {[['3.2×','callbacks'],['0.4s','to first answer'],['96%','answer confidence'],['14k','offers / month']].map(([v, l]) => (
                <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ color: T.ink, fontSize: 17, fontWeight: 500, fontFamily: T.sans, letterSpacing: '-0.02em' }}>{v}</span>
                  <span style={{ letterSpacing: '0.02em' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <EditorMock />
        </div>
      </section>

      <Strip />
      <FeaturesSection />
      <HowItWorks />
      <CTASection />
      <Footer />
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
      <Ambient />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontWeight: 600, fontFamily: T.sans, fontSize: 18, letterSpacing: '-0.02em' }}>
          JobCracker
          <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.inkDim, border: `1px solid ${T.line2}`, padding: '2px 6px', borderRadius: 4 }}>v2.0</span>
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
