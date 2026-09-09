import { DESIGN_DEFAULTS, DESIGN_OPTIONS, PALETTES, SECTION_OPTIONS, SECTION_TYPES, MAX_SECTIONS, editableContent, contrast } from '/design.mjs';
const $ = selector => document.querySelector(selector);
const token = $('meta[name="studio-token"]').content;
let state=null;
let draft=null;
let dirty=false;
let working=false;
let previewUrl='';
let past=[],future=[],lastSnapshot='';
const get=(object,key)=>key.split('.').reduce((value,part)=>value[part],object);
const set=(object,key,value)=>{const parts=key.split('.');const last=parts.pop();parts.reduce((item,part)=>item[part],object)[last]=value;};
function failure(error){$('#error').textContent=error.message;$('#error').hidden=false;}
async function request(path,data){
  const response=await fetch(path,data===undefined ? {cache:'no-store'} : {method:'POST',headers:{'Content-Type':'application/json','X-Studio-Token':token},body:JSON.stringify(data)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error || 'Something went wrong. Your draft has not been discarded.');
  return result;
}
function renderFields(){
  for(const field of $('#editor').querySelectorAll('[name]')){
    if(field.type==='radio')field.checked=field.value===get(draft,field.name);
    else if(field.type==='checkbox')field.checked=get(draft,field.name)!==false;
    else field.value=get(draft,field.name);
  }
  renderSections();
  renderDesignState();
}
function changed(){
  const snapshot=JSON.stringify(draft);
  if(lastSnapshot && snapshot!==lastSnapshot){past.push(JSON.parse(lastSnapshot));if(past.length>40)past.shift();future=[];}
  lastSnapshot=snapshot;dirty=snapshot!==JSON.stringify(editableContent(state.content));$('#error').hidden=true;renderDesignState();update();
}
function historyMove(from,to){
  if(working || state?.busy || !from.length)return;
  to.push(structuredClone(draft));draft=from.pop();lastSnapshot=JSON.stringify(draft);
  dirty=lastSnapshot!==JSON.stringify(editableContent(state.content));$('#error').hidden=true;renderFields();update();
}
$('#undo').addEventListener('click',()=>historyMove(past,future));
$('#redo').addEventListener('click',()=>historyMove(future,past));
function update(){
  if(!state)return;
  const busy=working || state.busy;
  $('#undo').disabled=busy || !past.length;$('#redo').disabled=busy || !future.length;
  $('#save-state').textContent=busy ? 'Working…' : dirty ? 'Unsaved changes' : 'Draft saved';
  $('#save').disabled=busy || !dirty;
  $('#preview').disabled=busy;
  $('#preview').textContent=busy ? 'Please wait…' : 'Prepare preview';
  $('#publish').disabled=busy || dirty || !state.configured || !state.preview?.current;
  $('#restore').disabled=busy || !state.canRestore;
  $('#connect-publishing').disabled=busy;
  $('#connect-publishing').textContent=busy?'Please wait…':'Check publishing connection';
  $('#connection-title').textContent=state.configured?'Publishing is connected':'Connect the Publish button';
  renderConnection();
  $('#status-message').textContent=state.message;
  if(state.preview){
    const current=state.preview.current && !dirty;
    $('#preview-state').textContent=current ? `Ready · ${new Date(state.preview.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : 'Your draft changed. Prepare a new preview.';
    if(previewUrl!==state.preview.url){previewUrl=state.preview.url;$('#preview-frame').src=previewUrl;}
    $('#preview-frame').hidden=false;$('#preview-empty').hidden=true;
    $('#open-preview').href=previewUrl;$('#open-preview').hidden=false;
  }
  if(state.publication){$('#live-link').href=state.publication.url;$('#live-link').hidden=false;}
  $('#publish-help').textContent=state.configured ? 'Only the saved version you previewed will go live.' : 'Saving and previewing are ready. Public publishing is not connected yet.';
}
async function operation(fn){
  if(working)return;
  working=true;$('#error').hidden=true;update();
  // Prevent editing fields while a saved snapshot is being submitted.
  for(const control of $('#editor').querySelectorAll('input,textarea,select,button'))control.disabled=true;
  try{await fn();}catch(error){failure(error);}finally{
    working=false;
    for(const control of $('#editor').querySelectorAll('input,textarea,select,button'))control.disabled=false;
    renderSections();
    update();
  }
}
async function save(){
  state=await request('/api/save',{content:draft,revision:state.revision});
  draft=editableContent(state.content);lastSnapshot=JSON.stringify(draft);dirty=false;update();
}
$('#editor').addEventListener('submit',event=>event.preventDefault());
$('#editor').addEventListener('input',event=>{
  if(event.target.name){
    const field=event.target;
    const value=field.type==='checkbox' ? field.checked : ['range','number'].includes(field.type) ? Number(field.value) : field.value;
    set(draft,field.name,value);
    if(field.name.startsWith('design.') && /^#[0-9a-f]{6}$/i.test(value))for(const peer of $('#editor').querySelectorAll('[name]'))if(peer!==field && peer.name===field.name)peer.value=value;
    changed();
  }
});
$('#save').addEventListener('click',()=>operation(save));
$('#connect-publishing').addEventListener('click',()=>operation(async()=>{
  const result=await request('/api/connect-publishing',{});
  // Checking the connection must preserve local edits and their conflict revision.
  state={...state,configured:result.configured,connection:result.connection,message:result.message,busy:result.busy};
  if(result.revision!==state.revision && state.preview)state.preview={...state.preview,current:false};
  update();
}));
$('#preview').addEventListener('click',()=>operation(async()=>{if(dirty)await save();state=await request('/api/preview',{revision:state.revision});update();}));
$('#publish').addEventListener('click',()=>$('#publish-dialog').showModal());
$('#cancel-publish').addEventListener('click',()=>$('#publish-dialog').close());
$('#confirm-publish').addEventListener('click',()=>{
  $('#publish-dialog').close();
  operation(async()=>{state=await request('/api/publish',{previewId:state.preview.id,confirmed:true});update();});
});
$('#restore').addEventListener('click',()=>$('#restore-dialog').showModal());
$('#cancel-restore').addEventListener('click',()=>$('#restore-dialog').close());
$('#confirm-restore').addEventListener('click',()=>{
  $('#restore-dialog').close();
    operation(async()=>{if(dirty)await save();state=await request('/api/restore',{revision:state.revision});draft=editableContent(state.content);lastSnapshot=JSON.stringify(draft);past=[];future=[];dirty=false;renderFields();update();});
});
function activateTab(button){
  for(const tab of document.querySelectorAll('[role="tab"]')){
    const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;
  }
}
for(const button of document.querySelectorAll('[role="tab"]')){
  button.addEventListener('click',()=>activateTab(button));
  button.addEventListener('keydown',event=>{
    const buttons=[...document.querySelectorAll('[role="tab"]')];let index=buttons.indexOf(button);
    if(event.key==='ArrowRight')index=(index+1)%buttons.length;
    else if(event.key==='ArrowLeft')index=(index+buttons.length-1)%buttons.length;
    else if(event.key==='Home')index=0;
    else if(event.key==='End')index=buttons.length-1;
    else return;
    event.preventDefault();activateTab(buttons[index]);buttons[index].focus();
  });
}
for(const [id,phone] of [['desktop',false],['mobile',true]])$('#'+id).addEventListener('click',()=>{
  $('#preview-stage').classList.toggle('phone',phone);$('#desktop').setAttribute('aria-pressed',String(!phone));$('#mobile').setAttribute('aria-pressed',String(phone));
});
$('#logo-upload').addEventListener('change',event=>{
  const file=event.target.files[0];if(!file)return;
  operation(async()=>{
    if(file.size>2*1024*1024)throw new Error('Choose an image smaller than 2 MB.');
    const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
    const result=await request('/api/upload',{base64});draft.logo=result.path;draft.logoPresentation='image';changed();$('#image-status').textContent='Image added. Save and preview to see it in place.';
  });
});
$('#original-logo').addEventListener('click',()=>{draft.logo='/images/ruslitiki-original.png';draft.logoPresentation='original-banner';changed();$('#image-status').textContent='Original wordmark selected.';});
function element(tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
let renderedConnection=null;
function renderConnection(){
  const connection=state.connection;
  if(connection===renderedConnection)return;
  renderedConnection=connection;
  const list=$('#connection-checks');list.replaceChildren();list.hidden=!connection;
  if(!connection)return;
  for(const check of connection.checks){
    const item=element('li');item.className=check.ready?'connection-ready':'connection-action';
    item.append(element('strong',(check.ready?'Ready: ':'Action needed: ')+check.label),element('p',check.detail));
    if(!check.ready && check.url){const link=element('a','Open GitHub settings ↗');link.href=check.url;link.target='_blank';link.rel='noopener';item.append(link);}
    list.append(item);
  }
  $('#connection-time').textContent='Last checked '+new Date(connection.checkedAt).toLocaleString()+'. Check again after changing settings.';
}
function selectControl(key,label,choices,value,onChange){
  const wrapper=element('label',label);const select=element('select');
  if(key)select.name=key;
  for(const [value,text] of Object.entries(choices)){const option=element('option',text);option.value=value;select.append(option);}
  if(value!==undefined)select.value=value;
  if(onChange)select.addEventListener('change',()=>onChange(select.value));
  wrapper.append(select);return wrapper;
}
function buildDesignControls(){
  for(const [value,label] of Object.entries(DESIGN_OPTIONS.composition)){
    const choice=element('label');choice.className='layout-option';
    const input=element('input');input.type='radio';input.name='design.composition';input.value=value;
    const sketch=element('span');sketch.className='layout-sketch sketch-'+value;sketch.setAttribute('aria-hidden','true');sketch.append(element('span'),element('span'));
    choice.append(input,sketch,element('span',label));$('#layout-choices').append(choice);
  }
  const groups={
    'size-controls':[['width','Page width'],['spacing','Space between sections'],['logoSize','Wordmark size'],['headingSize','Main heading size']],
    'type-controls':[['headingFont','Headings'],['bodyFont','Paragraphs']],
    'art-controls':[['artworkPlacement','Illustration placement'],['artworkSize','Illustration size'],['buttonStyle','Button shape']],
  };
  for(const [id,fields] of Object.entries(groups))for(const [key,label] of fields)$('#'+id).append(selectControl('design.'+key,label,DESIGN_OPTIONS[key]));
  for(const [id,palette] of Object.entries(PALETTES)){
    const button=element('button');button.type='button';button.className='palette-button palette-'+id;
    const swatch=element('span');swatch.className='palette-swatch';swatch.setAttribute('aria-hidden','true');button.append(swatch,element('span',palette.label));
    button.addEventListener('click',()=>{for(const key of ['background','ink','accent'])draft.design[key]=palette[key];changed();renderFields();});$('#palette-choices').append(button);
  }
  for(const [key,label] of [['background','Page background'],['ink','Text colour'],['accent','Accent colour']]){
    const group=element('div');group.className='colour-row';
    const swatchLabel=element('label',label);const swatch=element('input');swatch.type='color';swatch.name='design.'+key;swatchLabel.append(swatch);
    const hexLabel=element('label',label+' hex');hexLabel.className='hex-label';const hex=element('input');hex.name='design.'+key;hex.maxLength=7;hex.spellcheck=false;hex.autocomplete='off';hexLabel.append(hex);group.append(swatchLabel,hexLabel);$('#colour-controls').append(group);
  }
  for(const [type,label] of Object.entries(SECTION_TYPES)){
    const button=element('button','Add '+label.toLowerCase());button.type='button';button.dataset.addType=type;
    button.addEventListener('click',()=>addSection(type));$('#add-block-controls').append(button);
  }
}
function renderDesignState(){
  if(!draft?.design)return;
  $('#body-size-value').value=draft.design.bodySize+'px';
  const d=draft.design;const valid=[d.background,d.ink,d.accent].every(value=>/^#[0-9a-f]{6}$/i.test(value));
  const readable=valid && contrast(d.background,d.ink)>=4.5 && contrast(d.background,d.accent)>=4.5;
  $('#contrast-status').textContent=readable ? 'Colours have readable text contrast.' : 'Adjust the colours for readable contrast before saving, or choose a palette above.';
  $('#contrast-status').classList.toggle('contrast-warning',!readable);
}
$('#reset-design').addEventListener('click',()=>{draft.design={...DESIGN_DEFAULTS,blockOrder:[...draft.design.blockOrder]};changed();renderFields();});
let activeBlockId=null;
function addSection(type){
  if(draft.sections.length>=MAX_SECTIONS)return;
  const section={id:'section-'+crypto.randomUUID(),type,heading:'',body:'',visible:true,width:'reading',align:'left',tone:'plain',layout:'single'};
  if(type==='quote')section.attribution='';
  if(type==='image')Object.assign(section,{image:'',imageAlt:'',imageWidth:0,imageHeight:0,caption:'',sourceUrl:'',imageLayout:'left',imageRatio:'auto'});
  draft.sections.push(section);draft.design.blockOrder.push(section.id);activeBlockId=section.id;changed();renderSections();
  document.getElementById('edit-'+section.id).querySelector('input').focus();
}
function moveBlock(id,position){
  if(working || state?.busy)return;
  const order=draft.design.blockOrder;const from=order.indexOf(id);
  if(from<0 || position<0 || position>=order.length || from===position)return;
  order.splice(from,1);order.splice(position,0,id);changed();renderSections();
  const row=document.getElementById('order-'+id);row.focus();$('#block-status').textContent=`Moved to position ${position+1}.`;
}
async function uploadBlockImage(file,section){
  if(file.size>2*1024*1024)throw new Error('Choose an image smaller than 2 MB.');
  let bitmap;
  try{bitmap=await createImageBitmap(file);}catch{throw new Error('This image could not be opened. Choose a PNG, JPEG or WebP.');}
  const width=bitmap.width,height=bitmap.height;bitmap.close();
  if(width>12000 || height>12000)throw new Error('Choose an image no larger than 12,000 pixels on either side.');
  const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('The image could not be read.'));reader.readAsDataURL(file);});
  const result=await request('/api/upload',{base64});Object.assign(section,{image:result.path,imageWidth:width,imageHeight:height});changed();
}
function renderSections(){
  if(!draft)return;
  const open=new Set([...$('#sections').querySelectorAll('details[open]')].map(node=>node.dataset.sectionId));
  $('#sections').replaceChildren();$('#page-order').replaceChildren();
  const byId=new Map(draft.sections.map(section=>[section.id,section]));
  for(const [position,id] of draft.design.blockOrder.entries()){
    const section=byId.get(id);const label=id==='opening'?'Introduction & first book':section.heading || SECTION_TYPES[section.type];
    const row=element('li');row.className='order-row';row.id='order-'+id;row.tabIndex=-1;row.draggable=true;
    const name=element('span',label+(section?.visible===false?' (hidden)':''));name.className='order-label';row.append(name);
    const controls=element('div');controls.className='order-actions';
    for(const [text,delta] of [['Move up',-1],['Move down',1]]){
      const button=element('button',text);button.type='button';button.disabled=position+delta<0 || position+delta>=draft.design.blockOrder.length;
      button.setAttribute('aria-label',text+': '+label);button.addEventListener('click',()=>moveBlock(id,position+delta));controls.append(button);
    }
    const edit=element('button','Edit');edit.type='button';edit.addEventListener('click',()=>{
      if(id==='opening'){activateTab($('#tab-design'));$('#tab-design').focus();return;}
      activeBlockId=id;const card=document.getElementById('edit-'+id);card.open=true;card.scrollIntoView({block:'nearest'});card.querySelector('input').focus();
    });controls.append(edit);row.append(controls);
    row.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',id);event.dataTransfer.effectAllowed='move';});
    row.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='move';});
    row.addEventListener('drop',event=>{event.preventDefault();const moved=event.dataTransfer.getData('text/plain');if(draft.design.blockOrder.includes(moved))moveBlock(moved,position);});
    $('#page-order').append(row);
    if(!section)continue;
    const wrapper=element('details');wrapper.className='section-item block-editor';wrapper.id='edit-'+id;wrapper.dataset.sectionId=id;wrapper.open=open.has(id) || activeBlockId===id;
    wrapper.append(element('summary',SECTION_TYPES[section.type]+' · '+(section.heading || 'New block')));
    const fields=element('div');fields.className='block-fields';
    const textField=(key,label,tag='input',max=150)=>{
      const field=element('label',label);const input=element(tag);input.value=section[key]??'';input.maxLength=max;if(tag==='textarea')input.rows=4;
      input.addEventListener('input',()=>{section[key]=input.value;changed();if(key==='heading'){name.textContent=section.heading || SECTION_TYPES[section.type];wrapper.querySelector('summary').textContent=SECTION_TYPES[section.type]+' · '+(section.heading || 'New block');}});field.append(input);fields.append(field);
    };
    textField('heading',section.type==='faq'?'Question':'Heading');
    textField('body',section.type==='faq'?'Answer':section.type==='quote'?'Quote':section.type==='image'?'Text (optional)':'Text','textarea',1400);
    if(section.type==='quote')textField('attribution','Attribution (optional)');
    if(section.type==='image'){
      if(section.image){const thumbnail=element('img');thumbnail.src='/media/'+section.image.split('/').pop();thumbnail.alt=section.imageAlt || 'Selected image';thumbnail.className='block-image-preview';fields.append(thumbnail);}
      const label=element('label',section.image?'Replace image':'Choose image');const upload=element('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';
      upload.addEventListener('change',()=>{const file=upload.files[0];if(file)operation(()=>uploadBlockImage(file,section));});label.append(upload,element('small','PNG, JPEG or WebP, up to 2 MB.'));fields.append(label);
      textField('imageAlt','Describe the image','textarea',300);textField('caption','Caption (optional)','input',300);textField('sourceUrl','Image source link (optional)','input',1000);
      for(const [key,label] of [['imageLayout','Image placement'],['imageRatio','Image proportions']])fields.append(selectControl('',label,SECTION_OPTIONS[key],section[key] || (key==='imageLayout'?'left':'auto'),value=>{section[key]=value;changed();}));
    }
    const appearance=element('div');appearance.className='design-controls';
    for(const [key,label] of [['width','Block width'],['align','Alignment'],['tone','Background'],...(section.type==='text'?[['layout','Text columns']]:[])])appearance.append(selectControl('',label,SECTION_OPTIONS[key],section[key],value=>{section[key]=value;changed();}));
    fields.append(appearance);
    const controls2=element('div');controls2.className='section-controls';
    const visibility=element('label');const checkbox=element('input');checkbox.type='checkbox';checkbox.checked=section.visible;
    checkbox.addEventListener('change',()=>{section.visible=checkbox.checked;changed();name.textContent=(section.heading || SECTION_TYPES[section.type])+(section.visible?'':' (hidden)');});visibility.append(checkbox,document.createTextNode('Show on page'));controls2.append(visibility);
    const duplicate=element('button','Duplicate');duplicate.type='button';duplicate.disabled=draft.sections.length>=MAX_SECTIONS;
    duplicate.addEventListener('click',()=>{if(draft.sections.length>=MAX_SECTIONS)return;const copy=structuredClone(section);copy.id='section-'+crypto.randomUUID();draft.sections.push(copy);draft.design.blockOrder.splice(draft.design.blockOrder.indexOf(id)+1,0,copy.id);activeBlockId=copy.id;changed();renderSections();});controls2.append(duplicate);
    const remove=element('button','Remove');remove.type='button';remove.addEventListener('click',()=>{draft.sections=draft.sections.filter(item=>item.id!==id);draft.design.blockOrder=draft.design.blockOrder.filter(item=>item!==id);changed();renderSections();});controls2.append(remove);fields.append(controls2);wrapper.append(fields);$('#sections').append(wrapper);
  }
  for(const button of $('#add-block-controls').querySelectorAll('button'))button.disabled=draft.sections.length>=MAX_SECTIONS;
}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
async function initialize(){try{state=await request('/api/state');draft=editableContent(state.content);lastSnapshot=JSON.stringify(draft);renderFields();update();}catch(error){failure(error);}}
buildDesignControls();
initialize();
let polling=false;
setInterval(async()=>{
  if(polling || (!working && !state?.busy))return;
  polling=true;
  try{
    const latest=await request('/api/state');
    $('#status-message').textContent=latest.message;
    // A tab opened during another tab's build must also learn when it finishes.
    // Keep unsaved text and its original revision so conflict detection still works.
    if(!working && state?.busy){
      if(!dirty){
        if(latest.revision!==state.revision){
          draft=editableContent(latest.content);lastSnapshot=JSON.stringify(draft);past=[];future=[];renderFields();
        }
        state=latest;
      }else{
        state={...state,busy:latest.busy,message:latest.message};
        if(latest.revision!==state.revision && state.preview)state.preview={...state.preview,current:false};
      }
      update();
    }
  }catch{}finally{polling=false;}
},1500);
