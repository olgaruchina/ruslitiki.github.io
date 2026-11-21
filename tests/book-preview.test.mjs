import {test} from 'node:test';
import assert from 'node:assert/strict';

class Element extends EventTarget{
  attributes=new Map();inert=false;focuses=0;
  setAttribute(name,value){this.attributes.set(name,value);}
  removeAttribute(name){this.attributes.delete(name);}
  hasAttribute(name){return this.attributes.has(name);}
  getAttribute(name){return this.attributes.get(name);}
  focus(){this.focuses++;}
}
const previousElement=globalThis.HTMLElement,previousRegistry=globalThis.customElements;
globalThis.HTMLElement=Element;
globalThis.customElements={get(){return false;},define(){}};
const {RuslitikiBookPreview}=await import('../src/scripts/book-preview.js');
if(previousElement===undefined)delete globalThis.HTMLElement;else globalThis.HTMLElement=previousElement;
if(previousRegistry===undefined)delete globalThis.customElements;else globalThis.customElements=previousRegistry;

function fixture(){
  const card=new RuslitikiBookPreview(),back=new Element(),trigger=new Element(),close=new Element(),body=new Element(),view=new EventTarget();
  back.inert=true;back.setAttribute('aria-hidden','true');
  const nodes={'[data-book-description]':back,'[data-book-open]':trigger,'[data-book-close]':close};
  Object.assign(card,{querySelector:selector=>nodes[selector],contains:node=>[back,trigger,close].includes(node),ownerDocument:{body,defaultView:view}});
  card.connectedCallback();return {card,back,trigger,close,body,view};
}
test('cover flipping exposes only the visible side and returns keyboard focus to the cover',()=>{
  const f=fixture();let closes=0;f.card.addEventListener('ruslitiki:book-close',()=>closes++);
  f.trigger.dispatchEvent(new Event('click'));
  assert.equal(f.card.hasAttribute('data-flipped'),true);
  assert.equal(f.trigger.inert,true);assert.equal(f.trigger.getAttribute('aria-expanded'),'true');
  assert.equal(f.back.inert,false);assert.equal(f.back.hasAttribute('aria-hidden'),false);
  assert.equal(f.close.focuses,1);
  f.card.showDescription();assert.equal(f.close.focuses,1);
  f.close.dispatchEvent(new Event('click'));
  assert.equal(f.card.hasAttribute('data-flipped'),false);
  assert.equal(f.trigger.inert,false);assert.equal(f.back.inert,true);
  assert.equal(f.trigger.focuses,1);assert.equal(closes,1);
  f.card.disconnectedCallback();
  f.trigger.dispatchEvent(new Event('click'));assert.equal(f.card.hasAttribute('data-flipped'),false);
});
test('Escape returns from the description, and an editor save cannot flip a locked card',()=>{
  const f=fixture();f.body.setAttribute('data-canvas-locked','');
  f.card.showDescription();assert.equal(f.card.hasAttribute('data-flipped'),false);
  f.body.removeAttribute('data-canvas-locked');f.card.showDescription();
  const escape=new Event('keydown',{cancelable:true});Object.defineProperty(escape,'key',{value:'Escape'});Object.defineProperty(escape,'target',{value:f.close});
  f.view.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented,true);assert.equal(f.card.hasAttribute('data-flipped'),false);
  f.card.disconnectedCallback();
});
