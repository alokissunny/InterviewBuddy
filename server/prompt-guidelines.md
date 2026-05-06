# Interview Copilot — Prompt Guidelines

This file documents the coaching logic rules used in the Gemini `/api/interview-chunk` endpoint.
Edit this file when tuning prompt behaviour; then mirror the changes in `server/index.js`.

---

## Overview

Each 10-second audio chunk is sent to Gemini 2.5 Flash which returns:
- `transcript` — verbatim text of what was said
- `needsResponse` — whether the candidate needs to respond
- `type` — question category
- `keywords` — terms to weave into the answer
- `pointers` — 3–4 concrete action prompts
- `avoid` — one specific mistake to avoid

---

## Transcription Rules

| Rule | Detail |
|------|--------|
| Domain vocabulary | Use the candidate's actual skill names, company names, tech stack for accurate transcription |
| `needsResponse: true` | Any question, prompt, or imperative the candidate must reply to ("Tell me about yourself", "Walk me through…", "What would you do if…") |
| `needsResponse: false` | Silence, background noise, filler speech ("Okay", "Thanks", "Mm-hmm", "Sure") |

---

## Coaching Rules

### Rule 1 — Pointers (3–4, max 6 words each)

Pointers are **cheat-sheet cues** — short enough to read in one glance mid-interview, not full sentences.

#### CV-relevant questions (past work, skills, projects, achievements)
Reference a specific company/project/tech from the candidate's profile.

| ✓ Good (≤6 words) | ✗ Bad (too long / generic) |
|-------------------|---------------------------|
| "[Company X] — latency cut story" | "Lead with your experience at Company X where you reduced latency significantly" |
| "Led migration → owned the tradeoff" | "Talk about the migration you led and the tradeoffs involved" |
| "Conflict at [Company] — outcome first" | "Use the STAR method to describe a conflict" |

#### General questions (weakness, motivation, salary, culture fit, hypotheticals)
Give a sharp tactic for that question type — do **not** force-map to the CV.

| Question Type | ✓ Good pointer |
|---------------|---------------|
| Weakness | "Weakness → name it + what changed" |
| Motivation / Why here | "[Company mission] + growth you want" |
| Salary | "Market rate anchor, not current comp" |
| Hypothetical | "Framework first, then walk reasoning" |
| Culture fit | "Values → action you took, not belief" |
| Why leaving | "Forward only — what you're growing into" |

**Banned from pointers:** "Use STAR format", "Be specific", "Quantify impact", "Show enthusiasm", "Be authentic"

---

### Rule 2 — Keywords (5–7, question-specific answer triggers)

Keywords are the **exact words a strong answer to THIS question would contain** — not a repeat of the candidate's skills list.

Ask: *"What words would a hiring manager expect to hear in a great answer to this question?"*

| Question | ✓ Good keywords | ✗ Bad keywords (generic skills) |
|----------|----------------|--------------------------------|
| "Tell me about a conflict" | de-escalation, shared goal, direct conversation, outcome, learned | Python, React, leadership |
| "Why this company?" | [specific product/mission], growth trajectory, team fit, long-term | communication, teamwork |
| "Design a rate limiter" | token bucket, sliding window, Redis, distributed, failure mode | problem-solving, systems |
| "Biggest weakness?" | self-aware, concrete action, measurable progress, ongoing | adaptability, detail-oriented |

---

### Rule 3 — Avoid

One sharp, question-specific mistake.

| ✓ Good | ✗ Bad |
|--------|-------|
| "Don't pick a weakness that sounds like a strength" | "Don't be too vague" |
| "Don't start with context — lead with the decision" | "Be more specific" |
| "Don't anchor salary to current pay — negotiation goes downward" | "Don't ramble" |

---

## Model Config

| Setting | Value | Reason |
|---------|-------|--------|
| Model | `gemini-2.5-flash` | Audio-native, free tier available |
| `thinkingBudget` | `0` | Disables chain-of-thought to preserve output tokens for JSON |
| `maxOutputTokens` | `2048` | Enough for full JSON with 4 pointers |
| `temperature` | `0.1` | Low randomness for consistent JSON structure |
| Chunk size | `10 000 ms` | Long enough for full sentences + richer acoustic context |

---

## JSON Response Schema

```json
{
  "transcript": "verbatim transcription",
  "needsResponse": true,
  "type": "Behavioral | Technical | Situational | Background | Other",
  "keywords": ["term1", "term2", "...up to 8"],
  "pointers": ["pointer 1", "pointer 2", "pointer 3", "pointer 4"],
  "avoid": "one concrete mistake for this question type"
}
```

Coaching fires client-side when `needsResponse === true` OR when `keywords.length > 0 || pointers.length > 0` (safety fallback).
