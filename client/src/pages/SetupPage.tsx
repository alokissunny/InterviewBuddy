import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { CandidateProfile } from '../types';

// ─── Design tokens (match JobCracker.html) ────────────────────────────────────

const T = {
  bg:       '#050807',
  bg2:      '#0a0f0d',
  bg3:      '#0f1614',
  line:     '#1a2420',
  line2:    '#243530',
  ink:      '#d8e8e0',
  inkDim:   '#6b7d76',
  inkFaint: '#3d4a45',
  accent:   '#00ff88',
  accentDim:'rgba(0,255,136,0.12)',
  warn:     '#ffb800',
  pink:     '#ff4d8d',
  mono:     '"JetBrains Mono", ui-monospace, monospace',
  sans:     '"Space Grotesk", system-ui, sans-serif',
  serif:    '"Instrument Serif", Georgia, serif',
};

// ─── Global keyframes (injected once) ─────────────────────────────────────────

const KEYFRAMES = `
@keyframes jc-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes jc-blink { 50%{opacity:0} }
@keyframes jc-wave  { 0%,100%{height:4px} 50%{height:16px} }
@keyframes jc-scroll { to{transform:translateX(-50%)} }
@keyframes jc-ping  { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.4);opacity:0} }
`;

function InjectStyles() {
  useEffect(() => {
    const id = 'jc-keyframes';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = KEYFRAMES;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function GridBg() {
  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      backgroundImage: `linear-gradient(${T.line} 1px,transparent 1px),linear-gradient(90deg,${T.line} 1px,transparent 1px)`,
      backgroundSize: '64px 64px',
      maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 75%)',
      opacity: .55,
    }} />
  );
}

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: T.accent,
      display: 'grid', placeItems: 'center',
      color: '#000', fontFamily: T.mono, fontWeight: 700, fontSize: size * 0.59,
      boxShadow: `0 0 24px ${T.accentDim}`,
      flexShrink: 0,
    }}>JC</div>
  );
}

function BtnPrimary({ href, children, onClick }: { href?: string; children: React.ReactNode; onClick?: () => void }) {
  const style: React.CSSProperties = {
    background: T.accent, color: '#000', padding: '10px 20px', borderRadius: 999,
    fontWeight: 600, fontFamily: T.sans, fontSize: 14,
    display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'transform .15s ease, box-shadow .15s ease',
    cursor: 'pointer', border: 'none', textDecoration: 'none',
  };
  if (href) return <a href={href} style={style}>{children}</a>;
  return <button style={style} onClick={onClick}>{children}</button>;
}

function BtnGhost({ href, children }: { href?: string; children: React.ReactNode }) {
  return (
    <a href={href || '#'} style={{
      border: `1px solid ${T.line2}`, padding: '10px 18px', borderRadius: 999,
      fontWeight: 500, fontFamily: T.sans, fontSize: 14, color: T.ink,
      display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
    }}>{children}</a>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav style={{
      position: 'relative', zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '22px 40px',
      borderBottom: `1px solid ${T.line}`,
      fontFamily: T.mono, fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: T.sans, fontSize: 18 }}>
        <LogoMark />
        JobCracker
      </div>

      <div style={{ display: 'flex', gap: 28, color: T.inkDim, fontFamily: T.mono }}>
        {['Copilot','Mock Interview','Job Search','CV','LinkedIn'].map(l => (
          <a key={l} href={`#${l.toLowerCase().replace(' ','-')}`} style={{ color: T.inkDim, textDecoration: 'none' }}>{l}</a>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          border: `1px solid ${T.line2}`, padding: '8px 14px', borderRadius: 999,
          color: T.inkDim, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, boxShadow: `0 0 8px ${T.accent}`, display: 'inline-block', animation: 'jc-pulse 2s infinite' }} />
          v2.0 — Live
        </div>
        <BtnPrimary href="/auth/linkedin">Crack your interview →</BtnPrimary>
      </div>
    </nav>
  );
}

// ─── Terminal mockup ──────────────────────────────────────────────────────────

function WaveBar() {
  const delays = Array.from({ length: 26 }, (_, i) => i * 0.1);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 18, marginTop: 12 }}>
      {delays.map((d, i) => (
        <i key={i} style={{
          display: 'block', width: 2, background: T.accent, borderRadius: 1,
          animation: `jc-wave 1.2s ease-in-out ${d}s infinite`,
        }} />
      ))}
    </div>
  );
}

