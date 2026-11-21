import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readContent,validateContent,selectedImagePaths} from '../src/lib/content.mjs';
import {editableContent} from '../src/lib/design.mjs';
import {insertSection} from '../src/lib/canvas-model.mjs';

test('an empty extra image block reports its own problem without blaming the selected book cover',()=>{
  const content=editableContent(readContent());
  content.book.description='Olga has expanded the book description.';
  const number=content.sections.length+1;
  const image=insertSection(content,'image',null,'section-unfinished-image');
  assert.ok(content.book.coverImage);
  assert.deepEqual(validateContent(content,{draft:true}),[]);
  assert.deepEqual(validateContent(content),[`Section ${number}: this Image and text block is empty. Complete it, hide it, or remove it before publishing.`]);
  image.visible=false;
  assert.deepEqual(validateContent(content),[]);
  assert.equal(content.book.description,'Olga has expanded the book description.');
  assert.ok(selectedImagePaths(content).includes(content.book.coverImage));
  image.visible=true;
  assert.equal(validateContent(content).length,1);
});

test('missing image dimensions and oversized images get distinct single errors',()=>{
  const content=editableContent(readContent());
  const image=insertSection(content,'image',null,'section-size-check');
  Object.assign(image,{heading:'A reading guide',image:content.book.coverImage,imageAlt:'A book cover',imageWidth:0,imageHeight:0});
  assert.match(validateContent(content)[0],/image size could not be read/);
  assert.equal(validateContent(content).length,1);
  image.imageWidth=14000;image.imageHeight=15000;
  assert.equal(validateContent(content).length,1);
  assert.match(validateContent(content)[0],/12,000 pixels/);
  image.imageWidth=970;image.imageHeight=1500;
  assert.deepEqual(validateContent(content),[]);
});

test('hidden unfinished blocks do not prevent a preview, while unsafe paths and links still fail',()=>{
  const content=editableContent(readContent());
  for(const type of ['image','text','quote','faq','video','button']){
    const block=insertSection(content,type,null,'section-hidden-'+type);block.visible=false;
  }
  assert.deepEqual(validateContent(content),[]);
  const image=content.sections.find(section=>section.id==='section-hidden-image');
  image.image='/images/../../private.jpg';image.imageWidth=10;image.imageHeight=10;
  assert.ok(validateContent(content).some(error=>error.includes('upload a PNG')));
  image.image='';image.imageWidth=0;image.imageHeight=0;
  const button=content.sections.find(section=>section.id==='section-hidden-button');
  button.buttonUrl='javascript:alert(1)';
  assert.ok(validateContent(content).some(error=>error.includes('button:')));
});
