import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readContent, validateContent, ctaFor, instagramProfile } from '../src/lib/content.mjs';
import { atomicJson, digest, saveDraft, fileMap, safeImage } from '../scripts/studio-store.mjs';
import { validatePublishing, verifyArtifact } from '../scripts/publish-release.mjs';
const fresh=()=>structuredClone(readContent());

test('host Instagram is optional for older drafts and only accepts safe profile links',()=>{
  const content=fresh();delete content.hostInstagramUrl;
  assert.deepEqual(validateContent(content),[]);
  assert.equal(instagramProfile(content.hostInstagramUrl),null);
  content.hostInstagramUrl='';assert.deepEqual(validateContent(content),[]);
  assert.equal(instagramProfile(''),null);
  content.hostInstagramUrl='https://instagram.com/books_olgaruchina/?igsh=shared';
  assert.deepEqual(validateContent(content),[]);
  assert.deepEqual(instagramProfile(content.hostInstagramUrl),{handle:'@books_olgaruchina',url:'https://www.instagram.com/books_olgaruchina/'});
  for(const value of ['javascript:alert(1)','https://instagram.com.evil.example/name/','https://name@instagram.com/profile/','https://www.instagram.com/p/abc/','https://www.instagram.com/explore/',null]){
    content.hostInstagramUrl=value;
    assert.equal(instagramProfile(value),null);
    assert.ok(validateContent(content).some(error=>error.startsWith('Host Instagram:')));
  }
});

test('opening membership requires a real Patreon link; no silent broken CTA',()=>{
  const content=fresh();content.status='membership-open';
  assert.ok(validateContent(content).some(error=>error.startsWith('Patreon:')));
  content.patreonUrl='https://www.patreon.com/ruslitiki';
  assert.deepEqual(validateContent(content),[]);
  assert.equal(ctaFor(content).url,content.patreonUrl);
});
test('rejects unsafe destinations and email header injection',()=>{
  const content=fresh();content.waitlistUrl='javascript:alert(1)';content.email='olga@example.com\r\nBcc:other@example.com';
  assert.ok(validateContent(content).some(error=>error.startsWith('Waitlist:')));
  assert.ok(validateContent(content).some(error=>error.includes('email address')));
});
test('rejects invalid calendar dates and impossible launch order',()=>{
  const content=fresh();content.openingDate='2026-02-30';
  assert.ok(validateContent(content).length);
  content.openingDate='2026-11-01';assert.ok(validateContent(content).includes('Membership must open on or before the reading start.'));
});
test('rejects path traversal, executable assets and unsupported fields',()=>{
  const content=fresh();content.logo='/images/../../secrets.png';content.script='untrusted';
  assert.ok(validateContent(content).some(error=>error.startsWith('Logo:')));
  assert.ok(validateContent(content).some(error=>error.includes('unknown field')));
  content.logo='/images/logo.svg';assert.ok(validateContent(content).some(error=>error.startsWith('Logo:')));
});
test('two windows cannot silently overwrite each other’s saved drafts',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ruslitiki-draft-'));
  try{
    const original=fresh();await atomicJson(path.join(dir,'draft.json'),original);
    const first=structuredClone(original);first.heading='Read Russian literature together.';
    await saveDraft(dir,first,digest(original));
    const second=structuredClone(original);second.heading='A different heading.';
    await assert.rejects(saveDraft(dir,second,digest(original)),/another window/);
    assert.equal(JSON.parse(await fs.readFile(path.join(dir,'draft.json'))).heading,first.heading);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('invalid content cannot overwrite a valid draft',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ruslitiki-valid-'));
  try{
    const content=fresh();await atomicJson(path.join(dir,'draft.json'),content);
    await assert.rejects(saveDraft(dir,{...content,heading:''},digest(content)),/Main heading/);
    assert.equal(JSON.parse(await fs.readFile(path.join(dir,'draft.json'))).heading,content.heading);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('a modified or symlinked preview cannot be published',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ruslitiki-artifact-'));
  try{
    await fs.writeFile(path.join(dir,'index.html'),'reviewed');
    const preview={directory:dir,artifactHash:digest(await fileMap(dir))};
    await verifyArtifact(preview);
    await fs.writeFile(path.join(dir,'index.html'),'changed after review');
    await assert.rejects(verifyArtifact(preview),/preview files changed/);
    await fs.symlink('/etc/hosts',path.join(dir,'outside'));
    await assert.rejects(fileMap(dir),/Symbolic links/);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('publishing fails closed until configured, and cannot target another repository',()=>{
  assert.throws(()=>validatePublishing(null),/not connected/);
  assert.throws(()=>validatePublishing({enabled:true,repository:'someone/else',branch:'main',liveUrl:'https://example.com'}),/configured Ruslitiki/);
  assert.throws(()=>validatePublishing({enabled:true,repository:'olgaruchina/ruslitiki.github.io',branch:'site-live',liveUrl:'http://127.0.0.1/'}),/HTTPS/);
  assert.throws(()=>validatePublishing({enabled:true,repository:'olgaruchina/ruslitiki.github.io',branch:'site-live',liveUrl:'https://ruslitiki.com/'}),/canonical/);
});
test('uploads cannot smuggle executable SVG content',()=>{
  assert.throws(()=>safeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')),/not a supported/);
});