function Terminal() {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(180deg,#0b1310 0%,#060a09 100%)',
      border: `1px solid ${T.line2}`,
      borderRadius: 14,
      fontFamily: T.mono, fontSize: 13,
      overflow: 'hidden',
      boxShadow: `0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(0,255,136,.04),inset 0 1px 0 rgba(255,255,255,.04)`,
    }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderBottom: `1px solid ${T.line}`,
        background: 'rgba(255,255,255,.015)',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => (
            <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
          ))}
        </div>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: T.inkDim, letterSpacing: '0.05em' }}>
          jobcracker · live · zoom-call.001
        </span>
        <span style={{ fontSize: 11, color: T.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, animation: 'jc-pulse 1.5s infinite', boxShadow: `0 0 6px ${T.accent}`, display: 'inline-block' }} />
          REC 03:42
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 18px 16px', minHeight: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Row label="THEM" color={T.pink} labelBg="rgba(255,77,141,.12)" labelBorder="rgba(255,77,141,.3)">
          <span style={{ color: T.inkDim }}>
            "Tell me about a time you handled a conflict with a stakeholder who disagreed with your roadmap."
          </span>
        </Row>

        <Row label="JC" color={T.accent} labelBg={T.accentDim} labelBorder="rgba(0,255,136,.3)">
          Pulling from your <Hl>Stripe PM</Hl> story → STAR structure ↓
        </Row>

        {/* Suggested answer card */}
        <div style={{
          marginLeft: 52,
          background: 'rgba(0,255,136,.04)',
          border: `1px solid rgba(0,255,136,.25)`,
          borderRadius: 8, padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: T.accent, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>SUGGESTED ANSWER</span>
            <span style={{ color: T.inkDim, fontWeight: 400 }}>+0.42s · confidence 96%</span>
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              <><b style={{ color: T.accent, fontWeight: 500 }}>Situation:</b> Q3 2024, Eng Lead pushed back on deprecating legacy API</>,
              <><b style={{ color: T.accent, fontWeight: 500 }}>Task:</b> Align 12-person team without losing 6 months of velocity</>,
              <><b style={{ color: T.accent, fontWeight: 500 }}>Action:</b> Ran data review → showed 3.2% revenue at risk → proposed phased sunset</>,
              <><b style={{ color: T.accent, fontWeight: 500 }}>Result:</b> Shipped on time, <b style={{ color: T.accent }}>zero customer churn</b>, promoted Q1</>,
            ].map((li, i) => (
              <li key={i} style={{ color: T.ink, fontSize: 12.5, lineHeight: 1.5, paddingLeft: 18, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, color: T.accent }}>▸</span>
                {li}
              </li>
            ))}
          </ul>
        </div>

        <Row label="YOU" color={T.warn} labelBg="rgba(255,184,0,.15)" labelBorder="rgba(255,184,0,.3)">
          <span style={{ color: T.inkDim }}>[speaking — confidence rising]</span>
        </Row>

        {/* Footer */}
        <div style={{ marginTop: 'auto', borderTop: `1px solid ${T.line}`, paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: T.inkDim }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[['⌘','K','rephrase'],['⌘','L','shorter'],['⌘','↵','next']].map(([k1,k2,lbl]) => (
              <React.Fragment key={lbl}>
                <kbd style={{ fontFamily: T.mono, fontSize: 10, background: T.bg3, border: `1px solid ${T.line2}`, padding: '2px 6px', borderRadius: 4, color: T.inkDim }}>{k1}</kbd>
                <kbd style={{ fontFamily: T.mono, fontSize: 10, background: T.bg3, border: `1px solid ${T.line2}`, padding: '2px 6px', borderRadius: 4, color: T.inkDim }}>{k2}</kbd>
                <span style={{ color: T.inkFaint, margin: '0 4px' }}>{lbl}</span>
              </React.Fragment>
            ))}
          </div>
          <span style={{ color: T.accent }}>● undetectable</span>
        </div>
      </div>

      {/* Glow overlay */}
      <div style={{ position: 'absolute', inset: -1, borderRadius: 14, pointerEvents: 'none', background: 'linear-gradient(135deg,transparent 40%,rgba(0,255,136,.15),transparent 70%)', mixBlendMode: 'screen' }} />
    </div>
  );
}

