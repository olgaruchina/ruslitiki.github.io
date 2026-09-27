import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readContent, validateContent } from '../src/lib/content.mjs';
import { DEFAULT_LABELS } from '../src/lib/labels.mjs';
import { plainText } from '../src/lib/rich-text.mjs';
import { atomicJson, json } from '../scripts/studio-store.mjs';
import { applyMembershipCopyUpdate, updateMembershipCopy } from '../scripts/membership-copy-update.mjs';

function activeDraft(){
  const content=readContent();
  content.status='membership-open';
  content.joinMode='patreon';
  content.patreonUrl='https://www.patreon.com/c/books_olgaruchina/membership';
  content.heading='Olga’s own headline';
  content.labels={...DEFAULT_LABELS};
  content.design.blockOrder=['opening',...content.sections.map(section=>section.id)];
  const doc={blocks:[
    {type:'paragraph',runs:[{text:'Membership fee: $15 USD per month'}]},
    {type:'paragraph',runs:[]},
    {type:'paragraph',runs:[{text:'It includes:'}]},
    {type:'bullet',runs:[{text:'Weekly videos',bold:true}]},
    {type:'bullet',runs:[{text:'Reading guides and additional materials'}]},
    {type:'paragraph',runs:[]},
    {type:'paragraph',runs:[{text:'Joining the waitlist is free. Paid membership is a separate step through '},{text:'Patreon. ',italic:true},{text:'The price will be indicated in your local currency (equal to $15 USD)'}]},
    {type:'paragraph',runs:[]},
    {type:'paragraph',runs:[{text:'The book itself is not included.'}]},
  ]};
  content.sections.find(section=>section.id==='membership').body=plainText(doc);
  content.richText={'membership:body':doc};
  return content;
}

async function fixture(t,content){
  const storage=await fs.mkdtemp(path.join(os.tmpdir(),'ruslitiki-membership-update-'));
  t.after(()=>fs.rm(storage,{recursive:true,force:true}));
  await atomicJson(path.join(storage,'draft.json'),content);
  return storage;
}

test('open membership copy updates exact stale text and preserves the owner’s formatting',async t=>{
  const original=activeDraft();
  const storage=await fixture(t,original);
  const result=await applyMembershipCopyUpdate(storage);
  assert.equal(result.changed,true);
  assert.deepEqual(await json(result.backup),original);
  const updated=await json(path.join(storage,'draft.json'));
  const membership=updated.sections.find(section=>section.id==='membership');
  assert.equal(updated.heading,original.heading);
  assert.ok(!membership.body.includes('Joining the waitlist'));
  assert.ok(!membership.body.includes('The price will be indicated in your local currency'));
  assert.equal(updated.richText['membership:body'].blocks[3].type,'bullet');
  assert.equal(updated.richText['membership:body'].blocks[3].runs[0].bold,true);
  assert.equal(plainText(updated.richText['membership:body']),membership.body);
  assert.deepEqual(updated.sections.find(section=>section.id==='faq-waitlist-and-price'),original.sections.find(section=>section.id==='faq-waitlist-and-price'));
  assert.deepEqual(updated.design.blockOrder,original.design.blockOrder);
  assert.deepEqual(updated.seo,original.seo);
  assert.deepEqual(updated.labels,original.labels);
  assert.deepEqual(validateContent(updated,{draft:true}),[]);
  assert.deepEqual(await applyMembershipCopyUpdate(storage),{changed:false});
});

test('pre-launch drafts and custom owner copy are not rewritten',async t=>{
  const comingSoon=readContent();
  const storage=await fixture(t,comingSoon);
  assert.deepEqual(await applyMembershipCopyUpdate(storage),{changed:false});
  assert.deepEqual(await json(path.join(storage,'draft.json')),comingSoon);
  assert.deepEqual(await fs.readdir(path.join(storage,'updates')),[]);

  const custom=activeDraft();
  custom.sections.find(section=>section.id==='membership').body='Olga’s new membership text.';
  delete custom.richText['membership:body'];
  custom.sections.find(section=>section.id==='faq-waitlist-and-price').heading='Olga’s own question';
  custom.sections.find(section=>section.id==='faq-waitlist-and-price').body='Olga’s own answer';
  custom.labels.privacyIntroduction='Olga’s own privacy introduction.';
  const changed=updateMembershipCopy(custom);
  assert.equal(changed.sections.find(section=>section.id==='membership').body,'Olga’s new membership text.');
  assert.equal(changed.sections.find(section=>section.id==='faq-waitlist-and-price').heading,'Olga’s own question');
  assert.equal(changed.labels.privacyIntroduction,'Olga’s own privacy introduction.');
});
