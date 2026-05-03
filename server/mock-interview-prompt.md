# Mock Interview Prompts

## 1. Question Generation (`POST /api/mock-interview/questions`)

**Model:** `claude-haiku-4-5-20251001`  
**Max tokens:** 1800

### Context built server-side before the prompt

| Field | Source | Notes |
|---|---|---|
| `years` | Parsed from `profile.experience[].duration` | Handles `YYYY–YYYY`, `YYYY–Present`, `X years`, `X months`; falls back to 1.5 yrs/role |
| `seniority` | Derived from `years` | Entry / Mid / Senior / Staff / Principal, with calibration instructions |
| `workHistory` | All `experience[]` entries | role, company, duration + up to 3 highlights per role |
| `projects` | All `projects[]` | name, description, technologies |
| `jobDescription` | `job.description` | Up to 900 chars — more than old 400-char truncation |

### Prompt

```
You are a senior interview coach preparing a real interview. Generate {count} incisive,
role-specific questions that will genuinely assess this candidate's fit.

━━ ROLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: {job.title}
Company: {job.company}
Type: {job.jobType}
Required skills: {job.tags}

Job Description:
{job.description[0:900]}

━━ CANDIDATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: {profile.name}
Current title: {profile.title}
Seniority: {seniority}   ← e.g. "Senior (~8 yrs) — focus on architecture decisions, trade-offs..."
Skills: {profile.skills}
Summary: {profile.summary}

Work history:
  {role} at {company} ({duration})
    • {highlight}
    • ...

Projects:
  {name}: {description} [{technologies}]

Achievements:
  • ...

Education:
  {degree} — {institution} ({year})

━━ INSTRUCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━
1. ANALYSE the job description for the 3-5 most critical requirements.
2. CROSS-REFERENCE against the candidate's experience:
   - Gaps: JD requires it, candidate hasn't demonstrated it
   - Depth checks: they claim it, needs validation
   - Strengths: strong match, confirm with a concrete example
3. CALIBRATE difficulty to their seniority level.
4. DISTRIBUTE question types by role:
   - Technical/Engineering → 3 Technical, 1 Behavioral, 1 Situational
   - Management/Leadership → 2 Behavioral, 1 Situational, 1 Leadership, 1 Technical
   - Mixed/Other → 2 Behavioral, 2 Technical, 1 Motivation or Fit
5. MAKE QUESTIONS SPECIFIC — reference their actual companies, projects, or technologies.
6. HINT should tell the candidate what a strong answer looks like, referencing the JD or CV.

Return ONLY valid JSON, no markdown fences:
{
  "questions": [
    {
      "id": "q1",
      "type": "Technical",        // Behavioral | Technical | Situational | Motivation/Fit | Leadership
      "question": "...",
      "hint": "...",
      "focus": "gap"              // gap | validation | strength
    }
  ]
}
```

### Response also includes

```json
{
  "questions": [...],
  "meta": {
    "years": 7,
    "seniority": "Senior (~7 yrs) — focus on architecture decisions, trade-offs, mentoring, system design"
  }
}
```

---

## 2. Answer Feedback (`POST /api/mock-interview/feedback`)

**Model:** `claude-haiku-4-5-20251001`  
**Max tokens:** 500  
**Delivery:** Server-Sent Events (streaming)  
**Request body:** `{ job, question, answer, profile }` — profile is now required for seniority calibration

### Prompt

```
You are a senior interview coach giving real-time feedback. Be direct and actionable — no fluff.

CONTEXT:
Role: {job.title} at {job.company}
Candidate seniority: {seniority}
Key skills the role requires: {job.tags}
This question probes a: SKILL GAP | CLAIMED SKILL | DEMONSTRATED STRENGTH
  (from question.focus field — adjusts how critical the feedback should be)

QUESTION ({question.type}): "{question.question}"

CANDIDATE'S ANSWER: "{answer[0:1500]}"

Respond in this EXACT format (keep each bullet under 20 words):

## Score
[X]/10 — [one sharp phrase summarising the answer quality]

## Strengths
- [what they did well — be specific, quote their words if strong]
- [second strength if warranted]

## Improve
- [biggest gap — what a {seniority-level} interviewer would flag]
- [second point if needed]

## Ideal answer would include
[4-6 comma-separated concepts, keywords, or frameworks they should have mentioned]
```

---

## Notes

- `estimateYearsOfExperience(experience[])` parses duration strings server-side; fallback is 1.5 yrs/role.
- `getSeniorityLevel(years)` returns a string used verbatim in both prompts for consistent calibration.
- The `focus` field (`gap | validation | strength`) is generated in the questions prompt and forwarded to the feedback prompt so the coach knows how critically to evaluate the answer.
- Answer is capped at 1500 chars (was 1200) before being sent to the model.
- The client streams SSE chunks: `data: {"text": "..."}` until `data: {"done": true}`.
- Score is extracted client-side with `/##\s*Score\s*\n\s*(\d+)\s*\/\s*10/i`.
