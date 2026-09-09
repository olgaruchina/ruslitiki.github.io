import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContent } from '../src/lib/content.mjs';
import { renderLlms } from '../src/lib/llms.mjs';

const site = 'https://www.ruslitiki.com/';

test('AI overview excludes hidden content, unused fields and inactive join links', () => {
  const content = readContent();
  content.patreonUrl = 'https://www.patreon.com/unannounced-membership';
  content.sections = [
    { id: 'private-video', type: 'video', visible: false, heading: 'Hidden title', body: 'Hidden notes', videoUrl: 'https://youtu.be/M7lc1UVf-VE' },
    { id: 'public-copy', type: 'text', visible: true, heading: 'Published heading', body: 'Published description', caption: 'Unused caption', attribution: 'Unused attribution', videoUrl: 'https://youtu.be/abcdefghijk' },
  ];
  const output = renderLlms(content, site);
  assert.match(output, /^# Ruslitiki\n\n> /);
  assert.ok(output.includes('Published heading') && output.includes('Published description'));
  assert.ok(output.includes(content.waitlistUrl));
  for (const privateValue of ['private-video', 'Hidden title', 'Hidden notes', 'M7lc1UVf-VE', 'Unused caption', 'Unused attribution', 'abcdefghijk', content.patreonUrl, 'mailto:']) assert.ok(!output.includes(privateValue), privateValue);
  content.status = 'membership-open';
  content.email = 'olga@example.com';
  const opened = renderLlms(content, site);
  assert.ok(opened.includes(content.patreonUrl) && opened.includes('mailto:olga@example.com'));
  assert.ok(!opened.includes(content.waitlistUrl));
});

test('AI overview follows custom block order and resolves public buttons and videos', () => {
  const content = readContent();
  content.sections = [
    { id: 'question', type: 'faq', heading: 'A question', body: 'An answer', visible: true },
    { id: 'clip', type: 'video', heading: 'Introduction', body: '', visible: true, videoUrl: 'https://youtu.be/M7lc1UVf-VE?si=tracking' },
    { id: 'button', type: 'button', heading: '', body: '', visible: true, buttonLabel: 'See the answer', buttonUrl: '#question' },
  ];
  content.design = { blockOrder: ['clip', 'opening', 'button', 'question'] };
  const output = renderLlms(content, site);
  assert.ok(output.indexOf('/#clip') < output.indexOf('/#first-book-title'));
  assert.ok(output.indexOf('/#first-book-title') < output.indexOf('/#button'));
  assert.ok(output.includes('[See the answer](<https://www.ruslitiki.com/#question>)'));
  assert.ok(output.includes('https://www.youtube.com/watch?v=M7lc1UVf-VE') && !output.includes('si=tracking'));
  assert.ok(output.includes('[A question](<https://www.ruslitiki.com/#question>): An answer'));
});

test('plain editor text cannot inject Markdown headings or links into the overview', () => {
  const content = readContent();
  content.heading = 'Read [this](https://unrelated.example/)';
  content.sections = [{ type: 'text', visible: true, heading: 'A [literal] heading', body: 'First line\n\n## Fake heading\n<script>literal</script>' }];
  const output = renderLlms(content, site);
  assert.ok(output.includes('Read \\[this\\](https://unrelated.example/)'));
  assert.ok(output.includes('[A \\[literal\\] heading](<https://www.ruslitiki.com/#section-1>)'));
  assert.ok(output.includes('\\#\\# Fake heading') && output.includes('\\<script\\>'));
  assert.ok(!output.includes('\n## Fake heading') && !output.includes('<script>'));
});
