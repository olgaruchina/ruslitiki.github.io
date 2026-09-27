import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readContent,validateContent,ctaFor,showMembershipWaitlistNote} from '../src/lib/content.mjs';
import {editableContent,groupedSections} from '../src/lib/design.mjs';
import {setCanvasRichText} from '../src/lib/rich-fields.mjs';
import {fromPlainText,renderRichText} from '../src/lib/rich-text.mjs';

test('approved content and editable lead survive a content round-trip',()=>{
  const content=editableContent(readContent());
  assert.deepEqual(validateContent(content),[]);
  assert.equal(content.status,'membership-open');
  assert.equal(ctaFor(content).url,'https://www.patreon.com/c/books_olgaruchina/membership');
  const membership=content.sections.find(section=>section.id==='membership');
  assert.equal(membership.lead,'Membership fee: $15 USD per month');
  assert.ok(!membership.body.includes('Membership fee:'));
  assert.equal(showMembershipWaitlistNote(membership),true);
  assert.equal(content.labels.membershipWaitlistNote,'Joining the waitlist is free.');
  const lead=fromPlainText('Membership fee: $20 USD per month');lead.blocks[0].runs[0].bold=true;
  assert.equal(setCanvasRichText(content,'membership','lead','Membership fee: $20 USD per month',lead),true);
  const restored=JSON.parse(JSON.stringify(content));
  assert.deepEqual(validateContent(restored),[]);
  assert.deepEqual(restored.richText['membership:lead'],lead);
  for(const malformed of [null,42,{},'x'.repeat(151)]){
    const bad=structuredClone(content);delete bad.richText;bad.sections.find(section=>section.id==='membership').lead=malformed;
    assert.ok(validateContent(bad).some(error=>error.includes('lead')));
  }
});

test('FAQ grouping preserves visible order, respects interruptions and hidden headings',()=>{
  const content=editableContent(readContent());
  const visible=()=>content.design.blockOrder.filter(id=>id==='opening'||content.sections.find(s=>s.id===id).visible);
  assert.deepEqual(groupedSections(content).flat(),visible());
  const faq=groupedSections(content).find(group=>group[0]==='faq');
  assert.equal(faq.length,8);
  content.sections.find(s=>s.id===faq[1]).visible=false;
  assert.deepEqual(groupedSections(content).flat(),visible());
  assert.ok(!groupedSections(content).find(g=>g[0]==='faq').includes(faq[1]));
  const order=content.design.blockOrder;order.splice(order.indexOf('membership'),1);order.splice(order.indexOf(faq[3]),0,'membership');
  assert.deepEqual(groupedSections(content).flat(),visible());
  assert.ok(!groupedSections(content).find(g=>g[0]==='faq').includes(faq[3]));
  content.sections.find(s=>s.id==='faq').visible=false;
  assert.ok(groupedSections(content).every(group=>group.length===1));
});

test('only entirely bold paragraphs receive emphasis spacing',()=>{
  const whole=fromPlainText('Pay attention.');whole.blocks[0].runs[0].bold=true;
  assert.match(renderRichText(whole),/<p class="emphasis-paragraph"><strong>/);
  whole.blocks[0].runs.push({text:' More detail.'});
  assert.doesNotMatch(renderRichText(whole),/emphasis-paragraph/);
  assert.doesNotMatch(renderRichText(fromPlainText('')),/emphasis-paragraph/);
});
