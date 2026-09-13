import {fromPlainText,plainText,renderRichText,validateRichText} from './rich-text.mjs';

const discarded=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','TEMPLATE','NOSCRIPT','SVG','MATH','IMG','VIDEO','AUDIO','INPUT','TEXTAREA','SELECT','BUTTON']);

/** Read semantic content only. No pasted attribute or HTML string becomes saved data. */
export function serializeRichText(root,{inline=false}={}){
  const blocks=[];
  let current=null;
  const start=type=>{current={type,runs:[]};blocks.push(current);};
  const append=(text,marks,type)=>{
    if(!text)return;
    if(!current)start(type);
    const run={text,...(marks.bold?{bold:true}:{}),...(marks.italic?{italic:true}:{})};
    const previous=current.runs.at(-1);
    if(previous && !!previous.bold===!!run.bold && !!previous.italic===!!run.italic)previous.text+=text;
    else current.runs.push(run);
  };
  const walk=(node,marks={},type='paragraph')=>{
    if(node.nodeType===3){
      const parent=node.parentNode;
      if(!node.nodeValue.trim() && (['UL','OL'].includes(parent.tagName) || (parent===root && [...root.children].some(child=>['P','DIV','UL','OL'].includes(child.tagName)))))return;
      append(node.nodeValue.replace(/\r\n?|\n/g,' '),marks,type);return;
    }
    if(node.nodeType!==1 && node!==root)return;
    if(node===root){for(const child of node.childNodes)walk(child,marks,type);return;}
    const tag=node.tagName;
    if(discarded.has(tag))return;
    if(tag==='BR'){
      if(!current)start(type);
      let tail=node;
      while(!tail.nextSibling && tail.parentNode!==root && !['P','DIV','LI'].includes(tail.parentNode.tagName))tail=tail.parentNode;
      if(tail.nextSibling)start(type);
      return;
    }
    const nextMarks={...marks,...(['B','STRONG'].includes(tag)?{bold:true}:{}),...(['I','EM'].includes(tag)?{italic:true}:{})};
    if(tag==='UL' || tag==='OL'){
      current=null;
      for(const child of node.childNodes)walk(child,nextMarks,tag==='UL'?'bullet':'number');
      current=null;return;
    }
    if(node!==root && ['P','DIV','LI'].includes(tag)){
      current=null;const count=blocks.length;
      const blockType=type;
      for(const child of node.childNodes)walk(child,nextMarks,blockType);
      if(blocks.length===count)start(blockType);
      current=null;return;
    }
    for(const child of node.childNodes)walk(child,nextMarks,type);
  };
  walk(root);
  if(!blocks.length)start('paragraph');
  if(!inline)return {blocks};
  const runs=[];
  for(const [index,block] of blocks.entries()){
    if(index)runs.push({text:' '});
    for(const run of block.runs){
      const previous=runs.at(-1);
      if(previous && !!previous.bold===!!run.bold && !!previous.italic===!!run.italic)previous.text+=run.text;
      else runs.push({...run});
    }
  }
  return {blocks:[{type:'paragraph',runs}]};
}

