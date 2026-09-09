(()=>{
  const config=JSON.parse(document.getElementById('canvas-config').textContent);
  let sequence=config.sequence,generation=config.generation,minimumGeneration=config.generation,selected=null,editing=null,locked=false,pendingRender=null,rendering=false,awaitingEditAck=null,textSequence=0;
  const send=(type,data={})=>parent.postMessage({channel:'ruslitiki-canvas',session:config.session,nonce:config.nonce,sequence,generation,type,...data},config.studioOrigin);
  const make=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
  const toolbar=make('div');toolbar.id='canvas-tools';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Selected section');toolbar.hidden=true;
  const label=make('span');label.className='canvas-tool-label';toolbar.append(label);
  const drag=make('button','⠿ Move');drag.type='button';drag.draggable=true;drag.title='Drag to move this section';toolbar.append(drag);
  const command=(text,action,aria=text)=>{
    const button=make('button',text);button.type='button';button.setAttribute('aria-label',aria);
    button.addEventListener('click',()=>{finishEditing();send(action,{id:selected});});toolbar.append(button);return button;
  };
  const up=command('↑','up','Move section up'),down=command('↓','down','Move section down');
  command('+ Before','insert-before','Add a section before this one');command('+ After','insert-after','Add a section after this one');
  command('Options','options','Open section options');
  const duplicate=command('Duplicate','duplicate'),hide=command('Hide','hide'),remove=command('Remove','remove');
  document.body.append(toolbar);
  const dropLine=make('div');dropLine.id='canvas-drop-line';dropLine.hidden=true;document.body.append(dropLine);
  const notice=make('div','Click text to edit · Drag a section handle to move');notice.id='canvas-tip';document.body.append(notice);
  const blocks=()=>[...document.querySelectorAll('#main > [data-block-id]')];
  const selectedBlock=()=>blocks().find(block=>block.dataset.blockId===selected);
  function positionTools(){
    const block=selectedBlock();
    toolbar.hidden=!block || locked;if(!block || locked)return;
    const rect=block.getBoundingClientRect();
    toolbar.style.left=Math.max(8,Math.min(rect.left,innerWidth-toolbar.offsetWidth-8))+'px';
    toolbar.style.top=Math.max(8,Math.min(innerHeight-toolbar.offsetHeight-8,rect.top-toolbar.offsetHeight-5))+'px';
  }
  function select(id,field,notify=true){
    selected=id;
    for(const block of blocks())block.toggleAttribute('data-canvas-selected',block.dataset.blockId===id);
    const block=selectedBlock();
    if(block){
      label.textContent=id==='opening'?'Introduction & book':block.dataset.blockLabel;
      const position=blocks().indexOf(block);up.disabled=position===0;down.disabled=position===blocks().length-1;
      for(const button of [duplicate,hide,remove])button.hidden=id==='opening';
    }
    positionTools();if(notify)send('select',{id,field});
  }
  function setup(){
    for(const block of blocks()){
      block.tabIndex=0;block.setAttribute('aria-label',block.dataset.blockId==='opening'?'Introduction and first book':block.dataset.blockLabel || 'Page section');
    }
    const main=document.getElementById('main');
    const add=make('button','+ Add a section here');add.type='button';add.id='canvas-add-end';
    add.addEventListener('click',()=>{finishEditing();send('insert-end');});main.append(add);
    select(selected,null,false);
  }
  function fieldText(field){return field.innerText.replace(/\r/g,'');}
  function beginEditing(field){
    if(locked || editing?.field===field)return;
    finishEditing();
    const block=field.closest('[data-block-id]');
    const id=block?.dataset.blockId || 'brand';
    editing={field,id,key:field.dataset.editField,transaction:crypto.randomUUID(),lastValue:field.textContent};
    field.contentEditable='plaintext-only';field.setAttribute('role','textbox');field.setAttribute('aria-label',field.dataset.placeholder || field.dataset.editField.replaceAll('.',' '));field.spellcheck=true;field.focus();
    if(block)select(id,editing.key);else send('select',{id,field:editing.key});
  }
  function emitText(){if(editing){textSequence++;const value=fieldText(editing.field);send('text',{id:editing.id,field:editing.key,value,previousValue:editing.lastValue,transaction:editing.transaction,textSequence});editing.lastValue=value;}}
  function finishEditing(){
    if(!editing)return;
    emitText();awaitingEditAck={transaction:editing.transaction,textSequence};const field=editing.field;editing=null;field.removeAttribute('contenteditable');field.removeAttribute('role');field.removeAttribute('aria-label');
    // Rich clipboard formatting never becomes saved content.
    field.textContent=fieldText(field);send('edit-end');
  }
  document.addEventListener('input',event=>{if(editing?.field===event.target)emitText();});
  document.addEventListener('focusout',event=>{if(editing?.field===event.target)finishEditing();});
  document.addEventListener('click',event=>{
    if(event.target.closest('#canvas-tools,#canvas-add-end'))return;
    const link=event.target.closest('a');if(link)event.preventDefault();
    if(locked)return;
    const field=event.target.closest('[data-edit-field]');if(field){if(field.closest('summary'))event.preventDefault();beginEditing(field);return;}
    finishEditing();
    const block=event.target.closest('[data-block-id]');
    if(block)select(block.dataset.blockId);
    if(event.target.closest('[data-select-image]'))send('options',{id:block?.dataset.blockId,field:'image'});
    else if(!block && event.target.closest('[data-edit-region]'))send('select',{id:'brand'});
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){finishEditing();selectedBlock()?.focus();event.preventDefault();}
    if(editing || locked)return;
    const block=event.target.closest('[data-block-id]');
    if(block && event.key==='Enter'){select(block.dataset.blockId);toolbar.querySelector('button').focus();event.preventDefault();}
  });
  drag.addEventListener('dragstart',event=>{
    if(locked || !selected){event.preventDefault();return;}finishEditing();event.dataTransfer.setData('text/plain','ruslitiki-move:'+selected);event.dataTransfer.effectAllowed='move';
  });
  const dropTarget=event=>{
    const candidates=blocks();const block=event.target.closest('[data-block-id]') || candidates.find(item=>event.clientY<item.getBoundingClientRect().bottom) || candidates.at(-1);
    if(!block)return {before:null,top:40};
    const rect=block.getBoundingClientRect();const before=event.clientY<rect.top+rect.height/2;
    return {before:before?block.dataset.blockId:(candidates[candidates.indexOf(block)+1]?.dataset.blockId || null),top:before?rect.top:rect.bottom};
  };
  document.addEventListener('dragover',event=>{
    if(locked)return;event.preventDefault();const target=dropTarget(event);dropLine.style.top=Math.max(0,Math.min(innerHeight-4,target.top))+'px';dropLine.hidden=false;
  });
  document.addEventListener('drop',event=>{
    event.preventDefault();dropLine.hidden=true;if(locked)return;
    const value=event.dataTransfer.getData('text/plain'),target=dropTarget(event);
    if(value.startsWith('ruslitiki-move:'))send('move',{id:value.slice(15),before:target.before});
    else if(value.startsWith('ruslitiki-add:'))send('add',{blockType:value.slice(14),before:target.before});
  });
  document.addEventListener('dragend',()=>{dropLine.hidden=true;});
  document.addEventListener('dragleave',event=>{if(!event.relatedTarget)dropLine.hidden=true;});
  async function refresh(){
    if(rendering || editing || awaitingEditAck || !pendingRender)return;
    rendering=true;
    const request=pendingRender;pendingRender=null;
    try{
      if(request.generation<minimumGeneration)return;
      const url=new URL(request.url);
      if(url.origin!==location.origin || url.searchParams.get('session')!==config.session || url.searchParams.get('nonce')!==config.nonce)throw new Error('Invalid canvas destination.');
      const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('The page could not refresh.');
      const parsed=new DOMParser().parseFromString(await response.text(),'text/html');
      const metadata=JSON.parse(parsed.getElementById('canvas-config').textContent);
      if(metadata.generation<minimumGeneration || metadata.sequence<sequence || (pendingRender && metadata.sequence<pendingRender.sequence)){return;}
      if(editing || awaitingEditAck){pendingRender=request;return;}
      const page=parsed.getElementById('canvas-content');if(!page)throw new Error('The page could not refresh.');
      const scroll=scrollY;
      document.getElementById('canvas-content').replaceWith(document.adoptNode(page));
      document.documentElement.style.cssText=parsed.documentElement.style.cssText;
      document.documentElement.dataset.buttonStyle=parsed.documentElement.dataset.buttonStyle;
      sequence=metadata.sequence;generation=metadata.generation;setup();window.scrollTo(0,scroll);positionTools();send('rendered');
    }catch{send('render-error',{message:'The visual page could not refresh. Your changes are still in the editor.'});}
    finally{rendering=false;if(pendingRender && !editing && !awaitingEditAck)refresh();}
  }
  addEventListener('message',event=>{
    const data=event.data;
    if(event.source!==parent || event.origin!==config.studioOrigin || data?.channel!=='ruslitiki-canvas' || data.session!==config.session || data.nonce!==config.nonce)return;
    if(data.type==='invalidate' && Number.isSafeInteger(data.generation)){minimumGeneration=Math.max(minimumGeneration,data.generation);if(pendingRender?.generation<minimumGeneration)pendingRender=null;}
    if(data.type==='text-ack' && awaitingEditAck?.transaction===data.transaction && awaitingEditAck.textSequence===data.textSequence){
      minimumGeneration=Math.max(minimumGeneration,data.generation);awaitingEditAck=null;
      if(pendingRender?.generation<minimumGeneration)pendingRender=null;
      if(pendingRender)refresh();
    }
    if(data.type==='refresh' && Number.isSafeInteger(data.sequence) && data.sequence>=sequence){pendingRender=data;refresh();}
    if(data.type==='select'){select(data.id,null,false);selectedBlock()?.scrollIntoView({block:'nearest',behavior:'instant'});}
    if(data.type==='flush'){finishEditing();send('flushed',{requestId:data.requestId});}
    if(data.type==='lock'){locked=data.locked===true;if(locked)finishEditing();document.body.toggleAttribute('data-canvas-locked',locked);positionTools();}
  });
  addEventListener('scroll',positionTools,{passive:true});addEventListener('resize',positionTools);
  document.addEventListener('load',positionTools,true);
  setup();send('rendered');
})();
