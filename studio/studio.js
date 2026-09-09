const $ = selector => document.querySelector(selector);
const token = $('meta[name="studio-token"]').content;
let state=null;
let draft=null;
let dirty=false;
let working=false;
let previewUrl='';
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
  for(const field of $('#editor').querySelectorAll('[name]'))field.value=get(draft,field.name);
  renderSections();
}
function changed(){dirty=true;$('#error').hidden=true;update();}
function update(){
  if(!state)return;
  const busy=working || state.busy;
  $('#save-state').textContent=busy ? 'Working…' : dirty ? 'Unsaved changes' : 'Draft saved';
  $('#save').disabled=busy || !dirty;
  $('#preview').disabled=busy;
  $('#preview').textContent=busy ? 'Please wait…' : 'Prepare preview';
  $('#publish').disabled=busy || dirty || !state.configured || !state.preview?.current;
  $('#restore').disabled=busy || !state.canRestore;
  $('#connection-note').hidden=state.configured;
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
  draft=structuredClone(state.content);dirty=false;update();
}
$('#editor').addEventListener('submit',event=>event.preventDefault());
$('#editor').addEventListener('input',event=>{
  if(event.target.name){set(draft,event.target.name,event.target.value);changed();}
});
$('#save').addEventListener('click',()=>operation(save));
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
  operation(async()=>{if(dirty)await save();state=await request('/api/restore',{revision:state.revision});draft=structuredClone(state.content);dirty=false;renderFields();update();});
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
function renderSections(){
  $('#sections').replaceChildren();
  draft.sections.forEach((section,index)=>{
    const wrapper=element('section');wrapper.className='section-item';
    const title=element('p',`${index+1}. ${section.type==='faq'?'Question and answer':'Note'}`);title.className='section-title';wrapper.append(title);
    for(const [key,label,tag,max] of [['heading',section.type==='faq'?'Question':'Heading','input',150],['body',section.type==='faq'?'Answer':'Text','textarea',1400]]){
      const field=element('label',label);const input=element(tag);input.value=section[key];input.maxLength=max;if(tag==='textarea')input.rows=4;
      input.addEventListener('input',()=>{section[key]=input.value;changed();});field.append(input);wrapper.append(field);
    }
    const controls=element('div');controls.className='section-controls';
    const visibility=element('label');const checkbox=element('input');checkbox.type='checkbox';checkbox.checked=section.visible;
    checkbox.addEventListener('change',()=>{section.visible=checkbox.checked;changed();});visibility.append(checkbox,document.createTextNode('Show on page'));controls.append(visibility);
    for(const [label,delta] of [['Move up',-1],['Move down',1]]){
      const button=element('button',label);button.type='button';button.disabled=index+delta<0||index+delta>=draft.sections.length;
      button.addEventListener('click',()=>{[draft.sections[index],draft.sections[index+delta]]=[draft.sections[index+delta],draft.sections[index]];changed();renderSections();});controls.append(button);
    }
    const remove=element('button','Remove');remove.type='button';remove.addEventListener('click',()=>{draft.sections.splice(index,1);changed();renderSections();});controls.append(remove);wrapper.append(controls);$('#sections').append(wrapper);
  });
  $('#add-text').disabled=draft.sections.length>=6;$('#add-faq').disabled=draft.sections.length>=6;
}
for(const type of ['text','faq'])$('#add-'+type).addEventListener('click',()=>{if(draft.sections.length>=6)return;draft.sections.push({type,heading:'',body:'',visible:true});changed();renderSections();});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
async function initialize(){try{state=await request('/api/state');draft=structuredClone(state.content);renderFields();update();}catch(error){failure(error);}}
initialize();
setInterval(async()=>{if(!working)return;try{const latest=await request('/api/state');$('#status-message').textContent=latest.message;}catch{}},1500);
