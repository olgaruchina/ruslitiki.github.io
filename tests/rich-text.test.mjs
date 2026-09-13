import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromPlainText, plainText, renderRichText, validateRichText } from '../src/lib/rich-text.mjs';
import { setCanvasRichText, validateRichContent, pruneRichText, copyRichSection } from '../src/lib/rich-fields.mjs';
import { readContent, validateContent } from '../src/lib/content.mjs';
import { editableContent, pageNavigation } from '../src/lib/design.mjs';
import { setCanvasText } from '../src/lib/canvas-model.mjs';

test('rich text produces semantic emphasis and grouped lists while preserving searchable plain copy',()=>{
  const doc={blocks:[
    {type:'paragraph',runs:[{text:'Read ',bold:true},{text:'together',italic:true}]},
    {type:'bullet',runs:[{text:'A guide'}]},
    {type:'bullet',runs:[{text:'A conversation',bold:true,italic:true}]},
    {type:'number',runs:[{text:'Join'}]},
  ]};
  assert.deepEqual(validateRichText(doc),[]);
  assert.equal(plainText(doc),'Read together\nA guide\nA conversation\nJoin');
  assert.equal(renderRichText(doc),'<p><strong>Read </strong><em>together</em></p><ul><li>A guide</li><li><strong><em>A conversation</em></strong></li></ul><ol><li>Join</li></ol>');
  assert.equal(plainText(fromPlainText('One\n\nTwo')),'One\n\nTwo');
  assert.ok(validateRichText(doc,{inline:true}).length,'Buttons and headings cannot contain lists.');
});

test('rich text escapes pasted markup and rejects attributes, unknown tags and malformed marks',()=>{
  assert.equal(renderRichText(fromPlainText('<script>alert(1)</script>'),{inline:true}),'&lt;script&gt;alert(1)&lt;/script&gt;');
  for(const doc of [
    {blocks:[],html:'<img src=x onerror=alert(1)>'},
    {blocks:[{type:'iframe',runs:[{text:'x'}]}]},
    {blocks:[{type:'paragraph',runs:[{text:'x',href:'javascript:alert(1)'}]}]},
    {blocks:[{type:'paragraph',runs:[{text:'x',bold:'true'}]}]},
    {blocks:[{type:'paragraph',runs:[{text:'x'}],onclick:'alert(1)'}]},
  ]){assert.ok(validateRichText(doc).length);assert.equal(renderRichText(doc),'');}
});

test('formatting updates persist alongside canonical text, including labels and aliased menu links',()=>{
  const content=editableContent(readContent());
  const body={blocks:[{type:'bullet',runs:[{text:'Read each week',bold:true}]},{type:'bullet',runs:[{text:'Meet at the end',italic:true}]}]};
  assert.equal(setCanvasRichText(content,'how-the-club-works','body',plainText(body),body),true);
  const label={blocks:[{type:'paragraph',runs:[{text:'This month’s book',italic:true}]}]};
  assert.equal(setCanvasRichText(content,'labels','bookLabel',plainText(label),label),true);
  assert.equal(content.labels.bookLabel,'This month’s book');
  const nav=pageNavigation(content).find(item=>item.id==='meet-ruslitiki');
  assert.equal(nav.blockId,'how-the-club-works');assert.equal(nav.field,'navLabel');
  assert.equal(setCanvasText(content,nav.blockId,nav.field,'Our reading rhythm'),true);
  assert.equal(pageNavigation(content).find(item=>item.id==='meet-ruslitiki').label,'Our reading rhythm');
  assert.deepEqual(validateRichContent(content),[]);assert.deepEqual(validateContent(content),[]);
  assert.deepEqual(validateContent(JSON.parse(JSON.stringify(content))),[]);
  assert.equal(setCanvasRichText(content,'labels','bookLabel','Different text',label),false);
  assert.equal(setCanvasRichText(content,'opening','waitlistUrl','x',fromPlainText('x')),false);
  content.richText['opening:waitlistUrl']=fromPlainText('x');assert.ok(validateContent(content).length);
});

test('replacing prose and deleting or duplicating a section keep formatting attached to the right content',()=>{
  const content=editableContent(readContent());
  const doc=fromPlainText('Hello');doc.blocks[0].runs[0].bold=true;
  setCanvasRichText(content,'membership','body','Hello',doc);
  const copy=structuredClone(content.sections.find(section=>section.id==='membership'));copy.id='copied-membership';content.sections.push(copy);
  copyRichSection(content,'membership',copy.id);
  assert.deepEqual(content.richText['copied-membership:body'],content.richText['membership:body']);
  content.sections.find(section=>section.id==='membership').body='New content';
  pruneRichText(content);assert.equal(content.richText['membership:body'],undefined);
  assert.ok(content.richText['copied-membership:body']);
  content.sections=content.sections.filter(section=>section.id!==copy.id);
  pruneRichText(content);assert.equal(content.richText,undefined);
});

test('visiting plain text does not dirty the draft and clearing formatting removes its stored marks',()=>{
  const content=editableContent(readContent());const before=JSON.stringify(content);
  assert.equal(setCanvasRichText(content,'opening','heading',content.heading,fromPlainText(content.heading)),false);
  assert.equal(JSON.stringify(content),before);
  const marked=fromPlainText(content.heading);marked.blocks[0].runs[0].italic=true;
  setCanvasRichText(content,'opening','heading',content.heading,marked);
  assert.equal(setCanvasRichText(content,'opening','heading',content.heading,fromPlainText(content.heading)),true);
  assert.equal(content.richText,undefined);
});
