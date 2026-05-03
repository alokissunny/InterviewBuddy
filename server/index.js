require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { toFile } = require('openai');
const pdfParse = require('pdf-parse');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const TAILOR_PROMPT_PATH = path.join(__dirname, 'tailor-prompt.md');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Client-provided key takes priority over server env key (allows override from UI).
// Auto-detects Groq keys by gsk_ prefix and routes to Groq's endpoint.
function getOpenAIClient(req) {
  const key = req?.headers?.['x-whisper-key'] || process.env.OPENAI_API_KEY;
  if (!key) return null;
  const isGroq = key.startsWith('gsk_');
  const baseURL = isGroq ? 'https://api.groq.com/openai/v1' : undefined;
  const model = isGroq ? 'whisper-large-v3-turbo' : 'whisper-1';
  return { client: new OpenAI({ apiKey: key, ...(baseURL ? { baseURL } : {}) }), model };
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── LinkedIn OAuth ───────────────────────────────────────────────────────────
const oauthStates = new Map();

app.get('/auth/linkedin', (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('LinkedIn OAuth not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to server/.env');
  }
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  oauthStates.set(state, Date.now());
  // Prune states older than 10 min
  for (const [s, ts] of oauthStates) if (Date.now() - ts > 600_000) oauthStates.delete(s);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/auth/linkedin/callback',
    scope: 'openid profile email',
    state,
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    return res.redirect(`${frontendUrl}?linkedin_error=${encodeURIComponent(error_description || error)}`);
  }
  if (!oauthStates.has(state)) {
    return res.redirect(`${frontendUrl}?linkedin_error=${encodeURIComponent('Invalid or expired OAuth state. Please try again.')}`);
  }
  oauthStates.delete(state);

  try {
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/auth/linkedin/callback';

    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(tokenData.error_description || 'Failed to get access token');
    const accessToken = tokenData.access_token;

    // Fetch name/email/photo via OpenID Connect userinfo endpoint
    // Note: /v2/me requires r_liteprofile scope (not available with openid/profile/email scopes),
    // so vanityName cannot be fetched here — user provides LinkedIn URL in the UI for Apify enrichment
    const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userinfo = await userinfoRes.json();

    const name = userinfo.name || `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim();

    console.log('[LinkedIn OAuth] userinfo keys:', Object.keys(userinfo).join(', '));
    console.log('[LinkedIn OAuth] name:', name, '| email:', userinfo.email, '| picture:', userinfo.picture ? 'yes' : 'no');

    const profile = {
      name,
      title: '',
      email: userinfo.email || '',
      phone: '',
      summary: '',
      photoUrl: userinfo.picture || '',
      profileUrl: '',
      skills: [],
      experience: [],
      education: [],
      projects: [],
      achievements: [],
    };

    const encoded = Buffer.from(JSON.stringify(profile)).toString('base64');
    res.redirect(`${frontendUrl}?lp=${encoded}`);
  } catch (err) {
    console.error('LinkedIn OAuth error:', err.message);
    res.redirect(`${frontendUrl}?linkedin_error=${encodeURIComponent(err.message)}`);
  }
});

// ─── CV Upload ───────────────────────────────────────────────────────────────
app.post('/api/cv/upload', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let cvText = '';
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      cvText = data.text;
    } else {
      cvText = req.file.buffer.toString('utf-8');
    }

    if (!cvText.trim()) return res.status(400).json({ error: 'Could not extract text from file' });

    // Truncate to ~6000 chars to avoid hitting token limits on the response side
    const truncatedCV = cvText.length > 6000 ? cvText.slice(0, 6000) + '\n...[truncated]' : cvText;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Extract structured information from this CV/resume. Return ONLY a valid JSON object with these exact fields:
{
  "name": "Full Name",
  "title": "Current or Target Role",
  "email": "email if present",
  "phone": "phone if present",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2"],
  "experience": [{"company": "", "role": "", "duration": "", "highlights": ["keep to 1-2 highlights max"]}],
  "education": [{"institution": "", "degree": "", "year": ""}],
  "projects": [{"name": "", "description": "one sentence max", "technologies": [""]}],
  "achievements": ["achievement1"]
}

Keep all string values concise. Limit experience to 5 most recent roles, projects to 4 most relevant.

CV Text:
${truncatedCV}

Return ONLY valid JSON, no markdown, no explanation.`
      }]
    });

    let profileText = response.content[0].text.trim();
    // Strip markdown code fences if present
    if (profileText.startsWith('```')) {
      profileText = profileText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    }
    // If response was cut off mid-JSON, attempt to close it
    if (!profileText.endsWith('}')) {
      // Remove trailing incomplete property and close the JSON
      profileText = profileText.replace(/,?\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, '') + '}';
    }

    const profile = JSON.parse(profileText);
    res.json({ profile, rawText: cvText });
  } catch (error) {
    console.error('CV upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process CV' });
  }
});

