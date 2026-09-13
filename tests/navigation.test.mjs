import { test } from 'node:test';
import assert from 'node:assert/strict';

class Styles{
  values=new Map();
  getPropertyValue(name){return this.values.get(name)?.value || '';}
  getPropertyPriority(name){return this.values.get(name)?.priority || '';}
  setProperty(name,value,priority=''){this.values.set(name,{value,priority});}
  removeProperty(name){this.values.delete(name);}
}
class Element extends EventTarget{
  style=new Styles();attributes=new Map();dataset={};isConnected=true;focuses=0;
  setAttribute(name,value){this.attributes.set(name,value);}
  removeAttribute(name){this.attributes.delete(name);}
  hasAttribute(name){return this.attributes.has(name);}
  getAttribute(name){return this.attributes.get(name);}
  focus(){this.focuses++;}
}
const previousElement=globalThis.HTMLElement,previousRegistry=globalThis.customElements;
globalThis.HTMLElement=Element;
globalThis.customElements={get(){return false;},define(){}};
const {RuslitikiNavigation,lockPageScroll}=await import('../src/scripts/navigation.js');
if(previousElement===undefined)delete globalThis.HTMLElement;else globalThis.HTMLElement=previousElement;
if(previousRegistry===undefined)delete globalThis.customElements;else globalThis.customElements=previousRegistry;

function fixture(){
  const body=new Element(),root=new Element(),view=new EventTarget(),desktop=new EventTarget();
  const scrolls=[];root.clientWidth=375;desktop.matches=false;
  Object.assign(view,{innerWidth:390,scrollX:0,scrollY:280,getComputedStyle:()=>({paddingRight:'10px'}),scrollTo:position=>scrolls.push(position),matchMedia:()=>desktop});
  const document={body,documentElement:root,defaultView:view,getElementById:()=>null};
  const nav=new RuslitikiNavigation(),dialog=new Element(),trigger=new Element(),title=new Element(),close=new Element(),desktopLink=new Element();
  Object.assign(dialog,{open:false,showModal(){this.open=true;},close(){this.open=false;this.dispatchEvent(new Event('close'));},contains:element=>element===link});
  const elements={'[data-nav-dialog]':dialog,'[data-nav-open]':trigger,'[data-nav-title]':title,'[data-nav-close]':close,'[data-nav-desktop] a':desktopLink};
  Object.assign(nav,{ownerDocument:document,querySelector:selector=>elements[selector]});
  const link=new Element(),label=new Element();
  link.closest=selector=>selector==='a'?link:null;
  label.closest=selector=>selector==='a'?link:selector==='[data-edit-field]'?label:null;
  const click=target=>{const event=new Event('click',{cancelable:true});Object.defineProperty(event,'target',{value:target});view.dispatchEvent(event);return event;};
  nav.connectedCallback();
  return {nav,dialog,trigger,title,close,desktopLink,document,view,desktop,body,root,scrolls,link,label,click};
}

test('scroll locking preserves position and prior inline styles, and releases once',()=>{
  const f=fixture();
  f.body.style.setProperty('position','relative','important');
  f.body.style.setProperty('padding-right','10px');
  f.root.style.setProperty('scroll-behavior','smooth','important');
  const release=lockPageScroll(f.document,f.view);
  assert.equal(f.body.style.getPropertyValue('position'),'fixed');
  assert.equal(f.body.style.getPropertyValue('top'),'-280px');
  assert.equal(f.body.style.getPropertyValue('padding-right'),'25px');
  f.body.style.setProperty('color','blue');
  release();release();
  assert.equal(f.body.style.getPropertyValue('position'),'relative');
  assert.equal(f.body.style.getPropertyPriority('position'),'important');
  assert.equal(f.body.style.getPropertyValue('top'),'');
  assert.equal(f.body.style.getPropertyValue('padding-right'),'10px');
  assert.equal(f.body.style.getPropertyValue('color'),'blue');
  assert.equal(f.root.style.getPropertyValue('scroll-behavior'),'smooth');
  assert.equal(f.root.style.getPropertyPriority('scroll-behavior'),'important');
  assert.deepEqual(f.scrolls,[{left:0,top:280,behavior:'instant'}]);
  f.nav.disconnectedCallback();
});

test('canvas replacement releases the scroll lock and reconnects without duplicate handlers',()=>{
  const f=fixture();let opens=0;f.dialog.showModal=()=>{opens++;f.dialog.open=true;};
  f.trigger.dispatchEvent(new Event('click'));
  assert.equal(f.dialog.open,true);assert.equal(f.trigger.getAttribute('aria-expanded'),'true');
  f.nav.disconnectedCallback();
  assert.equal(f.dialog.open,false);assert.equal(f.body.style.getPropertyValue('position'),'');
  f.trigger.dispatchEvent(new Event('click'));assert.equal(opens,1);
  f.nav.connectedCallback();f.trigger.dispatchEvent(new Event('click'));
  assert.equal(opens,2);assert.equal(f.dialog.open,true);
  // A queued close event from the previous opening must not unlock the new one.
  f.dialog.dispatchEvent(new Event('close'));assert.equal(f.body.style.getPropertyValue('position'),'fixed');
  f.nav.disconnectedCallback();
});

test('public links close without cancelling navigation; editable labels stay open until Go to section',()=>{
  const f=fixture();let closes=0;f.nav.addEventListener('ruslitiki:navigation-close',()=>closes++);
  f.nav.open();const event=f.click(f.label);
  assert.equal(f.dialog.open,false);assert.equal(event.defaultPrevented,false);assert.equal(closes,1);
  f.nav.dataset.visualEditing='true';f.nav.open();f.click(f.label);
  assert.equal(f.dialog.open,true);assert.equal(closes,1);
  f.link.setAttribute('data-nav-jump','');f.click(f.link);
  assert.equal(f.dialog.open,false);assert.equal(closes,2);
  f.nav.disconnectedCallback();
});

test('Escape restores trigger focus, and resizing to desktop focuses a visible menu link',()=>{
  const f=fixture();f.nav.open();
  const escape=new Event('keydown',{cancelable:true});Object.defineProperty(escape,'key',{value:'Escape'});
  f.view.dispatchEvent(escape);
  assert.equal(f.dialog.open,false);assert.equal(escape.defaultPrevented,true);assert.equal(f.trigger.focuses,1);
  f.nav.open();f.desktop.matches=true;
  const change=new Event('change');Object.defineProperty(change,'matches',{value:true});f.desktop.dispatchEvent(change);
  assert.equal(f.dialog.open,false);assert.equal(f.desktopLink.focuses,1);assert.equal(f.body.style.getPropertyValue('position'),'');
  f.nav.disconnectedCallback();
});

test('backdrop clicks close the drawer, while dragging from inside does not',()=>{
  const f=fixture();f.dialog.getBoundingClientRect=()=>({left:70,right:390,top:0,bottom:844});
  const pointer=(type,x)=>{
    const event=new Event(type);Object.defineProperties(event,{clientX:{value:x},clientY:{value:100}});
    f.dialog.dispatchEvent(event);
  };
  f.nav.open();pointer('pointerdown',100);pointer('click',40);
  assert.equal(f.dialog.open,true);
  pointer('pointerdown',40);pointer('click',40);
  assert.equal(f.dialog.open,false);assert.equal(f.trigger.focuses,1);
  f.nav.disconnectedCallback();
});