function Row({ label, color, labelBg, labelBorder, children }: {
  label: string; color: string; labelBg: string; labelBorder: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{
        fontSize: 10, letterSpacing: '0.12em', padding: '3px 7px', borderRadius: 4,
        flexShrink: 0, marginTop: 2, fontWeight: 700, fontFamily: T.mono,
        color, background: labelBg, border: `1px solid ${labelBorder}`,
      }}>{label}</span>
      <span style={{ color: T.ink, lineHeight: 1.55, flex: 1, fontSize: 13 }}>{children}</span>
    </div>
  );
}

function Hl({ children }: { children: React.ReactNode }) {
  return <span style={{ background: 'rgba(0,255,136,.12)', color: T.accent, padding: '0 4px', borderRadius: 3 }}>{children}</span>;
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

const MARQUEE_ITEMS = [
  'Real-time answers','STAR-formatted','Tailored to your CV',
  'Works on Zoom · Meet · Teams','Undetectable overlay','96% answer confidence',
];

function Marquee() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div style={{
      borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`,
      overflow: 'hidden', position: 'relative', zIndex: 2,
      background: T.bg2, marginTop: 80,
    }}>
      <div style={{
        display: 'flex', gap: 56, padding: '18px 0', whiteSpace: 'nowrap',
        animation: 'jc-scroll 40s linear infinite',
        fontFamily: T.mono, fontSize: 13, color: T.inkDim,
      }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: T.accent }}>✱</span>{item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Feature bento ────────────────────────────────────────────────────────────

function MockCopilot() {
  return (
    <div style={{
      borderRadius: 10, border: `1px solid ${T.line}`,
      background: T.bg, padding: 16, fontFamily: T.mono, fontSize: 12,
      minHeight: 160, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: T.inkDim, marginBottom: 12, letterSpacing: '0.1em' }}>
        <span style={{ color: T.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, animation: 'jc-pulse 1.5s infinite', display: 'inline-block' }} />
          LIVE · 03:42
        </span>
        <span>ZOOM · MEET · TEAMS</span>
      </div>
      <div style={{ color: T.pink, marginBottom: 8, fontSize: 11.5 }}>
        "Why do you want to work at Anthropic specifically?"
      </div>
      <div style={{ color: T.ink, fontSize: 12, lineHeight: 1.5 }}>
        → Lead with your <Hl>RLHF side project</Hl>. Mention the <Hl>Claude 4 launch</Hl> as catalyst. Tie to <Hl>your alignment essay</Hl>.
      </div>
      <WaveBar />
    </div>
  );
}

function MockInterview() {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${T.line}`, background: T.bg, padding: 16, fontFamily: T.mono, fontSize: 12, minHeight: 160 }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: `linear-gradient(135deg,#2a3530,#0a0f0d)`,
        border: `1px solid ${T.line2}`,
        display: 'grid', placeItems: 'center',
        color: T.accent, fontFamily: T.mono, fontSize: 18,
        marginBottom: 12, position: 'relative',
      }}>
        ●
        <span style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1px solid ${T.accent}`, opacity: .3, animation: 'jc-ping 2s ease-out infinite' }} />
      </div>
      <div style={{ color: T.inkDim, fontSize: 11.5, marginBottom: 4 }}>Round 2 · Behavioral · 18 min</div>
      <div style={{ color: T.ink, fontSize: 12 }}>"Walk me through a time you said no to a senior leader."</div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11 }}>
        {[['8.4','Clarity'],['9.1','STAR'],['7.2','Signal']].map(([v,l]) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: T.accent, fontSize: 18, fontWeight: 700 }}>{v}</span>
            <span style={{ color: T.inkDim, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 10 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockJobs() {
  const jobs = [
    { letter: 'A', color: T.accent, bg: 'rgba(0,255,136,.15)', role: 'Staff PM, Platform', meta: 'Anthropic · SF · $310–380k', match: '95%', highlight: true },
    { letter: 'L', color: T.pink,   bg: 'rgba(255,77,141,.15)', role: 'Senior PM, AI Products', meta: 'Linear · Remote · $240–290k', match: '88%', highlight: false },
    { letter: 'F', color: T.warn,   bg: 'rgba(255,184,0,.15)',  role: 'Group PM, Growth', meta: 'Figma · NYC · $260–320k', match: '82%', highlight: false },
  ];
  return (
    <div style={{ fontFamily: T.mono, fontSize: 12 }}>
      {jobs.map(j => (
        <div key={j.role} style={{
          background: j.highlight ? 'rgba(0,255,136,.03)' : T.bg2,
          border: `1px solid ${j.highlight ? 'rgba(0,255,136,.35)' : T.line}`,
          borderRadius: 8, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 6, fontSize: 11.5,
        }}>
          <div style={{ width: 24, height: 24, borderRadius: 4, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0, background: j.bg, color: j.color }}>{j.letter}</div>
          <div style={{ flex: 1, color: T.ink }}>
            {j.role}
            <div style={{ color: T.inkDim, fontSize: 10, marginTop: 2 }}>{j.meta}</div>
          </div>
          <div style={{ fontFamily: T.mono, color: T.accent, fontWeight: 700, fontSize: 11 }}>{j.match}</div>
        </div>
      ))}
    </div>
  );
}

function MockCV() {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${T.line}`, background: T.bg, padding: '12px', fontFamily: T.mono, fontSize: 12, minHeight: 160 }}>
      <div style={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 6, padding: 12, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 10, right: 10, fontFamily: T.mono, fontSize: 9, color: T.accent, border: `1px solid ${T.accent}`, padding: '2px 5px', borderRadius: 3, letterSpacing: '0.1em' }}>v3 · 95% ATS</div>
        <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 2 }}>Alex Chen</div>
        <div style={{ fontSize: 10, color: T.inkDim, marginBottom: 10 }}>Tailored for: Anthropic · Staff PM</div>
        {[null,'short','hl',null,'short'].map((cls, i) => (
          <div key={i} style={{ height: 4, background: cls === 'hl' ? T.accent : T.line2, borderRadius: 2, marginBottom: 4, width: cls === 'short' ? '60%' : cls === 'hl' ? '40%' : '100%' }} />
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, fontFamily: T.mono, fontSize: 10, color: T.inkDim }}>
          {['Anthropic','Linear','Figma'].map((chip, i) => (
            <span key={chip} style={{ padding: '3px 7px', border: `1px solid ${i === 0 ? T.accent : T.line2}`, borderRadius: 999, color: i === 0 ? T.accent : T.inkDim, background: i === 0 ? T.accentDim : 'transparent' }}>{chip}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockLinkedIn() {
  const rows = [
    { name: 'Maya Singh', sub: 'Head of PM · Anthropic', stat: '↩ replied', statColor: T.warn, statBg: 'rgba(255,184,0,.1)', statBorder: 'rgba(255,184,0,.25)' },
    { name: 'Theo Park',  sub: 'VP Eng · Linear',        stat: '✓ sent',   statColor: T.accent, statBg: T.accentDim, statBorder: 'rgba(0,255,136,.25)' },
    { name: 'Priya Rao',  sub: 'Recruiter · Figma',      stat: '✓ sent',   statColor: T.accent, statBg: T.accentDim, statBorder: 'rgba(0,255,136,.25)' },
    { name: 'Jordan Lee', sub: 'CPO · Notion',            stat: '⧖ queue', statColor: T.inkDim, statBg: T.bg3, statBorder: T.line2 },
  ];
  return (
    <div style={{ fontFamily: T.mono, fontSize: 12 }}>
      {rows.map(r => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px dashed ${T.line}`, fontSize: 11.5 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg,#2a3530,#0a0f0d)`, border: `1px solid ${T.line2}`, flexShrink: 0 }} />
          <div style={{ flex: 1, color: T.ink }}>
            {r.name}
            <div style={{ color: T.inkDim, fontSize: 10 }}>{r.sub}</div>
          </div>
          <span style={{ fontFamily: T.mono, fontSize: 10, padding: '2px 6px', borderRadius: 4, color: r.statColor, background: r.statBg, border: `1px solid ${r.statBorder}` }}>{r.stat}</span>
        </div>
      ))}
    </div>
  );
}

interface FeatureDef {
  num: string; name: string; title: React.ReactNode; desc: string;
  span: 4 | 3 | 2; mock: React.ReactNode;
}

const FEATURES: FeatureDef[] = [
  {
    num: '01 / 05', name: '// INTERVIEW COPILOT',
    title: "Whispers the right answer. While they're still asking.",
    desc: 'Joins your call as a transparent overlay. Listens, transcribes, pulls from your context (CV, JD, company research), and surfaces a structured answer in under half a second.',
    span: 4, mock: <MockCopilot />,
  },
  {
    num: '02 / 05', name: '// MOCK INTERVIEW',
    title: 'Practice with an AI that asks like a hiring manager.',
    desc: 'Behavioural, technical, system design. Realistic follow-ups, scored on STAR coverage, clarity, signal density.',
    span: 2, mock: <MockInterview />,
  },
  {
    num: '03 / 05', name: '// SMART JOB SEARCH',
    title: 'Roles that actually fit. Surfaced before they trend.',
    desc: 'We index 1.2M openings a week, score them against your CV, filter for visa, comp band, remote, stage.',
    span: 3, mock: <MockJobs />,
  },
  {
    num: '04 / 05', name: '// CUSTOM CV',
    title: 'A bespoke CV per job. In one click.',
    desc: 'Reads the JD, re-orders bullets, swaps keywords, hits ATS, never lies. Export PDF, .docx, or copy-paste.',
    span: 3, mock: <MockCV />,
  },
  {
    num: '05 / 05', name: '// LINKEDIN AUTOPILOT',
    title: '200 warm intros a week. While you sleep.',
    desc: 'Finds hiring managers, drafts personalised notes from their last 5 posts, sends on a human cadence.',
    span: 4, mock: <MockLinkedIn />,
  },
];

function FeatureCard({ f, colSpan }: { f: FeatureDef; colSpan: number }) {
  const isBig = f.span === 4;
  return (
    <article style={{
      background: T.bg2, padding: '32px 28px 28px',
      display: 'flex', flexDirection: 'column',
      minHeight: 380, position: 'relative',
      gridColumn: `span ${colSpan}`,
    }}>
      <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkFaint, letterSpacing: '0.15em' }}>{f.num}</div>
      <div style={{ fontFamily: T.mono, fontSize: 12, color: T.accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8 }}>{f.name}</div>
      <h3 style={{
        fontSize: isBig ? 36 : 26, lineHeight: 1.05, letterSpacing: '-0.02em',
        fontWeight: 600, margin: '16px 0 12px', maxWidth: '18ch',
        fontFamily: T.sans, color: T.ink,
      }}>{f.title}</h3>
      <p style={{ fontSize: 14.5, lineHeight: 1.5, color: T.inkDim, maxWidth: '40ch', marginBottom: 24, fontFamily: T.sans }}>{f.desc}</p>
      <div style={{ marginTop: 'auto' }}>{f.mock}</div>
    </article>
  );
}

