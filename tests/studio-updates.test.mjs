import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readContent, validateContent } from '../src/lib/content.mjs';
import { plainText, fromPlainText } from '../src/lib/rich-text.mjs';
import { atomicJson, json } from '../scripts/studio-store.mjs';
import { applyContactUpdate } from '../scripts/studio-updates.mjs';

const CONTACT='section-bb4b953e-a094-43dd-baec-239fd87471e6';
const INSTAGRAM='section-6a548e93-39c6-412f-a4fc-b3398c69a58d';
const source=()=>readContent();
async function fixture(t,content){
  const storage=await fs.mkdtemp(path.join(os.tmpdir(),'ruslitiki-contact-update-'));
  t.after(()=>fs.rm(storage,{recursive:true,force:true}));
  await atomicJson(path.join(storage,'draft.json'),content);
  return storage;
}

test('the contact update preserves owner edits and formatting, with a recoverable backup',async t=>{
  const content=source();
  content.email='BOOKSOLGARUCHINA@GMAIL.COM';
  content.heading='Olga’s revised invitation';
  content.design={...content.design,spacing:'airy',blockOrder:['opening',...content.sections.map(section=>section.id)].reverse()};
  const contact=content.sections.find(section=>section.id===CONTACT);
  contact.heading='Questions for Olga';contact.visible=false;contact.buttonUrl='https://example.com/contact';contact.buttonLabel='Our own link';
  delete contact.divider;
  const formatted={blocks:[{type:'paragraph',runs:[{text:'Please write ',italic:true},{text:'BOOKS',bold:true},{text:'olgaruchina@gmail.com',italic:true},{text:' about your reading plans.',bold:true}]},{type:'bullet',runs:[{text:'Keep this list item.',italic:true}]}]};
  contact.body=plainText(formatted);
  content.richText={[CONTACT+':body']:formatted,'opening:heading':fromPlainText(content.heading)};
  const before=structuredClone(content);
  const storage=await fixture(t,content);
  const result=await applyContactUpdate(storage,source());
  assert.equal(result.changed,true);
  assert.deepEqual(await json(result.backup),before);
  const updated=await json(path.join(storage,'draft.json'));
  const expected=structuredClone(before);
  expected.email='olga@ruslitiki.com';
  const expectedContact=expected.sections.find(section=>section.id===CONTACT);
  expectedContact.divider='line';expectedContact.body=expectedContact.body.replace('BOOKSolgaruchina@gmail.com','olga@ruslitiki.com');
  expected.richText[CONTACT+':body'].blocks[0].runs[1].text='olga@ruslitiki.com';
  expected.richText[CONTACT+':body'].blocks[0].runs[2].text='';
  assert.deepEqual(updated,expected);
  assert.deepEqual(validateContent(updated,{draft:true}),[]);

  // Later intentional edits/removals survive every subsequent launch.
  updated.email='different@example.com';
  updated.sections=updated.sections.filter(section=>section.id!==CONTACT);
  updated.design.blockOrder=updated.design.blockOrder.filter(id=>id!==CONTACT);
  delete updated.richText[CONTACT+':body'];
  await atomicJson(path.join(storage,'draft.json'),updated);
  assert.deepEqual(await applyContactUpdate(storage,source()),{changed:false});
  assert.deepEqual(await json(path.join(storage,'draft.json')),updated);
  assert.equal((await fs.readdir(path.join(storage,'backups'))).length,1);
});

