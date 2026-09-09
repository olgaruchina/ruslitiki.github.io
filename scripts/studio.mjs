import http from 'node:http';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { readContent, validateContent } from '../src/lib/content.mjs';
import { atomicJson, json, digest, fileMap, rendererDigest, checkRevision, saveDraft, safeImage } from './studio-store.mjs';
import { run, publishRelease, validatePublishing, verifyArtifact } from './publish-release.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const STORAGE=path.join(ROOT,'.studio');
const PORT=Number(process.env.RUSLITIKI_STUDIO_PORT || 4310);
const ORIGIN=`http://127.0.0.1:${PORT}`;
const TOKEN=randomBytes(32).toString('hex');
const UI=path.join(ROOT,'studio');
const previewServers=new Map();
let busy=false;
let message='Your changes stay private until you publish.';
let preview=null;
let publication=null;

await fs.mkdir(STORAGE,{recursive:true,mode:0o700});
try {await fs.access(path.join(STORAGE,'draft.json'));} catch {await atomicJson(path.join(STORAGE,'draft.json'),readContent(path.join(ROOT,'content/site.json')));}
try { publication=await json(path.join(STORAGE,'publication.json')); } catch {}

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
function send(res,status,value) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req) {
  if(req.headers['content-type']!=='application/json') {const e=new Error('Use a JSON request.');e.status=415;throw e;}
  const chunks=[];let bytes=0;
  for await(const chunk of req) {bytes+=chunk.length;if(bytes>3*1024*1024){const e=new Error('The request is too large.');e.status=413;throw e;}chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString());}catch{const e=new Error('The request could not be read.');e.status=400;throw e;}
}
async function staticFile(res,root,pathname) {
  let decoded;
  try{decoded=decodeURIComponent(pathname);}catch{res.writeHead(400);res.end();return;}
  if(decoded.includes('\0')){res.writeHead(400);res.end();return;}
  let file=path.resolve(root,`.${decoded}`);
  if(file!==root && !file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try {
    const stat=await fs.lstat(file);
    if(stat.isSymbolicLink())throw new Error();
    if(stat.isDirectory())file=path.join(file,'index.html');
    if(!(await fs.realpath(file)).startsWith(await fs.realpath(root)+path.sep))throw new Error();
    const data=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});res.end(data);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Page not found.');}
}
async function servePreview(item) {
  const server=http.createServer((req,res)=>{
    if(req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(403);res.end();return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    staticFile(res,item.directory,new URL(req.url,'http://127.0.0.1').pathname);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  previewServers.set(item.id,server);
  return `http://127.0.0.1:${server.address().port}/`;
}
async function publishingConfig(){try{return await json(path.join(STORAGE,'publishing.json'));}catch{return null;}}
async function state() {
  const content=await json(path.join(STORAGE,'draft.json'));
  let configured=false;
  try{validatePublishing(await publishingConfig());configured=true;}catch{}
  const current=preview ? preview.contentHash===digest(content) && preview.rendererHash===await rendererDigest(ROOT) && preview.sourceHash===digest(await fs.readFile(path.join(ROOT,'content/site.json'))) : false;
  const canRestore=await fs.access(path.join(STORAGE,'previous-publication.json')).then(()=>true,()=>false);
  return {content,revision:digest(content),busy,message,preview:preview ? {id:preview.id,url:preview.url,createdAt:preview.createdAt,current} : null,publication,configured,canRestore};
}
async function buildPreview() {
  const content=await json(path.join(STORAGE,'draft.json'));
  const errors=validateContent(content);if(errors.length)throw new Error(errors.join('\n'));
  const id=randomUUID();
  const folder=path.join(STORAGE,'previews',id);
  const directory=path.join(folder,'site');
  const rendererHash=await rendererDigest(ROOT);
  const sourceHash=digest(await fs.readFile(path.join(ROOT,'content/site.json')));
  await atomicJson(path.join(folder,'content.json'),content);
  const publicDir=path.join(folder,'public');
  await fs.cp(path.join(ROOT,'public'),publicDir,{recursive:true});
  const stagedImage=path.join(STORAGE,'uploads',path.basename(content.logo));
  try{await fs.copyFile(stagedImage,path.join(publicDir,content.logo.slice(1)));}catch(error){if(error.code!=='ENOENT')throw error;}
  const buildEnv={...process.env,RUSLITIKI_CONTENT_FILE:path.join(folder,'content.json'),RUSLITIKI_PUBLIC_DIR:publicDir,RUSLITIKI_PREVIEW:'0'};
  message='Preparing your saved draft…';
  await run(process.execPath,[path.join(ROOT,'scripts/check-content.mjs')],{cwd:ROOT,env:buildEnv});
  await run(process.execPath,[path.join(ROOT,'node_modules/astro/bin/astro.mjs'),'build','--outDir',directory],{cwd:ROOT,env:buildEnv});
  if(rendererHash!==await rendererDigest(ROOT) || sourceHash!==digest(await fs.readFile(path.join(ROOT,'content/site.json'))))throw new Error('The website design changed while preparing this preview. Please prepare a new preview.');
  await atomicJson(path.join(directory,'release.json'),{id,createdAt:new Date().toISOString()});
  await fs.writeFile(path.join(directory,'.nojekyll'),'');
  const item={id,directory,content,contentHash:digest(content),rendererHash,sourceHash,createdAt:new Date().toISOString(),artifactHash:digest(await fileMap(directory))};
  await atomicJson(path.join(folder,'manifest.json'),item);
  item.url=await servePreview(item);
  preview=item;
  await atomicJson(path.join(STORAGE,'current-preview.json'),{id});
  message='Preview ready. This is your saved draft; the public website has not changed.';
}
try{
  const current=await json(path.join(STORAGE,'current-preview.json'));
  if(/^[a-f0-9-]{36}$/.test(current.id)){
    const item=await json(path.join(STORAGE,'previews',current.id,'manifest.json'));
    if(item.directory===path.join(STORAGE,'previews',current.id,'site')){await verifyArtifact(item);item.url=await servePreview(item);preview=item;}
  }
}catch{}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.headers.host!==`127.0.0.1:${PORT}` || (req.headers.origin && req.headers.origin!==ORIGIN)){send(res,403,{error:'Open this editor directly on this laptop.'});return;}
    const url=new URL(req.url,ORIGIN);
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(url.pathname.startsWith('/api/')){
      if(req.method==='GET' && url.pathname==='/api/state'){send(res,200,await state());return;}
      if(req.method!=='POST'){send(res,405,{error:'This action is not available.'});return;}
      if(req.headers.origin!==ORIGIN || req.headers['x-studio-token']!==TOKEN){send(res,403,{error:'Reload the editor before making changes.'});return;}
      if(busy){send(res,409,{error:'Please wait for the current action to finish.'});return;}
      const data=await body(req);
      if(busy){send(res,409,{error:'Please wait for the current action to finish.'});return;}
      busy=true;
      try{
        if(url.pathname==='/api/save'){
          await saveDraft(STORAGE,data.content,data.revision);
          message='Draft saved on this laptop. The public website has not changed.';
        }else if(url.pathname==='/api/upload'){
          const image=Buffer.from(typeof data.base64==='string'?data.base64:'','base64');
          const extension=safeImage(image);
          const filename=`logo-${randomUUID()}.${extension}`;
          await fs.mkdir(path.join(STORAGE,'uploads'),{recursive:true});
          await fs.writeFile(path.join(STORAGE,'uploads',filename),image,{flag:'wx'});
          send(res,200,{path:`/images/${filename}`});return;
        }else if(url.pathname==='/api/preview'){
          checkRevision(data.revision,digest(await json(path.join(STORAGE,'draft.json'))));
          await buildPreview();
        }else if(url.pathname==='/api/restore'){
          const previous=await json(path.join(STORAGE,'previous-publication.json')).catch(()=>null);
          if(!previous?.content)throw new Error('There is no previous published version to restore yet.');
          const draft=await json(path.join(STORAGE,'draft.json'));
          checkRevision(data.revision,digest(draft));
          await atomicJson(path.join(STORAGE,'backups',`${Date.now()}.json`),draft);
          await atomicJson(path.join(STORAGE,'draft.json'),previous.content);
          await buildPreview();
          message='Previous content restored as a draft. Your newer draft is backed up; review before publishing.';
        }else if(url.pathname==='/api/publish'){
          if(!preview || data.previewId!==preview.id || data.confirmed!==true)throw new Error('Review and confirm the current preview before publishing.');
          if(!(await state()).preview.current)throw new Error('The draft or website design changed. Prepare and review a fresh preview.');
          const config=await publishingConfig();
          const published=await publishRelease(preview,config,STORAGE,value=>message=value);
          const old=await json(path.join(STORAGE,'publication.json')).catch(()=>null);
          if(old)await atomicJson(path.join(STORAGE,'previous-publication.json'),old);
          publication={...published,content:preview.content};
          await atomicJson(path.join(STORAGE,'publication.json'),publication);
          await fs.copyFile(path.join(preview.directory,preview.content.logo.slice(1)),path.join(ROOT,'public',preview.content.logo.slice(1)));
          // Keep the source of this published content easy to back up and commit.
          await atomicJson(path.join(ROOT,'content/site.json'),preview.content);
          preview.sourceHash=digest(await fs.readFile(path.join(ROOT,'content/site.json')));
          message='Published. The live website is showing your reviewed version.';
        }else{send(res,404,{error:'This action is not available.'});return;}
      }finally{busy=false;}
      send(res,200,await state());return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-src http://127.0.0.1:*; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
    if(url.pathname==='/'){
      const html=(await fs.readFile(path.join(UI,'index.html'),'utf8')).replace('STUDIO_TOKEN',TOKEN);
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;
    }
    await staticFile(res,UI,url.pathname);
  }catch(error){if(!busy)message=error.message;send(res,error.status || 400,{error:error.message});}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE' ? `The editor may already be open: ${ORIGIN}` : error.message);process.exitCode=1;for(const s of previewServers.values())s.close();});
server.listen(PORT,'127.0.0.1',()=>console.log(`Ruslitiki Studio: ${ORIGIN}\nPrivate drafts stay on this laptop. Keep this window open while editing.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const s of previewServers.values())s.close();server.close(()=>process.exit(0));});
