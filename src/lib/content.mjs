import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDesign, SECTION_OPTIONS, SECTION_TYPES, MAX_SECTIONS, normalizedSections, safeButtonUrl } from './design.mjs';

export const LIMITS = { heading: 100, description: 180, introduction: 400, bookNote: 300 };
const own = (o, key) => Object.hasOwn(o, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateContent(data, {draft = false} = {}) {
  const errors = [];
  const string = (value, label, max, required = true) => {
    if (typeof value !== 'string' || (required && !value.trim()) || value.length > max) {
      errors.push(`${label}: enter ${required ? '1' : '0'}–${max} characters.`);
    }
  };
  const keys = (obj, allowed, label) => {
    if (!record(obj)) { errors.push(`${label}: expected a group of fields.`); return false; }
    for (const key of Object.keys(obj)) if (!allowed.includes(key)) errors.push(`${label}: unknown field “${key}”.`);
    return true;
  };
  const https = (value, label, required = true, hosts = []) => {
    if ((value === undefined || value === '') && !required) return;
    try {
      if (typeof value !== 'string') throw new Error();
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || (hosts.length && !hosts.includes(url.hostname))) throw new Error();
    } catch { errors.push(`${label}: enter a valid HTTPS link${hosts.length ? ` on ${hosts.join(' or ')}` : ''}.`); }
  };
  if (!keys(data, ['brand','status','heading','description','introduction','openingDate','readingDate','waitlistUrl','patreonUrl','email','instagramUrl','logo','logoPresentation','book','sections','seo','design'], 'Website')) return errors;
  string(data.brand, 'Club name', 40);
  string(data.heading, 'Main heading', LIMITS.heading);
  string(data.description, 'Club description', LIMITS.description);
  string(data.introduction, 'Introduction', LIMITS.introduction);
  if (!['coming-soon','membership-open','reading'].includes(data.status)) errors.push('Choose a valid membership state.');
  for (const [key,label] of [['openingDate','Membership opening'],['readingDate','Reading start']]) {
    const value = data[key];
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) errors.push(`${label}: use a valid calendar date.`);
  }
  if (data.openingDate > data.readingDate) errors.push('Membership must open on or before the reading start.');
  https(data.waitlistUrl, 'Waitlist');
  https(data.patreonUrl, 'Patreon', data.status !== 'coming-soon', ['patreon.com','www.patreon.com']);
  https(data.instagramUrl, 'Instagram', true, ['instagram.com','www.instagram.com']);
  string(data.email, 'Email', 254, false);
  if (data.email && !/^[^\s<>@\r\n]+@[^\s<>@\r\n]+\.[^\s<>@\r\n]+$/.test(data.email)) errors.push('Enter a working email address, or leave the field empty.');
  if (typeof data.logo !== 'string' || !/^\/images\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(data.logo)) errors.push('Logo: choose a PNG, JPEG or WebP in the image library.');
  if (!['original-banner','image'].includes(data.logoPresentation)) errors.push('Choose the logo presentation.');
  if (keys(data.book, ['title','author','note','showArtwork'], 'First book')) {
    string(data.book.title, 'Book title', 120);
    string(data.book.author, 'Author', 100);
    string(data.book.note, 'Book note', LIMITS.bookNote);
    if (own(data.book,'showArtwork') && typeof data.book.showArtwork !== 'boolean') errors.push('Book illustration: visibility must be on or off.');
  }
  if (!Array.isArray(data.sections) || data.sections.length > MAX_SECTIONS) errors.push(`Use at most ${MAX_SECTIONS} additional sections.`);
  else data.sections.forEach((section, i) => {
    const label = `Section ${i+1}`;
    if (!keys(section, ['id','type','heading','body','visible','width','align','tone','layout','imageLayout','imageRatio','image','imageAlt','imageWidth','imageHeight','caption','sourceUrl','attribution','buttonLabel','buttonUrl','buttonKind'], label)) return;
    if (typeof section.type!=='string' || !Object.hasOwn(SECTION_TYPES,section.type)) errors.push(`${label}: choose a supported block type.`);
    if (own(section,'id') && (typeof section.id!=='string' || !/^[a-z][a-z0-9-]{0,60}$/.test(section.id) || section.id==='opening')) errors.push(`${label}: invalid block identifier.`);
    string(section.heading, `${label} heading`, 150, !draft && section.type!=='button');
    string(section.body, `${label} text`, 1400, !draft && !['image','button'].includes(section.type));
    if (typeof section.visible !== 'boolean') errors.push(`${label}: visibility must be on or off.`);
    for(const [key,choices] of Object.entries(SECTION_OPTIONS))if(own(section,key) && (typeof section[key]!=='string' || !Object.hasOwn(choices,section[key])))errors.push(`${label}: choose a supported ${key}.`);
    if(section.type==='image'){
      const emptyImage=draft && section.image==='';
      if(!emptyImage && (typeof section.image!=='string' || !/^\/images\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(section.image)))errors.push(`${label}: upload a PNG, JPEG or WebP image.`);
      string(section.imageAlt,`${label} image description`,300,!draft);
      for(const key of ['imageWidth','imageHeight'])if(!Number.isInteger(section[key]) || section[key]<(emptyImage?0:1) || section[key]>12000)errors.push(`${label}: choose an image no larger than 12,000 pixels on either side.`);
      string(section.caption??'',`${label} caption`,300,false);
      https(section.sourceUrl,`${label} image source`,false);
    }
    if(section.type==='quote')string(section.attribution??'',`${label} attribution`,150,false);
    if(section.type==='button' || own(section,'buttonLabel') || own(section,'buttonUrl')){
      const required=!draft && (section.type==='button' || !!section.buttonLabel || !!section.buttonUrl);
      string(section.buttonLabel??'',`${label} button label`,70,required);
      const url=section.buttonUrl??'';
      if((required || url!=='') && !safeButtonUrl(url))errors.push(`${label} button: enter an HTTPS link, an email link, or a page/section link.`);
    }
  });
  if(Array.isArray(data.sections) && data.sections.every(record)){
    const ids=normalizedSections(data.sections).map(section=>section.id);
    if(new Set(ids).size!==ids.length)errors.push('Each content block needs a unique identifier.');
    errors.push(...validateDesign(data));
  }
  if (keys(data.seo, ['title','description'], 'Search listing')) {
    string(data.seo.title, 'Search title', 100);
    string(data.seo.description, 'Search description', 240);
  }
  return errors;
}

export function selectedImagePaths(data) {
  return [...new Set([data.logo,...data.sections.filter(section=>section.type==='image' && section.visible && section.image).map(section=>section.image)])];
}

export function readContent(file = process.env.RUSLITIKI_CONTENT_FILE || resolve('content/site.json')) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const errors = validateContent(data);
  if (errors.length) throw new Error(errors.join('\n'));
  return data;
}

export function ctaFor(data) {
  return data.status === 'coming-soon'
    ? { label: 'Join the waitlist', url: data.waitlistUrl }
    : { label: 'Join on Patreon', url: data.patreonUrl };
}

export function formatDate(iso) {
  return new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }).format(new Date(`${iso}T12:00:00Z`));
}
