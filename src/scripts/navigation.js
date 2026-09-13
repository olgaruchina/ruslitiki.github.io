let instanceNumber=0;

function preserveStyles(element,properties){
  const saved=properties.map(property=>[property,element.style.getPropertyValue(property),element.style.getPropertyPriority(property)]);
  return ()=>{for(const [property,value,priority] of saved){
    if(value)element.style.setProperty(property,value,priority);
    else element.style.removeProperty(property);
  }};
}

// Fixed positioning also prevents background scrolling in mobile Safari.
export function lockPageScroll(document,view){
  const {body,documentElement:root}=document;
  const left=view.scrollX,top=view.scrollY;
  const gap=Math.max(0,view.innerWidth-root.clientWidth);
  const padding=Number.parseFloat(view.getComputedStyle(body).paddingRight)||0;
  const restoreBody=preserveStyles(body,['position','top','left','width','overflow','padding-right']);
  const restoreRoot=preserveStyles(root,['overflow','scroll-behavior']);
  root.style.setProperty('overflow','hidden');
  root.style.setProperty('scroll-behavior','auto');
  for(const [property,value] of Object.entries({position:'fixed',top:`-${top}px`,left:`-${left}px`,width:'100%',overflow:'hidden','padding-right':`${padding+gap}px`}))body.style.setProperty(property,value);
  let locked=true;
  return ()=>{
    if(!locked)return;
    locked=false;
    restoreBody();
    // Restore instantly even when the page uses smooth anchor scrolling.
    view.scrollTo({left,top,behavior:'instant'});
    restoreRoot();
  };
}

export class RuslitikiNavigation extends HTMLElement{
  connectedCallback(){
    if(this.listeners)return;
    this.dialog=this.querySelector('[data-nav-dialog]');
    this.trigger=this.querySelector('[data-nav-open]');
    this.drawerTitle=this.querySelector('[data-nav-title]');
    if(!this.dialog?.showModal || !this.trigger)return;
    this.view=this.ownerDocument.defaultView;
    this.listeners=new AbortController();
    const {signal}=this.listeners;
    let id;
    do{id=`ruslitiki-navigation-${++instanceNumber}`;}
    while(this.ownerDocument.getElementById(`${id}-drawer`) || this.ownerDocument.getElementById(`${id}-title`));
    this.dialog.id=`${id}-drawer`;
    this.drawerTitle.id=`${id}-title`;
    this.dialog.setAttribute('aria-labelledby',this.drawerTitle.id);
    this.trigger.setAttribute('aria-controls',this.dialog.id);
    this.trigger.addEventListener('click',()=>this.open(),{signal});
    this.querySelector('[data-nav-close]').addEventListener('click',()=>this.close(),{signal});
    this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();},{signal});
    this.dialog.addEventListener('close',()=>{
      if(this.dialog.open)return;
      this.releaseScroll();this.trigger.setAttribute('aria-expanded','false');
    },{signal});
    this.dialog.addEventListener('pointerdown',event=>{this.backdropStart=this.isBackdrop(event);},{signal});
    this.dialog.addEventListener('click',event=>{
      if(this.backdropStart && this.isBackdrop(event))this.close();
      this.backdropStart=false;
    },{signal});
    // Run before the editor's document capture handler jumps to a section.
    this.view.addEventListener('click',event=>{
      if(!this.dialog.open)return;
      const link=event.target.closest?.('a');
      if(!link || !this.dialog.contains(link))return;
      if(this.dataset.visualEditing==='true' && event.target.closest('[data-edit-field]') && !link.hasAttribute('data-nav-jump'))return;
      this.close({restoreFocus:false});
    },{capture:true,signal});
    this.view.addEventListener('keydown',event=>{
      if(!this.dialog.open || event.key!=='Escape')return;
      event.preventDefault();event.stopPropagation();this.close();
    },{capture:true,signal});
    this.desktop=this.view.matchMedia('(min-width: 900px)');
    this.desktop.addEventListener('change',event=>{
      if(!event.matches || !this.dialog.open)return;
      this.close({restoreFocus:false});
      this.querySelector('[data-nav-desktop] a')?.focus({preventScroll:true});
    },{signal});
    this.setAttribute('data-enhanced','');
  }

  disconnectedCallback(){
    this.listeners?.abort();this.listeners=null;
    if(this.dialog?.open)this.dialog.close();
    this.releaseScroll();
    this.trigger?.setAttribute('aria-expanded','false');
    this.removeAttribute('data-enhanced');
  }

  isBackdrop(event){
    if(event.target!==this.dialog)return false;
    const rect=this.dialog.getBoundingClientRect();
    return event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom;
  }

  open(){
    if(this.dialog.open || this.desktop.matches)return;
    this.unlock=lockPageScroll(this.ownerDocument,this.view);
    try{
      this.dialog.showModal();
      this.trigger.setAttribute('aria-expanded','true');
    }catch(error){this.releaseScroll();throw error;}
  }

  close({restoreFocus=true}={}){
    if(!this.dialog?.open)return;
    this.dispatchEvent(new CustomEvent('ruslitiki:navigation-close',{bubbles:true}));
    this.dialog.close();
    this.releaseScroll();
    this.trigger.setAttribute('aria-expanded','false');
    if(restoreFocus && this.trigger.isConnected)this.trigger.focus({preventScroll:true});
  }

  releaseScroll(){this.unlock?.();this.unlock=null;}
}

if(!customElements.get('ruslitiki-navigation'))customElements.define('ruslitiki-navigation',RuslitikiNavigation);
