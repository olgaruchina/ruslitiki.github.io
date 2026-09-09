import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readContent, ctaFor } from '../src/lib/content.mjs';
import {youtubeVideoId} from '../src/lib/design.mjs';
import {renderLlms} from '../src/lib/llms.mjs';
const root=path.resolve(process.argv[2] || 'dist');
const content=readContent();
const home=await fs.readFile(path.join(root,'index.html'),'utf8');
const privacy=await fs.readFile(path.join(root,'privacy/index.html'),'utf8');
const llms=await fs.readFile(path.join(root,'llms.txt'),'utf8');
assert.equal(llms,renderLlms(content,'https://www.ruslitiki.com/'),'The AI overview must match the content being published.');
assert.ok(home.includes('rel="describedby" href="/llms.txt"'),'The AI overview discovery link is missing.');
for(const [,id] of llms.matchAll(/https:\/\/www\.ruslitiki\.com\/#([a-z][a-z0-9-]*)/g)){
  assert.equal([...home.matchAll(new RegExp(`\\sid="${id}"`,'g'))].length,1,`AI overview target ${id} must exist exactly once.`);
}
assert.equal((home.match(/<h1(?:\s|>)/g)||[]).length,1,'Homepage must have one H1.');
assert.ok(home.includes(ctaFor(content).url),'The active signup link is missing.');
assert.ok(home.includes(content.openingDate) && home.includes(content.readingDate),'The saved dates are missing.');
assert.ok(home.includes('https://www.ruslitiki.com/'),'Canonical origin is missing.');
assert.ok(!home.includes('mailto:') || Boolean(content.email),'Do not publish an unconfigured mailbox.');
assert.ok(!home.includes('/studio') && !home.includes('.studio'),'Editor must not ship on the public page.');
assert.ok(!home.includes('googletagmanager') && !home.includes('google-analytics'),'Unexpected tracking code.');
const menu=home.match(/<nav class="section-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert.ok(menu,'The section menu is missing.');
for(const [,id] of menu.matchAll(/href="#([a-z][a-z0-9-]*)"/g)){
  assert.equal([...home.matchAll(new RegExp(`\\sid="${id}"`,'g'))].length,1,`Menu target ${id} must exist exactly once.`);
}
const videos=content.sections.filter(section=>section.type==='video' && section.visible);
const frames=[...home.matchAll(/<iframe\b([^>]*)>/g)];
assert.equal(frames.length,videos.length,'Only configured visible videos may render a player.');
for(const section of videos)assert.ok(home.includes(`https://www.youtube-nocookie.com/embed/${youtubeVideoId(section.videoUrl)}`),'Video must use the approved embed source.');
for(const [attributes] of frames)assert.ok(attributes.includes('loading="lazy"') && attributes.includes('referrerpolicy="strict-origin-when-cross-origin"'),'Video must load lazily and retain its referring origin.');
for(const html of [home,privacy]){
  for(const match of html.matchAll(/(?:src|href)="(\/[^"?#]*)"/g)){
    const target=match[1];
    const file=path.join(root,target.endsWith('/') ? `${target}index.html` : target);
    assert.ok((await fs.stat(file)).isFile(),`Missing local asset/link: ${target}`);
  }
}
for(const entry of ['studio','scripts','content','.studio','.git']){
  assert.equal(await fs.access(path.join(root,entry)).then(()=>true,()=>false),false,`${entry} must not ship.`);
}
const scripts=[...home.matchAll(/<script([^>]*)>/g)].filter(match=>!match[1].includes('application/ld+json'));
assert.equal(scripts.length,0,'The coming-soon page should not require client JavaScript.');
console.log('Built-page checks passed: content, AI overview, dates, canonical, links, assets, privacy boundary and zero client scripts.');
