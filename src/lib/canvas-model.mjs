import { SECTION_TYPES, MAX_SECTIONS } from './design.mjs';

export function insertSection(content,type,before=null,id='section-'+crypto.randomUUID()) {
  if(typeof type!=='string' || !Object.hasOwn(SECTION_TYPES,type) || content.sections.length>=MAX_SECTIONS)return null;
  if(before!==null && !content.design.blockOrder.includes(before))return null;
  const section={id,type,heading:'',body:'',visible:true,width:'reading',align:'left',tone:'plain',layout:'single'};
  if(type==='quote')section.attribution='';
  if(type==='image')Object.assign(section,{image:'',imageAlt:'',imageWidth:0,imageHeight:0,caption:'',sourceUrl:'',imageLayout:'left',imageRatio:'auto'});
  if(type==='button')Object.assign(section,{buttonLabel:'',buttonUrl:'',buttonKind:'primary'});
  if(type==='video')section.videoUrl='';
  content.sections.push(section);
  const index=before===null?content.design.blockOrder.length:content.design.blockOrder.indexOf(before);
  content.design.blockOrder.splice(index,0,id);return section;
}
export function moveSectionBefore(content,id,before) {
  const order=content.design.blockOrder;
  if(!order.includes(id) || id===before || (before!==null && !order.includes(before)))return false;
  const previous=order.join('|');order.splice(order.indexOf(id),1);
  order.splice(before===null?order.length:order.indexOf(before),0,id);return previous!==order.join('|');
}
export function editableField(content,id,field) {
  if(id==='opening' || id==='brand'){
    const limits=id==='brand'?{description:180}:{heading:100,introduction:400,'book.title':120,'book.author':100,'book.note':300};
    if(!Object.hasOwn(limits,field))return null;
    const parts=field.split('.');return {object:parts.length===2?content.book:content,key:parts.at(-1),max:limits[field]};
  }
  const section=content.sections.find(item=>item.id===id);if(!section)return null;
  const limits={heading:150,body:1400,...(section.type==='quote'?{attribution:150}:{}),...((section.type==='button' || section.buttonLabel || section.buttonUrl)?{buttonLabel:70}:{})};
  return Object.hasOwn(limits,field)?{object:section,key:field,max:limits[field]}:null;
}
export function setCanvasText(content,id,field,value) {
  if(typeof id!=='string' || typeof field!=='string' || typeof value!=='string')return false;
  const target=editableField(content,id,field);
  // Preserve over-limit text in the unsaved draft; validation must report it,
  // rather than silently saving the previous shorter value after a paste.
  if(!target || target.object[target.key]===value)return false;
  target.object[target.key]=value;return true;
}
