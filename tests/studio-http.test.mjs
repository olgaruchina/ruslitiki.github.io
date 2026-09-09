import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { designFor, PALETTES } from '../src/lib/design.mjs';

test('local editor keeps drafts private, validates requests and builds the exact selected preview', {timeout:60000}, async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ruslitiki-http-'));
  let child;
  try{
    for(const entry of ['src','scripts','studio','public','content','package.json','package-lock.json','astro.config.mjs'])await fs.cp(path.resolve(entry),path.join(root,entry),{recursive:true});
    await fs.symlink(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
    const bin=path.join(root,'test-bin');await fs.mkdir(bin);
    await fs.writeFile(path.join(bin,'gh'),`#!${process.execPath}\nprocess.stderr.write('GitHub is not connected in this isolated test.');process.exit(1);\n`,{mode:0o700});
    const reservation=net.createServer();
    await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
    const port=reservation.address().port;
    await new Promise(resolve=>reservation.close(resolve));
    const origin=`http://127.0.0.1:${port}`;
    child=spawn(process.execPath,['scripts/studio.mjs'],{cwd:root,env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,RUSLITIKI_STUDIO_PORT:String(port)},stdio:['ignore','pipe','pipe']});
    let log='';child.stderr.on('data',data=>log+=data);child.stdout.on('data',data=>log+=data);
    let ready=false;
    for(let i=0;i<100;i++){
      try{if((await fetch(origin+'/api/state')).ok){ready=true;break;}}catch{}
      if(child.exitCode!==null)throw new Error(log);
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    assert.ok(ready,log || 'Studio did not start.');
    const html=await (await fetch(origin)).text();
    const token=html.match(/name="studio-token" content="([a-f0-9]+)"/)[1];
    const api=async(route,data,headers={})=>{
      const response=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,'X-Studio-Token':token,...headers},body:JSON.stringify(data)});
      return {status:response.status,data:await response.json()};
    };
    const initial=await (await fetch(origin+'/api/state')).json();
    const sourceBefore=await fs.readFile(path.join(root,'content/site.json'),'utf8');
    assert.equal((await api('/api/connect-publishing',{}, {'X-Studio-Token':'wrong'})).status,403);
    const connection=await api('/api/connect-publishing',{});
    assert.equal(connection.status,200);assert.equal(connection.data.configured,false);
    assert.equal(connection.data.connection.ready,false);assert.equal(connection.data.revision,initial.revision);
    assert.equal(JSON.parse(await fs.readFile(path.join(root,'.studio/publishing.json'))).enabled,false);
    const canvasOne=await api('/api/canvas',{sequence:1,generation:1,content:initial.content});
    assert.equal(canvasOne.status,200,JSON.stringify(canvasOne.data));
    const firstCanvas=await fetch(canvasOne.data.url);assert.equal(firstCanvas.status,200);
    const canvasHtml=await firstCanvas.text();assert.ok(canvasHtml.includes('data-edit-field="heading"') && canvasHtml.includes('/__canvas/bridge.js'));
    const tabTwo={...initial.content,heading:'A different unsaved tab'};
    const canvasTwo=await api('/api/canvas',{sequence:1,generation:1,content:tabTwo});assert.equal(canvasTwo.status,200);
    assert.notEqual(canvasTwo.data.session,canvasOne.data.session);
    assert.ok((await (await fetch(canvasTwo.data.url)).text()).includes('A different unsaved tab'));
    assert.ok(!(await (await fetch(canvasOne.data.url)).text()).includes('A different unsaved tab'));
    const badNonce=new URL(canvasOne.data.url);badNonce.searchParams.set('nonce','wrong');
    assert.equal((await fetch(badNonce)).status,403);
    assert.equal((await fetch(canvasOne.data.url,{headers:{Origin:'https://another-site.example'}})).status,403);
    const privateSnapshot='/@fs/'+path.join(root,'.studio/canvas-sessions',canvasOne.data.session+'.json');
    assert.ok([403,404].includes((await fetch(new URL(privateSnapshot,canvasOne.data.origin))).status),'Vite must not expose per-tab drafts.');
    const canvasHostStatus=await new Promise((resolve,reject)=>{const req=http.get(canvasOne.data.url,{headers:{Host:'rebound.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});
    assert.equal(canvasHostStatus,403);
    assert.equal((await api('/api/canvas',{sequence:2,generation:2,session:canvasOne.data.session,nonce:'wrong',content:initial.content})).status,400);
    const newer=await api('/api/canvas',{sequence:3,generation:3,session:canvasOne.data.session,nonce:canvasOne.data.nonce,content:tabTwo});assert.equal(newer.status,200);
    assert.equal((await api('/api/canvas',{sequence:2,generation:2,session:canvasOne.data.session,nonce:canvasOne.data.nonce,content:initial.content})).status,409);
    assert.equal((await (await fetch(origin+'/api/state')).json()).revision,initial.revision,'Visual edits never change the saved draft.');
    const unfinished={...initial.content,sections:[{id:'empty-button',type:'button',heading:'',body:'',visible:true,buttonLabel:'',buttonUrl:''},{id:'empty-image',type:'image',heading:'',body:'',visible:true,image:'',imageAlt:'',imageWidth:0,imageHeight:0}]};delete unfinished.design;
    const unfinishedCanvas=await api('/api/canvas',{sequence:2,generation:2,session:canvasTwo.data.session,nonce:canvasTwo.data.nonce,content:unfinished});
    assert.equal(unfinishedCanvas.status,200,JSON.stringify(unfinishedCanvas.data));
    const unfinishedHtml=await (await fetch(unfinishedCanvas.data.url)).text();
    assert.ok(unfinishedHtml.includes('data-edit-field="buttonLabel"') && unfinishedHtml.includes('Choose an image'));
    assert.equal((await api('/api/save',{},{Origin:'https://another-site.example'})).status,403);
    assert.equal((await api('/api/save',{}, {'X-Studio-Token':'wrong'})).status,403);
    const reboundStatus=await new Promise((resolve,reject)=>{const req=http.get(origin+'/api/state',{headers:{Host:'rebound.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});
    assert.equal(reboundStatus,403);
    const content=structuredClone(initial.content);content.heading='Read the classics together.';
    delete content.book.showArtwork; // Existing saved drafts predate this optional field.
    const saved=await api('/api/save',{content,revision:initial.revision});
    assert.equal(saved.status,200);
    assert.equal(await fs.readFile(path.join(root,'content/site.json'),'utf8'),sourceBefore,'Saving must not touch public source.');
    assert.equal((await api('/api/save',{content:initial.content,revision:initial.revision})).status,409,'Stale window must not overwrite a newer draft.');
    const invalid={...content,waitlistUrl:'javascript:alert(1)'};
    assert.equal((await api('/api/save',{content:invalid,revision:saved.data.revision})).status,422);
    const uploaded=await api('/api/upload',{base64:(await fs.readFile(path.join(root,'public/images/ruslitiki-original.png'))).toString('base64')});
    assert.equal(uploaded.status,200);
    const stagedPath=uploaded.data.path;
    assert.equal(await fs.access(path.join(root,'public',stagedPath)).then(()=>true,()=>false),false,'Draft upload must stay outside public assets.');
    const built=await api('/api/preview',{revision:saved.data.revision});
    assert.equal(built.status,200,JSON.stringify(built.data));
    assert.equal(built.data.preview.current,true);
    const rendered=await fetch(built.data.preview.url);
    assert.match(rendered.headers.get('x-robots-tag'),/noindex/);
    const previewHtml=await rendered.text();
    assert.ok(!previewHtml.includes('/@vite/') && !previewHtml.includes('/__canvas/') && !previewHtml.includes('data-edit-field='),'A preview prepared after canvas startup is still a production artifact.');
    assert.ok(previewHtml.includes('Read the classics together.'));
    const overview=await fetch(new URL('/llms.txt',built.data.preview.url));
    assert.equal(overview.status,200);
    assert.match(overview.headers.get('content-type'),/text\/plain/);
    const overviewText=await overview.text();
    assert.ok(overviewText.includes('Read the classics together.'),'The AI overview must use the reviewed draft, not public source.');
    assert.ok(!overviewText.includes('#meet-ruslitiki'),'Hidden sections must stay out of the AI overview.');
    assert.ok(previewHtml.includes('Onegin speaks to Tatyana'),'Older drafts should display the matching book illustration.');
    assert.ok(previewHtml.includes('Frequently asked questions') && previewHtml.includes('Do I need to read Russian?'));
    const menu=previewHtml.match(/<nav class="section-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
    for(const id of ['first-book-title','how-the-club-works','membership','faq'])assert.ok(menu.includes(`href="#${id}"`));
    assert.ok(!menu.includes('#meet-ruslitiki'),'Hidden video sections stay out of the menu.');
    assert.ok(!previewHtml.includes('youtube-nocookie.com/embed/'),'The pending video must not publish a broken player.');
    assert.equal((await fetch(new URL(stagedPath,built.data.preview.url))).status,404,'Unselected upload must not be included in a release.');
    const manifest=JSON.parse(await fs.readFile(path.join(root,'.studio/previews',built.data.preview.id,'manifest.json')));
    assert.equal((await fetch(new URL('/favicon.svg',built.data.preview.url))).status,200);
    assert.equal((await api('/api/publish',{previewId:built.data.preview.id,confirmed:true})).status,400,'Publishing must remain disconnected until configured.');
    const selected={...content,logo:stagedPath,logoPresentation:'image'};
    selected.book={...content.book,showArtwork:false};
    const savedSelected=await api('/api/save',{content:selected,revision:saved.data.revision});
    const selectedPreview=await api('/api/preview',{revision:savedSelected.data.revision});
    assert.equal(selectedPreview.status,200,JSON.stringify(selectedPreview.data));
    assert.ok(!(await (await fetch(selectedPreview.data.preview.url)).text()).includes('Onegin speaks to Tatyana'),'The editor can hide the book illustration.');
    assert.equal((await fetch(new URL(stagedPath,selectedPreview.data.preview.url))).status,200,'The selected upload must appear in its reviewed release.');
    const customized=structuredClone(content);
    customized.sections=[
      {id:'quote-first',type:'quote',heading:'A reading invitation',body:'A supplied quotation.',attribution:'Club notes',visible:true,tone:'accent',align:'center',width:'full'},
      {id:'reader-image',type:'image',heading:'Our library',body:'Reading together.',visible:true,image:stagedPath,imageAlt:'The supplied Ruslitiki wordmark.',imageWidth:2500,imageHeight:1000,imageLayout:'right',imageRatio:'square'},
      {id:'custom-button',type:'button',heading:'',body:'',visible:true,buttonLabel:'Read with Ruslitiki',buttonUrl:content.waitlistUrl,buttonKind:'outline'},
      {id:'test-video',type:'video',heading:'Video fixture',body:'',visible:true,videoUrl:'https://youtu.be/M7lc1UVf-VE?si=shared'},
    ];
    customized.design={...designFor(customized),background:PALETTES.night.background,ink:PALETTES.night.ink,accent:PALETTES.night.accent,buttonStyle:'outline',width:'compact',spacing:'airy',headingFont:'golos',bodySize:20,blockOrder:['quote-first','opening','reader-image','custom-button','test-video']};
    let revision=savedSelected.data.revision;
    for(const composition of ['book-left','stacked','centered','split']){
      customized.design.composition=composition;
      const next=await api('/api/save',{content:customized,revision});
      assert.equal(next.status,200,JSON.stringify(next.data));revision=next.data.revision;
      assert.equal(next.data.preview.current,false,'A layout change invalidates the reviewed preview.');
      assert.equal(await fs.readFile(path.join(root,'content/site.json'),'utf8'),sourceBefore);
      const result=await api('/api/preview',{revision});assert.equal(result.status,200,JSON.stringify(result.data));
      const html=await (await fetch(result.data.preview.url)).text();
      assert.ok(html.includes(`composition-${composition}`));
      assert.ok(html.includes('Read with Ruslitiki') && html.includes('section-button-outline'));
      assert.ok(html.includes('src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"') && html.includes('referrerpolicy="strict-origin-when-cross-origin"') && html.includes('title="Video fixture"'));
      const customMenu=html.match(/<nav class="section-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
      assert.ok(!customMenu.includes('#membership') && !customMenu.includes('#faq'),'Removed sections leave no broken menu links.');
      assert.ok(!html.includes('autoplay=1') && !html.includes('canvas-video-control'));
      assert.ok(html.includes('--page-bg:#161b2c') && html.includes('data-button-style="outline"'));
      assert.ok(html.indexOf('data-block-id="quote-first"')<html.indexOf('data-block-id="opening"'),'Custom blocks can appear before the introduction.');
      assert.equal(html.indexOf('data-part="book"')<html.indexOf('data-part="introduction"'),composition==='book-left','Visual and document reading order agree.');
      assert.equal((await fetch(new URL(stagedPath,result.data.preview.url))).status,customized.sections[1].visible?200:404,'Only visible block images are included when the logo uses the original asset.');
      customized.sections[1].visible=false;
    }
    const rejected={...customized,design:{...customized.design,background:'#ffffff',ink:'#eeeeee'}};
    assert.equal((await api('/api/save',{content:rejected,revision})).status,422,'Unreadable colours cannot overwrite a saved draft.');
    assert.equal((await (await fetch(origin+'/api/state')).json()).revision,revision);
    assert.match((await fetch(origin+'/design.mjs')).headers.get('content-type'),/javascript/);
    const layoutStyles=await fetch(origin+'/layout-controls.css');
    assert.equal(layoutStyles.status,200);assert.match(layoutStyles.headers.get('content-type'),/css/);
    const current=await (await fetch(origin+'/api/state')).json();
    const missing={...current.content,logo:'/images/missing.png'};
    const savedMissing=await api('/api/save',{content:missing,revision:current.revision});
    const missingPreview=await api('/api/preview',{revision:savedMissing.data.revision});
    assert.equal(missingPreview.status,400);
    assert.match(missingPreview.data.error,/selected logo is missing/);
    assert.equal(await fs.readFile(path.join(root,'content/site.json'),'utf8'),sourceBefore);
  }finally{
    if(child && child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('close',resolve));}
    await fs.rm(root,{recursive:true,force:true});
  }
});
