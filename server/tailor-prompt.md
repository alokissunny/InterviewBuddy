# CV Tailoring Prompt

Tailor this resume for the job below. Rules:
- Rewrite summary (3-4 sentences) to directly target this role — do NOT mention any company name
- Reorder skills: most relevant to the role first, keep all of them
- Adjust experience highlights to emphasise relevant impact — reframe existing bullets, never invent facts
- Select up to 3 most relevant projects
- Do NOT include the target company name anywhere in the output

JOB:
Title: {{job.title}}
{{description}}

CANDIDATE (JSON):
{{profile}}

Return ONLY valid JSON with the exact same structure as the input.