function FeaturesSection() {
  return (
    <section style={{ position: 'relative', zIndex: 2, padding: '120px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ fontFamily: T.mono, fontSize: 12, color: T.accent, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 24, height: 1, background: T.accent, display: 'inline-block' }} />
        FIVE TOOLS · ONE COPILOT
      </div>
      <h2 style={{ fontSize: 'clamp(36px,5.5vw,72px)', lineHeight: .95, letterSpacing: '-0.035em', fontWeight: 600, maxWidth: '18ch', marginBottom: 24, fontFamily: T.sans, color: T.ink }}>
        Every step from <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400, color: T.accent }}>cold apply</span> to signed offer.
      </h2>
      <p style={{ fontSize: 18, lineHeight: 1.5, color: T.inkDim, maxWidth: '60ch', fontFamily: T.sans }}>
        Most tools fix one piece. JobCracker is the operating system for your job hunt — context flows from your CV into your applications, into your prep, and into the interview itself.
      </p>

      {/* Bento grid — 6 columns */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6,1fr)',
        gap: 1, marginTop: 64,
        background: T.line, border: `1px solid ${T.line}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {FEATURES.map((f) => {
          // Row 1: [4-wide][2-wide] → Row 2: [3][3] → Row 3: [4][2]
          const colSpan = f.span;
          return <FeatureCard key={f.num} f={f} colSpan={colSpan} />;
        })}
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 1, background: T.line, border: `1px solid ${T.line}`,
        borderRadius: 16, marginTop: 64, overflow: 'hidden',
      }}>
        {[['3.2','x','More callbacks'],['96','%','Answer confidence'],['14','k','Offers cracked / mo'],['0.4','s','Time to first answer']].map(([v,s,l]) => (
          <div key={l} style={{ background: T.bg2, padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 56, lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 600, fontFamily: T.sans, color: T.ink }}>
              {v}<span style={{ fontFamily: T.serif, fontStyle: 'italic', color: T.accent }}>{s}</span>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.inkDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CTA section ──────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section style={{
      position: 'relative', zIndex: 2,
      margin: '0 40px 60px', maxWidth: 1400,
      marginLeft: 'auto', marginRight: 'auto',
      border: `1px solid ${T.line2}`, borderRadius: 20,
      padding: '80px 60px',
      background: `radial-gradient(circle 600px at 80% 50%,${T.accentDim},transparent 60%),${T.bg2}`,
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${T.line} 1px,transparent 1px),linear-gradient(90deg,${T.line} 1px,transparent 1px)`, backgroundSize: '32px 32px', opacity: .4, maskImage: 'radial-gradient(ellipse 60% 80% at 0% 50%,black 30%,transparent 80%)' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '60ch' }}>
        <div style={{ fontFamily: T.mono, fontSize: 12, color: T.accent, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 24, height: 1, background: T.accent, display: 'inline-block' }} />
          READY?
        </div>
        <h2 style={{ fontSize: 'clamp(40px,6vw,88px)', lineHeight: .95, letterSpacing: '-0.04em', fontWeight: 600, marginBottom: 20, fontFamily: T.sans, color: T.ink }}>
          Your next interview <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400, color: T.accent }}>starts in days.</span><br />Crack it.
        </h2>
        <p style={{ fontSize: 18, color: T.inkDim, marginBottom: 32, maxWidth: '50ch', lineHeight: 1.5, fontFamily: T.sans }}>
          Free trial. No credit card. Works on Zoom, Meet, Teams. Ships with mock interviews, smart job search, custom CV, and LinkedIn autopilot — all in one.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
          <BtnPrimary href="/auth/linkedin">Start cracking → free</BtnPrimary>
          <BtnGhost>Book a 15-min walkthrough</BtnGhost>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{
      position: 'relative', zIndex: 2,
      borderTop: `1px solid ${T.line}`,
      padding: '32px 40px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: T.mono, fontSize: 12, color: T.inkDim,
      flexWrap: 'wrap', gap: 16,
    }}>
      <div>© 2026 JobCracker · v2.0 · Built for the brave.</div>
      <div style={{ display: 'flex', gap: 24 }}>
        {['Privacy','Terms','Discord','Twitter','hello@jobcracker.app'].map(l => (
          <a key={l} href="#" style={{ color: T.inkDim, textDecoration: 'none' }}>{l}</a>
        ))}
      </div>
    </footer>
  );
}

