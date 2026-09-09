import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { validateContent } from '../src/lib/content.mjs';
import { editableContent } from '../src/lib/design.mjs';
import { atomicJson } from './studio-store.mjs';

// The canvas is a separate local Astro app. Its renderer is the actual homepage,
// but its routes, bridge and per-tab draft files never enter the public build.
export function createCanvasService(root, studioOrigin) {
  const app=path.join(root,'.studio/canvas-app');
  const snapshots=path.join(root,'.studio/canvas-sessions');
  const sessions=new Map();
  let starting=null;
  async function start() {
    await fs.mkdir(path.join(app,'src/pages'),{recursive:true});
    await fs.mkdir(snapshots,{recursive:true,mode:0o700});
    await fs.writeFile(path.join(app,'package.json'),JSON.stringify({name:'ruslitiki-private-canvas',private:true,type:'module'}));
    const template=`---
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Homepage from ${JSON.stringify(path.join(root,'src/components/Homepage.astro'))};
export const prerender = false;
const id=Astro.url.searchParams.get('session');
if(!/^[a-f0-9-]{36}$/.test(id || ''))return new Response('Open the canvas from the editor.',{status:403});
let snapshot;
try{snapshot=JSON.parse(await readFile(path.join(${JSON.stringify(snapshots)},id+'.json'),'utf8'));}catch{return new Response('This editing session is unavailable.',{status:404});}
if(Astro.url.searchParams.get('nonce')!==snapshot.nonce)return new Response('Open the canvas from the editor.',{status:403});
const config={studioOrigin:${JSON.stringify(studioOrigin)},session:id,nonce:snapshot.nonce,sequence:snapshot.sequence,generation:snapshot.generation};
---
<Homepage content={snapshot.content} visualEditing={true}>
  <link rel="stylesheet" href="/__canvas/bridge.css" />
  <script is:inline type="application/json" id="canvas-config" set:html={JSON.stringify(config).replace(/</g,'\\\\u003c')} />
  <script is:inline src="/__canvas/bridge.js"></script>
</Homepage>
`;
    await fs.writeFile(path.join(app,'src/pages/index.astro'),template);
    const {dev}=await import('astro');
    return dev({
      root:app,configFile:false,srcDir:'./src',publicDir:path.join(root,'public'),
      outDir:'./dist',cacheDir:'./.astro-cache',site:'https://www.ruslitiki.com',output:'server',
      devToolbar:{enabled:false},server:{host:'127.0.0.1',port:0,open:false},logLevel:'error',
      vite:{cacheDir:path.join(app,'.vite'),server:{hmr:false,fs:{strict:true,allow:[app,path.join(root,'src'),await fs.realpath(path.join(root,'node_modules'))]}},
        plugins:[{name:'private-ruslitiki-canvas',enforce:'pre',configureServer(server){
          server.middlewares.use(async(req,res,next)=>{
            const origin=`http://127.0.0.1:${req.socket.localPort}`;
            if(req.headers.host!==new URL(origin).host || (req.headers.origin && req.headers.origin!==origin)){res.writeHead(403);res.end();return;}
            if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
            res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Referrer-Policy','no-referrer');
            res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src https://www.youtube-nocookie.com; frame-ancestors ${studioOrigin}; form-action 'none'; base-uri 'self'`);
            const bridges={'/__canvas/bridge.js':['canvas-bridge.js','text/javascript'],'/__canvas/bridge.css':['canvas-bridge.css','text/css']};
            try{
              const pathname=new URL(req.url,origin).pathname;
              if(bridges[pathname]){
                const [file,type]=bridges[pathname];res.setHeader('Content-Type',type+'; charset=utf-8');res.end(await fs.readFile(path.join(root,'studio',file)));return;
              }
              if(/^\/images\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(pathname)){
                const file=path.join(root,'.studio/uploads',path.basename(pathname));
                try{
                  const stat=await fs.lstat(file);if(!stat.isFile() || stat.isSymbolicLink())throw new Error('Invalid image.');
                  res.setHeader('Content-Type',/\.png$/.test(file)?'image/png':/\.webp$/.test(file)?'image/webp':'image/jpeg');res.end(await fs.readFile(file));return;
                }catch(error){if(error.code!=='ENOENT')throw error;}
              }
              next();
            }catch{res.writeHead(404);res.end('Not found.');}
          });
        }}]},
    });
  }
  return {
    async update(data) {
      if(!Number.isSafeInteger(data.sequence) || data.sequence<1)throw new Error('Invalid canvas update.');
      const generation=data.generation??data.sequence;
      if(!Number.isSafeInteger(generation) || generation<1)throw new Error('Invalid canvas revision.');
      const errors=validateContent(data.content,{draft:true});
      if(errors.length){const error=new Error(errors.join('\n'));error.status=422;throw error;}
      let session=data.session ? sessions.get(data.session) : null;
      if(data.session && (!session || session.nonce!==data.nonce))throw new Error('Reload the editor to start a fresh canvas.');
      if(!session){
        if(sessions.size>=64)throw new Error('Too many editing tabs. Restart the editor to open a new canvas.');
        session={id:randomUUID(),nonce:randomBytes(24).toString('hex'),sequence:0,queue:Promise.resolve()};sessions.set(session.id,session);
      }
      const write=session.queue.then(async()=>{
        if(data.sequence<=session.sequence){const error=new Error('A newer canvas update is already available.');error.status=409;throw error;}
        await atomicJson(path.join(snapshots,session.id+'.json'),{content:editableContent(data.content),nonce:session.nonce,sequence:data.sequence,generation});
        session.sequence=data.sequence;
      });
      session.queue=write.catch(()=>{});await write;
      starting ||= start();
      let server;
      try{server=await starting;}catch(error){starting=null;throw error;}
      const origin=`http://127.0.0.1:${server.address.port}`;
      const url=new URL('/',origin);url.searchParams.set('session',session.id);url.searchParams.set('nonce',session.nonce);url.searchParams.set('sequence',String(data.sequence));
      return {session:session.id,nonce:session.nonce,sequence:data.sequence,generation,url:url.href,origin};
    },
    async stop(){if(starting)await (await starting).stop();},
  };
}
