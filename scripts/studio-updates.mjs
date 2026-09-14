import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateContent } from '../src/lib/content.mjs';
import { designFor } from '../src/lib/design.mjs';
import { atomicJson, digest, json, saveDraft } from './studio-store.mjs';

const UPDATE='contact-email-2026-09';
const CONTACT='section-bb4b953e-a094-43dd-baec-239fd87471e6';
const INSTAGRAM='section-6a548e93-39c6-412f-a4fc-b3398c69a58d';
const OLD_EMAIL='booksolgaruchina@gmail.com';
const NEW_EMAIL='olga@ruslitiki.com';
const oldAddress=()=>/(?<![a-z0-9._%+-])booksolgaruchina@gmail\.com(?![a-z0-9_+-]|\.[a-z0-9])/gi;

// A formatted email can span several runs. Keep all surrounding text and marks;
// the replacement address inherits the marks at the start of the old address.
function replaceFormattedAddress(doc,email) {
  for(const block of doc.blocks){
    const text=block.runs.map(run=>run.text).join('');
    for(const match of [...text.matchAll(oldAddress())].reverse()){
      const start=match.index,end=start+match[0].length;
      let offset=0;
      for(const run of block.runs){
        const next=offset+run.text.length;
        if(next>start && offset<end){
          const before=run.text.slice(0,Math.max(0,start-offset));
          const after=run.text.slice(Math.max(0,end-offset));
          run.text=before+(start>=offset?email:'')+after;
        }
        offset=next;
      }
    }
  }
}

function contactUpdate(content,source) {
  const next=structuredClone(content);
  if(next.email==='' || next.email.toLowerCase()===OLD_EMAIL)next.email=source.email;
  const contact=next.sections.find(section=>section.id===CONTACT);
  if(contact){
    contact.body=contact.body.replace(oldAddress(),source.email);
    const formatted=next.richText?.[`${CONTACT}:body`];
    if(formatted)replaceFormattedAddress(formatted,source.email);
    if(contact.divider===undefined)contact.divider='line';
  }else{
    const ids=new Set(next.sections.map(section=>section.id));
    const additions=[CONTACT,INSTAGRAM].filter(id=>!ids.has(id)).map(id=>{
      const section=source.sections.find(item=>item.id===id);
      if(!section)throw new Error('The approved contact update is missing its source blocks.');
      return structuredClone(section);
    });
    const order=designFor(next).blockOrder;
    const faqs=new Set(next.sections.filter(section=>section.type==='faq').map(section=>section.id));
    const lastFaq=order.findLastIndex(id=>faqs.has(id));
    order.splice(lastFaq<0?order.length:lastFaq+1,0,...additions.map(section=>section.id));
    next.sections.push(...additions);
    next.design={...next.design,blockOrder:order};
    for(const section of additions){
      for(const [key,doc] of Object.entries(source.richText??{})){
        if(key.startsWith(section.id+':')){
          next.richText??={};next.richText[key]=structuredClone(doc);
        }
      }
    }
  }
  return next;
}

/** Apply this approved contact change once; this is not ongoing draft/source sync. */
export async function applyContactUpdate(storage,source) {
  const updates=path.join(storage,'updates');
  const receipt=path.join(updates,UPDATE+'.json');
  const lock=path.join(updates,UPDATE+'.lock');
  await fs.mkdir(updates,{recursive:true,mode:0o700});
  const completed=async()=>{
    try{await fs.access(receipt);return true;}catch(error){if(error.code!=='ENOENT')throw error;return false;}
  };
  if(await completed())return {changed:false};
  if(source.email?.toLowerCase()!==NEW_EMAIL)throw new Error('The contact update requires the approved olga@ruslitiki.com source address.');
  let handle;
  try{handle=await fs.open(lock,'wx',0o600);}catch(error){
    if(error.code==='EEXIST')throw new Error('The contact update is already running. Close the other editor before trying again.');
    throw error;
  }
  try{
    if(await completed())return {changed:false};
    const content=await json(path.join(storage,'draft.json'));
    const errors=validateContent(content,{draft:true});
    if(errors.length)throw new Error('The contact update left your draft unchanged: '+errors.join('\n'));
    const updated=contactUpdate(content,source);
    const invalid=validateContent(updated,{draft:true});
    if(invalid.length)throw new Error('The contact update left your draft unchanged: '+invalid.join('\n'));
    const changed=digest(updated)!==digest(content);
    let backup;
    if(changed){
      backup=path.join(storage,'backups',`${UPDATE}-${randomUUID()}.json`);
      await atomicJson(backup,content);
      // The normal draft revision check also protects against a save made while
      // the backup was being written. A stale migration never records completion.
      await saveDraft(storage,updated,digest(content));
    }
    await atomicJson(receipt,{id:UPDATE,appliedAt:new Date().toISOString(),changed,...(backup?{backup:path.relative(storage,backup)}:{})});
    return {changed,...(backup?{backup}:{})};
  }finally{
    await handle.close();
    await fs.unlink(lock);
  }
}