// ─── Login Page (full landing) ─────────────────────────────────────────────────

interface LoginPageProps {
  linkedinError?: string | null;
  onClearLinkedinError?: () => void;
}

export function LoginPage({ linkedinError, onClearLinkedinError }: LoginPageProps) {
  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.sans, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden', minHeight: '100vh' }}>
      <InjectStyles />
      <GridBg />

      <Nav />

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 2, padding: '80px 40px 60px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Tag */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: T.mono, fontSize: 12, border: `1px solid ${T.line2}`, padding: '6px 12px', borderRadius: 999, color: T.inkDim, marginBottom: 28 }}>
          <span style={{ color: T.accent }}>●</span>
          INTERVIEW COPILOT
          <span style={{ color: T.inkFaint }}>/</span>
          REAL-TIME · UNDETECTABLE · YOUR CONTEXT
        </div>

        {linkedinError && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', marginBottom: 24, borderRadius: 12, background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.25)', maxWidth: 540 }}>
            <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
            <p style={{ color: '#fca5a5', fontSize: 14, flex: 1, lineHeight: 1.5 }}>{linkedinError}</p>
            <button onClick={onClearLinkedinError} style={{ color: '#f87171', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {/* Hero split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'end' }}>
          <div>
            <h1 style={{
              fontFamily: T.sans,
              fontSize: 'clamp(48px,9vw,120px)',
              lineHeight: .92, letterSpacing: '-0.045em',
              fontWeight: 600, maxWidth: '14ch',
              marginBottom: 28, color: T.ink,
            }}>
              <span style={{ textDecoration: 'line-through', textDecorationColor: T.inkFaint, textDecorationThickness: 4, color: T.inkFaint }}>Bomb</span>{' '}
              <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400, color: T.accent, letterSpacing: '-0.02em' }}>crack</span><br />
              any interview.
              <span style={{ color: T.accent }}> _</span>
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.5, color: T.inkDim, maxWidth: '56ch', marginBottom: 36, fontFamily: T.sans }}>
              JobCracker listens to your interview in real time and feeds you <strong style={{ color: T.ink, fontWeight: 500 }}>perfect answers</strong>, tailored to your CV, the role, and the company. Plus mock interviews, smart job search, custom CVs, and LinkedIn outreach on autopilot.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginBottom: 56 }}>
              <BtnPrimary href="/auth/linkedin">Start free → no card</BtnPrimary>
              <BtnGhost>▶ Watch 60s demo</BtnGhost>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.inkDim, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                <span style={{ color: T.accent }}>●</span>14,392 offers cracked this month
              </span>
            </div>
          </div>

          <Terminal />
        </div>
      </section>

      <Marquee />
      <FeaturesSection />
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
  const dropBg = uploadState === 'dragging'  ? 'rgba(0,255,136,.05)' :
                 uploadState === 'success'   ? 'rgba(52,211,153,.04)' :
                 uploadState === 'uploading' ? T.bg3 :
                 uploadState === 'error'     ? 'rgba(239,68,68,.04)' :
                 T.bg2;

  return (
    <div style={{ background: T.bg, color: T.ink, fontFamily: T.sans, WebkitFontSmoothing: 'antialiased', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <InjectStyles />
      <GridBg />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontFamily: T.sans, fontSize: 18, letterSpacing: '-0.02em' }}>
          <LogoMark size={28} />
          JobCracker
        </div>

        {/* Welcome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt={profile.name}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${T.accent}` }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `2px solid ${T.accent}`, background: 'rgba(0,255,136,.1)', color: T.accent, fontWeight: 700, fontSize: 16 }}>
              {initials}
            </div>
          )}
          <div>
            <p style={{ color: T.ink, fontWeight: 600 }}>Welcome, {profile.name.split(' ')[0]} 👋</p>
            <p style={{ color: T.inkDim, fontSize: 13 }}>Signed in with LinkedIn</p>
          </div>
        </div>

        {/* Card */}
        <div style={{ width: '100%', borderRadius: 20, padding: 32, border: `1px solid ${T.line2}`, background: T.bg2, boxShadow: `0 32px 80px rgba(0,0,0,.4)` }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 8, fontFamily: T.sans }}>One last step — upload your CV</h2>
            <p style={{ color: T.inkDim, fontSize: 14, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
              Your CV unlocks truly personalised AI assistance across every feature — from real-time interview coaching to smart job matching.
            </p>
          </div>

          {/* Benefits */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 28 }}>
            {CV_BENEFITS.map(({ icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${T.line2}`, background: T.bg3 }}>
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
              gap: 12, borderRadius: 16, border: `2px dashed ${dropBorder}`,
              padding: '40px 24px', cursor: uploadState === 'uploading' ? 'wait' : uploadState === 'success' ? 'default' : 'pointer',
              background: dropBg, transition: 'all .2s ease',
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={onFileChange} />

            {uploadState === 'uploading' && (
              <>
                <Loader2 size={32} style={{ color: T.accent, animation: 'spin 1s linear infinite' }} />
                <p style={{ color: T.ink, fontWeight: 500, fontSize: 14 }}>Parsing your CV…</p>
                <p style={{ color: T.inkDim, fontSize: 13 }}>Extracting skills, experience & education</p>
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
                <div style={{ width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', background: uploadState === 'dragging' ? 'rgba(0,255,136,.15)' : T.bg3, border: `1px solid ${uploadState === 'dragging' ? T.accent : T.line2}` }}>
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
          Your CV is used only to personalise AI responses within this app. We don't share or store it externally.
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
