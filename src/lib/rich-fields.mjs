import { editableField, setCanvasText } from './canvas-model.mjs';
import { plainText, validateRichText } from './rich-text.mjs';

export const richMode = field => ['body','introduction','book.note'].includes(field) ? 'block' : 'inline';
const targetFor=(content,key)=>{
  if(typeof key!=='string' || !/^[a-z][a-z0-9-]*:[a-zA-Z][a-zA-Z0-9.]*$/.test(key))return null;
  const [id,field]=key.split(':');
  if(['openingDate','readingDate'].includes(field))return null;
  try{const target=editableField(content,id,field);return target?.object ? {...target,id,field} : null;}catch{return null;}
};
export function validateRichContent(content){
  if(content.richText===undefined)return [];
  const map=content.richText;
  if(!map || typeof map!=='object' || Array.isArray(map) || Object.keys(map).length>256)return ['Text formatting: expected up to 256 formatted fields.'];
  const errors=[];
  for(const [key,doc] of Object.entries(map)){
    const target=targetFor(content,key);
    if(!target){errors.push(`Text formatting: unknown field “${key}”.`);continue;}
    const invalid=validateRichText(doc,{inline:richMode(target.field)==='inline'});
    if(invalid.length){errors.push(`Text formatting (${key}): ${invalid.join(' ')}`);continue;}
    if(plainText(doc)!==(target.object[target.key]??''))errors.push(`Text formatting (${key}): the text and its formatting must match.`);
  }
  return errors;
}
export function setCanvasRichText(content,id,field,value,doc){
  const key=`${id}:${field}`,target=targetFor(content,key);
  if(!target || typeof value!=='string' || validateRichText(doc,{inline:richMode(field)==='inline'}).length || plainText(doc)!==value)return false;
  const formatted=doc.blocks.some(block=>block.type!=='paragraph' || block.runs.some(run=>run.bold || run.italic));
  const changed=target.object[target.key]!==value || (formatted?JSON.stringify(content.richText?.[key])!==JSON.stringify(doc):Object.hasOwn(content.richText??{},key));
  if(changed){
    setCanvasText(content,id,field,value);
    if(formatted){content.richText??={};content.richText[key]=structuredClone(doc);}
    else if(content.richText){delete content.richText[key];if(!Object.keys(content.richText).length)delete content.richText;}
  }
  return changed;
}
export function pruneRichText(content){
  if(!content.richText)return;
  for(const [key,doc] of Object.entries(content.richText)){
    const target=targetFor(content,key);
    if(!target || plainText(doc)!==(target.object[target.key]??''))delete content.richText[key];
  }
  if(!Object.keys(content.richText).length)delete content.richText;
}
export function copyRichSection(content,from,to){
  for(const [key,doc] of Object.entries(content.richText??{}))if(key.startsWith(from+':'))content.richText[to+key.slice(from.length)]=structuredClone(doc);
}
