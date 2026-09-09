import { ctaFor, formatDate } from './content.mjs';
import { designFor, normalizedSections, youtubeVideoId } from './design.mjs';

// Editor fields are plain text. Keep their punctuation from creating Markdown links or headings.
const text = value => String(value ?? '').trim().replace(/\s+/g, ' ').replace(/[\\`*_[\]<>#!|]/g, '\\$&');
const link = (label, url, note = '') => `- [${text(label)}](<${url.replace(/</g, '%3C').replace(/>/g, '%3E')}>)${note ? `: ${text(note)}` : ''}`;

export function renderLlms(content, site) {
  const absolute = value => new URL(value, site).href;
  const sections = new Map(normalizedSections(content.sections).map(section => [section.id, section]));
  const status = { 'coming-soon': 'Coming soon', 'membership-open': 'Membership is open', reading: 'Reading together' }[content.status];
  const lines = [
    `# ${text(content.brand)}`, '',
    `> ${text(content.description)}`, '',
    text(content.heading), '',
    text(content.introduction), '',
    `Status: ${status}.`,
    `Membership opening date: ${formatDate(content.openingDate)}.`,
    `Reading start date: ${formatDate(content.readingDate)}.`, '',
    '## Website', '',
    link(content.brand, absolute('/'), 'Official book club website.'), '',
    '## Book club', '',
  ];
  for (const id of designFor(content).blockOrder) {
    if (id === 'opening') {
      lines.push(link('Our first book', absolute('/#first-book-title'), `${content.book.title} by ${content.book.author}. ${content.book.note}`));
      continue;
    }
    const section = sections.get(id);
    if (!section?.visible) continue;
    const details = [section.body];
    if (section.type === 'quote' && section.attribution) details.push(`Attribution: ${section.attribution}`);
    if (section.type === 'image' && section.caption) details.push(section.caption);
    lines.push(link(section.heading || section.buttonLabel, absolute(`/#${id}`), details.filter(Boolean).join(' ')));
    if (section.type === 'video' && section.videoUrl) lines.push(link(`${section.heading} — YouTube video`, `https://www.youtube.com/watch?v=${youtubeVideoId(section.videoUrl)}`));
    if (section.buttonLabel && section.buttonUrl) lines.push(link(section.buttonLabel, absolute(section.buttonUrl)));
  }
  const cta = ctaFor(content);
  lines.push('', '## Join and contact', '', link(cta.label, absolute(cta.url)), link('Instagram', absolute(content.instagramUrl)));
  if (content.email) lines.push(link('Contact Olga Ruchina', absolute(`mailto:${content.email}`)));
  lines.push('', '## Optional', '', link('Privacy', absolute('/privacy/'), 'How the website and waitlist handle personal information.'), '');
  return lines.join('\n');
}
