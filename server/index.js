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

// ─── LinkedIn Jobs (direct scraper) ──────────────────────────────────────────
const JOB_TYPE_MAP = { 'full-time': 'F', 'part-time': 'P', 'contract': 'C', 'temporary': 'T', 'internship': 'I' };
const EXP_LEVEL_MAP = { 'internship': '1', 'entry-level': '2', 'associate': '3', 'mid-senior': '4', 'director': '5', 'executive': '6' };
const DATE_POSTED_MAP = { 'Past 24 hours': 'r86400', 'Past Week': 'r604800', 'Past Month': 'r2592000' };

const PAGE_SIZE = 10;

async function scrapeLinkedInJobs({ keywords, location, jobType, experienceLevel, datePosted, start = 0 }) {
  const params = new URLSearchParams({ keywords, start: String(start), count: String(PAGE_SIZE) });
  if (location) params.set('location', location);
  if (jobType && JOB_TYPE_MAP[jobType]) params.set('f_JT', JOB_TYPE_MAP[jobType]);
  if (experienceLevel && EXP_LEVEL_MAP[experienceLevel]) params.set('f_E', EXP_LEVEL_MAP[experienceLevel]);
  if (datePosted && DATE_POSTED_MAP[datePosted]) params.set('f_TPR', DATE_POSTED_MAP[datePosted]);

  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;
  console.log('[Jobs] scraping:', url);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!res.ok) throw new Error(`LinkedIn returned ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];
  $('li').each((_, el) => {
    const card = $(el);
    const urn = card.find('[data-entity-urn]').attr('data-entity-urn') || '';
    const jobId = urn.split(':').pop() || String(Math.random());
    const title = card.find('.base-search-card__title').text().trim();
    const company = card.find('.base-search-card__subtitle').text().trim();
    const location = card.find('.job-search-card__location').text().trim();
    const postedAt = card.find('time').attr('datetime') || card.find('.job-search-card__listdate').text().trim() || '';
    const applyUrl = card.find('a.base-card__full-link').attr('href') || '';
    const companyLogo = card.find('img.artdeco-entity-image').attr('data-delayed-url') || card.find('img').attr('src') || '';

    if (title) jobs.push({ jobId, title, company, location, postedAt, applyUrl, companyLogo });
  });

  return jobs;
}

app.get('/api/jobs/status', (_req, res) => {
  res.json({ serverKeyAvailable: true });
});

app.post('/api/jobs/search', async (req, res) => {
  const { keywords, location, jobType, experienceLevel, datePosted, start = 0 } = req.body;
  if (!keywords) return res.status(400).json({ error: 'keywords is required.' });

  try {
    const jobs = await scrapeLinkedInJobs({ keywords, location, jobType, experienceLevel, datePosted, start });
    console.log(`[Jobs] scraped ${jobs.length} results for "${keywords}" (start=${start})`);
    res.json({ jobs, hasMore: jobs.length === PAGE_SIZE });
  } catch (err) {
    console.error('Jobs search error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch jobs' });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\nInterview Copilot server on port ${PORT}`);
  console.log(`Whisper: ${process.env.OPENAI_API_KEY ? 'server key configured' : 'client must provide key'}`);
});