// ─── Whisper status ──────────────────────────────────────────────────────────
// Returns whether the server has a built-in key (client doesn't need to provide one)
app.get('/api/transcribe/status', (req, res) => {
  res.json({ serverKeyAvailable: !!process.env.OPENAI_API_KEY });
});

// ─── Audio Transcription (Whisper) ───────────────────────────────────────────
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  const result = getOpenAIClient(req);
  if (!result) {
    return res.status(401).json({
      error: 'No Whisper API key. Enter an OpenAI or Groq key in the app settings.'
    });
  }
  if (!req.file) return res.status(400).json({ error: 'No audio file received' });

  const { client: openai, model } = result;

  try {
    const audioFile = await toFile(
      req.file.buffer,
      req.file.originalname || 'audio.webm',
      { type: req.file.mimetype || 'audio/webm' }
    );

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model,
      language: 'en',
      response_format: 'json',
    });

    const text = transcription.text?.trim() || '';
    if (text) console.log('[Whisper]', `"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`);
    res.json({ transcript: text });
  } catch (error) {
    const status = error?.status || error?.response?.status || 500;
    const message = error?.message || 'Transcription failed';
    console.error(`Transcription error [${status}]:`, message);

    // Give actionable messages for common failures
    if (status === 401) return res.status(401).json({ error: 'Invalid API key. Check your Whisper key in settings.' });
    if (status === 429) return res.status(429).json({ error: 'API quota exceeded. Check your billing on OpenAI/Groq.' });
    if (status === 413) return res.status(413).json({ error: 'Audio chunk too large. Try a shorter recording.' });
    res.status(status).json({ error: message });
  }
});

// ─── Claude Analysis (streaming) ─────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { transcript, profile, conversationHistory = [] } = req.body;
  if (!transcript || !profile) {
    return res.status(400).json({ error: 'Missing transcript or profile' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const systemPrompt = `You are a discreet interview copilot for ${profile.name || 'the candidate'}.

CANDIDATE PROFILE:
Name: ${profile.name} | Role: ${profile.title}
Skills: ${(profile.skills || []).join(', ')}
Experience: ${(profile.experience || []).map(e => `${e.role} at ${e.company} (${e.duration}): ${(e.highlights || []).join('; ')}`).join(' | ')}
Projects: ${(profile.projects || []).map(p => `${p.name}: ${p.description}`).join(' | ')}
Achievements: ${(profile.achievements || []).join('; ')}

YOUR TASK:
Identify the interview question and give the candidate ONLY brief glanceable pointers — keywords and short phrases they can use to steer the conversation. No full sentences, no long answers.

Respond in this exact format (keep everything very short):

## Type
[Behavioral / Technical / Situational / Background / Other] — [3-word intent]

## Keywords
[6-10 comma-separated keywords or short phrases from the candidate's background most relevant to this question]

## Pointers
- [short phrase — max 8 words]
- [short phrase — max 8 words]
- [short phrase — max 8 words]
- [short phrase — max 8 words]

## Avoid
[1 short phrase — common mistake to avoid for this question type]`;


  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        ...conversationHistory.slice(-6),
        { role: 'user', content: `Interview transcript segment:\n"${transcript}"\n\nAnalyze and provide a structured response guide.` }
      ]
    });

    stream.on('text', (text) => res.write(`data: ${JSON.stringify({ text })}\n\n`));
    stream.on('finalMessage', (msg) => {
      res.write(`data: ${JSON.stringify({ done: true, inputTokens: msg.usage?.input_tokens, outputTokens: msg.usage?.output_tokens })}\n\n`);
      res.end();
    });
    stream.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ─── Job Aggregator ───────────────────────────────────────────────────────────
const { aggregateJobs, ALL_SOURCES } = require('./jobs/aggregator');

app.get('/api/jobs/status', (_req, res) => {
  res.json({ serverKeyAvailable: true, sources: ALL_SOURCES });
});

app.post('/api/jobs/search', async (req, res) => {
  const { keywords, location, jobType, experienceLevel, datePosted, page = 0 } = req.body;
  if (!keywords) return res.status(400).json({ error: 'keywords is required.' });

  try {
    const { jobs, sourceStats, hasMore } = await aggregateJobs(
      { keywords, location, jobType, experienceLevel, datePosted, page },
      ALL_SOURCES
    );
    console.log(`[Jobs] returning ${jobs.length} jobs (page=${page}) for "${keywords}" | hasMore=${hasMore}`);
    res.json({ jobs, sourceStats, total: jobs.length, hasMore });
  } catch (err) {
    console.error('Jobs search error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch jobs' });
  }
});

