require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { toFile } = require('openai');
const pdfParse = require('pdf-parse');
const cheerio = require('cheerio');

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\nInterview Copilot server on port ${PORT}`);
  console.log(`Whisper: ${process.env.OPENAI_API_KEY ? 'server key configured' : 'client must provide key'}`);
  console.log(`Jobs (Apify): ${process.env.APIFY_API_TOKEN ? 'configured' : 'APIFY_API_TOKEN missing'}`);
});
