import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileMap, digest, atomicJson, json } from './studio-store.mjs';

export function run(command, args, options = {}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{...options,stdio:['ignore','pipe','pipe']});
    let output='';
    child.stdout.on('data',chunk=>output+=chunk);
    child.stderr.on('data',chunk=>output+=chunk);
    child.on('error',reject);
    child.on('close',code=>code===0 ? resolve(output.trim()) : reject(new Error(output.slice(-5000) || `${command} could not finish.`)));
  });
}

export function validatePublishing(config) {
  if (!config?.enabled) throw new Error('Public publishing is not connected yet. The page can still be edited, saved and previewed.');
  if (config.repository !== 'olgaruchina/ruslitiki.github.io' || config.branch !== 'site-live') throw new Error('Publishing must use the configured Ruslitiki repository and site-live branch.');
  const url = new URL(config.liveUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || !['www.ruslitiki.com','ruslitiki.com'].includes(url.hostname)) throw new Error('Use the Ruslitiki HTTPS website address for publication.');
  return url;
}

export async function verifyArtifact(preview) {
  const actual = await fileMap(preview.directory);
  if (digest(actual) !== preview.artifactHash) throw new Error('The preview files changed. Prepare and review a fresh preview before publishing.');
}

// Cloudflare Pages must first be connected to this repository's site-live branch,
// with no build command and the output directory set to the repository root.
// Only generated public files go onto that branch. No hosting token reaches the UI.
export async function publishRelease(preview, config, workingRoot, onStatus) {
  const liveUrl = validatePublishing(config);
  await verifyArtifact(preview);
  const remote=`https://github.com/${config.repository}.git`;
  await run('gh',['auth','status']);
  const work=path.join(workingRoot,`publish-${preview.id}`);
  const pendingFile=path.join(workingRoot,`pending-${preview.id}.json`);
  const pending=await json(pendingFile).catch(()=>null);
  await fs.mkdir(work,{recursive:true});
  const git=args=>run('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential',...args],{cwd:work});
  await git(['init','--initial-branch=site-live']);
  const refs=await git(['ls-remote',remote,'refs/heads/site-live']);
  const remoteCommit=refs.split(/\s/)[0] || null;
  const previousCommit=pending ? pending.previousCommit : remoteCommit;
  let commit=pending?.commit;
  if(pending){
    if(pending.artifactHash!==preview.artifactHash || pending.id!==preview.id)throw new Error('The pending release does not match this preview.');
    if(remoteCommit!==commit && remoteCommit!==previousCommit)throw new Error('Another release replaced the pending update. Prepare a fresh preview.');
    await git(['rev-parse','--verify',`${commit}^{commit}`]);
  }else{
    if (remoteCommit) {
      await git(['fetch','--depth=1',remote,'refs/heads/site-live']);
      await git(['checkout','-B','site-live','FETCH_HEAD']);
      if(await git(['rev-parse','HEAD'])!==remoteCommit)throw new Error('The public release changed while preparing publication. Retry with a fresh preview.');
    }
    for (const entry of await fs.readdir(work)) if(entry!=='.git') await fs.rm(path.join(work,entry),{recursive:true,force:true});
    await fs.cp(preview.directory,work,{recursive:true});
    if(digest(await fileMap(work,['.git']))!==preview.artifactHash)throw new Error('The copied release differs from the reviewed preview. Prepare a fresh preview.');
    await git(['add','--all']);
    if(await git(['status','--porcelain']))await git(['-c','user.name=Ruslitiki Studio','-c','user.email=studio@users.noreply.github.com','commit','-m',`Publish reviewed Ruslitiki page ${preview.id}`]);
    commit=await git(['rev-parse','HEAD']);
    await atomicJson(pendingFile,{id:preview.id,artifactHash:preview.artifactHash,commit,previousCommit});
  }
  onStatus('Sending your reviewed page to the website…');
  // No force push: another publisher's update causes an explicit failure.
  if(remoteCommit!==commit)await git(['push',remote,`${commit}:refs/heads/site-live`]);
  onStatus('The host is updating the website. Your previous page stays available while it builds.');
  for(let attempt=0;attempt<60;attempt++) {
    const current=await git(['ls-remote',remote,'refs/heads/site-live']);
    if(current.split(/\s/)[0] !== commit) throw new Error('Another release was sent after yours. Refresh the editor before publishing again.');
    try {
      const markerUrl=new URL('/release.json',liveUrl);
      markerUrl.searchParams.set('v',preview.id);
      const response=await fetch(markerUrl,{cache:'no-store',signal:AbortSignal.timeout(5000),redirect:'error'});
      if(response.ok && (await response.json()).id===preview.id) return {id:preview.id,commit,previousCommit,url:liveUrl.href,publishedAt:new Date().toISOString()};
    } catch { /* A host can briefly return an old page or be unavailable during deployment. */ }
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  const error=new Error('The release was sent, but the live site has not confirmed it yet. Your draft is safe. Check the hosting connection before retrying.');
  error.sentCommit=commit;
  throw error;
}
