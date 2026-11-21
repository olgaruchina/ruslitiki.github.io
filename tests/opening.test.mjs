import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readContent as legacyContent} from './fixtures/legacy-content.mjs';
import {editableContent} from '../src/lib/design.mjs';
import {validateContent} from '../src/lib/content.mjs';
import {setCanvasRichText} from '../src/lib/rich-fields.mjs';
import {plainText} from '../src/lib/rich-text.mjs';
import {renderLlms} from '../src/lib/llms.mjs';

test('the retired opening heading is optional and excluded from the public overview',()=>{
  const c=legacyContent();
  c.heading='Russian literature, but make it fun';
  assert.equal(renderLlms(c,'https://www.ruslitiki.com/').includes(c.heading),false);
  delete c.heading;
  assert.deepEqual(validateContent(c),[]);
  assert.equal(editableContent(c).heading,undefined);
});

test('new opening fields keep owner text and formatting through save and reload',()=>{
  const c=editableContent(legacyContent());
  const doc={blocks:[{type:'paragraph',runs:[{text:'Written by Olga',bold:true,italic:true}]},{type:'bullet',runs:[{text:'A weekly video'}]}]};
  for(const field of ['book.description','signupBenefits','waitlistNote'])assert.equal(setCanvasRichText(c,'opening',field,plainText(doc),doc),true);
  assert.deepEqual(validateContent(c),[]);
  assert.deepEqual(editableContent(JSON.parse(JSON.stringify(c))),c);
  c.book.description='';delete c.richText['opening:book.description'];
  c.signupBenefits='';delete c.richText['opening:signupBenefits'];
  c.waitlistNote='';delete c.richText['opening:waitlistNote'];
  const restored=editableContent(c);
  assert.equal(restored.book.description,'');assert.equal(restored.signupBenefits,'');assert.equal(restored.waitlistNote,'');
});

test('the AI overview follows cover visibility and the active join mode',()=>{
  const c=editableContent(legacyContent());c.book.description='An owner-written description.';c.waitlistNote='An owner-written waitlist note.';
  c.joinMode='waitlist';c.book.showArtwork=true;
  const output=()=>renderLlms(c,'https://www.ruslitiki.com/');
  assert.ok(output().includes(c.book.description) && output().includes(c.waitlistNote));
  c.book.showArtwork=false;c.joinMode='patreon';
  assert.equal(output().includes(c.book.description),false);
  assert.equal(output().includes(c.waitlistNote),false);
});

test('an older draft moves its signup invitation after the book and preserves its original file',()=>{
  const c=legacyContent();
  c.introduction='Fall in love with Russian classics, one book at a time. Discover the stories behind the stories.\nJoin the waitlist for our December read!';
  const before=JSON.stringify(c);
  const updated=editableContent(c);
  assert.equal(JSON.stringify(c),before);
  assert.equal(updated.introduction,'');
  assert.equal(updated.signupHeading,'Join the waitlist for our December read!');
  assert.equal(updated.book.description,c.book.note);
  assert.deepEqual(editableContent(updated),updated);
  updated.signupHeading='My own heading';updated.waitlistNote='My own note';
  assert.equal(editableContent(updated).signupHeading,'My own heading');
  assert.equal(editableContent(updated).waitlistNote,'My own note');
  assert.deepEqual(validateContent(updated),[]);
});
