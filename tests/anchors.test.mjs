import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionAnchors, materializeSectionAnchors, validateSectionAnchors } from '../src/lib/anchors.mjs';

const generated=(number,heading='',rest={})=>({id:`section-00000000-0000-0000-0000-${String(number).padStart(12,'0')}`,heading,visible:true,...rest});
const contact=rest=>({id:'section-bb4b953e-a094-43dd-baec-239fd87471e6',heading:'Contact information',visible:true,...rest});

test('existing named identifiers stay stable while generated sections receive readable links',()=>{
  const sections=[{id:'membership',heading:'Your membership'},contact(),generated(1,'Café & Reading'),generated(2,'2027 reading'),generated(3,'Книги')];
  const original=structuredClone(sections);
  assert.deepEqual([...sectionAnchors(sections).values()],['membership','contact','cafe-reading','section-2027-reading','section']);
  assert.deepEqual(sections,original,'Rendering does not mutate editor content.');
});

test('allocation reserves hidden identifiers and explicit links before deriving defaults',()=>{
  const sections=[generated(1,'Reading'),generated(2,'Reading'),{id:'reading',heading:'Hidden',visible:false},generated(3,'Different',{anchor:'reading-2',visible:false})];
  assert.deepEqual([...sectionAnchors(sections).values()],['reading-3','reading-4','reading','reading-2']);
  assert.deepEqual(sectionAnchors(sections),sectionAnchors(structuredClone(sections)));
  const content={sections,design:{blockOrder:sections.map(section=>section.id).reverse()}};
  materializeSectionAnchors(content);
  content.design.blockOrder.reverse();
  content.sections[0].heading='Renamed reading';
  content.sections[2].visible=true;
  assert.deepEqual([...sectionAnchors(content.sections).values()],['reading-3','reading-4','reading','reading-2']);
});

test('blank new sections remain unnamed until saving their heading or button label',()=>{
  const first=generated(1),second=generated(2,'',{buttonLabel:'Get in touch'});
  const content={sections:[first,second]};
  materializeSectionAnchors(content);
  assert.equal(Object.hasOwn(first,'anchor'),false);
  assert.equal(sectionAnchors(content.sections).get(first.id),first.id);
  assert.equal(second.anchor,'get-in-touch');
  first.heading='Our calendar';
  materializeSectionAnchors(content);
  assert.equal(first.anchor,'our-calendar');
  first.heading='The next chapter';
  second.buttonLabel='Ask Olga';
  materializeSectionAnchors(content);
  assert.equal(first.anchor,'our-calendar');
  assert.equal(second.anchor,'get-in-touch');
  first.anchor='';
  materializeSectionAnchors(content);
  assert.equal(first.anchor,'the-next-chapter');
});

test('explicit choices and legacy named identifiers are never replaced on materialization',()=>{
  const sections=[contact({anchor:'ask-olga'}),{id:'membership',heading:'Join us',anchor:''},generated(1,'Changed heading',{anchor:'original-link'})];
  const content={sections};
  materializeSectionAnchors(content);
  assert.deepEqual([...sectionAnchors(sections).values()],['ask-olga','membership','original-link']);
  assert.equal(sections[1].anchor,'');
  const saved=structuredClone(content);
  materializeSectionAnchors(content);
  assert.deepEqual(content,saved);
});

test('derived links avoid reserved IDs and namespaces, and stay within the length limit',()=>{
  const heading='A'.repeat(100);
  const sections=[generated(1,'Main'),generated(2,'Canvas content'),generated(3,'Ruslitiki navigation drawer'),generated(4,heading),generated(5,heading)];
  materializeSectionAnchors({sections});
  assert.deepEqual(sections.slice(0,3).map(section=>section.anchor),['main-2','section-canvas-content','section-ruslitiki-navigation-drawer']);
  assert.equal(sections[3].anchor.length,61);
  assert.equal(sections[4].anchor.length,61);
  assert.ok(sections[4].anchor.endsWith('-2'));
  assert.deepEqual(validateSectionAnchors(sections),[]);
});

test('validation reports conflicting explicit links, including cloned and hidden sections',()=>{
  const original=contact({anchor:'contact'});
  const duplicate={...original,id:generated(1).id,visible:false};
  assert.ok(validateSectionAnchors([original,duplicate]).some(error=>error.includes('another section link')));
  assert.ok(validateSectionAnchors([{id:'contact',heading:'Existing',visible:false},original]).some(error=>error.includes('another section identifier')));
  assert.deepEqual(validateSectionAnchors([{id:'contact',heading:'Contact',anchor:'contact'}]),[]);
  assert.deepEqual(validateSectionAnchors([generated(1,'About'),generated(2,'About',{anchor:''})]),[]);
});

test('validation rejects invalid or reserved custom fragments without rewriting them',()=>{
  for(const anchor of ['Contact','#contact','about us','about--us','about-','4-books','a'.repeat(62),null,undefined,42,{},[]]){
    const section=generated(1,'About',{anchor});
    assert.ok(validateSectionAnchors([section]).length,JSON.stringify(anchor));
    materializeSectionAnchors({sections:[section]});
    assert.equal(section.anchor,anchor);
  }
  for(const anchor of ['opening','labels','main','canvas-content','first-book-title','canvas-tools','ruslitiki-navigation-1-drawer'])assert.ok(validateSectionAnchors([generated(1,'About',{anchor})]).some(error=>error.includes('reserved')),anchor);
});
