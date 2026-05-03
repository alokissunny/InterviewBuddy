const cheerio = require('cheerio');

function stripHtml(html) {
  if (!html) return '';
  try {
    const $ = cheerio.load(html);
    return $.text().replace(/\s+/g, ' ').trim().slice(0, 500);
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
  }
}

function isoDate(str) {
  if (!str) return '';
  try { return new Date(str).toISOString().split('T')[0]; } catch { return ''; }
}

function relativeDate(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'Today';
  if (d === 1) return '1 day ago';
  if (d < 7) return `${d} days ago`;
  if (d < 14) return '1 week ago';
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}

function formatSalary(min, max, currency = 'USD') {
  if (!min && !max) return '';
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  const fmt = n => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  if (min && max) return `${sym}${fmt(min)}–${fmt(max)}/yr`;
  if (min) return `${sym}${fmt(min)}+/yr`;
  return `up to ${sym}${fmt(max)}/yr`;
}

module.exports = { stripHtml, isoDate, relativeDate, formatSalary };
