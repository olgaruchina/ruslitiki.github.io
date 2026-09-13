export class VisualCanvas {
  constructor({frame,status,request,onIntent}){
    this.frame=frame;this.status=status;this.request=request;this.onIntent=onIntent;
    this.connection=null;this.sequence=0;this.generation=0;this.renderedGeneration=0;this.signature='';this.deferred=false;this.rendered=0;this.pending=null;this.sending=false;this.locked=false;this.flushes=new Map();
    window.addEventListener('message',event=>{
      const data=event.data,c=this.connection;
      if(!c || event.source!==frame.contentWindow || event.origin!==c.origin || data?.channel!=='ruslitiki-canvas' || data.session!==c.session || data.nonce!==c.nonce)return;
      if(data.type==='flushed'){
        const waiting=this.flushes.get(data.requestId);if(waiting){clearTimeout(waiting.timer);this.flushes.delete(data.requestId);waiting.resolve();}return;
      }
      if(data.type==='rendered' && Number.isSafeInteger(data.sequence) && data.sequence>=this.rendered && data.sequence<=c.sequence){
        this.rendered=data.sequence;this.renderedGeneration=Math.max(this.renderedGeneration,data.generation || 0);this.status.textContent='Click text to edit. Select a section to move it or add more.';
        this.post('invalidate',{generation:this.generation});this.post('lock',{locked:this.editingBlocked});
        if(data.sequence<c.sequence)this.post('refresh',{url:c.url,sequence:c.sequence,generation:c.generation});
        return;
      }
      if(data.sequence!==this.rendered)return;
      if(data.type==='render-error'){this.status.textContent=data.message;return;}
      // Final text handshakes must always be answered, even if an inspector
      // change just locked the frame. The parent checks field conflicts.
      if(['text','edit-end'].includes(data.type) || !this.editingBlocked)this.onIntent(data);
    });
  }
  get flushing(){return this.flushes.size>0;}
  get editingBlocked(){return this.locked || this.generation>this.renderedGeneration;}
  post(type,data={}){const c=this.connection;if(c)this.frame.contentWindow.postMessage({channel:'ruslitiki-canvas',session:c.session,nonce:c.nonce,sequence:c.sequence,type,...data},c.origin);}
  schedule(content,{defer=false}={}){
    const signature=JSON.stringify(content);if(signature!==this.signature){this.generation++;this.signature=signature;}
    if(defer && this.rendered)this.renderedGeneration=this.generation; // Inline text is already visible in the frame.
    this.pending={content:structuredClone(content),generation:this.generation};this.deferred=defer;clearTimeout(this.timer);this.post('invalidate',{generation:this.generation});
    this.post('lock',{locked:this.editingBlocked});
    if(!defer)this.timer=setTimeout(()=>this.sendDraft(),180);
  }
  async sendDraft(){
    if(this.sending || !this.pending || this.deferred)return;
    this.sending=true;const {content,generation}=this.pending;this.pending=null;const sequence=++this.sequence;
    this.status.textContent='Updating the visual page…';
    try{
      const c=this.connection;
      const result=await this.request('/api/canvas',{content,sequence,generation,...(c?{session:c.session,nonce:c.nonce}:{})});
      this.connection=result;
      if(!this.frame.getAttribute('src')){this.frame.src=result.url;this.frame.hidden=false;}
      else this.post('refresh',{url:result.url,sequence:result.sequence,generation:result.generation});
    }catch(error){this.status.textContent='Canvas: '+error.message;}
    finally{this.sending=false;if(this.pending && !this.deferred)this.timer=setTimeout(()=>this.sendDraft(),180);}
  }
  select(id){this.post('select',{id});}
  setLocked(locked){this.locked=locked;this.post('lock',{locked:this.editingBlocked});}
  flush(){
    if(!this.rendered)return Promise.resolve();
    const requestId=crypto.randomUUID();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.flushes.delete(requestId);reject(new Error('The visual page did not respond. Try again before saving or publishing.'));},5000);
      this.flushes.set(requestId,{resolve,timer});this.post('flush',{requestId});
    });
  }
}