// ─── LinkedIn Profile Enrichment (Apify) ─────────────────────────────────────

// dev_fusion/linkedin-profile-scraper field reference:
//   experience items: jobTitle, companyName, jobStartedOn, jobStillWorking, currentJobDuration
//   skills: unknown — logged on first run so we can confirm
//   education: unknown — logged on first run so we can confirm

function formatApifyDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (typeof d === 'object') {
    const m = d.month ? String(d.month).padStart(2, '0') : '';
    const y = d.year || '';
    return m && y ? `${y}-${m}` : String(y);
  }
  return String(d);
}

async function enrichProfileWithApify(profileUrl) {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken || !profileUrl) {
    console.log('[Apify] Skipping — missing token or profileUrl');
    return null;
  }

  const actorId = 'dev_fusion~linkedin-profile-scraper';
  const apiUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiToken}&timeout=120`;

  console.log('\n[Apify] ═══════════════════════════════════════════');
  console.log('[Apify] Actor  :', actorId);
  console.log('[Apify] Profile:', profileUrl);
  console.log('[Apify] URL    :', apiUrl);

  const runRes = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileUrls: [profileUrl] }),
  });

  console.log('[Apify] HTTP status:', runRes.status, runRes.statusText);

  if (!runRes.ok) {
    const errText = await runRes.text().catch(() => '');
    console.error('[Apify] Error body:', errText.slice(0, 600));
    throw new Error(`Apify ${runRes.status}: ${errText.slice(0, 200)}`);
  }

  const items = await runRes.json();
  console.log('[Apify] Items received:', Array.isArray(items) ? items.length : typeof items);

  const raw = Array.isArray(items) ? items[0] : items;
  if (!raw) {
    console.log('[Apify] No items in response — profile may be private or actor returned empty dataset');
    return null;
  }

  console.log('[Apify] Top-level keys:', Object.keys(raw).join(', '));
  console.log('[Apify] Full raw response:\n', JSON.stringify(raw, null, 2));
  console.log('[Apify] ═══════════════════════════════════════════\n');

  // ── Skills ──
  // dev_fusion returns skills as array of strings or {name} objects; handle both
  const rawSkills = raw.skills || raw.topSkills || [];
  const skills = rawSkills
    .map(s => (typeof s === 'string' ? s : s.name || s.title || ''))
    .filter(Boolean);
  console.log(`[Apify] Skills (${skills.length}):`, skills.slice(0, 6).join(', '));

  // ── Experience ──
  // dev_fusion: jobTitle, companyName, jobStartedOn, jobStillWorking, currentJobDuration
  const rawExp = raw.experience || raw.experiences || raw.positions || raw.jobs || [];
  const experience = rawExp.map(e => {
    const role    = e.jobTitle    || e.title    || e.role    || '';
    const company = e.companyName || e.company  || e.organization || '';
    const start   = formatApifyDate(e.jobStartedOn  || e.startDate || e.start);
    const end     = e.jobStillWorking ? 'Present' : formatApifyDate(e.jobEndedOn || e.endDate || e.end) || 'Present';
    const duration = e.currentJobDuration || e.dateRange || (start ? `${start} – ${end}` : '');
    const descRaw  = e.description || e.jobDescription || '';
    const highlights = descRaw
      ? descRaw.split(/\n|•|·/).map(s => s.trim()).filter(s => s.length > 15).slice(0, 3)
      : [];
    return { company, role, duration, highlights };
  }).filter(e => e.company || e.role);
  console.log(`[Apify] Experience (${experience.length}):`, experience.map(e => `${e.role} @ ${e.company}`).join(' | '));

  // ── Education ──
  // dev_fusion: schoolName (or degreeName), fieldOfStudy, startedOn, endedOn
  const rawEdu = raw.education || raw.educations || [];
  const education = rawEdu.map(e => {
    const institution = e.schoolName || e.school || e.institutionName || '';
    const degreeParts = [e.degreeName || e.degree, e.fieldOfStudy].filter(Boolean);
    const degree = degreeParts.join(', ') || '';
    const year   = formatApifyDate(e.endedOn || e.endDate || e.end) || formatApifyDate(e.startedOn || e.startDate || e.start) || '';
    return { institution, degree, year };
  }).filter(e => e.institution);
  console.log(`[Apify] Education (${education.length}):`, education.map(e => `${e.degree} @ ${e.institution}`).join(' | '));

  // ── Projects ──
  const rawProj = raw.projects || raw.publications || [];
  const projects = rawProj.map(p => ({
    name: p.title || p.name || '',
    description: (p.description || '').slice(0, 120),
    technologies: p.technologies || [],
  })).filter(p => p.name);

  // ── Achievements ──
  const rawAch = [...(raw.honors || raw.honorsAndAwards || []), ...(raw.certifications || [])];
  const achievements = rawAch
    .map(a => a.title || a.name || (typeof a === 'string' ? a : ''))
    .filter(Boolean)
    .slice(0, 6);

  // ── Summary / Photo ──
  const summary  = raw.summary || raw.about || raw.description || '';
  const photoUrl = raw.profilePicture || raw.profilePictureUrl || raw.imgUrl || raw.photo || '';

  const result = { skills, experience, education, projects, achievements, summary, photoUrl };
  console.log('[Apify] Mapped result — skills:', skills.length, '| exp:', experience.length, '| edu:', education.length);

  return result;
}

app.post('/api/profile/enrich', async (req, res) => {
  const { profileUrl } = req.body;
  console.log('[Apify] /api/profile/enrich called with profileUrl:', profileUrl);

  if (!profileUrl) return res.status(400).json({ error: 'profileUrl is required' });
  if (!process.env.APIFY_API_TOKEN) return res.status(503).json({ error: 'Apify token not configured' });

  try {
    const enriched = await enrichProfileWithApify(profileUrl);
    if (!enriched) return res.status(404).json({ error: 'No profile data returned — profile may be private or not found' });
    console.log('[Apify] Sending enriched profile to client');
    res.json({ enriched });
  } catch (err) {
    console.error('[Apify] Enrichment error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to enrich profile' });
  }
});

// ─── CV Tailor ───────────────────────────────────────────────────────────────
function buildResumeHTML(profile, job) {
  const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const expHTML = (profile.experience || []).map(e => `
    <div class="entry">
      <div class="entry-header">
        <div><div class="entry-title">${esc(e.role)}</div><div class="entry-subtitle">${esc(e.company)}</div></div>
        <div class="entry-date">${esc(e.duration)}</div>
      </div>
      <ul class="bullets">${(e.highlights||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ul>
    </div>`).join('');

  const projHTML = (profile.projects || []).slice(0,3).map(p => `
    <div class="entry">
      <div class="entry-title">${esc(p.name)} <span class="tech">${esc((p.technologies||[]).join(', '))}</span></div>
      <div class="entry-desc">${esc(p.description)}</div>
    </div>`).join('');

  const eduHTML = (profile.education || []).map(e => `
    <div class="entry">
      <div class="entry-header">
        <div><div class="entry-title">${esc(e.degree)}</div><div class="entry-subtitle">${esc(e.institution)}</div></div>
        <div class="entry-date">${esc(e.year)}</div>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(profile.name)} — Resume</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#e2e8f0;font-size:13px}
.bar{background:#1e293b;color:#cbd5e1;text-align:center;padding:10px 16px;font-size:12px;display:flex;align-items:center;justify-content:center;gap:12px}
.bar strong{color:#fff}.bar button{background:#3b82f6;color:#fff;border:none;padding:6px 18px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}
.bar button:hover{background:#2563eb}
.page{background:#fff;max-width:820px;margin:20px auto;padding:44px 52px;box-shadow:0 4px 24px rgba(0,0,0,.1)}
h1{font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-.5px}
.tagline{color:#3b82f6;font-size:14px;font-weight:600;margin-top:4px}
.contact{color:#64748b;font-size:12px;margin-top:6px}
.contact span{margin-right:16px}
hr{border:none;border-top:1.5px solid #e2e8f0;margin:18px 0}
h2{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#3b82f6;margin-bottom:10px}
.summary{color:#374151;line-height:1.65}
.skills-wrap{display:flex;flex-wrap:wrap;gap:6px}
.skill{background:#f1f5f9;color:#334155;padding:3px 11px;border-radius:99px;font-size:12px}
.entry{margin-bottom:14px}
.entry-header{display:flex;justify-content:space-between;align-items:flex-start}
.entry-title{font-weight:600;color:#1e293b;font-size:13px}
.entry-subtitle{color:#64748b;font-size:12px;margin-top:2px}
.entry-date{color:#94a3b8;font-size:11px;white-space:nowrap;margin-left:10px;padding-top:2px}
.bullets{list-style:disc;padding-left:18px;margin-top:5px}
.bullets li{color:#374151;line-height:1.55;margin-bottom:3px}
.tech{color:#6366f1;font-size:11px;font-weight:500;margin-left:6px}
.entry-desc{color:#64748b;font-size:12px;margin-top:3px}
.ach-list{list-style:disc;padding-left:18px}
.ach-list li{color:#374151;line-height:1.55;margin-bottom:3px}
@media print{@page{margin:0;size:A4}body{background:#fff}.bar{display:none}.page{margin:0;padding:1.5cm 2cm;box-shadow:none;max-width:100%}}
</style>
</head>
<body>
<div class="bar">
  Tailored for <strong>${esc(job.title)}</strong>
  <button onclick="window.print()">⬇ Save as PDF</button>
</div>
<div class="page">
  <h1>${esc(profile.name)}</h1>
  <div class="tagline">${esc(profile.title)}</div>
  <div class="contact">
    ${profile.email ? `<span>✉ ${esc(profile.email)}</span>` : ''}
    ${profile.phone ? `<span>✆ ${esc(profile.phone)}</span>` : ''}
  </div>
  <hr/>
  <h2>Summary</h2>
  <p class="summary">${esc(profile.summary)}</p>
  <hr/>
  <h2>Skills</h2>
  <div class="skills-wrap">${(profile.skills||[]).map(s=>`<span class="skill">${esc(s)}</span>`).join('')}</div>
  ${expHTML ? `<hr/><h2>Experience</h2>${expHTML}` : ''}
  ${projHTML ? `<hr/><h2>Projects</h2>${projHTML}` : ''}
  ${eduHTML  ? `<hr/><h2>Education</h2>${eduHTML}` : ''}
  ${(profile.achievements||[]).length ? `<hr/><h2>Achievements</h2><ul class="ach-list">${(profile.achievements).map(a=>`<li>${esc(a)}</li>`).join('')}</ul>` : ''}
</div>
</body>
</html>`;
}

app.post('/api/cv/tailor', async (req, res) => {
  const { profile, job } = req.body;
  if (!profile || !job) return res.status(400).json({ error: 'profile and job are required' });

  // Best-effort: scrape job description from LinkedIn if missing
  let description = job.description || '';
  if (!description && job.applyUrl && job.applyUrl.includes('linkedin.com')) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 5000);
      const r = await fetch(job.applyUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      });
      clearTimeout(tid);
      if (r.ok) {
        const $ = cheerio.load(await r.text());
        description = ($('.show-more-less-html__markup').text() || $('.description__text').text()).trim().slice(0, 3000);
      }
    } catch { /* ignore timeout / block */ }
  }

  try {
    const promptTemplate = fs.readFileSync(TAILOR_PROMPT_PATH, 'utf-8');
    const promptContent = promptTemplate
      .replace('{{job.title}}', job.title || '')
      .replace('{{description}}', description ? `Description:\n${description}` : '')
      .replace('{{profile}}', JSON.stringify(profile, null, 2));

    console.log('\n─── Tailor Prompt ───────────────────────────────────────\n');
    console.log(promptContent);
    console.log('─────────────────────────────────────────────────────────\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: promptContent }],
    });

    let text = response.content[0].text.trim();
    if (text.startsWith('```')) text = text.replace(/^```json?\n?/,'').replace(/\n?```$/,'').trim();
    const tailored = JSON.parse(text);
    res.json({ html: buildResumeHTML(tailored, job) });
  } catch (err) {
    console.error('Tailor error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to tailor resume' });
  }
});

// ─── Connection Message Generator ────────────────────────────────────────────
app.post('/api/connections/message', async (req, res) => {
  const { connection, userProfile, messageType } = req.body;
  if (!connection || !userProfile) return res.status(400).json({ error: 'connection and userProfile are required' });

  const typeInstructions = {
    networking:  'A warm networking outreach. The sender wants to connect, learn about the recipient\'s work, and build a professional relationship. No ask for a job.',
    job_seeker:  'A professional job-seeker outreach. The sender is exploring opportunities and hopes to learn about openings or the company culture at the recipient\'s organisation.',
    referral:    'A polite referral or introduction request. The sender admires the recipient\'s company and would appreciate any insights, introductions, or a referral to the right team.',
  };

  const instruction = typeInstructions[messageType] || typeInstructions.networking;
  const recipientDesc = [connection.position, connection.company].filter(Boolean).join(' at ');
  const senderSkills = (userProfile.skills || []).slice(0, 6).join(', ');

  const prompt = `Write a short, genuine LinkedIn DM.

Sender: ${userProfile.name} — ${userProfile.title}
${senderSkills ? `Key skills: ${senderSkills}` : ''}
${userProfile.summary ? `Summary: ${userProfile.summary}` : ''}

Recipient: ${connection.firstName} ${connection.lastName}${recipientDesc ? ` — ${recipientDesc}` : ''}

Goal: ${instruction}

Rules:
- Start with "Hi ${connection.firstName},"
- Max 3 short sentences — conversational, not salesy
- Be specific to the recipient's role/company where possible
- End with one soft, clear call to action
- Return ONLY the message text, no subject line, no quotes`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const message = response.content[0].text.trim();
    res.json({ message });
  } catch (err) {
    console.error('Message gen error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate message' });
  }
});

// ─── LinkedIn Recruiters Search ───────────────────────────────────────────────
const RECRUITER_PAGE_SIZE = 10;

function extractProfilePhoto(picture) {
  if (!picture) return '';
  const rootUrl = picture.rootUrl || '';
  const artifacts = picture.artifacts || [];
  if (!artifacts.length) return '';
  const artifact = artifacts[Math.min(1, artifacts.length - 1)];
  return rootUrl + (artifact.fileIdentifyingUrlPathSegment || '');
}

async function searchLinkedInRecruiters({ keywords, location, start, liAt }) {
  // Step 1: Hit LinkedIn to get a JSESSIONID / csrf token bound to our session
  let jsessionid = null;
  try {
    const homeResp = await fetch('https://www.linkedin.com/', {
      headers: {
        Cookie: `li_at=${liAt}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    const rawCookies = homeResp.headers.get('set-cookie') || '';
    const jsMatch = rawCookies.match(/JSESSIONID="?([^";,\s]+)"?/);
    if (jsMatch) jsessionid = jsMatch[1];
    console.log('[Recruiters] JSESSIONID:', jsessionid ? jsessionid.slice(0, 20) + '…' : 'not found');
  } catch (e) {
    console.warn('[Recruiters] Could not fetch JSESSIONID:', e.message);
  }

  const cookieHeader = jsessionid
    ? `li_at=${liAt}; JSESSIONID="${jsessionid}"`
    : `li_at=${liAt}`;
  const csrfToken = jsessionid || 'ajax:0';

  // Step 2: Call Voyager dash/clusters (newer endpoint) with 1st/2nd connection filter.
  // Build URL manually — URLSearchParams would encode LinkedIn's RestLi filter syntax
  // (parentheses, colons, commas) and produce a 404.
  const kw = (keywords || 'recruiter').replace(/[(),:]/g, ' ').trim();
  const query = `(keywords:${kw},flagshipSearchIntent:SEARCH_SRP,queryParameters:(network:List(F,S),resultType:List(PEOPLE)),includeFiltersInResponse:false)`;
  const apiUrl = `https://www.linkedin.com/voyager/api/search/dash/clusters`
    + `?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-175`
    + `&count=${RECRUITER_PAGE_SIZE}`
    + `&q=all`
    + `&query=${query}`
    + `&start=${start || 0}`;

  console.log('[Recruiters] GET', apiUrl);

  const apiResp = await fetch(apiUrl, {
    headers: {
      Cookie: cookieHeader,
      'Csrf-Token': csrfToken,
      'X-Li-Lang': 'en_US',
      'X-Restli-Protocol-Version': '2.0.0',
      Accept: 'application/vnd.linkedin.normalized+json+2.1',
      'X-Li-Track': JSON.stringify({
        clientVersion: '1.13.10654', mpVersion: '1.13.10654',
        osName: 'web', timezoneOffset: 0, deviceFormFactor: 'DESKTOP', mpName: 'voyager-web',
      }),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://www.linkedin.com/search/results/people/',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!apiResp.ok) {
    const errText = await apiResp.text().catch(() => '');
    throw new Error(`LinkedIn API ${apiResp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await apiResp.json();

  // Dash normalized JSON: cluster['*elements'] contains URN strings that point to
  // SearchClusterHit objects in `included` — NOT inline objects. Build a URN lookup first.
  const includedMap = new Map();
  for (const item of (data.included || [])) {
    if (item.entityUrn) includedMap.set(item.entityUrn, item);
  }

  console.log('[Recruiters] included:', includedMap.size, '| clusters:', (data.data?.elements || []).length);

  const recruiters = [];
  const clusters = data.data?.elements || data.elements || [];

  for (const cluster of clusters) {
    // '*elements' holds the URN refs; fall back to inline 'elements' if present
    const hitRefs = cluster['*elements'] || cluster.elements || [];

    for (const ref of hitRefs) {
      // ref is either a URN string (dash format) or an inline object (old blended format)
      const hit = typeof ref === 'string' ? includedMap.get(ref) : ref;
      if (!hit) continue;

      const name = hit.title?.text || '';
      if (!name) continue;

      const distValue = hit.memberDistance?.value || hit.distanceFromViewer?.value || '';
      const badgeText = hit.badgeText?.text || '';
      const degree =
        distValue === 'DISTANCE_1' || badgeText === '1st' ? '1st' :
        distValue === 'DISTANCE_2' || badgeText === '2nd' ? '2nd' : '3rd+';

      const navUrl = hit.navigationUrl || '';
      const pubIdMatch = navUrl.match(/\/in\/([^/?#]+)/);
      const profileUrl = pubIdMatch ? `https://www.linkedin.com/in/${pubIdMatch[1]}/` : navUrl;

      let photoUrl = '';
      const imgAttr = hit.image?.attributes?.[0];
      if (imgAttr?.detailData?.nonEntityProfilePicture) {
        photoUrl = extractProfilePhoto(imgAttr.detailData.nonEntityProfilePicture);
      } else if (imgAttr?.miniProfile?.picture) {
        photoUrl = extractProfilePhoto(imgAttr.miniProfile.picture);
      }

      recruiters.push({
        id: hit.entityUrn || hit.trackingUrn || String(Math.random()),
        name,
        headline: hit.primarySubtitle?.text || '',
        location: hit.secondarySubtitle?.text || '',
        degree,
        profileUrl,
        photoUrl,
      });
    }
  }

  return recruiters;
}

app.get('/api/recruiters/search', async (req, res) => {
  const { keywords = 'recruiter', location = '', start = '0' } = req.query;
  const liAt = req.headers['x-li-at'];
  if (!liAt) return res.status(401).json({ error: 'LinkedIn li_at session cookie is required (x-li-at header)' });

  try {
    const recruiters = await searchLinkedInRecruiters({ keywords, location, start: Number(start), liAt });
    res.json({ recruiters, hasMore: recruiters.length >= RECRUITER_PAGE_SIZE });
  } catch (err) {
    console.error('Recruiter search error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to search recruiters' });
  }
});

// ─── Mock Interview ───────────────────────────────────────────────────────────
function estimateYearsOfExperience(experience) {
  if (!experience || experience.length === 0) return 0;
  let total = 0;
  for (const exp of experience) {
    const dur = (exp.duration || '').trim();
    const rangeMatch = dur.match(/(\d{4})\s*[-–—]\s*(\d{4}|present|current|now)/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = /present|current|now/i.test(rangeMatch[2]) ? new Date().getFullYear() : parseInt(rangeMatch[2]);
      total += Math.max(0, end - start);
      continue;
    }
    const yearsMatch = dur.match(/(\d+)\+?\s*years?/i);
    if (yearsMatch) { total += parseInt(yearsMatch[1]); continue; }
    const monthsMatch = dur.match(/(\d+)\s*months?/i);
    if (monthsMatch) { total += parseInt(monthsMatch[1]) / 12; continue; }
    total += 1.5; // fallback: assume ~1.5 yrs per role
  }
  return Math.round(total);
}

function getSeniorityLevel(years) {
  if (years <= 2)  return `Entry-level (~${years} yrs) — focus on fundamentals, learning speed, academic/side projects`;
  if (years <= 5)  return `Mid-level (~${years} yrs) — focus on ownership, independent problem-solving, cross-functional work`;
  if (years <= 9)  return `Senior (~${years} yrs) — focus on architecture decisions, trade-offs, mentoring, system design`;
  if (years <= 14) return `Staff/Lead (~${years} yrs) — focus on org-wide impact, technical strategy, driving alignment`;
  return           `Principal/Director (~${years} yrs) — focus on long-term vision, cross-org influence, build-vs-buy decisions`;
}

app.post('/api/mock-interview/questions', async (req, res) => {
  const { job, profile, count = 5 } = req.body;
  if (!job || !profile) return res.status(400).json({ error: 'job and profile are required' });

  const years = estimateYearsOfExperience(profile.experience);
  const seniority = getSeniorityLevel(years);

  const workHistory = (profile.experience || []).map(e => {
    const highlights = (e.highlights || []).slice(0, 3).map(h => `    • ${h}`).join('\n');
    return `  ${e.role} at ${e.company} (${e.duration || 'duration unknown'})${highlights ? '\n' + highlights : ''}`;
  }).join('\n');

  const projects = (profile.projects || []).map(p =>
    `  ${p.name}: ${p.description}${p.technologies?.length ? ` [${p.technologies.join(', ')}]` : ''}`
  ).join('\n');

  const prompt = `You are a senior interview coach preparing a real interview. Generate ${count} incisive, role-specific questions that will genuinely assess this candidate's fit.

━━ ROLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${job.title}
Company: ${job.company}
${job.jobType ? `Type: ${job.jobType}` : ''}
${job.tags?.length ? `Required skills: ${job.tags.join(', ')}` : ''}
${job.description ? `\nJob Description:\n${job.description.slice(0, 900)}` : ''}

━━ CANDIDATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${profile.name || 'Candidate'}
Current title: ${profile.title}
Seniority: ${seniority}
Skills: ${(profile.skills || []).join(', ')}
${profile.summary ? `\nSummary: ${profile.summary}` : ''}

Work history:
${workHistory || '  (none provided)'}
${projects ? `\nProjects:\n${projects}` : ''}
${(profile.achievements || []).length ? `\nAchievements:\n${profile.achievements.map(a => `  • ${a}`).join('\n')}` : ''}
${(profile.education || []).length ? `\nEducation:\n${profile.education.map(e => `  ${e.degree} — ${e.institution} (${e.year})`).join('\n')}` : ''}

━━ INSTRUCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━
As an expert interview coach:

1. ANALYSE the job description and extract the 3-5 most critical requirements.
2. CROSS-REFERENCE against the candidate's experience:
   - Gaps: things the JD requires that are absent or thin in their background
   - Depth checks: skills they list but that need validation
   - Strengths: strong matches worth confirming with a concrete example
3. CALIBRATE difficulty to their seniority level (see above).
4. DISTRIBUTE question types intelligently:
   - Technical/Engineering role → 3 Technical, 1 Behavioral, 1 Situational
   - Management/Leadership role → 2 Behavioral, 1 Situational, 1 Leadership, 1 Technical
   - Mixed/Other → 2 Behavioral, 2 Technical, 1 Motivation or Fit
5. MAKE QUESTIONS SPECIFIC — reference their actual companies, projects, or technologies when possible. Generic questions are not acceptable.
6. Write a HINT that tells the candidate what a strong answer looks like, referencing the JD or their CV.

Return ONLY valid JSON, no markdown fences:
{
  "questions": [
    {
      "id": "q1",
      "type": "Technical",
      "question": "...",
      "hint": "...",
      "focus": "gap | validation | strength"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });
    let text = response.content[0].text.trim();
    // Strip markdown fences if present
    text = text.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    // Extract the outermost JSON object in case the model added preamble/postamble
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in model response');
    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ questions: parsed.questions, meta: { years, seniority } });
  } catch (err) {
    console.error('Mock interview questions error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate questions' });
  }
});

app.post('/api/mock-interview/feedback', async (req, res) => {
  const { job, question, answer, profile } = req.body;
  if (!job || !question || !answer) return res.status(400).json({ error: 'job, question, and answer are required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const years = estimateYearsOfExperience(profile?.experience);
  const seniority = getSeniorityLevel(years);

  const prompt = `You are a senior interview coach giving real-time feedback. Be direct and actionable — no fluff.

CONTEXT:
Role: ${job.title} at ${job.company}
Candidate seniority: ${seniority}
${job.tags?.length ? `Key skills the role requires: ${job.tags.join(', ')}` : ''}
${question.focus ? `This question probes a: ${question.focus === 'gap' ? 'SKILL GAP — be especially honest if the answer is weak' : question.focus === 'validation' ? 'CLAIMED SKILL — verify they truly have depth' : 'DEMONSTRATED STRENGTH — confirm with specifics'}` : ''}

QUESTION (${question.type}): "${question.question}"

CANDIDATE'S ANSWER: "${answer.slice(0, 1500)}"

Respond in this EXACT format (keep each bullet under 20 words):

## Score
[X]/10 — [one sharp phrase summarising the answer quality]

## Strengths
- [what they did well — be specific, quote their words if strong]
- [second strength if warranted]

## Improve
- [biggest gap — what a ${seniority.split('(')[0].trim()} interviewer would flag]
- [second point if needed]

## Ideal answer would include
[4-6 comma-separated concepts, keywords, or frameworks they should have mentioned for this role]`;

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    stream.on('text', text => res.write(`data: ${JSON.stringify({ text })}\n\n`));
    stream.on('finalMessage', () => { res.write(`data: ${JSON.stringify({ done: true })}\n\n`); res.end(); });
    stream.on('error', err => { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ─── Serve React client in production ────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes return index.html
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\nInterview Copilot server on port ${PORT}`);
  console.log(`Whisper: ${process.env.OPENAI_API_KEY ? 'server key configured' : 'client must provide key'}`);
  console.log(`Env: ${process.env.NODE_ENV || 'development'}`);
});
