import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileMap, digest, atomicJson, json } from './studio-store.mjs';

export const EDITOR_PUBLISHING = {enabled:true,repository:'olgaruchina/ruslitiki.github.io',branch:'site-live',liveUrl:'https://www.ruslitiki.com/'};
const REPOSITORY_URL='https://github.com/'+EDITOR_PUBLISHING.repository;

// Read remote prerequisites without modifying GitHub settings or sending a release.
export async function checkPublishingConnection(execute=run) {
  const checks=[];
  const add=(id,label,ready,detail,url)=>checks.push({id,label,ready,detail,...(url?{url}:{})});
  const result=()=>({ready:checks.every(check=>check.ready),checkedAt:new Date().toISOString(),checks});
  const api=async endpoint=>JSON.parse(await execute('gh',['api',`repos/${EDITOR_PUBLISHING.repository}${endpoint}`],{timeout:15000}));
  try{
    await execute('git',['--version'],{timeout:15000});
    const repository=await api('');
    add('account','GitHub connection',repository.permissions?.push===true,repository.permissions?.push ? 'This laptop can send updates to the Ruslitiki repository.' : 'Sign in to GitHub CLI on this laptop with access to update the Ruslitiki repository.');
  }catch{
    add('account','GitHub connection',false,'The maintainer needs to install Git and sign in to GitHub CLI on this laptop.');
    return result();
  }
  const [pagesResult,modeResult,environmentResult]=await Promise.allSettled([
    api('/pages'),api('/actions/variables/RUSLITIKI_PUBLISH_SOURCE'),api('/environments/github-pages'),
  ]);
  const pages=pagesResult.status==='fulfilled'?pagesResult.value:null;
  add('pages','GitHub Pages publishing',pages?.build_type==='workflow',pages?.build_type==='workflow'?'GitHub Actions is the publishing source.':'The repository owner must select GitHub Actions under Pages → Build and deployment → Source.',REPOSITORY_URL+'/settings/pages');
  let canonical=false;
  try{canonical=new URL(pages.html_url).href===EDITOR_PUBLISHING.liveUrl && pages.https_enforced===true;}catch{}
  add('domain','Website address',canonical,canonical?'Publications will appear at https://www.ruslitiki.com/.':'The owner must check the custom domain www.ruslitiki.com and enable HTTPS in Pages settings.',REPOSITORY_URL+'/settings/pages');
  const editorMode=modeResult.status==='fulfilled' && modeResult.value.value==='editor';
  add('mode','Editor publishing mode',editorMode,editorMode?'GitHub Actions accepts the page reviewed in this editor.':'After pending production runs finish, set repository variable RUSLITIKI_PUBLISH_SOURCE to editor. This setting could not be confirmed.',REPOSITORY_URL+'/settings/variables/actions');
  const environment=environmentResult.status==='fulfilled'?environmentResult.value:null;
  let allowed=false;
  let environmentDetail='The owner must allow the site-live branch under Deployment branches and tags in the github-pages environment.';
  if(environment){
    const policy=environment.deployment_branch_policy;
    allowed=policy===null;
    if(policy?.custom_branch_policies){
      try{
        const rules=await api('/environments/github-pages/deployment-branch-policies?per_page=100');
        allowed=rules.branch_policies.some(rule=>rule.type==='branch' && (rule.name==='site-live' || rule.name==='*'));
      }catch{}
    }
    // Other rules may require a person or service to approve every publication.
    if((environment.protection_rules || []).some(rule=>rule.type!=='branch_policy')){
      allowed=false;environmentDetail='The github-pages environment has additional deployment rules. The owner must review those rules before automatic publishing can be confirmed.';
    }
  }
  add('environment','Permission to publish',allowed,allowed?'The site-live branch can publish without a separate approval.':environmentDetail,REPOSITORY_URL+'/settings/environments');
  return result();
}

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
  if (url.href !== EDITOR_PUBLISHING.liveUrl) throw new Error('Use the canonical Ruslitiki HTTPS website address: https://www.ruslitiki.com/.');
  return url;
}

export async function verifyArtifact(preview) {
  const actual = await fileMap(preview.directory);
  if (digest(actual) !== preview.artifactHash) throw new Error('The preview files changed. Prepare and review a fresh preview before publishing.');
}

export async function stagePagesRelease(preview, work, workflowPath) {
  await verifyArtifact(preview);
  const output=path.join(work,'dist');
  await fs.cp(preview.directory,output,{recursive:true});
  if(digest(await fileMap(output))!==preview.artifactHash)throw new Error('The copied release differs from the reviewed preview. Prepare a fresh preview.');
  // Push workflows must be present on the branch being pushed. Keep this trusted
  // infrastructure outside dist so it never becomes part of the public website.
  const workflow=path.join(work,'.github/workflows/pages.yml');
  await fs.mkdir(path.dirname(workflow),{recursive:true});
  await fs.copyFile(workflowPath,workflow);
}

// Pages must use GitHub Actions and RUSLITIKI_PUBLISH_SOURCE must be "editor".
// The workflow uploads dist unchanged; only the selected mode can deploy.
export async function publishRelease(preview, config, workingRoot, onStatus) {
  const liveUrl = validatePublishing(config);
  await verifyArtifact(preview);
  const remote=`https://github.com/${config.repository}.git`;
  const connection=await checkPublishingConnection();
  if(!connection.ready)throw new Error(connection.checks.filter(check=>!check.ready).map(check=>check.detail).join('\n'));
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
    await stagePagesRelease(preview,work,path.resolve(workingRoot,'../.github/workflows/pages.yml'));
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
