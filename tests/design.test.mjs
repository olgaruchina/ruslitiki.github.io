import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContent, validateContent, selectedImagePaths } from '../src/lib/content.mjs';
import { DESIGN_DEFAULTS, PALETTES, designFor, editableContent, pageNavigation } from '../src/lib/design.mjs';

test('legacy content receives stable layout defaults without changing saved data',()=>{
  const content=readContent();delete content.design;
  content.sections=[{type:'text',heading:'About the club',body:'Read together.',visible:true}];
  const before=JSON.stringify(content);
  const editable=editableContent(content);
  assert.equal(JSON.stringify(content),before);
  assert.deepEqual(editable.design,{...DESIGN_DEFAULTS,blockOrder:['opening','section-1']});
  assert.equal(editable.sections[0].id,'section-1');
  assert.deepEqual(editableContent(editable),editable);
  assert.deepEqual(validateContent(content),[]);
  assert.deepEqual(validateContent(editable),[]);
});

test('layout colours and values reject CSS injection, unreadable combinations and invalid sizes',()=>{
  const content=readContent();content.design={background:'#ffffff',ink:'#eeeeee',accent:'#23156b'};
  assert.ok(validateContent(content).some(error=>error.includes('text needs more contrast')));
  content.design={...DESIGN_DEFAULTS,accent:'#ffffff'};
  assert.ok(validateContent(content).some(error=>error.includes('accent needs more contrast')));
  content.design={...DESIGN_DEFAULTS,background:'red;position:fixed',composition:'split onclick=alert(1)',bodySize:'20',css:'*{display:none}'};
  assert.ok(validateContent(content).some(error=>error.includes('six-digit hex')));
  assert.ok(validateContent(content).some(error=>error.includes('supported composition')));
  assert.ok(validateContent(content).some(error=>error.includes('Text size')));
  assert.ok(validateContent(content).some(error=>error.includes('unknown setting')));
  content.design={composition:['book-left']};
  assert.ok(validateContent(content).some(error=>error.includes('supported composition')));
  for(const {label,...palette} of Object.values(PALETTES)){
    content.design={...DESIGN_DEFAULTS,...palette};assert.deepEqual(validateContent(content),[],label);
  }
});

test('page ordering cannot lose or duplicate content blocks',()=>{
  const content=editableContent(readContent());
  content.sections=[{id:'quote-one',type:'quote',heading:'Reading together',body:'A supplied quotation.',attribution:'Club notes',visible:true}];
  content.design=designFor({...content,design:{...content.design,blockOrder:['quote-one','opening']}});
  assert.deepEqual(validateContent(content),[]);
  content.design.blockOrder=['opening','opening'];
  assert.ok(validateContent(content).some(error=>error.startsWith('Page order')));
  content.design.blockOrder=['opening'];
  assert.ok(validateContent(content).some(error=>error.startsWith('Page order')));
});

test('section navigation follows visible block order and preserves explicit menu choices',()=>{
  const content=editableContent(readContent());
  content.sections=[
    {id:'membership',type:'text',heading:'Membership',body:'Details.',visible:true},
    {id:'faq',type:'text',heading:'Questions',body:'Answers.',visible:false},
    {id:'custom',type:'text',heading:'A new section',body:'More.',visible:true,navLabel:'New reading'},
  ];
  content.design.blockOrder=['membership','opening','custom','faq'];
  assert.deepEqual(pageNavigation(content),[{id:'membership',label:'Membership'},{id:'first-book-title',label:'First book'},{id:'custom',label:'New reading'}]);
  content.sections[0].navLabel='';content.sections[1].visible=true;
  assert.deepEqual(pageNavigation(content).map(item=>item.id),['first-book-title','custom','faq']);
  content.sections[2].navLabel={};assert.ok(validateContent(content).some(error=>error.includes('menu label')));
  content.sections[2].navLabel='Custom';content.sections[2].id='first-book-title';
  assert.ok(validateContent(content).some(error=>error.includes('invalid block identifier')));
});

test('block images require safe paths, descriptions and dimensions; hidden images stay private',()=>{
  const content=readContent();
  content.sections=[{type:'image',heading:'Our library',body:'',visible:true,image:'/images/reading.png',imageAlt:'A shelf of books.',imageWidth:1000,imageHeight:800}];
  assert.deepEqual(validateContent(content),[]);
  content.sections[0].imageLayout=['left'];
  assert.ok(validateContent(content).some(error=>error.includes('supported imageLayout')));
  delete content.sections[0].imageLayout;
  content.sections[0].sourceUrl=['https://example.com'];
  assert.ok(validateContent(content).some(error=>error.includes('valid HTTPS')));
  delete content.sections[0].sourceUrl;
  content.sections[0].type=['text'];
  assert.ok(validateContent(content).some(error=>error.includes('supported block type')));
  content.sections[0].type='image';
  assert.ok(selectedImagePaths(content).includes('/images/reading.png'));
  content.sections[0].visible=false;
  assert.ok(!selectedImagePaths(content).includes('/images/reading.png'));
  content.sections[0].image='/images/../../secret.png';content.sections[0].imageAlt='';content.sections[0].imageWidth=Infinity;
  assert.ok(validateContent(content).length>=3);
});
