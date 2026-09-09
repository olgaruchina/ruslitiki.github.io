import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readContent, ctaFor } from '../src/lib/content.mjs';
const root=path.resolve(process.argv[2] || 'dist');
const content=readContent();
const home=await fs.readFile(path.join(root,'index.html'),'utf8');
const privacy=await fs.readFile(path.join(root,'privacy/index.html'),'utf8');
assert.equal((home.match(/<h1(?:\s|>)/g)||[]).length,1,'Homepage must have one H1.');
assert.ok(home.includes(ctaFor(content).url),'The active signup link is missing.');
assert.ok(home.includes(content.openingDate) && home.includes(content.readingDate),'The saved dates are missing.');
assert.ok(home.includes('https://www.ruslitiki.com/'),'Canonical origin is missing.');
assert.ok(!home.includes('mailto:') || Boolean(content.email),'Do not publish an unconfigured mailbox.');
assert.ok(!home.includes('/studio') && !home.includes('.studio'),'Editor must not ship on the public page.');
assert.ok(!home.includes('googletagmanager') && !home.includes('google-analytics'),'Unexpected tracking code.');
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
console.log('Built-page checks passed: content, dates, canonical, links, assets, privacy boundary and zero client scripts.');