test('missing contact blocks are inserted after the final FAQ without changing existing order or hidden sections',async t=>{
  const content=source();content.email='';
  content.sections=content.sections.filter(section=>![CONTACT,INSTAGRAM].includes(section.id));
  const hidden={id:'owners-hidden-notes',type:'text',heading:'Future content',body:'Olga’s private notes',visible:false};
  content.sections.push(hidden);
  content.design={...content.design,blockOrder:['opening',...content.sections.map(section=>section.id)]};
  const oldOrder=[...content.design.blockOrder];
  const storage=await fixture(t,content);
  assert.equal((await applyContactUpdate(storage,source())).changed,true);
  const updated=await json(path.join(storage,'draft.json'));
  assert.deepEqual(updated.sections.filter(section=>![CONTACT,INSTAGRAM].includes(section.id)),content.sections);
  assert.deepEqual(updated.design.blockOrder.filter(id=>![CONTACT,INSTAGRAM].includes(id)),oldOrder);
  const finalFaq=updated.design.blockOrder.findLastIndex(id=>updated.sections.find(section=>section.id===id)?.type==='faq');
  assert.deepEqual(updated.design.blockOrder.slice(finalFaq+1,finalFaq+4),[CONTACT,INSTAGRAM,hidden.id]);
  for(const id of [CONTACT,INSTAGRAM])assert.deepEqual(updated.sections.find(section=>section.id===id),source().sections.find(section=>section.id===id));
  assert.equal(updated.email,'olga@ruslitiki.com');
  assert.deepEqual(validateContent(updated,{draft:true}),[]);
});

test('existing contact preferences and Instagram buttons are not replaced or duplicated',async t=>{
  const content=source();content.email='different@example.com';
  const contact=content.sections.find(section=>section.id===CONTACT);
  contact.divider='none';contact.body='Use different@example.com. Keep notbooksolgaruchina@gmail.com unchanged.';
  const storage=await fixture(t,content);
  assert.deepEqual(await applyContactUpdate(storage,source()),{changed:false});
  assert.deepEqual(await json(path.join(storage,'draft.json')),content);

  const withoutContact=source();withoutContact.sections=withoutContact.sections.filter(section=>section.id!==CONTACT);
  const instagram=withoutContact.sections.find(section=>section.id===INSTAGRAM);
  instagram.buttonLabel='Olga’s own button';instagram.buttonUrl='https://example.com/olga';instagram.visible=false;
  const second=await fixture(t,withoutContact);
  await applyContactUpdate(second,source());
  const updated=await json(path.join(second,'draft.json'));
  assert.equal(updated.sections.filter(section=>section.id===INSTAGRAM).length,1);
  assert.deepEqual(updated.sections.find(section=>section.id===INSTAGRAM),instagram);
});

test('an invalid migrated draft is left intact and the update can retry after correction',async t=>{
  const content=source();content.sections=content.sections.filter(section=>![CONTACT,INSTAGRAM].includes(section.id));
  while(content.sections.length<24)content.sections.push({id:'custom-'+content.sections.length,type:'text',heading:'Owner text',body:'Keep this.',visible:false});
  const storage=await fixture(t,content);
  await assert.rejects(applyContactUpdate(storage,source()),/at most 24/);
  assert.deepEqual(await json(path.join(storage,'draft.json')),content);
  assert.deepEqual(await fs.readdir(path.join(storage,'updates')),[]);
  content.sections.splice(-2);
  await atomicJson(path.join(storage,'draft.json'),content);
  assert.equal((await applyContactUpdate(storage,source())).changed,true);
});

test('a newer saved draft wins if it changes while the migration backup is being written',async t=>{
  const content=source();content.email='';
  const storage=await fixture(t,content);
  const newer={...content,heading:'A newer saved draft'};
  const rename=fs.rename;
  const interception=t.mock.method(fs,'rename',async function(from,to){
    await rename.call(fs,from,to);
    if(path.dirname(to)===path.join(storage,'backups'))await fs.writeFile(path.join(storage,'draft.json'),JSON.stringify(newer));
  });
  await assert.rejects(applyContactUpdate(storage,source()),/changed in another window/);
  interception.mock.restore();
  assert.deepEqual(await json(path.join(storage,'draft.json')),newer);
  assert.deepEqual(await fs.readdir(path.join(storage,'updates')),[]);
  assert.equal((await applyContactUpdate(storage,source())).changed,true);
  assert.equal((await json(path.join(storage,'draft.json'))).heading,newer.heading);
});
