import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stagePagesRelease } from '../scripts/publish-release.mjs';
import { digest, fileMap } from '../scripts/studio-store.mjs';

test('editor push includes its workflow while preserving the exact reviewed public artifact',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'ruslitiki-pages-'));
  try{
    const previewDir=path.join(root,'preview');
    const releaseDir=path.join(root,'release');
    await fs.mkdir(previewDir);
    await fs.writeFile(path.join(previewDir,'index.html'),'<h1>Reviewed copy</h1>');
    await fs.writeFile(path.join(previewDir,'release.json'),'{"id":"reviewed-release"}\n');
    const preview={directory:previewDir,artifactHash:digest(await fileMap(previewDir))};
    const workflow=path.resolve('.github/workflows/pages.yml');
    await stagePagesRelease(preview,releaseDir,workflow);
    assert.deepEqual(await fileMap(path.join(releaseDir,'dist')),await fileMap(previewDir));
    assert.equal(await fs.readFile(path.join(releaseDir,'.github/workflows/pages.yml'),'utf8'),await fs.readFile(workflow,'utf8'));
    assert.equal(await fs.access(path.join(releaseDir,'dist/.github')).then(()=>true,()=>false),false);
    await fs.writeFile(path.join(previewDir,'index.html'),'Unreviewed copy');
    await assert.rejects(stagePagesRelease(preview,path.join(root,'another'),workflow),/preview files changed/);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
