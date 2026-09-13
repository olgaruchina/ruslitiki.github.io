import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VisualCanvas } from '../studio/visual-canvas.js';

function fixture(){
  let receive;const messages=[],intents=[],requests=[];
  globalThis.window={addEventListener(type,handler){if(type==='message')receive=handler;}};
  const frame={src:'',getAttribute(){return this.src;},contentWindow:{postMessage(data,origin){messages.push({data,origin});}}};
  const controller=new VisualCanvas({frame,status:{textContent:''},onIntent:intent=>intents.push(intent),request:async(route,data)=>{
    requests.push({route,data});return {session:'tab-one',nonce:'canvas-only-secret',origin:'http://127.0.0.1:9876',url:'http://127.0.0.1:9876/?session=tab-one',sequence:data.sequence,generation:data.generation};
  }});
  const reply=(data,overrides={})=>receive({source:frame.contentWindow,origin:'http://127.0.0.1:9876',data:{channel:'ruslitiki-canvas',session:'tab-one',nonce:'canvas-only-secret',sequence:controller.rendered || 1,...data},...overrides});
  const render=async content=>{controller.schedule(content);clearTimeout(controller.timer);await controller.sendDraft();reply({type:'rendered',sequence:controller.sequence,generation:controller.generation});};
  return {controller,messages,intents,requests,reply,render};
}

test('a final inline handshake survives an inspector lock, while foreign frames and stale documents are ignored',async()=>{
  const f=fixture();
  try{
    await f.render({heading:'Original'});
    f.controller.schedule({heading:'Changed in settings'});clearTimeout(f.controller.timer);
    assert.equal(f.controller.editingBlocked,true);
    f.reply({type:'text',field:'heading',value:'Final inline text',textSequence:2,transaction:'editing'});
    assert.equal(f.intents.length,1,'The parent must receive and resolve this handshake even while the frame is locked.');
    f.reply({type:'text'},{origin:'https://foreign.example'});
    f.reply({type:'text',sequence:0});assert.equal(f.intents.length,1);
    const flushed=f.controller.flush();
    const request=f.messages.at(-1).data;
    f.reply({type:'flushed',requestId:request.requestId,nonce:'wrong'});assert.equal(f.controller.flushes.size,1);
    f.reply({type:'flushed',requestId:request.requestId});await flushed;assert.equal(f.controller.flushes.size,0);
  }finally{clearTimeout(f.controller.timer);delete globalThis.window;}
});

test('inline typing updates the visible generation without sending or applying an older draft',async()=>{
  const f=fixture();
  try{
    await f.render({heading:'Original'});
    f.controller.schedule({heading:'Typing here'},{defer:true});await f.controller.sendDraft();
    assert.equal(f.requests.length,1,'Typing is immediate in the frame; full rendering waits for the edit to finish.');
    assert.equal(f.controller.editingBlocked,false);assert.equal(f.controller.generation,2);
    f.controller.schedule({heading:'Typing here'});clearTimeout(f.controller.timer);await f.controller.sendDraft();
    assert.equal(f.requests.at(-1).data.generation,2);assert.equal(f.requests.at(-1).data.content.heading,'Typing here');
    assert.equal(f.messages.at(-1).data.type,'refresh');assert.equal(f.messages.at(-1).data.generation,2);
  }finally{clearTimeout(f.controller.timer);delete globalThis.window;}
});