export function createRichTextEditor({onChange=()=>{}}={}){
  let active=null,savedRange=null,inputRevision=0;
  const toolbar=document.createElement('div');
  toolbar.id='canvas-rich-tools';toolbar.hidden=true;toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Text formatting');
  const buttons=new Map();
  for(const [command,label,title] of [
    ['bold','Bold','Bold (⌘/Ctrl+B)'],['italic','Italic','Italic (⌘/Ctrl+I)'],
    ['insertUnorderedList','Bullets','Bulleted list'],['insertOrderedList','Numbered list','Numbered list'],
    ['removeFormat','Clear formatting','Remove formatting from the selection'],
  ]){
    const button=document.createElement('button');button.type='button';button.textContent=label;button.title=title;
    button.dataset.command=command;if(command!=='removeFormat')button.setAttribute('aria-pressed','false');
    button.addEventListener('pointerdown',event=>{if(event.button===0){rememberSelection();event.preventDefault();}});
    button.addEventListener('click',()=>execute(command));toolbar.append(button);buttons.set(command,button);
  }
  const status=document.createElement('span');status.className='canvas-rich-status';status.setAttribute('role','status');toolbar.append(status);
  document.body.append(toolbar);

  function rememberSelection(){
    if(!active)return;
    const selection=window.getSelection();
    if(selection?.rangeCount && active.field.contains(selection.anchorNode) && active.field.contains(selection.focusNode))savedRange=selection.getRangeAt(0).cloneRange();
  }
  function restoreSelection(){
    if(!active)return;
    active.field.focus({preventScroll:true});
    if(savedRange && active.field.contains(savedRange.commonAncestorContainer)){
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(savedRange);
    }
  }
  function position(){
    if(!active)return;
    const rect=active.field.getBoundingClientRect();
    toolbar.style.left=Math.max(8,Math.min(rect.left,innerWidth-toolbar.offsetWidth-8))+'px';
    const above=rect.top-toolbar.offsetHeight-8;
    toolbar.style.top=Math.max(8,Math.min(innerHeight-toolbar.offsetHeight-8,above<8?rect.bottom+8:above))+'px';
  }
  function update(){
    if(!active)return;
    for(const [command,button] of buttons){
      if(command==='removeFormat')continue;
      let pressed=false;try{pressed=document.queryCommandState(command);}catch{}
      button.setAttribute('aria-pressed',String(pressed));
    }
    position();
  }
  function execute(command,value){
    if(!active)return;
    restoreSelection();
    const field=active.field,before=field.innerHTML,revision=inputRevision;
    // Native editing commands retain the browser's selection and undo history.
    document.execCommand('styleWithCSS',false,false);
    if(command==='removeFormat'){
      document.execCommand('removeFormat',false);
      if(!active.inline){
        if(document.queryCommandState('insertUnorderedList'))document.execCommand('insertUnorderedList',false);
        if(document.queryCommandState('insertOrderedList'))document.execCommand('insertOrderedList',false);
      }
    }else document.execCommand(command,false,value);
    rememberSelection();update();
    if(revision===inputRevision && before!==field.innerHTML)onChange();
  }
  document.addEventListener('selectionchange',()=>{rememberSelection();update();});
  document.addEventListener('input',event=>{if(active?.field===event.target){inputRevision++;rememberSelection();update();}},true);
  document.addEventListener('keydown',event=>{
    if(!active || !(active.field.contains(event.target) || toolbar.contains(event.target)))return;
    if((event.metaKey || event.ctrlKey) && !event.altKey && ['b','i'].includes(event.key.toLowerCase())){
      event.preventDefault();execute(event.key.toLowerCase()==='b'?'bold':'italic');
    }
    if(active.inline && active.field.contains(event.target) && event.key==='Enter'){event.preventDefault();}
  });
  document.addEventListener('beforeinput',event=>{
    if(active?.field===event.target && active.inline && ['insertParagraph','insertLineBreak'].includes(event.inputType))event.preventDefault();
  });
  document.addEventListener('paste',event=>{
    if(!active || !active.field.contains(event.target))return;
    event.preventDefault();rememberSelection();status.textContent='';
    let doc;
    const html=event.clipboardData?.getData('text/html');
    if(html){
      const template=document.createElement('template');template.innerHTML=html;
      doc=serializeRichText(template.content,{inline:active.inline});
    }else{
      const value=event.clipboardData?.getData('text/plain') || '';
      doc=fromPlainText(active.inline?value.replace(/\r\n?|\n/g,' '):value);
    }
    if(validateRichText(doc,{inline:active.inline}).length){status.textContent='This paste is too large. Paste a shorter selection.';position();return;}
    // Insert only newly generated safe tags, so the paste remains one native undo step.
    const markup=doc.blocks.length===1 && doc.blocks[0].type==='paragraph'?renderRichText(doc,{inline:true}):renderRichText(doc);
    execute('insertHTML',markup);
  });
  window.addEventListener('scroll',position,{passive:true});window.addEventListener('resize',position);
  return {
    open(field,{inline=false}={}){
      active={field,inline};savedRange=null;status.textContent='';toolbar.hidden=false;
      (field.closest('dialog[open]') || document.body).append(toolbar);
      for(const command of ['insertUnorderedList','insertOrderedList'])buttons.get(command).hidden=inline;
      field.setAttribute('aria-multiline',String(!inline));rememberSelection();update();
    },
    close(){if(active)active.field.removeAttribute('aria-multiline');active=null;savedRange=null;toolbar.hidden=true;document.body.append(toolbar);},
    owns:target=>!!target && toolbar.contains(target),
    serialize:()=>active?serializeRichText(active.field,{inline:active.inline}):null,
    normalize(field,doc,{inline=false}={}){field.innerHTML=renderRichText(doc,{inline});},
    position,
  };
}

export {plainText};
