import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkPublishingConnection } from '../scripts/publish-release.mjs';
import { savePublication, json } from '../scripts/studio-store.mjs';

function github(overrides={}) {
  const responses={
    '':{permissions:{push:true}},
    '/pages':{build_type:'workflow',html_url:'https://www.ruslitiki.com/',https_enforced:true},
    '/actions/variables/RUSLITIKI_PUBLISH_SOURCE':{value:'editor'},
    '/environments/github-pages':{deployment_branch_policy:{custom_branch_policies:true},protection_rules:[{type:'branch_policy'}]},
    '/environments/github-pages/deployment-branch-policies?per_page=100':{branch_policies:[{name:'site-live',type:'branch'}]},
    ...overrides,
  };
  return async(command,args)=>{
    if(command==='git'){assert.deepEqual(args,['--version']);return 'git version 2';}
    assert.equal(command,'gh');assert.equal(args[0],'api');assert.equal(args.length,2,'Connection checks only read GitHub settings.');
    const endpoint=args[1].replace('repos/olgaruchina/ruslitiki.github.io','');
    assert.ok(Object.hasOwn(responses,endpoint),endpoint);
    if(responses[endpoint] instanceof Error)throw responses[endpoint];
    return JSON.stringify(responses[endpoint]);
  };
}

test('connection is ready only when the account, canonical domain and GitHub publishing settings agree',async()=>{
  const result=await checkPublishingConnection(github());
  assert.equal(result.ready,true);assert.equal(result.checks.length,5);
  const blocked=await checkPublishingConnection(github({
    '/pages':{build_type:'legacy',html_url:'https://www.ruslitiki.com/',https_enforced:true},
    '/actions/variables/RUSLITIKI_PUBLISH_SOURCE':{value:'main'},
    '/environments/github-pages/deployment-branch-policies?per_page=100':{branch_policies:[{name:'main',type:'branch'}]},
  }));
  assert.equal(blocked.ready,false);
  assert.deepEqual(blocked.checks.filter(check=>!check.ready).map(check=>check.id),['pages','mode','environment']);
});

test('read errors never expose command output or silently enable publishing',async()=>{
  const result=await checkPublishingConnection(github({'':new Error('private credential details')}));
  assert.equal(result.ready,false);assert.ok(!JSON.stringify(result).includes('private credential'));
  const missing=await checkPublishingConnection(github({'/actions/variables/RUSLITIKI_PUBLISH_SOURCE':new Error('Not found')}));
  assert.equal(missing.ready,false);assert.equal(missing.checks.find(check=>check.id==='mode').ready,false);
});

test('tag permissions, per-release approvals and a redirected domain do not pass the connection check',async()=>{
  for(const override of [
    {'/environments/github-pages/deployment-branch-policies?per_page=100':{branch_policies:[{name:'site-live',type:'tag'}]}},
    {'/environments/github-pages':{deployment_branch_policy:null,protection_rules:[{type:'required_reviewers'}]}},
    {'/pages':{build_type:'workflow',html_url:'https://ruslitiki.com/',https_enforced:true}},
    {'':{permissions:{push:false}}},
  ])assert.equal((await checkPublishingConnection(github(override))).ready,false);
});

test('confirming the same publication again preserves the real previous version',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'ruslitiki-publication-'));
  try{
    const first={id:'first',content:{heading:'First release'}};
    const second={id:'second',content:{heading:'Second release'}};
    await savePublication(directory,first);await savePublication(directory,first);
    await assert.rejects(fs.access(path.join(directory,'previous-publication.json')),error=>error.code==='ENOENT');
    await savePublication(directory,second);await savePublication(directory,second);
    assert.deepEqual(await json(path.join(directory,'previous-publication.json')),first);
    assert.deepEqual(await json(path.join(directory,'publication.json')),second);
  }finally{await fs.rm(directory,{recursive:true,force:true});}
});
