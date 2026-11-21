export class RuslitikiBookPreview extends HTMLElement {
  connectedCallback(){
    if(this.listeners)return;
    this.back=this.querySelector('[data-book-description]');
    this.trigger=this.querySelector('[data-book-open]');
    if(!this.back || !this.trigger)return;
    this.listeners=new AbortController();
    const {signal}=this.listeners;
    this.trigger.addEventListener('click',()=>this.showDescription(),{signal});
    this.querySelector('[data-book-close]').addEventListener('click',()=>this.close(),{signal});
    this.ownerDocument.defaultView.addEventListener('keydown',event=>{
      if(this.hasAttribute('data-flipped') && this.contains(event.target) && event.key==='Escape'){
        event.preventDefault();event.stopPropagation();this.close();
      }
    },{capture:true,signal});
  }
  showDescription(){
    if(!this.back || this.hasAttribute('data-flipped') || this.ownerDocument.body.hasAttribute('data-canvas-locked'))return;
    this.setAttribute('data-flipped','');
    this.back.inert=false;this.back.removeAttribute('aria-hidden');
    this.trigger.setAttribute('aria-expanded','true');
    this.querySelector('[data-book-close]').focus({preventScroll:true});
    this.trigger.inert=true;this.trigger.setAttribute('aria-hidden','true');
  }
  close(){
    if(!this.hasAttribute('data-flipped'))return;
    this.dispatchEvent(new Event('ruslitiki:book-close',{bubbles:true}));
    this.removeAttribute('data-flipped');
    this.trigger.inert=false;this.trigger.removeAttribute('aria-hidden');
    this.trigger.setAttribute('aria-expanded','false');
    this.trigger.focus({preventScroll:true});
    this.back.inert=true;this.back.setAttribute('aria-hidden','true');
  }
  disconnectedCallback(){this.listeners?.abort();this.listeners=null;}
}
if(!customElements.get('ruslitiki-book-preview'))customElements.define('ruslitiki-book-preview',RuslitikiBookPreview);
