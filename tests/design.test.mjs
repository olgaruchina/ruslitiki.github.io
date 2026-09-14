import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContent, validateContent, selectedImagePaths } from '../src/lib/content.mjs';
import { DESIGN_DEFAULTS, PALETTES, designFor, editableContent, pageNavigation } from '../src/lib/design.mjs';
const publicNavigation=content=>pageNavigation(content).map(({id,label})=>({id,label}));

test('legacy content receives stable layout defaults without changing saved data',()=>{
  const content=readContent();delete content.design;
  content.sections=[{type:'text',heading:'About the club',body:'Read together.',visible:true}];
  const before=JSON.stringify(content);
  const editable=editableContent(content);
  assert.equal(JSON.stringify(content),before);
  assert.deepEqual(editable.design,{...DESIGN_DEFAULTS,blockOrder:['opening','section-1']});
  assert.equal(editable.sections[0].id,'section-1');
  assert.equal(editable.sections[0].divider,'auto');
  assert.deepEqual(editableContent(editable),editable);
  assert.deepEqual(validateContent(content),[]);
  assert.deepEqual(validateContent(editable),[]);
});

test('section separators accept explicit overrides and reject unsupported values in drafts and releases',()=>{
  const content=readContent();
  for(const value of ['auto','line','none']){
    content.sections[0].divider=value;
    for(const options of [{},{draft:true}])assert.deepEqual(validateContent(content,options),[]);
    assert.equal(editableContent(content).sections[0].divider,value);
  }
  for(const value of [true,false,null,[],{},'solid','line;display:none']){
    content.sections[0].divider=value;
    for(const options of [{},{draft:true}])assert.ok(validateContent(content,options).some(error=>error.includes('supported divider')));
  }
});

test('background book drawings default off for older drafts and accept only boolean settings',()=>{
  const content=readContent();content.design={};
  const before=JSON.stringify(content);
  assert.equal(DESIGN_DEFAULTS.bookImprints,false);
  assert.equal(designFor(content).bookImprints,false);
  assert.equal(editableContent(content).design.bookImprints,false);
  assert.equal(JSON.stringify(content),before);
  for(const value of [true,false]){
    content.design.bookImprints=value;
    assert.deepEqual(validateContent(content),[]);
    assert.equal(editableContent(content).design.bookImprints,value);
  }
  for(const value of ['true','false',1,0,null,undefined,[],{}]){
    content.design.bookImprints=value;
    assert.ok(validateContent(content).some(error=>error.startsWith('Background book drawings:')));
  }
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
  assert.deepEqual(publicNavigation(content),[{id:'membership',label:'Membership'},{id:'first-book-title',label:"October's Book"},{id:'custom',label:'New reading'}]);
  content.sections[0].navLabel='';content.sections[1].visible=true;
  assert.deepEqual(publicNavigation(content).map(item=>item.id),['first-book-title','custom','faq']);
  content.sections[2].navLabel={};assert.ok(validateContent(content).some(error=>error.includes('menu label')));
  content.sections[2].navLabel='Custom';content.sections[2].id='first-book-title';
  assert.ok(validateContent(content).some(error=>error.includes('invalid block identifier')));
});

const introductionNavigationContent=()=>{
  const content=editableContent(readContent());
  content.sections=[
    {id:'meet-ruslitiki',type:'video',heading:'Meet Ruslitiki',body:'An introduction.',videoUrl:'https://youtu.be/m9CKv9oMYRY',visible:true},
    {id:'how-the-club-works',type:'text',heading:'How the club works',body:'Read together.',visible:true},
    {id:'membership',type:'text',heading:'Membership',body:'Details.',visible:true},
  ];
  content.design.blockOrder=['opening','meet-ruslitiki','how-the-club-works','membership'];
  return content;
};

test('custom section links change navigation while keeping editing targets and saved links stable',()=>{
  const content=introductionNavigationContent();
  content.sections[0].anchor='club-introduction';
  content.sections[1].anchor='our-format';
  const contact={id:'section-00000000-0000-0000-0000-000000000001',type:'text',heading:'Reading calendar',body:'Dates.',visible:true,navLabel:'Calendar'};
  content.sections.push(contact);content.design.blockOrder.push(contact.id);
  const draft=editableContent(content);
  const saved=draft.sections.at(-1);saved.heading='November dates';
  assert.equal(saved.anchor,'reading-calendar');
  assert.deepEqual(pageNavigation(draft)[1],{id:'club-introduction',label:'How it works',blockId:'how-the-club-works',field:'navLabel'});
  assert.equal(pageNavigation(draft).at(-1).id,'reading-calendar');
  assert.deepEqual(validateContent(draft),[]);
  saved.anchor='club-introduction';
  for(const options of [{},{draft:true}])assert.ok(validateContent(draft,options).some(error=>error.includes('another section link')));
});

test('How it works includes its adjacent visible introduction without a separate intro menu item',()=>{
  const content=introductionNavigationContent();
  assert.deepEqual(publicNavigation(content),[
    {id:'first-book-title',label:"October's Book"},
    {id:'meet-ruslitiki',label:'How it works'},
    {id:'membership',label:'Membership'},
  ]);
  const separator={id:'extra-note',type:'text',heading:'More context',body:'An optional note.',visible:false};
  content.sections.push(separator);
  content.design.blockOrder.splice(2,0,separator.id);
  assert.equal(publicNavigation(content)[1].id,'meet-ruslitiki','Hidden sections do not separate a visible group.');
  separator.visible=true;
  assert.equal(publicNavigation(content)[1].id,'how-the-club-works','Visible sections separate the group even without a menu label.');
});

test('How it works retains its own target when the introduction is hidden, missing or no longer a video',()=>{
  const content=introductionNavigationContent();
  content.sections[0].visible=false;
  assert.equal(publicNavigation(content)[1].id,'how-the-club-works');
  content.sections[0].visible=true;content.sections[0].type='text';
  assert.equal(publicNavigation(content)[1].id,'how-the-club-works');
  content.sections.shift();
  content.design.blockOrder=content.design.blockOrder.filter(id=>id!=='meet-ruslitiki');
  assert.equal(publicNavigation(content)[1].id,'how-the-club-works');
});

test('reordering the introduction keeps navigation in the visible section order',()=>{
  const content=introductionNavigationContent();
  content.design.blockOrder=['opening','meet-ruslitiki','membership','how-the-club-works'];
  assert.deepEqual(publicNavigation(content).map(item=>item.id),['first-book-title','membership','how-the-club-works']);
  content.design.blockOrder=['opening','how-the-club-works','meet-ruslitiki','membership'];
  assert.deepEqual(publicNavigation(content).map(item=>item.id),['first-book-title','how-the-club-works','membership']);
  content.design.blockOrder=['meet-ruslitiki','opening','how-the-club-works','membership'];
  assert.deepEqual(publicNavigation(content).map(item=>item.id),['first-book-title','how-the-club-works','membership']);
});

test('explicit introduction and How it works menu labels remain editable',()=>{
  const content=introductionNavigationContent();
  content.sections[0].navLabel='Meet Olga Ruchina';
  content.sections[1].navLabel='Our format';
  assert.deepEqual(publicNavigation(content).slice(1,3),[
    {id:'meet-ruslitiki',label:'Meet Olga Ruchina'},
    {id:'how-the-club-works',label:'Our format'},
  ]);
  content.sections[0].navLabel='';
  assert.deepEqual(publicNavigation(content)[1],{id:'meet-ruslitiki',label:'Our format'});
  content.sections[1].navLabel='';
  assert.deepEqual(publicNavigation(content).map(item=>item.id),['first-book-title','membership']);
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
