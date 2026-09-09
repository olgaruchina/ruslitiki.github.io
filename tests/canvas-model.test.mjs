import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContent, validateContent } from '../src/lib/content.mjs';
import { editableContent, safeButtonUrl } from '../src/lib/design.mjs';
import { insertSection, moveSectionBefore, setCanvasText } from '../src/lib/canvas-model.mjs';
import { saveDraft, atomicJson, digest, json } from '../scripts/studio-store.mjs';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('visual insertion and dragging preserve stable order without losing hidden blocks',()=>{
  const content=editableContent(readContent());content.sections=[];content.design.blockOrder=['opening'];
  const first=insertSection(content,'text','opening','section-first');
  const hidden=insertSection(content,'quote',null,'section-hidden');hidden.visible=false;
  const button=insertSection(content,'button','opening','section-button');
  assert.deepEqual(content.design.blockOrder,[first.id,button.id,'opening',hidden.id]);
  assert.equal(moveSectionBefore(content,button.id,null),true);
  assert.deepEqual(content.design.blockOrder,[first.id,'opening',hidden.id,button.id]);
  assert.equal(moveSectionBefore(content,'opening',first.id),true);
  const before=JSON.stringify(content);assert.equal(moveSectionBefore(content,'bad',first.id),false);assert.equal(insertSection(content,'script'),null);assert.equal(JSON.stringify(content),before);
});

test('inline text cannot change arbitrary fields and over-limit pastes are preserved for validation',()=>{
  const content=editableContent(readContent());
  assert.equal(setCanvasText(content,'opening','__proto__.polluted','yes'),false);
  assert.equal(setCanvasText(content,'opening','waitlistUrl','https://another.example'),false);
  const long='A'.repeat(101);assert.equal(setCanvasText(content,'opening','heading',long),true);
  assert.equal(content.heading,long);assert.ok(validateContent(content,{draft:true}).some(error=>error.startsWith('Main heading')));
  assert.equal(setCanvasText(content,'opening','heading','Read together.'),true);assert.deepEqual(validateContent(content),[]);
});

test('unfinished sections can be saved privately but cannot enter a publishing preview',async()=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'ruslitiki-canvas-draft-'));
  try{
    const original=readContent();await atomicJson(path.join(folder,'draft.json'),original);
    const draft=editableContent(original);insertSection(draft,'image');insertSection(draft,'button');
    assert.deepEqual(validateContent(draft,{draft:true}),[]);assert.ok(validateContent(draft).length);
    await saveDraft(folder,draft,digest(original));assert.deepEqual(await json(path.join(folder,'draft.json')),draft);
  }finally{await fs.rm(folder,{recursive:true,force:true});}
});

test('custom buttons accept website/email destinations and reject executable or malformed links',()=>{
  for(const url of ['https://example.com/reading','mailto:olga@ruslitiki.com','/privacy/','#main'])assert.equal(safeButtonUrl(url),true,url);
  for(const url of ['javascript:alert(1)','data:text/html,test','//example.com','mailto:olga@ruslitiki.com?bcc=someone@example.com','mailto:olga@ruslitiki.com%0aBCC:other@example.com','https://user:password@example.com',['https://example.com']])assert.equal(safeButtonUrl(url),false,String(url));
  const content=editableContent(readContent());const button=insertSection(content,'button');button.buttonLabel='Join the waitlist';button.buttonUrl=content.waitlistUrl;
  assert.deepEqual(validateContent(content),[]);button.buttonUrl='javascript:alert(1)';assert.ok(validateContent(content,{draft:true}).some(error=>error.includes('button:')));
});
