class RuslitikiFaq extends HTMLElement {
  connectedCallback(){
    if(this.listeners || this.dataset.visualEditing==='true')return;
    this.details=this.querySelector('details');
    this.summary=this.querySelector('summary');
    this.answer=this.querySelector('.faq-answer');
    if(!this.details || !this.summary || !this.answer?.animate)return;
    this.expanded=this.details.open;
    this.listeners=new AbortController();
    const {signal}=this.listeners;
    this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    this.summary.addEventListener('click',event=>{
      if(event.defaultPrevented || event.target.closest('a,button,input,[contenteditable]'))return;
      event.preventDefault();
      this.toggleAnswer(!this.expanded);
    },{signal});
    this.motion.addEventListener('change',()=>this.finish(),{signal});
    window.addEventListener('resize',()=>this.finish(),{signal});
  }

  toggleAnswer(expanded){
    const from=this.details.open?this.answer.getBoundingClientRect().height:0;
    const opacity=this.details.open?getComputedStyle(this.answer).opacity:'0';
    this.cancelAnimation();
    this.expanded=expanded;
    if(this.motion.matches){this.finish();return;}
    // The wrapper includes the answer's top margin, leaving the question and
    // its keyboard focus outline outside the clipped animated area.
    this.details.open=true;
    const to=expanded?this.answer.getBoundingClientRect().height:0;
    this.answer.style.overflow='hidden';
    this.answer.inert=!expanded;
    if(!expanded && this.answer.contains(document.activeElement))this.summary.focus({preventScroll:true});
    this.animation=this.answer.animate([
      {height:`${from}px`,opacity},
      {height:`${to}px`,opacity:expanded?'1':'0'},
    ],{duration:260,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
    this.animation.onfinish=()=>this.finish();
  }

  cancelAnimation(){
    if(this.animation){this.animation.onfinish=null;this.animation.cancel();this.animation=null;}
  }

  finish(){
    if(!this.details)return;
    this.cancelAnimation();
    this.details.open=this.expanded;
    this.answer.style.removeProperty('overflow');
    this.answer.inert=false;
  }

  disconnectedCallback(){
    this.listeners?.abort();this.listeners=null;
    this.finish();
  }
}

if(!customElements.get('ruslitiki-faq'))customElements.define('ruslitiki-faq',RuslitikiFaq);
