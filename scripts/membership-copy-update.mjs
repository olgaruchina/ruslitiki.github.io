import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateContent } from '../src/lib/content.mjs';
import { plainText } from '../src/lib/rich-text.mjs';
import { atomicJson, digest, json, saveDraft } from './studio-store.mjs';

const UPDATE='membership-copy-2026-09';
const membership='membership';

function removeMembershipParagraph(content){
  const section=content.sections.find(item=>item.id===membership);
  const paragraph='Joining the waitlist is free. Paid membership is a separate step through Patreon. The price will be indicated in your local currency (equal to $15 USD)';
  if(!section?.body.includes(paragraph))return;
  const doc=content.richText?.[`${membership}:body`];
  if(doc){
    const index=doc.blocks.findIndex(block=>block.runs.map(run=>run.text).join('')===paragraph);
    if(index<0)throw new Error('Could not preserve formatting in membership:body.');
    doc.blocks.splice(index,1);
    if(index>0 && index<doc.blocks.length && !doc.blocks[index-1].runs.length && !doc.blocks[index].runs.length)doc.blocks.splice(index,1);
    section.body=plainText(doc);
  }else{
    section.body=section.body.split('\n').filter(line=>line!==paragraph).join('\n').replace(/\n{3,}/g,'\n\n');
  }
}

export function updateMembershipCopy(content){
  if(content.status==='coming-soon')return structuredClone(content);
  const next=structuredClone(content);
  removeMembershipParagraph(next);
  return next;
}

/** Update only known pre-launch wording in an active membership draft. */
export async function applyMembershipCopyUpdate(storage){
  const updates=path.join(storage,'updates');
  const receipt=path.join(updates,UPDATE+'.json');
  const lock=path.join(updates,UPDATE+'.lock');
  await fs.mkdir(updates,{recursive:true,mode:0o700});
  const completed=async()=>fs.access(receipt).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
  if(await completed())return {changed:false};
  const current=await json(path.join(storage,'draft.json'));
  if(current.status==='coming-soon')return {changed:false};
  let handle;
  try{handle=await fs.open(lock,'wx',0o600);}catch(error){
    if(error.code==='EEXIST')throw new Error('The membership copy update is already running. Close the other editor before trying again.');
    throw error;
  }
  try{
    if(await completed())return {changed:false};
    const content=await json(path.join(storage,'draft.json'));
    if(content.status==='coming-soon')return {changed:false};
    const errors=validateContent(content,{draft:true});
    if(errors.length)throw new Error('The membership copy update left your draft unchanged: '+errors.join('\n'));
    const updated=updateMembershipCopy(content);
    const invalid=validateContent(updated,{draft:true});
    if(invalid.length)throw new Error('The membership copy update left your draft unchanged: '+invalid.join('\n'));
    const changed=digest(updated)!==digest(content);
    let backup;
    if(changed){
      backup=path.join(storage,'backups',`${UPDATE}-${randomUUID()}.json`);
      await atomicJson(backup,content);
      await saveDraft(storage,updated,digest(content));
    }
    await atomicJson(receipt,{id:UPDATE,appliedAt:new Date().toISOString(),changed,...(backup?{backup:path.relative(storage,backup)}:{})});
    return {changed,...(backup?{backup}:{})};
  }finally{
    await handle.close();
    await fs.unlink(lock);
  }
}
